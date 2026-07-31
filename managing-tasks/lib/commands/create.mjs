// Create commands: task new, task get-new-uid.

import { join } from "node:path";
import YAML from "yaml";
import { ulid } from "ulid";
import { atomicWrite, withLock } from "../storage.mjs";
import { scanTasks, writeCache, TASKS_DIR } from "../cache.mjs";
import { validateTaskFile, ValidationError, SCHEMA_VERSION } from "../schema.mjs";

const PREFIX_GAP = 10;

/**
 * Create a single task; allocates the next numeric id and prefix slot.
 * @returns {{ contract_version: 1, id: string, uid: string, file: string }}
 */
export async function cmdNew(cwd, args) {
  // task new "<title>" [--goal=..] [--file path:kind] [--depends-on=id] [--source 'kind=..,ref=..']
  const title = args._[0];
  if (!title) throw new ValidationError("task new <title> required");
  return withLock(cwd, {}, async () => {
    const existing = await scanTasks(cwd, { includeArchived: true });
    const id = String(maxNumericId(existing) + 1);
    const uid = ulid();
    const { prefix, filename } = allocateSlot(existing, title);
    const depends_on = [].concat(args["depends-on"] || []).map(String);
    for (const dep of depends_on) {
      const t = existing.find((x) => x.id === dep);
      if (!t) throw new ValidationError(`dep ${dep} not found`, 2);
      if (t.status === "cancelled") throw new ValidationError(`dep ${dep} is cancelled`, 4);
    }
    const files = parseFileFlags(args.file);
    const sources = parseSourceFlags(args.source);
    const context = parseContextFlags(args.context);
    const task = {
      schema: SCHEMA_VERSION,
      uid,
      id,
      title,
      status: "pending",
      kind: args.kind || undefined,
      depends_on,
      depends_on_uids: depends_on.map((d) => existing.find((x) => x.id === d)?.uid).filter(Boolean),
      goal: args.goal || "",
      files: files.length ? files : undefined,
      sources: sources.length ? sources : undefined,
      context: context.length ? context : undefined,
    };
    validateTaskFile(task, { filename });
    const target = join(cwd, TASKS_DIR, filename);
    await atomicWrite(target, YAML.stringify(stripUndefined(task)));
    const refreshed = await scanTasks(cwd, { includeArchived: true });
    await writeCache(cwd, refreshed);
    return { contract_version: 1, id, uid, file: filename };
  });
}

/**
 * Mint fresh ULIDs for an agent writing task files directly.
 * Reads and writes no state, so it needs neither an initialised .tasks/ nor the lock.
 * Sorted ascending: ULIDs minted in one call are monotonic, and the timestamp
 * prefix is load-bearing for the merge procedure in references/file-format.md.
 * @returns {{ contract_version: 1, uids: string[] }}
 */
export async function cmdGetNewUid(cwd, args = {}) {
  const raw = args.count ?? 1;
  // A bare `--count` parses to boolean true; that is a missing value, not a count of 1.
  const count = typeof raw === "boolean" ? NaN : Number(raw);
  if (!Number.isInteger(count) || count < 1) {
    throw new ValidationError(`--count must be a positive integer, got: ${raw}`);
  }
  const uids = Array.from({ length: count }, () => ulid());
  uids.sort();
  return { contract_version: 1, uids };
}

function maxNumericId(tasks) {
  return tasks.reduce((m, t) => Math.max(m, parseInt(t.id, 10) || 0), 0);
}

function nextPrefixStart(tasks) {
  const maxP = tasks.reduce((m, t) => Math.max(m, t.prefix ?? 0), 0);
  return maxP === 0 ? PREFIX_GAP : maxP + PREFIX_GAP;
}

function allocateSlot(existing, title) {
  const prefix = String(nextPrefixStart(existing)).padStart(3, "0");
  return { prefix, filename: `${prefix}-${slugify(title)}.yaml` };
}

function parseFileFlags(val) {
  const vals = [].concat(val || []).filter(Boolean);
  return vals.map((v) => {
    const [path, kind] = String(v).split(":");
    return { path, kind: kind || "modify" };
  });
}

function parseSourceFlags(val) {
  const vals = [].concat(val || []).filter(Boolean);
  return vals.map((v) => parseSourceString(v));
}

function parseContextFlags(val) {
  const vals = [].concat(val || []).filter(Boolean);
  return vals.map((v) => parseContextString(v));
}

/**
 * Parse a context specifier: 'kind=file,ref=a/b.py,why=the write seam'.
 * Same single-string envelope as --source, including quoted values containing commas.
 */
export function parseContextString(s) {
  const out = {};
  for (const tok of tokenizeCSV(s)) {
    const eq = tok.indexOf("=");
    if (eq < 0) throw new ValidationError(`context: token without = (${tok})`);
    const k = tok.slice(0, eq).trim();
    const v = unquote(tok.slice(eq + 1).trim());
    if (k === "kind" || k === "ref" || k === "why") out[k] = v;
    else throw new ValidationError(`context: unknown key ${k} (expected kind, ref, why)`);
  }
  if (!out.kind || !out.ref) throw new ValidationError("context: kind and ref required");
  return out;
}

/**
 * Parse a source specifier: 'kind=prd,ref=a.md#s,meta.key=value'.
 * Supports quoted values containing commas (e.g. ref="a,b.md").
 */
export function parseSourceString(s) {
  const out = { meta: {} };
  const tokens = tokenizeCSV(s);
  for (const tok of tokens) {
    const eq = tok.indexOf("=");
    if (eq < 0) throw new ValidationError(`source: token without = (${tok})`);
    const k = tok.slice(0, eq).trim();
    const v = unquote(tok.slice(eq + 1).trim());
    if (k === "kind" || k === "ref") out[k] = v;
    else if (k.startsWith("meta.")) out.meta[k.slice(5)] = v;
    else out[k] = v;
  }
  if (!out.kind || !out.ref) throw new ValidationError("source: kind and ref required");
  if (!Object.keys(out.meta).length) delete out.meta;
  return out;
}

function tokenizeCSV(s) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { inQ = !inQ; cur += c; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

function unquote(v) {
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  return v;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "task";
}

function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

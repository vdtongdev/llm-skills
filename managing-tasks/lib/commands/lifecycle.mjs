// Lifecycle commands: archive, reindex, renumber, migrate.

import { mkdir, rename, readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { atomicWrite, withLock, MAINTENANCE_TIMEOUT_MS } from "../storage.mjs";
import { scanTasks, writeCache, rebuildCache, taskFilePath, TASKS_DIR, ARCHIVE_DIR } from "../cache.mjs";
import { ValidationError, TERMINAL, SCHEMA_VERSION, EXIT } from "../schema.mjs";
import { hasCycle } from "./mutate.mjs";

/**
 * Move done tasks to .tasks/archived/.
 * Use --id for a single task or --older-than <days> for bulk by mtime.
 * Refuses if the target is still referenced by an active dependent.
 */
export async function cmdArchive(cwd, args) {
  return withLock(cwd, { timeoutMs: MAINTENANCE_TIMEOUT_MS }, async () => {
    const all = await scanTasks(cwd, { includeArchived: true });
    let targets;
    if (args.id) {
      const t = all.find((x) => x.id === String(args.id));
      if (!t) throw new ValidationError(`task ${args.id} not found`, 2);
      if (t.status !== "done" && !args.force) throw new ValidationError(`task ${args.id} is not done (${t.status}); use --force to archive anyway`, 4);
      targets = [t];
    } else if (args["older-than"]) {
      const days = parseInt(args["older-than"], 10);
      if (isNaN(days) || days < 0) throw new ValidationError("--older-than requires a non-negative integer");
      const cutoff = Date.now() - days * 86400_000;
      targets = all.filter((t) => t.status === "done" && !t.archived && t.mtime < cutoff);
    } else {
      throw new ValidationError("task archive --id <id> | --older-than <days>");
    }

    // refuse if referenced by an active task
    for (const t of targets) {
      const blockers = all.filter((x) => !TERMINAL.has(x.status) && (x.depends_on || []).includes(t.id));
      if (blockers.length) {
        throw new ValidationError(`task ${t.id} referenced by active tasks ${blockers.map((b) => b.id).join(", ")}`, 4);
      }
    }
    await mkdir(join(cwd, ARCHIVE_DIR), { recursive: true });
    const moved = [];
    for (const t of targets) {
      const from = taskFilePath(cwd, t);
      const to = join(cwd, ARCHIVE_DIR, t.file);
      await rename(from, to);
      moved.push(t.id);
    }
    await rebuildCache(cwd);
    return { contract_version: 1, archived: moved };
  });
}

/** Rebuild .tasks/.cache/index.yaml from scratch. */
export async function cmdReindex(cwd) {
  return withLock(cwd, { timeoutMs: MAINTENANCE_TIMEOUT_MS }, async () => {
    const tasks = await rebuildCache(cwd);
    return { contract_version: 1, indexed: tasks.length };
  });
}

/**
 * Repo-wide integrity check. Reports, never repairs - that is why it is its own verb
 * and not part of `reindex`.
 *
 * Checks: schema-invalid task files, `depends_on` targets that resolve to nothing,
 * and dependency cycles. Archived tasks count as resolvable dep targets but are not
 * themselves walked for cycles.
 *
 * Every problem in the repo is reported in one run; the exit code is a verdict on the
 * repo, not on argv, so any problem is exit 4 (domain violation) rather than 3.
 * @returns {{ contract_version: 1, ok: boolean, checked: number, problems: object[] }}
 */
export async function cmdVerify(cwd) {
  const all = await scanTasks(cwd, { includeArchived: true });
  const problems = [];

  for (const t of all.filter((x) => x.status === "invalid")) {
    problems.push({ kind: "invalid", file: t.file, detail: t.error });
  }

  const valid = all.filter((t) => t.status !== "invalid");
  const known = new Set(valid.map((t) => t.id));
  const live = valid.filter((t) => !t.archived);

  // Nothing holds ids unique once tasks are written directly - there is no allocator
  // in the path. Two files claiming one id makes every `depends_on` on it ambiguous.
  const byId = new Map();
  for (const t of valid) {
    if (!byId.has(t.id)) byId.set(t.id, []);
    byId.get(t.id).push(t.file);
  }
  for (const [id, files] of byId) {
    if (files.length > 1) problems.push({ kind: "duplicate-id", id, files: files.sort() });
  }

  for (const t of live) {
    for (const dep of t.depends_on || []) {
      if (!known.has(dep)) problems.push({ kind: "dangling-dep", id: t.id, file: t.file, ref: dep });
    }
  }

  const graph = new Map(valid.map((t) => [t.id, new Set((t.depends_on || []).filter((d) => known.has(d)))]));
  const inACycle = new Set();
  for (const t of live) {
    if (inACycle.has(t.id)) continue;
    if (!hasCycle(graph, t.id)) continue;
    // Collect the whole strongly-connected group so one cycle yields one problem.
    const members = live.filter((x) => !inACycle.has(x.id) && reaches(graph, t.id, x.id) && reaches(graph, x.id, t.id));
    for (const m of members) inACycle.add(m.id);
    problems.push({ kind: "cycle", ids: members.map((m) => m.id).sort() });
  }

  const result = { contract_version: 1, ok: problems.length === 0, checked: valid.length, problems };
  if (problems.length) result[EXIT] = 4;
  return result;
}

/** True if `to` is reachable from `from` in `graph` (`from === to` counts only via a real edge). */
function reaches(graph, from, to) {
  const stack = [...(graph.get(from) || [])];
  const seen = new Set();
  while (stack.length) {
    const n = stack.pop();
    if (n === to) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const next of graph.get(n) || []) stack.push(next);
  }
  return false;
}

/** Normalize file prefixes to multiples of 10 (010, 020, …) to restore ordering space after moves. */
export async function cmdRenumber(cwd) {
  return withLock(cwd, { timeoutMs: MAINTENANCE_TIMEOUT_MS }, async () => {
    const all = await scanTasks(cwd, { includeArchived: false });
    const sorted = [...all].sort((a, b) => (a.prefix ?? 0) - (b.prefix ?? 0));
    const mapping = {};
    let nextPrefix = 10;
    const renames = [];
    for (const t of sorted) {
      const newPrefix = String(nextPrefix).padStart(3, "0");
      nextPrefix += 10;
      const slug = t.file.replace(/^\d+-/, "").replace(/\.yaml$/, "");
      const newName = `${newPrefix}-${slug}.yaml`;
      if (newName !== t.file) {
        renames.push({ from: taskFilePath(cwd, t), to: join(cwd, TASKS_DIR, newName), oldPrefix: t.prefix, newPrefix: parseInt(newPrefix, 10) });
        mapping[t.file] = newName;
      }
    }
    for (const r of renames) await rename(r.from, r.to);
    await rebuildCache(cwd);
    return { contract_version: 1, renamed: renames.length, mapping };
  });
}

/** Migrate task files to the current schema version. v1 is the only version; no-op for now. */
export async function cmdMigrate(cwd, args) {
  return withLock(cwd, { timeoutMs: MAINTENANCE_TIMEOUT_MS }, async () => {
    const all = await scanTasks(cwd, { includeArchived: true });
    const needs = all.filter((t) => t._raw && t._raw.schema !== SCHEMA_VERSION);
    if (args["dry-run"]) {
      return { contract_version: 1, dry_run: true, would_migrate: needs.length };
    }
    // v1 is current; no prior version to upgrade from yet.
    return { contract_version: 1, migrated: 0 };
  });
}

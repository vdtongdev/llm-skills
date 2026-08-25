import { lstat, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, relative, resolve } from "node:path";
import { minimatch } from "minimatch";
import lockfile from "proper-lockfile";
import YAML from "yaml";

const REQUIRED_TEXT = ["id", "title", "status"];
const REQUIRED_GUIDANCE = ["avoid", "prefer", "why"];
const STATUSES = new Set(["active", "retired"]);

function output(value) {
  process.stdout.write(YAML.stringify(value));
}

function warning(file, message) {
  process.stderr.write(`warning: ${file}: ${message}\n`);
}

function validateEntry(entry) {
  const problems = [];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return ["entry must be a YAML mapping"];
  }
  if (entry.schema !== 1) problems.push("schema must be 1");
  for (const field of REQUIRED_TEXT) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      problems.push(`${field} must be a non-empty string`);
    }
  }
  if (typeof entry.status === "string" && !STATUSES.has(entry.status)) {
    problems.push("status must be active or retired");
  }
  if (!entry.guidance || typeof entry.guidance !== "object" || Array.isArray(entry.guidance)) {
    problems.push("guidance must be a mapping");
  } else {
    for (const field of REQUIRED_GUIDANCE) {
      if (typeof entry.guidance[field] !== "string" || entry.guidance[field].trim() === "") {
        problems.push(`guidance.${field} must be a non-empty string`);
      }
    }
  }
  if (entry.topics !== undefined && !isStringList(entry.topics)) {
    problems.push("topics must be a list of strings");
  }
  if (entry.paths !== undefined && !isStringList(entry.paths)) {
    problems.push("paths must be a list of strings");
  } else {
    (entry.paths ?? []).forEach((pattern, index) => {
      try {
        minimatch("", pattern);
      } catch (error) {
        problems.push(`paths[${index}] is invalid: ${error.message}`);
      }
    });
  }
  if (entry.selection !== undefined) {
    if (!isMapping(entry.selection)) problems.push("selection must be a mapping");
    else if (entry.selection.pinned !== undefined && typeof entry.selection.pinned !== "boolean") {
      problems.push("selection.pinned must be a boolean");
    }
  }
  if (entry.provenance !== undefined) {
    if (!isMapping(entry.provenance)) problems.push("provenance must be a mapping");
    else if (entry.provenance.encounters !== undefined) {
      if (!Array.isArray(entry.provenance.encounters)) {
        problems.push("provenance.encounters must be a list");
      } else {
        entry.provenance.encounters.forEach((encounter, index) => {
          if (!isMapping(encounter)) {
            problems.push(`provenance.encounters[${index}] must be a mapping`);
            return;
          }
          if (typeof encounter.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(encounter.date)) {
            problems.push(`provenance.encounters[${index}].date must use YYYY-MM-DD`);
          }
          for (const field of ["ref", "note"]) {
            if (typeof encounter[field] !== "string" || encounter[field].trim() === "") {
              problems.push(`provenance.encounters[${index}].${field} must be a non-empty string`);
            }
          }
        });
      }
    }
  }
  return problems;
}

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item !== "");
}

async function loadRegistry(cwd, { reportWarnings = true } = {}) {
  const directory = resolve(cwd, ".antipatterns");
  let names;
  try {
    names = (await readdir(directory)).filter((name) => /\.ya?ml$/i.test(name)).sort();
  } catch (error) {
    if (error?.code === "ENOENT") return { directory, entries: [], problems: [] };
    throw error;
  }

  const entries = [];
  const problems = [];
  const ids = new Set();
  for (const name of names) {
    const path = join(directory, name);
    let entry;
    try {
      entry = YAML.parse(await readFile(path, "utf8"));
    } catch (error) {
      const message = `could not be parsed: ${error.message}`;
      problems.push({ file: relative(cwd, path), message });
      if (reportWarnings) warning(relative(cwd, path), message);
      continue;
    }

    const entryProblems = validateEntry(entry);
    if (entryProblems.length > 0) {
      for (const message of entryProblems) {
        problems.push({ file: relative(cwd, path), message });
        if (reportWarnings) warning(relative(cwd, path), message);
      }
      continue;
    }
    if (ids.has(entry.id)) {
      const message = `duplicate id ${entry.id}`;
      problems.push({ file: relative(cwd, path), message });
      if (reportWarnings) warning(relative(cwd, path), message);
      continue;
    }
    ids.add(entry.id);
    entries.push({ entry, path });
  }
  return { directory, entries, problems };
}

function takeOption(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
  return value;
}

function parseSelectArgs(args) {
  const query = { topics: [], paths: [], ids: [], limit: 20 };
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--topic") query.topics.push(takeOption(args, index++, option));
    else if (option === "--path") query.paths.push(takeOption(args, index++, option));
    else if (option === "--id") query.ids.push(takeOption(args, index++, option));
    else if (option === "--limit") {
      const raw = takeOption(args, index++, option);
      if (!/^[1-9]\d*$/.test(raw)) throw new Error("--limit must be a positive integer");
      query.limit = Number(raw);
    } else throw new Error(`unknown option: ${option}`);
  }
  return query;
}

function normalizeQueryPath(cwd, value) {
  const slashPath = value.replaceAll("\\", "/");
  if (/^[A-Za-z]:\//.test(slashPath)) throw new Error(`path must be inside the project: ${value}`);
  const absolutePath = resolve(cwd, slashPath);
  const projectPath = relative(cwd, absolutePath).replaceAll("\\", "/");
  if (projectPath === ".." || projectPath.startsWith("../")) {
    throw new Error(`path must be inside the project: ${value}`);
  }
  return projectPath;
}

function selectionReasons(entry, query) {
  const reasons = [];
  if (query.ids.includes(entry.id)) reasons.push("explicit");
  for (const pattern of entry.paths ?? []) {
    if (query.paths.some((path) => minimatch(path, pattern))) reasons.push(`path:${pattern}`);
  }
  for (const topic of entry.topics ?? []) {
    if (query.topics.includes(topic)) reasons.push(`topic:${topic}`);
  }
  if (entry.selection?.pinned === true) reasons.push("pinned");
  return reasons;
}

function selectionRank(reasons) {
  if (reasons.includes("explicit")) return 0;
  if (reasons.some((reason) => reason.startsWith("path:"))) return 1;
  if (reasons.some((reason) => reason.startsWith("topic:"))) return 2;
  return 3;
}

async function topics(cwd) {
  const { entries } = await loadRegistry(cwd);
  const counts = new Map();
  for (const { entry } of entries) {
    if (entry.status !== "active") continue;
    for (const topic of new Set(entry.topics ?? [])) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  output({
    topics: [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, count]) => ({ name, entries: count })),
  });
  return 0;
}

async function select(cwd, args) {
  const query = parseSelectArgs(args);
  query.paths = query.paths.map((path) => normalizeQueryPath(cwd, path));
  const { entries } = await loadRegistry(cwd);
  const selected = [];
  for (const { entry } of entries) {
    if (entry.status !== "active") continue;
    const reasons = selectionReasons(entry, query);
    if (reasons.length === 0) continue;
    selected.push({
      rank: selectionRank(reasons),
      topicMatches: reasons.filter((reason) => reason.startsWith("topic:")).length,
      value: { id: entry.id, title: entry.title, reasons, guidance: entry.guidance },
    });
  }
  selected.sort(
    (left, right) =>
      left.rank - right.rank ||
      right.topicMatches - left.topicMatches ||
      left.value.id.localeCompare(right.value.id),
  );
  output({ selected: selected.slice(0, query.limit).map(({ value }) => value) });
  return 0;
}

async function show(cwd, id) {
  if (!id) throw new Error("show requires an entry id");
  const { entries } = await loadRegistry(cwd);
  const found = entries.find(({ entry }) => entry.id === id);
  if (!found) throw new Error(`entry not found: ${id}`);
  output(found.entry);
  return 0;
}

function parseEncounterArgs(args) {
  const id = args[0];
  if (!id) throw new Error("encounter requires an entry id");
  let ref;
  let note;
  for (let index = 1; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--ref") ref = takeOption(args, index++, option);
    else if (option === "--note") note = takeOption(args, index++, option);
    else throw new Error(`unknown option: ${option}`);
  }
  if (!ref) throw new Error("encounter requires --ref");
  if (!note) throw new Error("encounter requires --note");
  return { id, ref, note };
}

async function encounter(cwd, args) {
  const request = parseEncounterArgs(args);
  const { entries } = await loadRegistry(cwd);
  const found = entries.find(({ entry }) => entry.id === request.id);
  if (!found) throw new Error(`entry not found: ${request.id}`);
  const event = {
    date: new Date().toISOString().slice(0, 10),
    ref: request.ref,
    note: request.note,
  };
  const release = await lockfile.lock(found.path, {
    realpath: false,
    retries: { retries: 20, factor: 1.2, minTimeout: 10, maxTimeout: 100 },
  });
  const temporaryPath = `${found.path}.tmp-${randomUUID()}`;
  try {
    const metadata = await lstat(found.path);
    if (!metadata.isFile()) throw new Error(`${request.id} record must be a regular file`);
    const document = YAML.parseDocument(await readFile(found.path, "utf8"));
    if (document.errors.length > 0) throw new Error(`${request.id} could not be parsed after locking`);
    const current = document.toJS();
    const currentProblems = validateEntry(current);
    if (currentProblems.length > 0) throw new Error(`${request.id} became invalid after locking`);
    const encounters = current.provenance?.encounters ?? [];
    document.setIn(["provenance", "encounters"], [...encounters, event]);

    const handle = await open(temporaryPath, "wx", metadata.mode);
    try {
      await handle.writeFile(String(document));
      await handle.sync();
      await handle.chmod(metadata.mode);
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, found.path);
  } finally {
    await rm(temporaryPath, { force: true });
    await release();
  }
  output({ updated: request.id, encounter: event });
  return 0;
}

async function validate(cwd) {
  const { entries, problems } = await loadRegistry(cwd, { reportWarnings: false });
  output({ valid: problems.length === 0, entries: entries.length, ...(problems.length ? { problems } : {}) });
  return problems.length === 0 ? 0 : 1;
}

export async function main(args, { cwd }) {
  const [command, ...rest] = args;
  if (command === "topics") {
    if (rest.length > 0) throw new Error("topics accepts no arguments");
    return topics(cwd);
  }
  if (command === "select") return select(cwd, rest);
  if (command === "show") {
    if (rest.length !== 1) throw new Error("show requires exactly one entry id");
    return show(cwd, rest[0]);
  }
  if (command === "encounter") return encounter(cwd, rest);
  if (command === "validate") {
    if (rest.length > 0) throw new Error("validate accepts no arguments");
    return validate(cwd);
  }
  throw new Error("usage: antipattern <topics|select|show|encounter|validate>");
}

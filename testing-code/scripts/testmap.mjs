import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { minimatch } from "minimatch";
import YAML from "yaml";

const LAYERS = new Set(["api", "unit", "integration", "script", "e2e"]);
const TARGET_KINDS = new Set(["path", "symbol", "endpoint", "route", "invariant"]);
const PATH_BEARING = new Set(["path", "symbol"]);
const GAP_STATUSES = new Set(["open", "accepted-risk"]);
const GAP_ID = /^TG-\d{3}$/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const REGISTRY = ".test-registry";
const CONFIG_PATH = `${REGISTRY}/config.yaml`;

class CliError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

function output(value) {
  process.stdout.write(YAML.stringify(value));
}

function warning(file, message) {
  process.stderr.write(`warning: ${file}: ${message}\n`);
}

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

/** Path portion of a target ref: everything before `#` for symbols, the whole ref otherwise. */
function targetPath(target) {
  return target.kind === "symbol" ? target.ref.split("#")[0] : target.ref;
}

// --- validation -------------------------------------------------------------

function validateTargets(targets, label, problems) {
  if (!Array.isArray(targets) || targets.length === 0) {
    problems.push(`${label} must be a non-empty list`);
    return;
  }
  targets.forEach((target, index) => {
    if (!isMapping(target)) {
      problems.push(`${label}[${index}] must be a mapping`);
      return;
    }
    if (!isText(target.kind) || !TARGET_KINDS.has(target.kind)) {
      problems.push(`${label}[${index}].kind must be one of ${[...TARGET_KINDS].join(", ")}`);
    }
    if (!isText(target.ref)) problems.push(`${label}[${index}].ref must be a non-empty string`);
  });
}

/**
 * Gap `sources` share the {kind, ref} shape of targets but not the kind enum: R4 leaves source
 * kinds open so provenance like `review` or `session` needs no schema change.
 */
function validateSources(sources, problems) {
  if (!Array.isArray(sources) || sources.length === 0) {
    problems.push("sources must be a non-empty list");
    return;
  }
  sources.forEach((source, index) => {
    if (!isMapping(source)) {
      problems.push(`sources[${index}] must be a mapping`);
      return;
    }
    for (const field of ["kind", "ref"]) {
      if (!isText(source[field])) problems.push(`sources[${index}].${field} must be a non-empty string`);
    }
  });
}

function validateTopics(topics, problems) {
  if (!Array.isArray(topics) || topics.length === 0) {
    problems.push("topics must be a non-empty list");
    return;
  }
  const seen = new Set();
  topics.forEach((topic, index) => {
    if (typeof topic !== "string" || !KEBAB.test(topic)) {
      problems.push(`topics[${index}] must be kebab-case`);
      return;
    }
    if (seen.has(topic)) problems.push(`topics[${index}] duplicates ${topic}`);
    seen.add(topic);
  });
}

function validateStringList(value, label, problems) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((item) => !isText(item))) {
    problems.push(`${label} must be a list of non-empty strings`);
  }
}

function validateRecord(record) {
  const problems = [];
  if (!isMapping(record)) return ["record must be a YAML mapping"];
  if (!isText(record.layer) || !LAYERS.has(record.layer)) {
    problems.push(`layer must be one of ${[...LAYERS].join(", ")}`);
  }
  if (!isText(record.summary)) problems.push("summary must be a non-empty string");
  validateTopics(record.topics, problems);
  validateTargets(record.targets, "targets", problems);
  validateStringList(record.notes, "notes", problems);
  validateStringList(record.anti_patterns, "anti_patterns", problems);
  return problems;
}

function validateGap(gap, stem) {
  const problems = [];
  if (!isMapping(gap)) return ["gap must be a YAML mapping"];
  if (!isText(gap.id) || !GAP_ID.test(gap.id)) problems.push("id must match TG-NNN");
  else if (stem !== undefined && gap.id !== stem) {
    problems.push(`id ${gap.id} does not match filename stem ${stem}`);
  }
  if (!isText(gap.title)) problems.push("title must be a non-empty string");
  if (!isText(gap.status) || !GAP_STATUSES.has(gap.status)) {
    problems.push("status must be open or accepted-risk");
  }
  if (!isText(gap.layer) || !LAYERS.has(gap.layer)) {
    problems.push(`layer must be one of ${[...LAYERS].join(", ")}`);
  }
  if (!isText(gap.summary)) problems.push("summary must be a non-empty string");
  validateTopics(gap.topics, problems);
  validateTargets(gap.targets, "targets", problems);
  validateSources(gap.sources, problems);
  validateStringList(gap.notes, "notes", problems);
  return problems;
}

function validateConfig(config) {
  const problems = [];
  if (!isMapping(config)) return ["config must be a YAML mapping"];
  if (!Array.isArray(config.suites) || config.suites.length === 0) {
    return ["suites must be a non-empty list"];
  }
  const names = new Set();
  config.suites.forEach((suite, index) => {
    if (!isMapping(suite)) {
      problems.push(`suites[${index}] must be a mapping`);
      return;
    }
    for (const field of ["name", "root", "pattern"]) {
      if (!isText(suite[field])) problems.push(`suites[${index}].${field} must be a non-empty string`);
    }
    if (isText(suite.name)) {
      if (names.has(suite.name)) problems.push(`suites[${index}].name duplicates ${suite.name}`);
      names.add(suite.name);
    }
  });
  return problems;
}

// --- loading ----------------------------------------------------------------

async function readYaml(path) {
  return YAML.parse(await readFile(path, "utf8"));
}

async function walk(directory) {
  let dirents;
  try {
    dirents = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const found = [];
  for (const dirent of dirents.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, dirent.name);
    if (dirent.isDirectory()) found.push(...(await walk(path)));
    else if (dirent.isFile()) found.push(path);
  }
  return found;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function loadConfig(cwd, { forQuery }) {
  const path = resolve(cwd, CONFIG_PATH);
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (forQuery) throw new CliError(`no registry: ${CONFIG_PATH} is missing`, 2);
    return { config: null, problems: [{ kind: "missing-config", file: CONFIG_PATH, detail: `${CONFIG_PATH} is missing.` }] };
  }

  let config;
  try {
    config = YAML.parse(raw);
  } catch (error) {
    if (forQuery) throw new CliError(`${CONFIG_PATH} could not be parsed; run testmap validate`, 3);
    return {
      config: null,
      problems: [{ kind: "invalid-config", file: CONFIG_PATH, detail: `Could not be parsed: ${error.message}` }],
    };
  }

  const problems = validateConfig(config);
  if (problems.length > 0) {
    if (forQuery) throw new CliError(`${CONFIG_PATH} is invalid; run testmap validate`, 3);
    return {
      config: null,
      problems: problems.map((detail) => ({ kind: "invalid-config", file: CONFIG_PATH, detail })),
    };
  }
  return { config, problems: [] };
}

/**
 * Load every test-file record. A record's path under `.test-registry/tests/` is its identity:
 * strip the trailing `.yaml` and the remainder is the source path.
 */
async function loadRecords(cwd, { collect }) {
  const root = resolve(cwd, REGISTRY, "tests");
  const records = [];
  let incomplete = false;
  for (const path of await walk(root)) {
    const registryPath = toPosix(relative(cwd, path));
    if (!path.endsWith(".yaml")) continue;
    const testFile = toPosix(relative(root, path)).slice(0, -".yaml".length);

    let record;
    try {
      record = await readYaml(path);
    } catch (error) {
      incomplete = true;
      collect({ kind: "invalid-record", file: registryPath, test_file: testFile, detail: `Could not be parsed: ${error.message}` });
      continue;
    }
    const problems = validateRecord(record);
    if (problems.length > 0) {
      incomplete = true;
      for (const detail of problems) {
        collect({ kind: "invalid-record", file: registryPath, test_file: testFile, detail });
      }
      continue;
    }
    records.push({ testFile, registryPath, record });
  }
  records.sort((left, right) => left.testFile.localeCompare(right.testFile));
  return { records, incomplete };
}

async function loadGaps(cwd, { collect }) {
  const root = resolve(cwd, REGISTRY, "gaps");
  const gaps = [];
  const byId = new Map();
  let incomplete = false;
  for (const path of await walk(root)) {
    if (!path.endsWith(".yaml")) continue;
    const registryPath = toPosix(relative(cwd, path));
    const stem = registryPath.slice(registryPath.lastIndexOf("/") + 1, -".yaml".length);

    let gap;
    try {
      gap = await readYaml(path);
    } catch (error) {
      incomplete = true;
      collect({ kind: "invalid-record", file: registryPath, detail: `Could not be parsed: ${error.message}` });
      continue;
    }
    const problems = validateGap(gap, stem);
    if (problems.length > 0) {
      incomplete = true;
      for (const detail of problems) {
        collect({ kind: "invalid-record", file: registryPath, gap_id: isText(gap?.id) ? gap.id : undefined, detail });
      }
      continue;
    }
    if (byId.has(gap.id)) {
      incomplete = true;
      collect({
        kind: "duplicate-gap-id",
        file: registryPath,
        gap_id: gap.id,
        detail: `Gap id ${gap.id} is already defined by ${byId.get(gap.id)}.`,
      });
      continue;
    }
    byId.set(gap.id, registryPath);
    gaps.push({ gap, registryPath });
  }
  gaps.sort((left, right) => left.gap.id.localeCompare(right.gap.id));
  return { gaps, incomplete };
}

async function loadRegistry(cwd, { forQuery }) {
  const problems = [];
  const collect = (problem) => problems.push(problem);
  const { config, problems: configProblems } = await loadConfig(cwd, { forQuery });
  problems.push(...configProblems);

  const warn = (problem) => {
    if (forQuery) warning(problem.file, problem.detail);
    collect(problem);
  };
  const records = await loadRecords(cwd, { collect: warn });
  const gaps = await loadGaps(cwd, { collect: warn });

  return {
    config,
    records: records.records,
    gaps: gaps.gaps,
    incomplete: records.incomplete || gaps.incomplete,
    problems,
  };
}

// --- selection --------------------------------------------------------------

function takeOption(args, index, option) {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new CliError(`${option} requires a value`, 3);
  return value;
}

function parseSelectArgs(args) {
  const query = { paths: [], topics: [], layers: [] };
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === "--path") query.paths.push(takeOption(args, index++, option));
    else if (option === "--topic") query.topics.push(takeOption(args, index++, option));
    else if (option === "--layer") query.layers.push(takeOption(args, index++, option));
    else throw new CliError(`unknown option: ${option}`, 3);
  }
  return query;
}

function normalizeQueryPath(cwd, value) {
  const slashPath = toPosix(value);
  const projectPath = toPosix(relative(cwd, resolve(cwd, slashPath)));
  if (projectPath === ".." || projectPath.startsWith("../") || projectPath === "") {
    throw new CliError(`path must be inside the project: ${value}`, 3);
  }
  return projectPath;
}

const REASON_ORDER = ["test-file:", "target:", "topic:", "layer:"];

function orderReasons(reasons) {
  const unique = [...new Set(reasons)];
  return unique.sort((left, right) => {
    const leftRank = REASON_ORDER.findIndex((prefix) => left.startsWith(prefix));
    const rightRank = REASON_ORDER.findIndex((prefix) => right.startsWith(prefix));
    return leftRank - rightRank || left.localeCompare(right);
  });
}

/** Reasons an entry matches. `testFile` is undefined for gaps, which own no source file. */
function matchReasons({ testFile, entry, query }) {
  const reasons = [];
  if (testFile !== undefined && query.paths.includes(testFile)) reasons.push(`test-file:${testFile}`);
  for (const target of entry.targets ?? []) {
    if (!PATH_BEARING.has(target.kind)) continue;
    const pattern = targetPath(target);
    if (query.paths.some((path) => path === pattern || minimatch(path, pattern))) {
      reasons.push(`target:${target.ref}`);
    }
  }
  for (const topic of entry.topics ?? []) {
    if (query.topics.includes(topic)) reasons.push(`topic:${topic}`);
  }
  if (query.layers.includes(entry.layer)) reasons.push(`layer:${entry.layer}`);
  return orderReasons(reasons);
}

async function select(cwd, args) {
  const query = parseSelectArgs(args);
  query.paths = query.paths.map((path) => normalizeQueryPath(cwd, path));
  const { records, gaps, incomplete } = await loadRegistry(cwd, { forQuery: true });
  const unfiltered = query.paths.length === 0 && query.topics.length === 0 && query.layers.length === 0;

  const testFiles = [];
  for (const { testFile, record } of records) {
    const reasons = matchReasons({ testFile, entry: record, query });
    if (!unfiltered && reasons.length === 0) continue;
    testFiles.push({
      test_file: testFile,
      layer: record.layer,
      summary: record.summary,
      topics: record.topics,
      reasons,
    });
  }

  const selectedGaps = [];
  for (const { gap } of gaps) {
    const reasons = matchReasons({ testFile: undefined, entry: gap, query });
    if (!unfiltered && reasons.length === 0) continue;
    selectedGaps.push({
      id: gap.id,
      title: gap.title,
      status: gap.status,
      layer: gap.layer,
      summary: gap.summary,
      topics: gap.topics,
      reasons,
    });
  }

  output({
    query,
    test_files: testFiles,
    gaps: selectedGaps,
    total: { test_files: testFiles.length, gaps: selectedGaps.length },
    incomplete,
  });
  return 0;
}

// --- show -------------------------------------------------------------------

async function show(cwd, ref) {
  if (GAP_ID.test(ref)) return showGap(cwd, ref);
  return showRecord(cwd, ref);
}

async function showGap(cwd, id) {
  await loadConfig(cwd, { forQuery: true });
  const path = resolve(cwd, REGISTRY, "gaps", `${id}.yaml`);
  if (!(await exists(path))) throw new CliError(`gap not found: ${id}`, 2);

  let gap;
  try {
    gap = await readYaml(path);
  } catch (error) {
    throw new CliError(`${id} could not be parsed: ${error.message}`, 1);
  }
  const problems = validateGap(gap, id);
  if (problems.length > 0) throw new CliError(`${id} is invalid: ${problems.join("; ")}`, 1);

  output({ ...gap, notes: gap.notes ?? [] });
  return 0;
}

async function showRecord(cwd, testFile) {
  await loadConfig(cwd, { forQuery: true });
  const projectPath = normalizeQueryPath(cwd, testFile);
  const path = resolve(cwd, REGISTRY, "tests", `${projectPath}.yaml`);
  if (!(await exists(path))) throw new CliError(`no record for ${projectPath}`, 2);

  let record;
  try {
    record = await readYaml(path);
  } catch (error) {
    throw new CliError(`${projectPath} record could not be parsed: ${error.message}`, 1);
  }
  const problems = validateRecord(record);
  if (problems.length > 0) throw new CliError(`${projectPath} record is invalid: ${problems.join("; ")}`, 1);

  output({
    test_file: projectPath,
    layer: record.layer,
    summary: record.summary,
    topics: record.topics,
    targets: record.targets,
    notes: record.notes ?? [],
    anti_patterns: record.anti_patterns ?? [],
  });
  return 0;
}

// --- validate ---------------------------------------------------------------

/** Every source file matching a configured suite root and pattern. */
async function discoverTestFiles(cwd, config) {
  const discovered = new Set();
  for (const suite of config.suites) {
    const root = resolve(cwd, suite.root);
    for (const path of await walk(root)) {
      const withinSuite = toPosix(relative(root, path));
      if (minimatch(withinSuite, suite.pattern)) discovered.add(toPosix(relative(cwd, path)));
    }
  }
  return discovered;
}

/** Any minimatch metacharacter, not just `*`: a brace list like `list/{a,b}/page.tsx` is a glob too. */
const GLOB_MAGIC = /[*?[\]{}]/;

async function targetExists(cwd, ref) {
  if (!GLOB_MAGIC.test(ref)) return exists(resolve(cwd, ref));
  const segments = ref.split("/");
  const staticPrefix = [];
  for (const segment of segments) {
    if (GLOB_MAGIC.test(segment)) break;
    staticPrefix.push(segment);
  }
  const searchRoot = resolve(cwd, staticPrefix.join("/") || ".");
  for (const path of await walk(searchRoot)) {
    if (minimatch(toPosix(relative(cwd, path)), ref)) return true;
  }
  return false;
}

async function validate(cwd) {
  const { config, records, gaps, problems } = await loadRegistry(cwd, { forQuery: false });

  let discovered = new Set();
  if (config) {
    discovered = await discoverTestFiles(cwd, config);
    const registered = new Set(records.map((entry) => entry.testFile));

    for (const testFile of [...discovered].sort()) {
      if (!registered.has(testFile)) {
        problems.push({
          kind: "unregistered-test-file",
          file: testFile,
          detail: "Source test file has no registry record.",
        });
      }
    }
    for (const { testFile, registryPath } of records) {
      if (!(await exists(resolve(cwd, testFile)))) {
        problems.push({
          kind: "missing-test-file",
          file: registryPath,
          test_file: testFile,
          detail: "Record has no source file at that path.",
        });
      }
    }
  }

  for (const { testFile, registryPath, record } of records) {
    for (const target of record.targets) {
      if (!PATH_BEARING.has(target.kind)) continue;
      if (!(await targetExists(cwd, targetPath(target)))) {
        problems.push({
          kind: "missing-target",
          file: registryPath,
          test_file: testFile,
          ref: target.ref,
          detail: "Target path matches nothing in the project.",
        });
      }
    }
  }
  for (const { gap, registryPath } of gaps) {
    for (const target of gap.targets) {
      if (!PATH_BEARING.has(target.kind)) continue;
      if (!(await targetExists(cwd, targetPath(target)))) {
        problems.push({
          kind: "missing-target",
          file: registryPath,
          gap_id: gap.id,
          ref: target.ref,
          detail: "Target path matches nothing in the project.",
        });
      }
    }
  }

  const cleaned = problems.map((problem) =>
    Object.fromEntries(Object.entries(problem).filter(([, value]) => value !== undefined)),
  );
  output({
    ok: cleaned.length === 0,
    checked: {
      test_records: records.length,
      gap_records: gaps.length,
      discovered_test_files: discovered.size,
    },
    problems: cleaned,
  });
  return cleaned.length === 0 ? 0 : 4;
}

// --- entrypoint -------------------------------------------------------------

export async function main(args, { cwd }) {
  const [command, ...rest] = args;
  if (command === "select") return select(cwd, rest);
  if (command === "show") {
    if (rest.length !== 1) throw new CliError("show requires exactly one test path or gap id", 3);
    return show(cwd, rest[0]);
  }
  if (command === "validate") {
    if (rest.length > 0) throw new CliError("validate accepts no arguments", 3);
    return validate(cwd);
  }
  throw new CliError("usage: testmap <select|show|validate>", 3);
}

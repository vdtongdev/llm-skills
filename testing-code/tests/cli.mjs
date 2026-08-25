import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../bin/testmap");

function run(cwd, ...args) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
  return {
    code: result.status,
    stderr: result.stderr,
    data: result.stdout.trim() === "" ? null : YAML.parse(result.stdout),
  };
}

async function write(project, path, contents) {
  const full = resolve(project, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, typeof contents === "string" ? contents : YAML.stringify(contents));
}

const CONFIG = {
  suites: [
    { name: "backend", root: "backend/tests", pattern: "**/test_*.py" },
    { name: "frontend-e2e", root: "frontend/e2e", pattern: "**/*.spec.ts" },
  ],
};

const CLOCK_RECORD = {
  layer: "unit",
  summary: "Local calendar-date behavior and plain-date return type.",
  topics: ["date-handling", "time"],
  targets: [{ kind: "symbol", ref: "backend/services/clock.py#today" }],
};

const CLEAN_DB_RECORD = {
  layer: "script",
  summary: "Destructive cleanup guards and preserved reference data.",
  topics: ["cleanup", "database"],
  targets: [{ kind: "path", ref: "scripts/clean_db.py" }],
  notes: ["The guard test owns the destructive path."],
  anti_patterns: ["AP-037"],
};

const ACCOUNTS_RECORD = {
  layer: "e2e",
  summary: "Account navigation, self-protection, create, reset, and delete.",
  topics: ["accounts", "authorization"],
  targets: [
    { kind: "path", ref: "frontend/src/components/accounts/**/*.tsx" },
    { kind: "route", ref: "/list/accounts" },
  ],
};

const GAP = {
  id: "TG-001",
  title: "Grade ordering depends on migration-seeded rows",
  status: "open",
  layer: "api",
  summary: "Replace the seeded-row non-vacuity guard with test-owned evidence.",
  topics: ["grades", "fixtures"],
  targets: [{ kind: "path", ref: "backend/services/grade_service.py" }],
  sources: [{ kind: "review", ref: "session:0170" }],
};

async function makeProject(t, extra = {}) {
  const project = await mkdtemp(resolve(tmpdir(), "testmap-"));
  t.after(() => rm(project, { recursive: true, force: true }));

  await write(project, ".test-registry/config.yaml", CONFIG);

  // Source test files.
  await write(project, "backend/tests/unit/test_clock.py", "def test_today():\n    pass\n");
  await write(project, "backend/tests/scripts/test_clean_db.py", "def test_guard():\n    pass\n");
  await write(project, "frontend/e2e/crud/accounts-crud.spec.ts", "test('creates', async () => {});\n");

  // Production files the targets point at.
  await write(project, "backend/services/clock.py", "def today():\n    pass\n");
  await write(project, "scripts/clean_db.py", "print('clean')\n");
  await write(project, "backend/services/grade_service.py", "pass\n");
  await write(project, "frontend/src/components/accounts/AccountRow.tsx", "export const A = 1;\n");

  // Records, path-mirrored with .yaml appended.
  await write(project, ".test-registry/tests/backend/tests/unit/test_clock.py.yaml", CLOCK_RECORD);
  await write(project, ".test-registry/tests/backend/tests/scripts/test_clean_db.py.yaml", CLEAN_DB_RECORD);
  await write(project, ".test-registry/tests/frontend/e2e/crud/accounts-crud.spec.ts.yaml", ACCOUNTS_RECORD);
  await write(project, ".test-registry/gaps/TG-001.yaml", GAP);

  for (const [path, contents] of Object.entries(extra)) await write(project, path, contents);
  return project;
}

test("clean registry: every command exits 0 and emits YAML", async (t) => {
  const project = await makeProject(t);
  for (const args of [["select"], ["show", "backend/tests/unit/test_clock.py"], ["validate"]]) {
    const result = run(project, ...args);
    assert.equal(result.code, 0, `${args[0]} stderr: ${result.stderr}`);
    assert.ok(result.data, `${args[0]} produced no YAML`);
  }
});

test("select with no selector returns every record and gap, sorted", async (t) => {
  const project = await makeProject(t);
  const { code, data } = run(project, "select");
  assert.equal(code, 0);
  assert.deepEqual(
    data.test_files.map((entry) => entry.test_file),
    [
      "backend/tests/scripts/test_clean_db.py",
      "backend/tests/unit/test_clock.py",
      "frontend/e2e/crud/accounts-crud.spec.ts",
    ],
  );
  assert.deepEqual(data.gaps.map((gap) => gap.id), ["TG-001"]);
  assert.deepEqual(data.total, { test_files: 3, gaps: 1 });
  assert.equal(data.incomplete, false);
});

test("select matches exact source path, glob target, symbol target, topic, and layer", async (t) => {
  const project = await makeProject(t);

  const byFile = run(project, "select", "--path", "backend/tests/unit/test_clock.py");
  assert.equal(byFile.code, 0);
  assert.deepEqual(byFile.data.test_files.map((e) => e.test_file), ["backend/tests/unit/test_clock.py"]);
  assert.ok(byFile.data.test_files[0].reasons.includes("test-file:backend/tests/unit/test_clock.py"));

  const bySymbol = run(project, "select", "--path", "backend/services/clock.py");
  assert.deepEqual(bySymbol.data.test_files.map((e) => e.test_file), ["backend/tests/unit/test_clock.py"]);
  assert.ok(bySymbol.data.test_files[0].reasons.includes("target:backend/services/clock.py#today"));

  const byGlob = run(project, "select", "--path", "frontend/src/components/accounts/AccountRow.tsx");
  assert.deepEqual(byGlob.data.test_files.map((e) => e.test_file), ["frontend/e2e/crud/accounts-crud.spec.ts"]);

  const byTopic = run(project, "select", "--topic", "date-handling");
  assert.deepEqual(byTopic.data.test_files.map((e) => e.test_file), ["backend/tests/unit/test_clock.py"]);
  assert.ok(byTopic.data.test_files[0].reasons.includes("topic:date-handling"));

  const byLayer = run(project, "select", "--layer", "e2e");
  assert.deepEqual(byLayer.data.test_files.map((e) => e.test_file), ["frontend/e2e/crud/accounts-crud.spec.ts"]);
  assert.ok(byLayer.data.test_files[0].reasons.includes("layer:e2e"));
});

test("select --path matching a scripts/ target selects that record", async (t) => {
  const project = await makeProject(t);
  const { code, data } = run(project, "select", "--path", "scripts/clean_db.py");
  assert.equal(code, 0);
  assert.deepEqual(data.test_files.map((e) => e.test_file), ["backend/tests/scripts/test_clean_db.py"]);
  assert.ok(data.test_files[0].reasons.includes("target:scripts/clean_db.py"));
});

test("every selector reaches gaps, and gaps carry status", async (t) => {
  const project = await makeProject(t);

  const byTopic = run(project, "select", "--topic", "grades");
  assert.deepEqual(byTopic.data.gaps.map((g) => g.id), ["TG-001"]);
  assert.equal(byTopic.data.gaps[0].status, "open");
  assert.deepEqual(byTopic.data.test_files, []);

  const byLayer = run(project, "select", "--layer", "api");
  assert.deepEqual(byLayer.data.gaps.map((g) => g.id), ["TG-001"]);

  const byPath = run(project, "select", "--path", "backend/services/grade_service.py");
  assert.deepEqual(byPath.data.gaps.map((g) => g.id), ["TG-001"]);
  assert.ok(byPath.data.gaps[0].reasons.includes("target:backend/services/grade_service.py"));
});

test("repeated selectors all appear in query and contribute reasons", async (t) => {
  const project = await makeProject(t);
  const { data } = run(project, "select", "--topic", "date-handling", "--topic", "accounts", "--layer", "script");
  assert.deepEqual(data.query.topics, ["date-handling", "accounts"]);
  assert.deepEqual(data.query.layers, ["script"]);
  assert.deepEqual(data.test_files.map((e) => e.test_file), [
    "backend/tests/scripts/test_clean_db.py",
    "backend/tests/unit/test_clock.py",
    "frontend/e2e/crud/accounts-crud.spec.ts",
  ]);
});

test("reasons are ordered by category then lexically", async (t) => {
  const project = await makeProject(t);
  const { data } = run(
    project,
    "select",
    "--path",
    "backend/tests/unit/test_clock.py",
    "--path",
    "backend/services/clock.py",
    "--topic",
    "time",
    "--topic",
    "date-handling",
    "--layer",
    "unit",
  );
  assert.deepEqual(data.test_files[0].reasons, [
    "test-file:backend/tests/unit/test_clock.py",
    "target:backend/services/clock.py#today",
    "topic:date-handling",
    "topic:time",
    "layer:unit",
  ]);
});

test("select rejects a path outside the project", async (t) => {
  const project = await makeProject(t);
  const outside = run(project, "select", "--path", "../escape.py");
  assert.equal(outside.code, 3);
  const absolute = run(project, "select", "--path", "/etc/passwd");
  assert.equal(absolute.code, 3);
});

test("select rejects an unknown option", async (t) => {
  const project = await makeProject(t);
  assert.equal(run(project, "select", "--nope", "x").code, 3);
  assert.equal(run(project, "select", "--topic").code, 3);
});

test("a damaged record marks select incomplete but still returns the rest", async (t) => {
  const project = await makeProject(t, {
    ".test-registry/tests/backend/tests/unit/broken.py.yaml": "summary: [unterminated\n",
  });
  const { code, data, stderr } = run(project, "select");
  assert.equal(code, 0);
  assert.equal(data.incomplete, true);
  assert.match(stderr, /warning/);
  assert.equal(data.test_files.length, 3);
});

test("show returns a full record with omitted optional lists as empty", async (t) => {
  const project = await makeProject(t);
  const { code, data } = run(project, "show", "backend/tests/unit/test_clock.py");
  assert.equal(code, 0);
  assert.equal(data.test_file, "backend/tests/unit/test_clock.py");
  assert.equal(data.layer, "unit");
  assert.deepEqual(data.notes, []);
  assert.deepEqual(data.anti_patterns, []);
  assert.deepEqual(data.targets, [{ kind: "symbol", ref: "backend/services/clock.py#today" }]);
});

test("show accepts a gap id and returns the whole gap record", async (t) => {
  const project = await makeProject(t);
  const { code, data } = run(project, "show", "TG-001");
  assert.equal(code, 0);
  assert.equal(data.id, "TG-001");
  assert.deepEqual(data.sources, [{ kind: "review", ref: "session:0170" }]);
  assert.deepEqual(data.targets, [{ kind: "path", ref: "backend/services/grade_service.py" }]);
  assert.deepEqual(data.notes, []);
});

test("show exits 2 for an unknown path or gap id, and 1 for a damaged record", async (t) => {
  const project = await makeProject(t, {
    ".test-registry/tests/backend/tests/unit/test_broken.py.yaml": "summary: [unterminated\n",
  });
  assert.equal(run(project, "show", "backend/tests/unit/test_absent.py").code, 2);
  assert.equal(run(project, "show", "TG-999").code, 2);
  assert.equal(run(project, "show", "backend/tests/unit/test_broken.py").code, 1);
});

test("record path round-trips for a compound extension", async (t) => {
  const project = await makeProject(t);
  const { code, data } = run(project, "show", "frontend/e2e/crud/accounts-crud.spec.ts");
  assert.equal(code, 0);
  assert.equal(data.test_file, "frontend/e2e/crud/accounts-crud.spec.ts");
});

test("validate on a clean registry exits 0 with no problems", async (t) => {
  const project = await makeProject(t);
  const { code, data } = run(project, "validate");
  assert.equal(code, 0);
  assert.equal(data.ok, true);
  assert.deepEqual(data.problems, []);
  assert.deepEqual(data.checked, { test_records: 3, gap_records: 1, discovered_test_files: 3 });
});

test("validate reports every problem in one exit-4 report", async (t) => {
  const project = await makeProject(t, {
    // malformed YAML
    ".test-registry/tests/backend/tests/unit/test_malformed.py.yaml": "summary: [unterminated\n",
    // invalid record: layer off-enum
    ".test-registry/tests/backend/tests/unit/test_invalid.py.yaml": {
      layer: "nonsense",
      summary: "Bad layer.",
      topics: ["x"],
      targets: [{ kind: "path", ref: "backend/services/clock.py" }],
    },
    // duplicate gap id: same id and matching stem, reachable only from a nested directory
    ".test-registry/gaps/legacy/TG-001.yaml": { ...GAP },
    // unregistered source file
    "backend/tests/unit/test_unregistered.py": "def test_x():\n    pass\n",
    // record whose source is gone
    ".test-registry/tests/backend/tests/unit/test_ghost.py.yaml": {
      layer: "unit",
      summary: "Source was deleted.",
      topics: ["ghost"],
      targets: [{ kind: "path", ref: "backend/services/clock.py" }],
    },
    // missing target
    ".test-registry/tests/backend/tests/unit/test_deadtarget.py.yaml": {
      layer: "unit",
      summary: "Target does not exist.",
      topics: ["dead"],
      targets: [{ kind: "path", ref: "backend/services/vanished.py" }],
    },
  });
  await write(project, "backend/tests/unit/test_deadtarget.py", "def test_y():\n    pass\n");

  const { code, data } = run(project, "validate");
  assert.equal(code, 4);
  assert.equal(data.ok, false);
  const kinds = new Set(data.problems.map((problem) => problem.kind));
  for (const expected of [
    "invalid-record",
    "duplicate-gap-id",
    "unregistered-test-file",
    "missing-test-file",
    "missing-target",
  ]) {
    assert.ok(kinds.has(expected), `missing problem kind ${expected}; saw ${[...kinds].join(", ")}`);
  }
  for (const problem of data.problems) {
    assert.equal(typeof problem.kind, "string");
    assert.ok(problem.detail.length > 0);
  }
});

test("validate rejects a gap whose layer is off-enum", async (t) => {
  const project = await makeProject(t, {
    ".test-registry/gaps/TG-002.yaml": { ...GAP, id: "TG-002", layer: "nonsense" },
  });
  const { code, data } = run(project, "validate");
  assert.equal(code, 4);
  assert.ok(data.problems.some((p) => p.kind === "invalid-record" && p.gap_id === "TG-002"));
});

test("validate rejects a gap id that disagrees with its filename", async (t) => {
  const project = await makeProject(t, {
    ".test-registry/gaps/TG-002.yaml": { ...GAP, id: "TG-003" },
  });
  const { code, data } = run(project, "validate");
  assert.equal(code, 4);
  assert.ok(data.problems.some((p) => p.kind === "invalid-record"));
});

test("only path and symbol targets are existence-checked", async (t) => {
  const project = await makeProject(t, {
    ".test-registry/tests/backend/tests/unit/test_labels.py.yaml": {
      layer: "unit",
      summary: "Label targets name nothing real.",
      topics: ["labels"],
      targets: [
        { kind: "endpoint", ref: "POST /nowhere" },
        { kind: "route", ref: "/no/such/route" },
        { kind: "invariant", ref: "attendance never precedes enrolment" },
      ],
    },
    "backend/tests/unit/test_labels.py": "def test_z():\n    pass\n",
  });
  const { code, data } = run(project, "validate");
  assert.equal(code, 0, `problems: ${JSON.stringify(data.problems)}`);
});

test("a glob target matching at least one path is valid, matching nothing is not", async (t) => {
  const project = await makeProject(t);
  const clean = run(project, "validate");
  assert.equal(clean.code, 0);

  const broken = await makeProject(t, {
    ".test-registry/tests/backend/tests/unit/test_glob.py.yaml": {
      layer: "unit",
      summary: "Glob matches nothing.",
      topics: ["glob"],
      targets: [{ kind: "path", ref: "backend/nothing/**/*.py" }],
    },
    "backend/tests/unit/test_glob.py": "def test_g():\n    pass\n",
  });
  const { code, data } = run(broken, "validate");
  assert.equal(code, 4);
  assert.ok(data.problems.some((p) => p.kind === "missing-target"));
});

test("a brace-list target is a glob, not a literal path", async (t) => {
  const project = await makeProject(t, {
    ".test-registry/tests/backend/tests/unit/test_braces.py.yaml": {
      layer: "unit",
      summary: "Brace list resolves through minimatch.",
      topics: ["braces"],
      targets: [{ kind: "path", ref: "frontend/src/components/{accounts,missing}/AccountRow.tsx" }],
    },
    "backend/tests/unit/test_braces.py": "def test_b():\n    pass\n",
  });
  const { code, data } = run(project, "validate");
  assert.equal(code, 0, `problems: ${JSON.stringify(data.problems)}`);
});

test("missing config exits 2 for queries and is a structured problem for validate", async (t) => {
  const project = await mkdtemp(resolve(tmpdir(), "testmap-empty-"));
  t.after(() => rm(project, { recursive: true, force: true }));

  const select = run(project, "select");
  assert.equal(select.code, 2);
  assert.match(select.stderr, /\.test-registry\/config\.yaml/);

  const validate = run(project, "validate");
  assert.equal(validate.code, 4);
  assert.ok(validate.data.problems.some((p) => p.kind === "missing-config"));
});

test("invalid config exits 3 for queries and is a structured problem for validate", async (t) => {
  const project = await makeProject(t, {
    ".test-registry/config.yaml": { suites: [{ name: "backend", root: "backend/tests" }] },
  });
  const select = run(project, "select");
  assert.equal(select.code, 3);
  assert.match(select.stderr, /validate/);

  const validate = run(project, "validate");
  assert.equal(validate.code, 4);
  assert.ok(validate.data.problems.some((p) => p.kind === "invalid-config"));
});

test("unknown command exits 3", async (t) => {
  const project = await makeProject(t);
  assert.equal(run(project, "wat").code, 3);
  assert.equal(run(project).code, 3);
});

import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../bin/antipattern");

async function makeProject(t) {
  const project = await mkdtemp(resolve(tmpdir(), "antipatterning-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const registry = resolve(project, ".antipatterns");
  await mkdir(registry);

  await writeFile(
    resolve(registry, "AP-001-migration-imports.yaml"),
    `# keep this comment\n${YAML.stringify({
      schema: 1,
      id: "AP-001",
      title: "Do not import service logic into migrations",
      status: "active",
      topics: ["backend", "database-migrations", "alembic"],
      paths: ["alembic/versions/**/*.py"],
      guidance: {
        avoid: "Do not import service decision logic into a migration.",
        prefer: "Keep a frozen copy inside the revision.",
        why: "Application changes can break historical migration replay.",
      },
      selection: { pinned: false },
      examples: {},
      relationships: {},
      provenance: {
        references: [{ kind: "code", ref: "backend/tests/test_phone.py" }],
        encounters: [{ date: "2026-08-20", ref: "session:0160", note: "Caught an import." }],
      },
    })}`,
  );
  await writeFile(
    resolve(registry, "AP-002-pagination.yaml"),
    YAML.stringify({
      schema: 1,
      id: "AP-002",
      title: "Use stable pagination ordering",
      status: "active",
      topics: ["backend", "paginated-api"],
      paths: ["backend/routers/**/*.py"],
      guidance: {
        avoid: "Do not paginate with unstable ordering.",
        prefer: "End the ordering with the primary key.",
        why: "Rows can be duplicated or omitted between pages.",
      },
      selection: { pinned: true },
      provenance: { encounters: [] },
    }),
  );
  await writeFile(resolve(registry, "broken.yaml"), "title: [unterminated\n");
  return project;
}

function run(project, args) {
  return spawnSync(cli, args, { cwd: project, encoding: "utf8" });
}

test("topics reports active topic counts and warns about malformed files", async (t) => {
  const project = await makeProject(t);

  const result = run(project, ["topics"]);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /warning: .*broken\.yaml.*could not be parsed/i);
  assert.deepEqual(YAML.parse(result.stdout), {
    topics: [
      { name: "alembic", entries: 1 },
      { name: "backend", entries: 2 },
      { name: "database-migrations", entries: 1 },
      { name: "paginated-api", entries: 1 },
    ],
  });
});

test("select returns compact guidance and every context reason", async (t) => {
  const project = await makeProject(t);

  const result = run(project, [
    "select",
    "--topic",
    "database-migrations",
    "--path",
    "alembic/versions/1234_normalize.py",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /warning:/i);
  assert.deepEqual(YAML.parse(result.stdout), {
    selected: [
      {
        id: "AP-001",
        title: "Do not import service logic into migrations",
        reasons: ["path:alembic/versions/**/*.py", "topic:database-migrations"],
        guidance: {
          avoid: "Do not import service decision logic into a migration.",
          prefer: "Keep a frozen copy inside the revision.",
          why: "Application changes can break historical migration replay.",
        },
      },
      {
        id: "AP-002",
        title: "Use stable pagination ordering",
        reasons: ["pinned"],
        guidance: {
          avoid: "Do not paginate with unstable ordering.",
          prefer: "End the ordering with the primary key.",
          why: "Rows can be duplicated or omitted between pages.",
        },
      },
    ],
  });
});

test("show returns the complete stored entry", async (t) => {
  const project = await makeProject(t);

  const result = run(project, ["show", "AP-001"]);

  assert.equal(result.status, 0);
  const entry = YAML.parse(result.stdout);
  assert.equal(entry.id, "AP-001");
  assert.deepEqual(entry.provenance.encounters, [
    { date: "2026-08-20", ref: "session:0160", note: "Caught an import." },
  ]);
});

test("encounter appends a counter event without a kind and preserves presentation", async (t) => {
  const project = await makeProject(t);
  const recordPath = resolve(project, ".antipatterns/AP-001-migration-imports.yaml");
  await chmod(recordPath, 0o640);

  const result = run(project, [
    "encounter",
    "AP-001",
    "--ref",
    "session:0168",
    "--note",
    "Kept the helper frozen.",
  ]);

  assert.equal(result.status, 0);
  const output = YAML.parse(result.stdout);
  assert.equal(output.updated, "AP-001");
  assert.match(output.encounter.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(Object.keys(output.encounter), ["date", "ref", "note"]);

  const stored = YAML.parse(
    await readFile(recordPath, "utf8"),
  );
  assert.equal(stored.provenance.encounters.length, 2);
  assert.deepEqual(stored.provenance.encounters[1], output.encounter);
  assert.match(await readFile(recordPath, "utf8"), /^# keep this comment/m);
  assert.equal((await stat(recordPath)).mode & 0o777, 0o640);
});

test("validate reports malformed files after checking the rest", async (t) => {
  const project = await makeProject(t);

  const result = run(project, ["validate"]);

  assert.equal(result.status, 1);
  const output = YAML.parse(result.stdout);
  assert.equal(output.valid, false);
  assert.equal(output.entries, 2);
  assert.equal(output.problems.length, 1);
  assert.match(output.problems[0].file, /broken\.yaml$/);
  assert.match(output.problems[0].message, /could not be parsed/i);
});

test("invalid structured fields warn without hiding valid records", async (t) => {
  const project = await makeProject(t);
  await writeFile(
    resolve(project, ".antipatterns/invalid.yaml"),
    YAML.stringify({
      schema: 1,
      id: "AP-003",
      title: "Invalid record",
      status: "actvie",
      topics: ["backend"],
      guidance: { avoid: "Avoid.", prefer: "Prefer.", why: "Why." },
      selection: { pinned: "yes" },
      provenance: { encounters: [{ date: "today", ref: "", note: "" }] },
    }),
  );

  const result = run(project, ["topics"]);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /status must be active or retired/);
  assert.match(result.stderr, /selection\.pinned must be a boolean/);
  assert.deepEqual(YAML.parse(result.stdout).topics.find(({ name }) => name === "backend"), {
    name: "backend",
    entries: 2,
  });
});

test("an invalid glob warns without stopping selection", async (t) => {
  const project = await makeProject(t);
  await writeFile(
    resolve(project, ".antipatterns/invalid-glob.yaml"),
    YAML.stringify({
      schema: 1,
      id: "AP-003",
      title: "Invalid glob",
      status: "active",
      topics: ["backend"],
      paths: ["a".repeat(70_000)],
      guidance: { avoid: "Avoid.", prefer: "Prefer.", why: "Why." },
    }),
  );

  const result = run(project, ["select", "--topic", "backend"]);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /paths\[0\] is invalid: pattern is too long/i);
  assert.deepEqual(
    YAML.parse(result.stdout).selected.map(({ id }) => id),
    ["AP-001", "AP-002"],
  );
});

test("select normalizes relative and absolute project paths", async (t) => {
  const project = await makeProject(t);
  const relativeResult = run(project, ["select", "--path", "./alembic/versions/change.py"]);
  const absoluteResult = run(project, [
    "select",
    "--path",
    resolve(project, "alembic/versions/change.py"),
  ]);

  assert.equal(relativeResult.status, 0);
  assert.equal(absoluteResult.status, 0);
  assert.equal(YAML.parse(relativeResult.stdout).selected[0].id, "AP-001");
  assert.equal(YAML.parse(absoluteResult.stdout).selected[0].id, "AP-001");
});

test("commands reject malformed limits and surplus arguments", async (t) => {
  const project = await makeProject(t);

  assert.equal(run(project, ["select", "--limit", "2records"]).status, 1);
  assert.equal(run(project, ["topics", "extra"]).status, 1);
  assert.equal(run(project, ["show", "AP-001", "extra"]).status, 1);
  assert.equal(run(project, ["validate", "extra"]).status, 1);
});

test("concurrent encounter writes retain every event", async (t) => {
  const project = await makeProject(t);
  const runs = Array.from({ length: 8 }, (_, index) =>
    new Promise((resolveRun) => {
      const child = spawn(
        cli,
        ["encounter", "AP-001", "--ref", `session:${index}`, "--note", `Encounter ${index}.`],
        { cwd: project, stdio: "ignore" },
      );
      child.on("exit", (code) => resolveRun(code));
    }),
  );

  assert.deepEqual(await Promise.all(runs), Array(8).fill(0));
  const stored = YAML.parse(
    await readFile(resolve(project, ".antipatterns/AP-001-migration-imports.yaml"), "utf8"),
  );
  assert.equal(stored.provenance.encounters.length, 9);
});

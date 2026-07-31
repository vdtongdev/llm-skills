// Node built-in test runner: node --test tests/
// Covers `task verify` - the repo-wide integrity check that replaces the intra-batch
// validation `task import` used to do. Its own verb, deliberately not folded into
// `reindex`: reindex repairs, verify only reports.

import { test } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import YAML from "yaml";

import { scratch, runCLI, seed, seedRaw } from "./helpers.mjs";

const kinds = (problems) => problems.map((p) => p.kind).sort();

test("verify: clean repo exits 0 and reports no problems", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [{ id: "1" }, { id: "2", depends_on: ["1"] }]);

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 0);
  const res = YAML.parse(out);
  assert.equal(res.contract_version, 1);
  assert.equal(res.ok, true);
  assert.equal(res.checked, 2);
  assert.deepEqual(res.problems, []);
  await rm(dir, { recursive: true, force: true });
});

test("verify: empty repo is clean", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 0);
  assert.equal(YAML.parse(out).checked, 0);
  await rm(dir, { recursive: true, force: true });
});

test("verify: dangling depends_on target is reported, exit 4", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [{ id: "1", depends_on: ["99"] }]);

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 4);
  const res = YAML.parse(out);
  assert.equal(res.ok, false);
  assert.deepEqual(kinds(res.problems), ["dangling-dep"]);
  assert.equal(res.problems[0].id, "1");
  assert.equal(res.problems[0].ref, "99");
  await rm(dir, { recursive: true, force: true });
});

test("verify: schema-invalid task file is reported, exit 4", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seedRaw(dir, "010-broken.yaml", "schema: 1\nid: '1'\ntitle: no uid or status\n");

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 4);
  const res = YAML.parse(out);
  assert.deepEqual(kinds(res.problems), ["invalid"]);
  assert.equal(res.problems[0].file, "010-broken.yaml");
  assert.match(res.problems[0].detail, /uid/);
  await rm(dir, { recursive: true, force: true });
});

test("verify: two-task dependency cycle is reported, exit 4", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [{ id: "1", depends_on: ["2"] }, { id: "2", depends_on: ["1"] }]);

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 4);
  const res = YAML.parse(out);
  assert.deepEqual(kinds(res.problems), ["cycle"]);
  await rm(dir, { recursive: true, force: true });
});

test("verify: cycle routed through a third task is reported", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [
    { id: "1", depends_on: ["3"] },
    { id: "2", depends_on: ["1"] },
    { id: "3", depends_on: ["2"] },
  ]);

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 4);
  assert.deepEqual(kinds(YAML.parse(out).problems), ["cycle"]);
  await rm(dir, { recursive: true, force: true });
});

test("verify: self-dependency is reported as a cycle", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [{ id: "1", depends_on: ["1"] }]);

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 4);
  assert.deepEqual(kinds(YAML.parse(out).problems), ["cycle"]);
  await rm(dir, { recursive: true, force: true });
});

test("verify: a cycle is reported once, not once per member", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [
    { id: "1", depends_on: ["3"] },
    { id: "2", depends_on: ["1"] },
    { id: "3", depends_on: ["2"] },
  ]);

  const { out } = await runCLI(dir, "verify");

  const cycles = YAML.parse(out).problems.filter((p) => p.kind === "cycle");
  assert.equal(cycles.length, 1);
  await rm(dir, { recursive: true, force: true });
});

test("verify: reports every problem in one run, not just the first", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [
    { id: "1", depends_on: ["2"] },
    { id: "2", depends_on: ["1"] },
    { id: "3", depends_on: ["99"] },
  ]);
  await seedRaw(dir, "040-broken.yaml", "schema: 1\nid: '4'\ntitle: no uid\n");

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 4);
  assert.deepEqual(kinds(YAML.parse(out).problems), ["cycle", "dangling-dep", "invalid"]);
  await rm(dir, { recursive: true, force: true });
});

test("verify: a dep on an archived task is not dangling", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [{ id: "1" }, { id: "2", depends_on: ["1"] }]);
  await runCLI(dir, "archive", "--id", "1");

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 0, YAML.stringify(YAML.parse(out)?.problems));
  await rm(dir, { recursive: true, force: true });
});

test("verify: does not modify task files - it reports, it does not repair", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  const [t] = await seed(dir, [{ id: "1", depends_on: ["99"] }]);
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const before = await readFile(join(dir, ".tasks", t.file), "utf8");

  const { code } = await runCLI(dir, "verify");

  assert.equal(code, 4, "verify must actually have run and found the dangling dep");
  const after = await readFile(join(dir, ".tasks", t.file), "utf8");
  assert.equal(after, before);
  await rm(dir, { recursive: true, force: true });
});

// `task import` was removed: the planner writes task files directly and runs `task verify`.
// Asserted so a reintroduction is a deliberate act, not an accident.
test("import: the verb no longer exists", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");

  const { code, out } = await runCLI(dir, "import", "b.yaml");

  assert.equal(code, 3);
  assert.match(out, /unknown command: import/);
  await rm(dir, { recursive: true, force: true });
});

// Direct writes have no allocator holding ids unique, so this is a new failure mode.
// `task import` never needed the check - it allocated every id in the batch itself.
test("verify: two task files sharing an id are reported", async () => {
  const dir = await scratch("mt-verify");
  await runCLI(dir, "init");
  await seed(dir, [{ id: "1", title: "one" }, { id: "1", title: "one again", prefix: 20 }]);

  const { code, out } = await runCLI(dir, "verify");

  assert.equal(code, 4);
  const dupes = YAML.parse(out).problems.filter((p) => p.kind === "duplicate-id");
  assert.equal(dupes.length, 1);
  assert.equal(dupes[0].id, "1");
  assert.deepEqual(dupes[0].files.sort(), ["010-one.yaml", "020-one-again.yaml"]);
  await rm(dir, { recursive: true, force: true });
});

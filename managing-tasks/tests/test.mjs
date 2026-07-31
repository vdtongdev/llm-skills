// Node built-in test runner: node --test tests/test.mjs
// Covers the invariants from PRD Test Plan; single file by design — split later
// if it grows past ~500 lines.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";

import { main } from "../lib/cli.mjs";
import { validateTaskFile, ValidationError } from "../lib/schema.mjs";
import { atomicWrite, withLock } from "../lib/storage.mjs";
import { seed } from "./helpers.mjs";

async function scratch() {
  return mkdtemp(join(tmpdir(), "mt-test-"));
}

async function runCLI(cwd, ...argv) {
  const chunks = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (s) => chunks.push(String(s));
  console.error = (s) => chunks.push(`ERR: ${s}`);
  try {
    const code = await main(argv, { cwd });
    return { code, out: chunks.join("\n") };
  } catch (err) {
    chunks.push(err?.message || String(err));
    return { code: err.exitCode ?? 1, out: chunks.join("\n"), err };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

test("schema: valid v1 task parses", () => {
  validateTaskFile({ schema: 1, uid: "U", id: "1", title: "t", status: "pending" });
});

test("schema: missing required field exit 3", () => {
  assert.throws(() => validateTaskFile({ schema: 1, id: "1", title: "t", status: "pending" }), /uid required/);
});

test("schema: unknown status rejected", () => {
  assert.throws(() => validateTaskFile({ schema: 1, uid: "U", id: "1", title: "t", status: "weird" }), /unknown status/);
});

test("schema: float subtask id rejected", () => {
  assert.throws(() => validateTaskFile({
    schema: 1, uid: "U", id: "1", title: "t", status: "pending",
    subtasks: [{ id: 1.1, status: "pending", title: "x" }],
  }), /subtasks\[\].id must be string/);
});

test("schema: optional kind must be string", () => {
  validateTaskFile({ schema: 1, uid: "U", id: "1", title: "t", status: "pending", kind: "coding" });
  assert.throws(
    () => validateTaskFile({ schema: 1, uid: "U", id: "1", title: "t", status: "pending", kind: 3 }),
    /kind must be string/,
  );
});

test("storage: atomic write produces final file, no tmp leftover", async () => {
  const dir = await scratch();
  try {
    const target = join(dir, "x.yaml");
    await atomicWrite(target, "hello: 1\n");
    assert.equal(await readFile(target, "utf8"), "hello: 1\n");
    const { readdir } = await import("node:fs/promises");
    const leftover = (await readdir(dir)).filter((n) => n.startsWith(".") && n.endsWith(".tmp"));
    assert.equal(leftover.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("storage: concurrent lock serialized (second acquires after first releases)", async () => {
  const dir = await scratch();
  try {
    // ensure tasks dir so lock file can live there
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, ".tasks/.cache"), { recursive: true });
    const order = [];
    const a = withLock(dir, {}, async () => {
      order.push("a-start");
      await new Promise((r) => setTimeout(r, 100));
      order.push("a-end");
    });
    const b = withLock(dir, {}, async () => {
      order.push("b-start");
      order.push("b-end");
    });
    await Promise.all([a, b]);
    assert.deepEqual(order, ["a-start", "a-end", "b-start", "b-end"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: init idempotent; gitignore entry added once", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await runCLI(dir, "init");
    const gi = await readFile(join(dir, ".gitignore"), "utf8");
    const lines = gi.split("\n").filter((l) => l.trim() === ".tasks/.cache/");
    assert.equal(lines.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: list + show happy path", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [
      { title: "first", goal: "do it", files: [{ path: "x.ts", kind: "create" }] },
      { title: "second", depends_on: ["1"] },
    ]);

    const list = await runCLI(dir, "list", "--compact");
    assert.match(list.out, /\[1\] PENDING {2}first/);
    assert.match(list.out, /\[2\] PENDING {2}second \(deps: 1\)/);

    const show = await runCLI(dir, "show", "1");
    assert.match(show.out, /uid:/);
    assert.match(show.out, /first/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: kind round-trips through new, show, edit, and a written file", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");

    // new --kind persists and shows
    await runCLI(dir, "new", "coded task", "--kind", "coding");
    let show = await runCLI(dir, "show", "1");
    assert.match(show.out, /kind: coding/);

    // edit --kind changes it
    const e = await runCLI(dir, "edit", "1", "--kind", "docs");
    assert.equal(e.code, 0);
    show = await runCLI(dir, "show", "1");
    assert.match(show.out, /kind: docs/);

    // a directly-written kind reads back through show
    await seed(dir, [{ id: "2", prefix: 20, title: "written", kind: "testing" }]);
    show = await runCLI(dir, "show", "2");
    assert.match(show.out, /kind: testing/);

    // surfaced in next and compact list
    const next = await runCLI(dir, "next");
    assert.match(next.out, /kind:/);
    const list = await runCLI(dir, "list", "--compact");
    assert.match(list.out, /kind:docs/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: task without kind omits it from show output", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await runCLI(dir, "new", "plain task");
    const show = await runCLI(dir, "show", "1");
    assert.doesNotMatch(show.out, /kind:/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: set-status done refused when subtasks open", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{
      title: "t",
      subtasks: [{ id: "1.1", status: "pending", title: "open" }],
    }]);
    const r = await runCLI(dir, "set-status", "1", "done");
    assert.equal(r.code, 4);
    assert.match(r.out, /open subtasks/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: set-status done refused when dep not done", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1" }, { title: "t2", depends_on: ["1"] }]);
    const r = await runCLI(dir, "set-status", "2", "done");
    assert.equal(r.code, 4);
    assert.match(r.out, /dep 1 not done/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: add-dep cycle rejected", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1" }, { title: "t2", depends_on: ["1"] }]);
    const r = await runCLI(dir, "add-dep", "1", "2");
    assert.equal(r.code, 4);
    assert.match(r.out, /cycle/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: cancel with active dependents refused without --force", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1" }, { title: "t2", depends_on: ["1"] }]);
    const r = await runCLI(dir, "cancel", "1");
    assert.equal(r.code, 4);
    assert.match(r.out, /active dependents/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: list --ready surfaces only deps-satisfied pendings", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1" }, { title: "t2", depends_on: ["1"] }]);
    const r = await runCLI(dir, "list", "--ready", "--compact");
    assert.match(r.out, /\[1\]/);
    assert.doesNotMatch(r.out, /\[2\]/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: list tolerates one malformed task file", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "good" }]);
    await writeFile(join(dir, ".tasks/020-broken.yaml"), "::: not yaml :::");
    const r = await runCLI(dir, "list");
    assert.equal(r.code, 0);
    assert.match(r.out, /INVALID/);
    assert.match(r.out, /good/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: rm-dep removes correct uid when dep is not last", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [
      { title: "t1" },
      { title: "t2" },
      { title: "t3", depends_on: ["1", "2"] },
    ]);
    // Remove the middle dep (task 1, "a") from task 3
    const r = await runCLI(dir, "rm-dep", "3", "1");
    assert.equal(r.code, 0);
    const { YAML: YAMLLib } = await import("yaml");
    const { readFile: rf } = await import("node:fs/promises");
    const { readdir } = await import("node:fs/promises");
    const files = (await readdir(join(dir, ".tasks"))).filter((f) => f.endsWith(".yaml") && !f.startsWith("."));
    const taskFiles = await Promise.all(files.map((f) => rf(join(dir, ".tasks", f), "utf8")));
    const task3 = taskFiles.map((c) => YAML.parse(c)).find((t) => t.id === "3");
    // depends_on should only contain task 2
    assert.deepEqual(task3.depends_on, ["2"]);
    // depends_on_uids should have exactly 1 entry (uid for task 2, not task 1)
    assert.equal((task3.depends_on_uids || []).length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: grep matches on title and goal", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [
      { title: "implement auth", goal: "oauth2 flow" },
      { title: "write tests", goal: "coverage" },
    ]);
    const r = await runCLI(dir, "grep", "oauth");
    assert.equal(r.code, 0);
    assert.match(r.out, /implement auth/);
    assert.doesNotMatch(r.out, /write tests/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: why shows goal and sources", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1", goal: "do the thing", sources: [{ kind: "prd", ref: "spec.md#s1" }] }]);
    const r = await runCLI(dir, "why", "1");
    assert.equal(r.code, 0);
    assert.match(r.out, /do the thing/);
    assert.match(r.out, /prd: spec\.md#s1/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: add-source accepts multiple --source flags", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1" }]);
    const r = await runCLI(dir, "add-source", "1", "--source", "kind=prd,ref=a.md", "--source", "kind=issue,ref=gh#1");
    assert.equal(r.code, 0);
    const show = await runCLI(dir, "show", "1");
    assert.match(show.out, /prd/);
    assert.match(show.out, /issue/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: reopen archived task moves file back and sets pending", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1" }]);
    await runCLI(dir, "set-status", "1", "done");
    await runCLI(dir, "archive", "--id", "1");
    const r = await runCLI(dir, "reopen", "1");
    assert.equal(r.code, 0);
    const show = await runCLI(dir, "show", "1");
    assert.match(show.out, /status: pending/);
    // file must be back in .tasks/, not in .tasks/archived/
    assert.ok(!existsSync(join(dir, ".tasks/archived/010-t1.yaml")));
    assert.ok(existsSync(join(dir, ".tasks/010-t1.yaml")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("schema: schema version too new exits 6", () => {
  assert.throws(
    () => validateTaskFile({ schema: 99, uid: "U", id: "1", title: "t", status: "pending" }),
    (err) => err.exitCode === 6,
  );
});

test("cli: archive refuses if referenced by active", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1" }, { title: "t2", depends_on: ["1"] }]);
    await runCLI(dir, "set-status", "1", "done");
    const r = await runCLI(dir, "archive", "--id", "1");
    assert.equal(r.code, 4);
    assert.match(r.out, /referenced by active/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Node built-in test runner: node --test tests/
// Covers the context[] field (schema, CLI, import round-trip). Split from test.mjs,
// which the header caps at ~500 lines.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";

import { main } from "../lib/cli.mjs";
import { validateTaskFile } from "../lib/schema.mjs";
import { seed } from "./helpers.mjs";

async function scratch() {
  return mkdtemp(join(tmpdir(), "mt-context-"));
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

const TASK = { schema: 1, uid: "U", id: "1", title: "t", status: "pending" };

// ---------------------------------------------------------------- schema: context[]

test("schema: valid context[] validates", () => {
  validateTaskFile({
    ...TASK,
    context: [
      { kind: "file", ref: "backend/services/common.py", why: "the write seam" },
      { kind: "skill", ref: "testing-code" },
    ],
  });
});

test("schema: context absent is fine (field is optional)", () => {
  validateTaskFile({ ...TASK });
});

test("schema: context not an array rejected", () => {
  assert.throws(() => validateTaskFile({ ...TASK, context: { kind: "file", ref: "a" } }), /context must be array/);
});

test("schema: context entry missing kind or ref rejected", () => {
  assert.throws(() => validateTaskFile({ ...TASK, context: [{ ref: "a" }] }), /context\[\].kind required/);
  assert.throws(() => validateTaskFile({ ...TASK, context: [{ kind: "file" }] }), /context\[\].ref required/);
});

test("schema: context entry why must be string", () => {
  assert.throws(() => validateTaskFile({ ...TASK, context: [{ kind: "file", ref: "a", why: 3 }] }), /why must be string/);
});

test("schema: context entry not a mapping rejected", () => {
  assert.throws(() => validateTaskFile({ ...TASK, context: ["backend/x.py"] }), /entry not a mapping/);
});

test("schema: unrecognised context kind is accepted (new kinds stay additive)", () => {
  validateTaskFile({ ...TASK, context: [{ kind: "files", ref: "a" }] });
});

// The additive claim in the PRD's Key Assumptions rests on the validator never enumerating
// the key set, and on the mutation round-trip preserving whatever it does not know about.
// Post-change there is no old validator to run, so these assert the property itself.

test("compat: validator ignores unknown top-level keys", () => {
  validateTaskFile({ ...TASK, some_future_field: [{ a: 1 }] });
});

test("compat: mutation round-trip preserves unknown top-level keys", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await runCLI(dir, "new", "t1");
    const files = (await readdir(join(dir, ".tasks"))).filter((f) => f.endsWith(".yaml"));
    const path = join(dir, ".tasks", files[0]);
    const parsed = YAML.parse(await readFile(path, "utf8"));
    parsed.some_future_field = [{ a: 1 }];
    await writeFile(path, YAML.stringify(parsed));

    const r = await runCLI(dir, "set-status", "1", "in-progress");
    assert.equal(r.code, 0);
    const after = YAML.parse(await readFile(path, "utf8"));
    assert.deepEqual(after.some_future_field, [{ a: 1 }]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Was "compat: import drops unknown top-level keys". That gap belonged to import's
// task-rebuilding step; a directly-written file keeps whatever the writer put in it.
// What still matters is that an unknown key does not make the file unreadable.
test("compat: an unknown top-level key does not invalidate a task file", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1", some_future_field: [{ a: 1 }] }]);
    const r = await runCLI(dir, "show", "1");
    assert.equal(r.code, 0);
    assert.match(r.out, /t1/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Was "schema: batch with a bad context entry writes zero files" - import's atomic
// rollback. Direct writes are not atomic, so the property that replaces it is that
// `task verify` reports the bad file rather than the repo silently accepting it.
test("schema: verify reports a task whose context entry is missing ref", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "ok" }, { title: "bad", context: [{ kind: "file" }] }]);
    const r = await runCLI(dir, "verify");
    assert.equal(r.code, 4);
    const problems = YAML.parse(r.out).problems;
    assert.equal(problems.length, 1);
    assert.equal(problems[0].kind, "invalid");
    assert.match(problems[0].detail, /context\[\]\.ref/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- CLI: context[]

test("cli: add-context appends, rm-context removes by positional ref", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await runCLI(dir, "new", "t1");
    let r = await runCLI(dir, "add-context", "1", "--kind", "file", "--ref", "a/b.py", "--why", "the seam");
    assert.equal(r.code, 0);
    r = await runCLI(dir, "add-context", "1", "--kind", "skill", "--ref", "testing-code");
    assert.equal(r.code, 0);

    let show = await runCLI(dir, "show", "1");
    assert.match(show.out, /ref: a\/b\.py/);
    assert.match(show.out, /why: the seam/);
    assert.match(show.out, /ref: testing-code/);

    r = await runCLI(dir, "rm-context", "1", "a/b.py");
    assert.equal(r.code, 0);
    show = await runCLI(dir, "show", "1");
    assert.doesNotMatch(show.out, /a\/b\.py/);
    assert.match(show.out, /testing-code/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: rm-context on an absent ref is exit 2", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await runCLI(dir, "new", "t1");
    const r = await runCLI(dir, "rm-context", "1", "nope.py");
    assert.equal(r.code, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: task new --context, repeated, and show omits the block when absent", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    const r = await runCLI(dir, "new", "t1",
      "--context", "kind=file,ref=a/b.py,why=x",
      "--context", "kind=skill,ref=testing-code");
    assert.equal(r.code, 0);
    const show = await runCLI(dir, "show", "1");
    assert.match(show.out, /context:/);
    assert.match(show.out, /a\/b\.py/);
    assert.match(show.out, /testing-code/);

    await runCLI(dir, "new", "t2");
    const bare = await runCLI(dir, "show", "2");
    assert.doesNotMatch(bare.out, /context:/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("cli: context[] written to disk survives to show", async () => {
  const dir = await scratch();
  try {
    await runCLI(dir, "init");
    await seed(dir, [{ title: "t1", context: [{ kind: "file", ref: "a/b.py", why: "seam" }] }]);
    const show = await runCLI(dir, "show", "1");
    assert.match(show.out, /a\/b\.py/);
    assert.match(show.out, /why: seam/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

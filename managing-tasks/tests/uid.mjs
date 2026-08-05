// Node built-in test runner: node --test tests/
// Covers `task get-new-uid`, the verb a batch-writing agent calls to obtain real
// ULIDs when it writes task files directly instead of going through `task import`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";

import { main } from "../lib/cli.mjs";

async function scratch() {
  return mkdtemp(join(tmpdir(), "mt-uid-"));
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

// Crockford base32, 26 chars: the format `create.mjs` already writes via ulid().
// Asserted because the timestamp prefix is load-bearing for the manual merge
// procedure in references/file-format.md ("keep the earlier-created one's id").
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

test("get-new-uid: returns a single ULID by default", async () => {
  const dir = await scratch();
  await runCLI(dir, "init");

  const { code, out } = await runCLI(dir, "get-new-uid");

  assert.equal(code, 0);
  const res = YAML.parse(out);
  assert.equal(res.contract_version, 1);
  assert.equal(res.uids.length, 1);
  assert.match(res.uids[0], ULID_RE);
  await rm(dir, { recursive: true, force: true });
});

test("get-new-uid: --count returns that many distinct ULIDs", async () => {
  const dir = await scratch();
  await runCLI(dir, "init");

  const { code, out } = await runCLI(dir, "get-new-uid", "--count", "3");

  assert.equal(code, 0);
  const res = YAML.parse(out);
  assert.equal(res.uids.length, 3);
  assert.equal(new Set(res.uids).size, 3);
  for (const uid of res.uids) assert.match(uid, ULID_RE);
  await rm(dir, { recursive: true, force: true });
});

test("get-new-uid: sorts ascending so ids allocated in one call keep batch order", async () => {
  const dir = await scratch();
  await runCLI(dir, "init");

  const { out } = await runCLI(dir, "get-new-uid", "--count", "5");

  const { uids } = YAML.parse(out);
  assert.deepEqual(uids, [...uids].sort());
  await rm(dir, { recursive: true, force: true });
});

test("get-new-uid: --count 0 is bad input", async () => {
  const dir = await scratch();
  await runCLI(dir, "init");

  const { code, out } = await runCLI(dir, "get-new-uid", "--count", "0");

  assert.equal(code, 3);
  assert.doesNotMatch(out, /unknown command/);
  await rm(dir, { recursive: true, force: true });
});

test("get-new-uid: non-numeric --count is bad input", async () => {
  const dir = await scratch();
  await runCLI(dir, "init");

  const { code, out } = await runCLI(dir, "get-new-uid", "--count", "abc");

  assert.equal(code, 3);
  assert.doesNotMatch(out, /unknown command/);
  await rm(dir, { recursive: true, force: true });
});

test("get-new-uid: fractional --count is bad input", async () => {
  const dir = await scratch();
  await runCLI(dir, "init");

  const { code, out } = await runCLI(dir, "get-new-uid", "--count", "2.5");

  assert.equal(code, 3);
  assert.doesNotMatch(out, /unknown command/);
  await rm(dir, { recursive: true, force: true });
});

test("get-new-uid: works without an initialised .tasks/ - it reads no state", async () => {
  const dir = await scratch();

  const { code, out } = await runCLI(dir, "get-new-uid");

  assert.equal(code, 0);
  assert.match(YAML.parse(out).uids[0], ULID_RE);
  await rm(dir, { recursive: true, force: true });
});

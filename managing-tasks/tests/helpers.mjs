// Shared test helpers.
//
// `seed()` writes task YAML into .tasks/ directly. It exists because `task import`
// was the suite's fixture builder, and import is being removed - a fixture builder
// must not depend on the code path under deletion.

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";

import { main } from "../lib/cli.mjs";

/** Fresh temp dir. Caller removes it. */
export async function scratch(tag = "mt") {
  return mkdtemp(join(tmpdir(), `${tag}-`));
}

/**
 * Run the CLI in-process, capturing stdout+stderr into one string.
 * @returns {Promise<{code: number, out: string}>}
 */
export async function runCLI(cwd, ...argv) {
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

/**
 * Write task files straight into .tasks/, bypassing the CLI.
 *
 * Each spec is merged over a minimal valid task, so a fixture states only what it
 * cares about. `depends_on_uids` is filled in from the other specs in the same call
 * when omitted, which is what the CLI would have written.
 *
 * Deliberately does NO validation: fixtures for `task verify` need to write files
 * that are invalid on purpose.
 *
 * @param {string} cwd
 * @param {Array<object>} specs - partial tasks; `id` and `title` are the useful ones
 * @returns {Promise<Array<object>>} the full task objects written
 */
export async function seed(cwd, specs) {
  await mkdir(join(cwd, ".tasks"), { recursive: true });

  const uidOf = new Map(specs.map((s, i) => [String(s.id ?? i + 1), s.uid ?? fakeUid(i)]));
  const written = [];

  for (const [i, spec] of specs.entries()) {
    const id = String(spec.id ?? i + 1);
    const depends_on = (spec.depends_on ?? []).map(String);
    const task = {
      schema: 1,
      uid: uidOf.get(id),
      id,
      title: spec.title ?? `task ${id}`,
      status: spec.status ?? "pending",
      depends_on,
      depends_on_uids: spec.depends_on_uids ?? depends_on.map((d) => uidOf.get(d)).filter(Boolean),
      ...spec,
    };
    task.id = id;
    task.depends_on = depends_on;

    const prefix = String(spec.prefix ?? (i + 1) * 10).padStart(3, "0");
    const slug = (task.title || "task").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const name = spec.file ?? `${prefix}-${slug}.yaml`;
    delete task.prefix;
    delete task.file;

    await writeFile(join(cwd, ".tasks", name), YAML.stringify(task));
    written.push({ ...task, file: name });
  }
  return written;
}

/** Write a file into .tasks/ verbatim - for fixtures that must be malformed. */
export async function seedRaw(cwd, name, content) {
  await mkdir(join(cwd, ".tasks"), { recursive: true });
  await writeFile(join(cwd, ".tasks", name), content);
}

/** Deterministic 26-char ULID-shaped uid. Format only; nothing parses these. */
function fakeUid(i) {
  return `01J${String(i).padStart(23, "0")}`;
}

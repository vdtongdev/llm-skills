// Lifecycle commands: archive, reindex, renumber, migrate.

import { mkdir, rename, readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { atomicWrite, withLock, MAINTENANCE_TIMEOUT_MS } from "../storage.mjs";
import { scanTasks, writeCache, rebuildCache, taskFilePath, TASKS_DIR, ARCHIVE_DIR } from "../cache.mjs";
import { ValidationError, TERMINAL, SCHEMA_VERSION } from "../schema.mjs";

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

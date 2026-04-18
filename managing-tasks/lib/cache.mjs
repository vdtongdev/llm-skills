// Cache layer: scans task files, maintains .tasks/.cache/index.yaml projection.

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { atomicWrite } from "./storage.mjs";
import { validateTaskFile, SCHEMA_VERSION } from "./schema.mjs";

export const TASKS_DIR = ".tasks";
export const ARCHIVE_DIR = ".tasks/archive";
export const CACHE_FILE = ".tasks/.cache/index.yaml";

/**
 * Read all .yaml task files from .tasks/ (and optionally .tasks/archive/).
 * Returns an array sorted by filename prefix; invalid files are included with status "invalid".
 */
export async function scanTasks(cwd, { includeArchived = false } = {}) {
  const dirs = [join(cwd, TASKS_DIR)];
  if (includeArchived && existsSync(join(cwd, ARCHIVE_DIR))) dirs.push(join(cwd, ARCHIVE_DIR));

  const out = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const entries = await readdir(dir);
    const archived = dir.endsWith("archive");
    for (const name of entries) {
      if (!name.endsWith(".yaml") || name.startsWith(".")) continue;
      if (!archived && name === "archive") continue;
      const m = name.match(/^(\d+)-(.+)\.yaml$/);
      const prefix = m ? parseInt(m[1], 10) : null;
      const path = join(dir, name);
      try {
        const raw = await readFile(path, "utf8");
        const parsed = YAML.parse(raw);
        validateTaskFile(parsed, { filename: name });
        const s = await stat(path);
        out.push({
          id: parsed.id,
          uid: parsed.uid,
          title: parsed.title,
          status: parsed.status,
          depends_on: parsed.depends_on || [],
          depends_on_uids: parsed.depends_on_uids || [],
          goal: parsed.goal,
          files: parsed.files,
          tests: parsed.tests,
          notes: parsed.notes,
          subtasks: parsed.subtasks,
          sources: parsed.sources,
          prefix,
          file: name,
          archived,
          mtime: s.mtimeMs,
          _raw: parsed,
        });
      } catch (err) {
        if (err.exitCode === 6) throw err; // schema-too-new: propagate, don't degrade to "invalid"
        out.push({
          id: "?",
          title: name,
          status: "invalid",
          error: err.message,
          prefix,
          file: name,
          archived,
        });
      }
    }
  }
  out.sort((a, b) => (a.prefix ?? 0) - (b.prefix ?? 0));
  return out;
}

/** Write a slim projection of tasks to .tasks/.cache/index.yaml. */
export async function writeCache(cwd, tasks) {
  const cache = {
    schema: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    tasks: tasks.map((t) => ({
      id: t.id,
      uid: t.uid,
      file: t.file,
      title: t.title,
      status: t.status,
      depends_on: t.depends_on || [],
      prefix: t.prefix,
      archived: !!t.archived,
      has_subtasks: !!(t.subtasks && t.subtasks.length),
      source_count: (t.sources || []).length,
      mtime: t.mtime ? Math.floor(t.mtime / 1000) : null,
    })),
  };
  await atomicWrite(join(cwd, CACHE_FILE), YAML.stringify(cache));
  return cache;
}

/** Full cache rebuild: scan all tasks (including archive) then write cache. */
export async function rebuildCache(cwd) {
  const tasks = await scanTasks(cwd, { includeArchived: true });
  await writeCache(cwd, tasks);
  return tasks;
}

/** Find a task by exact numeric string id; returns undefined if not found. */
export function findTaskById(tasks, id) {
  return tasks.find((t) => t.id === String(id));
}

/**
 * Find by task id or subtask id (e.g. "3.1").
 * For subtask ids returns { ...subtask, _parent, _isSubtask: true }.
 */
export function findTaskByAnyId(tasks, id) {
  const s = String(id);
  if (s.includes(".")) {
    const [parentId, subId] = s.split(".");
    const parent = tasks.find((t) => t.id === parentId);
    if (!parent) return null;
    const sub = parent.subtasks?.find((x) => x.id === s);
    return sub ? { ...sub, _parent: parent, _isSubtask: true } : null;
  }
  return tasks.find((t) => t.id === s);
}

/** Resolve the filesystem path for a task, routing to archive dir when task.archived is true. */
export function taskFilePath(cwd, task) {
  const dir = task.archived ? ARCHIVE_DIR : TASKS_DIR;
  return join(cwd, dir, task.file);
}

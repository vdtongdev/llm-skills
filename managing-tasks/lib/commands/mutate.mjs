// Mutation commands: set-status, edit, add/rm (file, dep, subtask, note, test, source), move, rm, cancel, reopen.

import { readFile, rename, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { atomicWrite, withLock } from "../storage.mjs";
import { scanTasks, writeCache, taskFilePath, TASKS_DIR } from "../cache.mjs";
import { validateTaskFile, ValidationError, STATUSES, TERMINAL } from "../schema.mjs";
import { parseSourceString } from "./create.mjs";

/** Load all tasks including archive. */
async function loadAll(cwd) {
  return scanTasks(cwd, { includeArchived: true });
}

/** Validate and write a task object to disk; strips internal _-prefixed fields before serializing. */
async function save(cwd, task, filePath) {
  validateTaskFile(task, { filename: filePath });
  const clean = Object.fromEntries(Object.entries(task).filter(([k]) => !k.startsWith("_")));
  await atomicWrite(filePath, YAML.stringify(clean));
}

/** Rebuild the cache and return the updated task list. */
async function refreshCache(cwd) {
  const all = await scanTasks(cwd, { includeArchived: true });
  await writeCache(cwd, all);
  return all;
}

/** Find task by id; throws ValidationError exit 2 if not found. */
function assertFound(all, id) {
  const t = all.find((x) => x.id === String(id));
  if (!t) throw new ValidationError(`task ${id} not found`, 2);
  return t;
}

/** Extract the raw stored object from a scanned task (strips cache projection fields added by scanTasks). */
function raw(t) {
  return { ...t._raw };
}

/**
 * Transition a task to a new status.
 * Blocks "done" if open subtasks or non-terminal deps exist (override with --force).
 */
export async function cmdSetStatus(cwd, args) {
  const [id, status] = args._;
  if (!id || !status) throw new ValidationError("task set-status <id> <status>");
  if (!STATUSES.has(status)) throw new ValidationError(`unknown status ${status}`);
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    if (t.archived) throw new ValidationError(`task ${id} is archived; reopen it first`, 4);
    if (status === "done" && !args.force) {
      if (t.subtasks?.some((s) => !TERMINAL.has(s.status))) {
        throw new ValidationError(`task ${id} has open subtasks (use --force)`, 4);
      }
      for (const d of t.depends_on || []) {
        const dep = all.find((x) => x.id === d);
        if (dep && !TERMINAL.has(dep.status)) {
          throw new ValidationError(`dep ${d} not done (use --force)`, 4);
        }
      }
    }
    const data = raw(t);
    data.status = status;
    await save(cwd, data, taskFilePath(cwd, t));
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id, status };
  });
}

/** Update title, goal, or kind of a task. */
export async function cmdEdit(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task edit <id>");
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    if (t.archived) throw new ValidationError(`task ${id} is archived; reopen it first`, 4);
    const data = raw(t);
    if (args.title) data.title = args.title;
    if (args.goal) data.goal = args.goal;
    if (args.kind) data.kind = args.kind;
    await save(cwd, data, taskFilePath(cwd, t));
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id };
  });
}

/** Append a file entry (path:kind) to the task's files list. */
export async function cmdAddFile(cwd, args) {
  const [id, spec] = args._;
  if (!id || !spec) throw new ValidationError("task add-file <id> <path:kind>");
  const [path, kind] = spec.split(":");
  return mutate(cwd, id, (data) => {
    data.files = data.files || [];
    data.files.push({ path, kind: kind || "modify" });
  });
}

/** Remove a file entry by path. */
export async function cmdRmFile(cwd, args) {
  const [id, path] = args._;
  if (!id || !path) throw new ValidationError("task rm-file <id> <path>");
  return mutate(cwd, id, (data) => {
    data.files = (data.files || []).filter((f) => f.path !== path);
  });
}

/** Append a change description string to an existing file entry on the task. */
export async function cmdAddChange(cwd, args) {
  const [id, path, ...rest] = args._;
  const change = rest.join(" ");
  if (!id || !path || !change) throw new ValidationError("task add-change <id> <path> <change>");
  return mutate(cwd, id, (data) => {
    const f = (data.files || []).find((x) => x.path === path);
    if (!f) throw new ValidationError(`file ${path} not on task ${id}`, 2);
    f.changes = f.changes || [];
    f.changes.push(change);
  });
}

/**
 * Add a dependency edge; validates no cycle, dep is non-cancelled, and task isn't already done.
 * Also records the dep's uid in depends_on_uids for stable cross-rename references.
 */
export async function cmdAddDep(cwd, args) {
  const [id, depId] = args._;
  if (!id || !depId) throw new ValidationError("task add-dep <id> <dep>");
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    if (t.archived) throw new ValidationError(`task ${id} is archived; reopen it first`, 4);
    const dep = assertFound(all, depId);
    if (dep.status === "cancelled") throw new ValidationError(`dep ${depId} is cancelled`, 4);
    if (dep.archived) throw new ValidationError(`dep ${depId} is archived`, 4);
    if (id === depId) throw new ValidationError("self-dep", 4);
    if ((t.depends_on || []).includes(depId)) throw new ValidationError(`dep ${depId} already on task ${id}`, 4);
    // cycle check
    const graph = new Map(all.map((x) => [x.id, new Set(x.depends_on || [])]));
    graph.get(id).add(depId);
    if (hasCycle(graph, id)) throw new ValidationError("would introduce cycle", 4);
    // retroactive done invalidation
    if (t.status === "done" && !TERMINAL.has(dep.status)) {
      throw new ValidationError(`task ${id} is done; adding non-terminal dep invalidates it (reopen first)`, 4);
    }
    const data = raw(t);
    data.depends_on = [...(data.depends_on || []), depId];
    data.depends_on_uids = [...(data.depends_on_uids || []), dep.uid].filter(Boolean);
    await save(cwd, data, taskFilePath(cwd, t));
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id, added: depId };
  });
}

/** Remove a dependency edge; removes all matching uid entries by position to keep arrays aligned. */
export async function cmdRmDep(cwd, args) {
  const [id, depId] = args._;
  if (!id || !depId) throw new ValidationError("task rm-dep <id> <dep>");
  return mutate(cwd, id, (data) => {
    const depsArr = data.depends_on || [];
    const removedIndices = new Set(depsArr.reduce((acc, d, i) => { if (d === depId) acc.push(i); return acc; }, []));
    data.depends_on = depsArr.filter((d) => d !== depId);
    if (removedIndices.size && data.depends_on_uids) {
      data.depends_on_uids = data.depends_on_uids.filter((_, i) => !removedIndices.has(i));
    }
  });
}

/** Append a subtask with id "N.M", title, and optional kind. */
export async function cmdAddSubtask(cwd, args) {
  const [id, subId, ...titleParts] = args._;
  const title = titleParts.join(" ");
  if (!id || !subId || !title) throw new ValidationError("task add-subtask <id> <sub-id> <title> [--kind <k>]");
  const fullId = `${id}.${subId}`;
  return mutate(cwd, id, (data) => {
    data.subtasks = data.subtasks || [];
    if (data.subtasks.some((s) => s.id === fullId)) throw new ValidationError(`subtask ${fullId} already exists`, 4);
    const s = { id: fullId, status: "pending", title };
    if (args.kind) s.kind = args.kind;
    data.subtasks.push(s);
  });
}

/** Update status or title of an existing subtask. */
export async function cmdEditSubtask(cwd, args) {
  const [id, subId] = args._;
  if (!id || !subId) throw new ValidationError("task edit-subtask <id> <sub-id> [--status ...] [--title ...]");
  const fullId = subId.includes(".") ? subId : `${id}.${subId}`;
  return mutate(cwd, id, (data) => {
    const s = (data.subtasks || []).find((x) => x.id === fullId);
    if (!s) throw new ValidationError(`subtask ${fullId} not found`, 2);
    if (args.status) {
      if (!STATUSES.has(args.status)) throw new ValidationError(`unknown status ${args.status}`);
      s.status = args.status;
    }
    if (args.title) s.title = args.title;
  });
}

/** Append a free-text note to the task. */
export async function cmdAddNote(cwd, args) {
  const [id, ...rest] = args._;
  const note = rest.join(" ");
  if (!id || !note) throw new ValidationError("task add-note <id> <text>");
  return mutate(cwd, id, (data) => {
    data.notes = [...(data.notes || []), note];
  });
}

/** Append a test description string to the task. */
export async function cmdAddTest(cwd, args) {
  const [id, ...rest] = args._;
  const test = rest.join(" ");
  if (!id || !test) throw new ValidationError("task add-test <id> <text>");
  return mutate(cwd, id, (data) => {
    data.tests = [...(data.tests || []), test];
  });
}

/** Append a source entry (parsed from --source 'kind=..,ref=..'). Supports multiple --source flags. */
export async function cmdAddSource(cwd, args) {
  const [id] = args._;
  if (!id || !args.source) throw new ValidationError("task add-source <id> --source 'kind=..,ref=..'");
  const srcs = [].concat(args.source).filter(Boolean).map(parseSourceString);
  return mutate(cwd, id, (data) => {
    data.sources = [...(data.sources || []), ...srcs];
  });
}

/** Remove a source entry by ref. */
export async function cmdRmSource(cwd, args) {
  const [id, ref] = args._;
  if (!id || !ref) throw new ValidationError("task rm-source <id> <ref>");
  return mutate(cwd, id, (data) => {
    data.sources = (data.sources || []).filter((s) => s.ref !== ref);
  });
}

/** Append a context entry: what to read or activate before working this task, beyond the kind default. */
export async function cmdAddContext(cwd, args) {
  const [id] = args._;
  if (!id || !args.kind || !args.ref) {
    throw new ValidationError("task add-context <id> --kind <k> --ref <r> [--why <w>]");
  }
  const entry = { kind: String(args.kind), ref: String(args.ref) };
  if (args.why != null && args.why !== true) entry.why = String(args.why);
  return mutate(cwd, id, (data) => {
    data.context = [...(data.context || []), entry];
  });
}

/** Remove a context entry by ref. Positional, mirroring rm-source. Absent ref is exit 2. */
export async function cmdRmContext(cwd, args) {
  const [id, ref] = args._;
  if (!id || !ref) throw new ValidationError("task rm-context <id> <ref>");
  return mutate(cwd, id, (data) => {
    const before = (data.context || []).length;
    data.context = (data.context || []).filter((c) => c.ref !== ref);
    if (data.context.length === before) throw new ValidationError(`context ref ${ref} not found on task ${id}`, 2);
    if (!data.context.length) delete data.context;
  });
}

/**
 * Reorder a task by inserting it directly after another task (--after <id>).
 * Fails if there's no prefix gap between the anchor and its next task; run 'task renumber' first.
 */
export async function cmdMove(cwd, args) {
  const id = args._[0];
  const after = args.after;
  if (!id || !after) throw new ValidationError("task move <id> --after <other>");
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    const anchor = assertFound(all, after);
    const sorted = [...all].filter((x) => !x.archived).sort((a, b) => (a.prefix ?? 0) - (b.prefix ?? 0));
    const idx = sorted.findIndex((x) => x.id === anchor.id);
    const nextPrefix = sorted[idx + 1]?.prefix;
    if (nextPrefix && nextPrefix - anchor.prefix < 2) {
      throw new ValidationError(`no prefix gap between ${anchor.prefix} and ${nextPrefix}; run 'task renumber'`, 4);
    }
    if (t.archived) throw new ValidationError(`task ${id} is archived; reopen it first`, 4);
    if (anchor.archived) throw new ValidationError(`anchor task ${after} is archived`, 4);
    if (anchor.prefix == null) throw new ValidationError(`anchor task ${after} has no numeric prefix; rename manually`, 4);
    const newPrefix = String(anchor.prefix + 1).padStart(3, "0");
    const slug = t.file.replace(/^\d+-/, "").replace(/\.yaml$/, "");
    const newName = `${newPrefix}-${slug}.yaml`;
    const oldPath = taskFilePath(cwd, t);
    const newPath = join(cwd, TASKS_DIR, newName);
    if (newPath !== oldPath && existsSync(newPath)) {
      throw new ValidationError(`${newName} already exists; run 'task renumber' to make space`, 4);
    }
    await rename(oldPath, newPath);
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id, moved_to: newName };
  });
}

/** Permanently delete a task file. Blocked by dependents unless --force. */
export async function cmdRm(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task rm <id> [--force]");
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    const dependents = all.filter((x) => (x.depends_on || []).includes(id));
    if (dependents.length && !args.force) {
      throw new ValidationError(`task ${id} has dependents: ${dependents.map((x) => x.id).join(", ")} (use --force)`, 4);
    }
    await rm(taskFilePath(cwd, t));
    await refreshCache(cwd);
    return { contract_version: 1, removed: t.id };
  });
}

/** Set status to "cancelled". Blocked by active dependents unless --force. */
export async function cmdCancel(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task cancel <id> [--force]");
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    const activeDependents = all.filter((x) => (x.depends_on || []).includes(id) && !TERMINAL.has(x.status));
    if (activeDependents.length && !args.force) {
      throw new ValidationError(`task ${id} has active dependents: ${activeDependents.map((x) => x.id).join(", ")} (use --force)`, 4);
    }
    const data = raw(t);
    data.status = "cancelled";
    await save(cwd, data, taskFilePath(cwd, t));
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id, status: "cancelled" };
  });
}

/**
 * Set status to "pending".
 * Blocks if any dependency is cancelled (override with --force).
 * If the task is archived, moves the file back from .tasks/archived/ to .tasks/.
 */
export async function cmdReopen(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task reopen <id>");
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    if (!args.force) {
      for (const d of t.depends_on || []) {
        const dep = all.find((x) => x.id === d);
        if (dep?.status === "cancelled") throw new ValidationError(`dep ${d} is cancelled; rm-dep it first or use --force`, 4);
      }
    }
    const data = raw(t);
    data.status = "pending";
    if (t.archived) {
      const from = taskFilePath(cwd, t);
      const to = join(cwd, TASKS_DIR, t.file);
      if (existsSync(to)) throw new ValidationError(`${t.file} already exists in .tasks/; rename manually`, 4);
      // write to active dir first (atomic), then remove archive copy — avoids stale-status window
      await save(cwd, data, to);
      await rm(from, { force: true });
    } else {
      await save(cwd, data, taskFilePath(cwd, t));
    }
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id, status: "pending" };
  });
}

/** Acquire lock, load task, run transform(data), save, and refresh cache. */
async function mutate(cwd, id, transform) {
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    if (t.archived) throw new ValidationError(`task ${id} is archived; reopen it first`, 4);
    const data = raw(t);
    transform(data);
    await save(cwd, data, taskFilePath(cwd, t));
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id };
  });
}

/** Iterative DFS cycle check: returns true if start is reachable from itself via graph edges. */
/**
 * True if `start` is reachable from itself in `graph` (Map<id, Set<id>>).
 * Exported for `task verify`, which runs it from every node for a repo-wide check.
 */
export function hasCycle(graph, start) {
  const stack = [start];
  const visited = new Set();
  while (stack.length) {
    const n = stack.pop();
    for (const next of graph.get(n) || []) {
      if (next === start) return true;
      if (!visited.has(next)) {
        visited.add(next);
        stack.push(next);
      }
    }
  }
  return false;
}

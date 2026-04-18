// Mutation commands: set-status, edit, add/rm (file, dep, subtask, note, test, source), move, rm, cancel, reopen.

import { readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import { atomicWrite, withLock } from "../storage.mjs";
import { scanTasks, writeCache, taskFilePath, TASKS_DIR } from "../cache.mjs";
import { validateTaskFile, ValidationError, STATUSES, TERMINAL } from "../schema.mjs";
import { parseSourceString } from "./create.mjs";

async function loadAll(cwd) {
  return scanTasks(cwd, { includeArchived: true });
}

async function save(cwd, task, filePath) {
  validateTaskFile(task, { filename: filePath });
  const clean = Object.fromEntries(Object.entries(task).filter(([k]) => !k.startsWith("_")));
  await atomicWrite(filePath, YAML.stringify(clean));
}

async function refreshCache(cwd) {
  const all = await scanTasks(cwd, { includeArchived: true });
  await writeCache(cwd, all);
  return all;
}

function assertFound(all, id) {
  const t = all.find((x) => x.id === String(id));
  if (!t) throw new ValidationError(`task ${id} not found`, 2);
  return t;
}

function raw(t) {
  return { ...t._raw };
}

export async function cmdSetStatus(cwd, args) {
  const [id, status] = args._;
  if (!id || !status) throw new ValidationError("task set-status <id> <status>");
  if (!STATUSES.has(status)) throw new ValidationError(`unknown status ${status}`);
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
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

export async function cmdEdit(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task edit <id>");
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    const data = raw(t);
    if (args.title) data.title = args.title;
    if (args.goal) data.goal = args.goal;
    await save(cwd, data, taskFilePath(cwd, t));
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id };
  });
}

export async function cmdAddFile(cwd, args) {
  const [id, spec] = args._;
  if (!id || !spec) throw new ValidationError("task add-file <id> <path:kind>");
  const [path, kind] = spec.split(":");
  return mutate(cwd, id, (data) => {
    data.files = data.files || [];
    data.files.push({ path, kind: kind || "modify" });
  });
}

export async function cmdRmFile(cwd, args) {
  const [id, path] = args._;
  if (!id || !path) throw new ValidationError("task rm-file <id> <path>");
  return mutate(cwd, id, (data) => {
    data.files = (data.files || []).filter((f) => f.path !== path);
  });
}

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

export async function cmdAddDep(cwd, args) {
  const [id, depId] = args._;
  if (!id || !depId) throw new ValidationError("task add-dep <id> <dep>");
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    const dep = assertFound(all, depId);
    if (dep.status === "cancelled") throw new ValidationError(`dep ${depId} is cancelled`, 4);
    if (dep.archived) throw new ValidationError(`dep ${depId} is archived`, 4);
    if (id === depId) throw new ValidationError("self-dep", 4);
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

export async function cmdRmDep(cwd, args) {
  const [id, depId] = args._;
  if (!id || !depId) throw new ValidationError("task rm-dep <id> <dep>");
  return mutate(cwd, id, (data) => {
    const idx = (data.depends_on || []).indexOf(depId);
    data.depends_on = (data.depends_on || []).filter((d) => d !== depId);
    if (idx >= 0 && data.depends_on_uids) {
      data.depends_on_uids = [...data.depends_on_uids];
      data.depends_on_uids.splice(idx, 1);
    }
  });
}

export async function cmdAddSubtask(cwd, args) {
  const [id, subId, ...titleParts] = args._;
  const title = titleParts.join(" ");
  if (!id || !subId || !title) throw new ValidationError("task add-subtask <id> <sub-id> <title> [--kind <k>]");
  return mutate(cwd, id, (data) => {
    data.subtasks = data.subtasks || [];
    const s = { id: String(subId), status: "pending", title };
    if (args.kind) s.kind = args.kind;
    data.subtasks.push(s);
  });
}

export async function cmdEditSubtask(cwd, args) {
  const [id, subId] = args._;
  if (!id || !subId) throw new ValidationError("task edit-subtask <id> <sub-id> [--status ...] [--title ...]");
  return mutate(cwd, id, (data) => {
    const s = (data.subtasks || []).find((x) => x.id === subId);
    if (!s) throw new ValidationError(`subtask ${subId} not found`, 2);
    if (args.status) {
      if (!STATUSES.has(args.status)) throw new ValidationError(`unknown status ${args.status}`);
      s.status = args.status;
    }
    if (args.title) s.title = args.title;
  });
}

export async function cmdAddNote(cwd, args) {
  const [id, ...rest] = args._;
  const note = rest.join(" ");
  if (!id || !note) throw new ValidationError("task add-note <id> <text>");
  return mutate(cwd, id, (data) => {
    data.notes = [...(data.notes || []), note];
  });
}

export async function cmdAddTest(cwd, args) {
  const [id, ...rest] = args._;
  const test = rest.join(" ");
  if (!id || !test) throw new ValidationError("task add-test <id> <text>");
  return mutate(cwd, id, (data) => {
    data.tests = [...(data.tests || []), test];
  });
}

export async function cmdAddSource(cwd, args) {
  const [id] = args._;
  if (!id || !args.source) throw new ValidationError("task add-source <id> --source 'kind=..,ref=..'");
  const src = parseSourceString(args.source);
  return mutate(cwd, id, (data) => {
    data.sources = [...(data.sources || []), src];
  });
}

export async function cmdRmSource(cwd, args) {
  const [id, ref] = args._;
  if (!id || !ref) throw new ValidationError("task rm-source <id> <ref>");
  return mutate(cwd, id, (data) => {
    data.sources = (data.sources || []).filter((s) => s.ref !== ref);
  });
}

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
    const newPrefix = String(anchor.prefix + 1).padStart(3, "0");
    const slug = t.file.replace(/^\d+-/, "").replace(/\.yaml$/, "");
    const newName = `${newPrefix}-${slug}.yaml`;
    const oldPath = taskFilePath(cwd, t);
    const newPath = join(cwd, TASKS_DIR, newName);
    await rename(oldPath, newPath);
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id, moved_to: newName };
  });
}

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

export async function cmdReopen(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task reopen <id>");
  return mutate(cwd, id, (data) => {
    data.status = "pending";
  });
}

async function mutate(cwd, id, transform) {
  return withLock(cwd, {}, async () => {
    const all = await loadAll(cwd);
    const t = assertFound(all, id);
    const data = raw(t);
    transform(data);
    await save(cwd, data, taskFilePath(cwd, t));
    await refreshCache(cwd);
    return { contract_version: 1, id: t.id };
  });
}

function hasCycle(graph, start) {
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

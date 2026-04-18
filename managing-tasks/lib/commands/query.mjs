// Query commands: list, show, next, deps, grep, why.

import { withLock } from "../storage.mjs";
import { scanTasks, findTaskByAnyId } from "../cache.mjs";
import { renderList, renderShow } from "../formatters.mjs";
import { ValidationError, TERMINAL } from "../schema.mjs";

export async function cmdList(cwd, args) {
  return withLock(cwd, {}, async () => {
    const all = await scanTasks(cwd, { includeArchived: !!args.archived || !!args.all });
    let tasks = all;
    if (args.status) {
      const statuses = new Set(String(args.status).split(","));
      tasks = tasks.filter((t) => statuses.has(t.status));
    } else if (!args.all && !args.archived) {
      tasks = tasks.filter((t) => !TERMINAL.has(t.status) || t.status === "invalid");
    }
    if (args.touching) {
      tasks = tasks.filter((t) => t.files?.some((f) => f.path.includes(String(args.touching))));
    }
    if (args.ready) {
      const doneOrCancelled = new Set(all.filter((t) => TERMINAL.has(t.status)).map((t) => t.id));
      tasks = tasks.filter((t) => t.status === "pending" && (t.depends_on || []).every((d) => doneOrCancelled.has(d)));
    }
    if (args.blocked) {
      tasks = tasks.filter((t) => t.status === "blocked" || (t.depends_on || []).some((d) => {
        const dep = all.find((x) => x.id === d);
        return dep && !TERMINAL.has(dep.status);
      }));
    }
    return { raw: renderList(tasks, { compact: !!args.compact }) };
  });
}

export async function cmdShow(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task show <id>");
  return withLock(cwd, {}, async () => {
    const all = await scanTasks(cwd, { includeArchived: true });
    const t = findTaskByAnyId(all, id);
    if (!t) throw new ValidationError(`task ${id} not found`, 2);
    return { raw: renderShow(t) };
  });
}

export async function cmdNext(cwd) {
  return withLock(cwd, {}, async () => {
    const all = await scanTasks(cwd, { includeArchived: false });
    const inProgress = all.find((t) => t.status === "in-progress" && t.subtasks?.some((s) => s.status === "pending"));
    if (inProgress) {
      const sub = inProgress.subtasks.find((s) => s.status === "pending");
      return { raw: `${inProgress.id}.${sub.id.split(".")[1] || sub.id} ${sub.title} (parent: ${inProgress.title})` };
    }
    const doneOrCancelled = new Set(all.filter((t) => TERMINAL.has(t.status)).map((t) => t.id));
    const ready = all.find((t) => t.status === "pending" && (t.depends_on || []).every((d) => doneOrCancelled.has(d)));
    if (!ready) return { raw: "no ready task" };
    return { raw: `[${ready.id}] ${ready.title}` };
  });
}

export async function cmdDeps(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task deps <id>");
  return withLock(cwd, {}, async () => {
    const all = await scanTasks(cwd, { includeArchived: true });
    const t = all.find((x) => x.id === id);
    if (!t) throw new ValidationError(`task ${id} not found`, 2);
    const dependents = all.filter((x) => (x.depends_on || []).includes(id));
    const lines = [`[${t.id}] ${t.title}`];
    if (t.depends_on?.length) {
      lines.push("  depends on:");
      for (const d of t.depends_on) {
        const dt = all.find((x) => x.id === d);
        lines.push(`    [${d}] ${dt?.title ?? "(missing)"} — ${dt?.status ?? "?"}`);
      }
    }
    if (dependents.length) {
      lines.push("  dependents:");
      for (const d of dependents) lines.push(`    [${d.id}] ${d.title} — ${d.status}`);
    }
    return { raw: lines.join("\n") };
  });
}

export async function cmdGrep(cwd, args) {
  const pattern = args._[0];
  if (!pattern) throw new ValidationError("task grep <pattern>");
  const re = new RegExp(pattern, "i");
  return withLock(cwd, {}, async () => {
    const all = await scanTasks(cwd, { includeArchived: true });
    const hits = all.filter((t) => {
      const bag = [t.title, t.goal, ...(t.notes || []), ...(t.files || []).map((f) => f.path), ...(t.sources || []).map((s) => s.ref)].join("\n");
      return re.test(bag);
    });
    return { raw: renderList(hits, { compact: true }) };
  });
}

export async function cmdWhy(cwd, args) {
  const id = args._[0];
  if (!id) throw new ValidationError("task why <id>");
  return withLock(cwd, {}, async () => {
    const all = await scanTasks(cwd, { includeArchived: true });
    const t = all.find((x) => x.id === id);
    if (!t) throw new ValidationError(`task ${id} not found`, 2);
    const lines = [`[${t.id}] ${t.title}`, `goal: ${t.goal || "—"}`, "sources:"];
    for (const s of t.sources || []) lines.push(`  - ${s.kind}: ${s.ref}`);
    if (!(t.sources || []).length) lines.push("  (none)");
    return { raw: lines.join("\n") };
  });
}

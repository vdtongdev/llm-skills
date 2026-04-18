// Rendering: 4-line default list, compact list, show detail.

import YAML from "yaml";

/**
 * Render one task as a 4-line default entry or a single compact line.
 * Invalid tasks always render as "[?] INVALID <file>: <error>".
 */
export function renderListLine(t, { compact = false } = {}) {
  if (t.status === "invalid") {
    return `[?] INVALID  ${t.file}: ${t.error}`;
  }
  if (compact) {
    const deps = t.depends_on?.length ? ` (deps: ${t.depends_on.join(", ")})` : "";
    return `[${t.id}] ${t.status.toUpperCase()}  ${t.title}${deps}`;
  }
  const lines = [`[${t.id}] ${t.status.toUpperCase()}  ${t.title}`];
  lines.push(`    ${firstLine(t.goal) || "—"}`);
  lines.push(`    Files: ${summarizeFiles(t.files) || "—"}`);
  const deps = t.depends_on?.length ? `Deps: ${t.depends_on.join(", ")}` : "Deps: —";
  const subs = summarizeSubtasks(t.subtasks);
  lines.push(`    ${deps}${subs ? `                Subtasks: ${subs}` : ""}`);
  return lines.join("\n");
}

/** Render an array of tasks; returns a newline-joined string. */
export function renderList(tasks, opts = {}) {
  return tasks.map((t) => renderListLine(t, opts)).join("\n");
}

/** Render full task detail as YAML with a contract_version: 1 envelope. */
export function renderShow(t) {
  const obj = {
    contract_version: 1,
    id: t.id,
    uid: t.uid,
    title: t.title,
    status: t.status,
    depends_on: t.depends_on,
    goal: t.goal,
    files: t.files,
    tests: t.tests,
    notes: t.notes,
    subtasks: t.subtasks,
    sources: t.sources,
    archived: !!t.archived,
  };
  return YAML.stringify(obj);
}

/** Render a subtask as YAML with contract_version: 1 and parent context. */
export function renderShowSubtask(t) {
  const obj = { contract_version: 1, parent_id: t._parent.id, parent_title: t._parent.title, id: t.id, title: t.title, status: t.status };
  if (t.kind !== undefined) obj.kind = t.kind;
  return YAML.stringify(obj);
}

function firstLine(s) {
  if (!s) return "";
  return String(s).split(/\r?\n/)[0].trim();
}

function summarizeFiles(files) {
  if (!files?.length) return null;
  const paths = files.map((f) => f.path);
  const shown = paths.slice(0, 3).join(", ");
  return paths.length > 3 ? `${shown} (+${paths.length - 3})` : shown;
}

function summarizeSubtasks(subs) {
  if (!subs?.length) return null;
  return subs.map((s) => `${s.id} ${s.status}`).join(", ");
}

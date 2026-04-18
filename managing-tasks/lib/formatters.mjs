// Rendering: 4-line default list, compact list, show detail.

import YAML from "yaml";

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

export function renderList(tasks, opts = {}) {
  return tasks.map((t) => renderListLine(t, opts)).join("\n");
}

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

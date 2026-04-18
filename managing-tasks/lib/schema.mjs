// Schema v1 validation for managing-tasks.
// Exit codes: 3 = bad CLI/YAML input or schema violation; 4 = domain constraint.

export const SCHEMA_VERSION = 1;
export const STATUSES = new Set(["pending", "in-progress", "done", "blocked", "cancelled"]);
export const FILE_KINDS = new Set(["create", "modify", "delete"]);
export const TERMINAL = new Set(["done", "cancelled"]);

export class ValidationError extends Error {
  constructor(message, exitCode = 3) {
    super(message);
    this.exitCode = exitCode;
  }
}

export function validateTaskFile(obj, { filename = "<task>" } = {}) {
  if (!obj || typeof obj !== "object") throw new ValidationError(`${filename}: not a mapping`);
  if (obj.schema !== SCHEMA_VERSION) throw new ValidationError(`${filename}: schema must be ${SCHEMA_VERSION}, got ${obj.schema}`, obj.schema > SCHEMA_VERSION ? 6 : 3);
  requireString(obj, "uid", filename);
  requireString(obj, "id", filename);
  requireString(obj, "title", filename);
  requireString(obj, "status", filename);
  if (!STATUSES.has(obj.status)) throw new ValidationError(`${filename}: unknown status ${obj.status}`);
  if (obj.depends_on != null) {
    if (!Array.isArray(obj.depends_on)) throw new ValidationError(`${filename}: depends_on must be array`);
    for (const d of obj.depends_on) {
      if (typeof d !== "string") throw new ValidationError(`${filename}: depends_on entries must be strings`);
    }
  }
  if (obj.files) {
    for (const f of obj.files) {
      if (!f || typeof f !== "object") throw new ValidationError(`${filename}: files[] entry not a mapping`);
      if (typeof f.path !== "string") throw new ValidationError(`${filename}: files[].path must be string`);
      if (f.kind && !FILE_KINDS.has(f.kind)) throw new ValidationError(`${filename}: files[].kind=${f.kind} unknown`);
    }
  }
  if (obj.subtasks) {
    for (const s of obj.subtasks) {
      if (typeof s.id !== "string") throw new ValidationError(`${filename}: subtasks[].id must be string (quote N.M)`);
      if (s.status && !STATUSES.has(s.status)) throw new ValidationError(`${filename}: subtasks[].status=${s.status} unknown`);
    }
  }
  if (obj.sources) {
    for (const s of obj.sources) {
      if (typeof s.kind !== "string") throw new ValidationError(`${filename}: sources[].kind required string`);
      if (typeof s.ref !== "string") throw new ValidationError(`${filename}: sources[].ref required string`);
    }
  }
  return obj;
}

export function validateBatch(batch) {
  if (!batch || batch.schema !== SCHEMA_VERSION) throw new ValidationError(`batch: schema must be ${SCHEMA_VERSION}`);
  if (!Array.isArray(batch.tasks)) throw new ValidationError("batch: tasks must be array");
  const labels = new Set();
  for (const [i, t] of batch.tasks.entries()) {
    if (typeof t.title !== "string" || !t.title) throw new ValidationError(`batch task ${i}: title required`);
    if (t.label) {
      if (labels.has(t.label)) throw new ValidationError(`batch: duplicate label ${t.label}`);
      labels.add(t.label);
    }
    if (t.depends_on_labels) {
      for (const l of t.depends_on_labels) {
        if (typeof l !== "string") throw new ValidationError(`batch task ${i}: depends_on_labels entries must be strings`);
      }
    }
    if (t.depends_on) {
      for (const d of t.depends_on) {
        if (typeof d !== "string") throw new ValidationError(`batch task ${i}: depends_on entries must be strings (quote numeric ids)`);
      }
    }
    if (t.sources) {
      for (const s of t.sources) {
        if (typeof s.kind !== "string" || typeof s.ref !== "string") {
          throw new ValidationError(`batch task ${i}: sources entries need kind+ref`);
        }
      }
    }
  }
  detectLabelCycles(batch.tasks);
  return batch;
}

function detectLabelCycles(tasks) {
  const graph = new Map();
  for (const t of tasks) graph.set(t.label, t.depends_on_labels || []);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...graph.keys()].map((k) => [k, WHITE]));
  function dfs(node, stack) {
    color.set(node, GRAY);
    for (const next of graph.get(node) || []) {
      if (!graph.has(next)) continue; // unresolved labels handled elsewhere
      if (color.get(next) === GRAY) {
        throw new ValidationError(`batch: cycle via labels: ${[...stack, next].join(" → ")}`, 4);
      }
      if (color.get(next) === WHITE) dfs(next, [...stack, next]);
    }
    color.set(node, BLACK);
  }
  for (const n of graph.keys()) if (color.get(n) === WHITE) dfs(n, [n]);
}

function requireString(obj, field, filename) {
  if (typeof obj[field] !== "string" || !obj[field]) {
    throw new ValidationError(`${filename}: ${field} required (string)`);
  }
}

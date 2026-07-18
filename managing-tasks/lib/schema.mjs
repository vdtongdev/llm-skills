// Schema v1 validation for managing-tasks.
// Exit codes: 3 = bad CLI/YAML input or schema violation; 4 = domain constraint.

export const SCHEMA_VERSION = 1;
export const STATUSES = new Set(["pending", "in-progress", "done", "blocked", "cancelled"]);
export const FILE_KINDS = new Set(["create", "modify", "delete"]);
export const TERMINAL = new Set(["done", "cancelled"]);

/** Carries an exitCode (2 = not-found, 3 = bad input, 4 = domain violation, 6 = schema too new) for process.exit. */
export class ValidationError extends Error {
  constructor(message, exitCode = 3) {
    super(message);
    this.exitCode = exitCode;
  }
}

/**
 * Validate a parsed task YAML object against schema v1.
 * @throws {ValidationError} exit 3 for type/missing-field errors, 4 for domain violations, 6 if schema version is newer than supported
 * @returns {object} the same obj, validated
 */
export function validateTaskFile(obj, { filename = "<task>" } = {}) {
  if (!obj || typeof obj !== "object") throw new ValidationError(`${filename}: not a mapping`);
  if (obj.schema !== SCHEMA_VERSION) throw new ValidationError(`${filename}: schema must be ${SCHEMA_VERSION}, got ${obj.schema}`, obj.schema > SCHEMA_VERSION ? 6 : 3);
  requireString(obj, "uid", filename);
  requireString(obj, "id", filename);
  requireString(obj, "title", filename);
  requireString(obj, "status", filename);
  if (!STATUSES.has(obj.status)) throw new ValidationError(`${filename}: unknown status ${obj.status}`);
  if (obj.kind != null && typeof obj.kind !== "string") throw new ValidationError(`${filename}: kind must be string`);
  if (obj.depends_on != null) {
    if (!Array.isArray(obj.depends_on)) throw new ValidationError(`${filename}: depends_on must be array`);
    for (const d of obj.depends_on) {
      if (typeof d !== "string") throw new ValidationError(`${filename}: depends_on entries must be strings`);
    }
  }
  if (obj.depends_on_uids != null) {
    if (!Array.isArray(obj.depends_on_uids)) throw new ValidationError(`${filename}: depends_on_uids must be array`);
  }
  if (obj.notes != null && !Array.isArray(obj.notes)) throw new ValidationError(`${filename}: notes must be array`);
  if (obj.tests != null && !Array.isArray(obj.tests)) throw new ValidationError(`${filename}: tests must be array`);
  if (obj.files != null) {
    if (!Array.isArray(obj.files)) throw new ValidationError(`${filename}: files must be array`);
    for (const f of obj.files) {
      if (!f || typeof f !== "object") throw new ValidationError(`${filename}: files[] entry not a mapping`);
      if (typeof f.path !== "string") throw new ValidationError(`${filename}: files[].path must be string`);
      if (f.kind && !FILE_KINDS.has(f.kind)) throw new ValidationError(`${filename}: files[].kind=${f.kind} unknown`);
    }
  }
  if (obj.subtasks != null) {
    if (!Array.isArray(obj.subtasks)) throw new ValidationError(`${filename}: subtasks must be array`);
    for (const s of obj.subtasks) {
      if (typeof s.id !== "string") throw new ValidationError(`${filename}: subtasks[].id must be string (quote N.M)`);
      if (typeof s.title !== "string" || !s.title) throw new ValidationError(`${filename}: subtasks[].title must be string`);
      if (s.status && !STATUSES.has(s.status)) throw new ValidationError(`${filename}: subtasks[].status=${s.status} unknown`);
    }
  }
  if (obj.sources != null) {
    if (!Array.isArray(obj.sources)) throw new ValidationError(`${filename}: sources must be array`);
    for (const s of obj.sources) {
      if (typeof s.kind !== "string") throw new ValidationError(`${filename}: sources[].kind required string`);
      if (typeof s.ref !== "string") throw new ValidationError(`${filename}: sources[].ref required string`);
    }
  }
  return obj;
}

/**
 * Validate a batch import YAML object (schema v1, tasks array with optional labels).
 * Detects intra-batch label cycles before any files are written.
 * @throws {ValidationError}
 */
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
    if (t.depends_on_labels != null) {
      if (!Array.isArray(t.depends_on_labels)) throw new ValidationError(`batch task ${i}: depends_on_labels must be array`);
      for (const l of t.depends_on_labels) {
        if (typeof l !== "string") throw new ValidationError(`batch task ${i}: depends_on_labels entries must be strings`);
      }
    }
    if (t.depends_on != null) {
      if (!Array.isArray(t.depends_on)) throw new ValidationError(`batch task ${i}: depends_on must be array`);
      for (const d of t.depends_on) {
        if (typeof d !== "string") throw new ValidationError(`batch task ${i}: depends_on entries must be strings (quote numeric ids)`);
      }
    }
    if (t.sources != null) {
      if (!Array.isArray(t.sources)) throw new ValidationError(`batch task ${i}: sources must be array`);
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

/**
 * Iterative DFS cycle detection on the label→depends_on_labels graph.
 * @throws {ValidationError} exit 4 listing the cycle path
 */
function detectLabelCycles(tasks) {
  const graph = new Map();
  for (const t of tasks) graph.set(t.label, t.depends_on_labels || []);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...graph.keys()].map((k) => [k, WHITE]));
  for (const start of graph.keys()) {
    if (color.get(start) !== WHITE) continue;
    const path = [start];
    const stack = [[start, [...(graph.get(start) || [])]]];
    color.set(start, GRAY);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const neighbors = frame[1];
      if (!neighbors.length) {
        color.set(frame[0], BLACK);
        stack.pop();
        path.pop();
        continue;
      }
      const next = neighbors.shift();
      if (!graph.has(next)) continue;
      if (color.get(next) === GRAY) {
        throw new ValidationError(`batch: cycle via labels: ${[...path, next].join(" → ")}`, 4);
      }
      if (color.get(next) === WHITE) {
        color.set(next, GRAY);
        path.push(next);
        stack.push([next, [...(graph.get(next) || [])]]);
      }
    }
  }
}

function requireString(obj, field, filename) {
  if (typeof obj[field] !== "string" || !obj[field]) {
    throw new ValidationError(`${filename}: ${field} required (string)`);
  }
}

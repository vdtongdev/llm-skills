// Schema v1 validation for managing-tasks.
// Exit codes: 3 = bad CLI/YAML input or schema violation; 4 = domain constraint.

export const SCHEMA_VERSION = 1;
export const STATUSES = new Set(["pending", "in-progress", "done", "blocked", "cancelled"]);
export const FILE_KINDS = new Set(["create", "modify", "delete"]);
export const TERMINAL = new Set(["done", "cancelled"]);

/**
 * Symbol key for an exit code on a SUCCESSFUL command result - the command ran fine
 * but its verdict is non-zero (`task verify`). A symbol so it never appears in the
 * YAML on stdout, which is the machine contract (see references/exit-codes.md).
 */
export const EXIT = Symbol.for("managing-tasks.exit");

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
  validateContext(obj.context, filename);
  return obj;
}

/**
 * Validate a context[] list: array of {kind, ref, why?} with kind/ref required strings.
 * Conventional kinds are 'file', 'skill' and 'doc', but any string is accepted so new
 * kinds stay additive without a schema bump.
 * @throws {ValidationError} exit 3
 */
export function validateContext(context, label = "<task>") {
  if (context == null) return;
  if (!Array.isArray(context)) throw new ValidationError(`${label}: context must be array`);
  for (const c of context) {
    if (!c || typeof c !== "object" || Array.isArray(c)) throw new ValidationError(`${label}: context[] entry not a mapping`);
    if (typeof c.kind !== "string" || !c.kind) throw new ValidationError(`${label}: context[].kind required string`);
    if (typeof c.ref !== "string" || !c.ref) throw new ValidationError(`${label}: context[].ref required string`);
    if (c.why != null && typeof c.why !== "string") throw new ValidationError(`${label}: context[].why must be string`);
  }
}

function requireString(obj, field, filename) {
  if (typeof obj[field] !== "string" || !obj[field]) {
    throw new ValidationError(`${filename}: ${field} required (string)`);
  }
}

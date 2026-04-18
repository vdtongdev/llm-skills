import { open, rename, rm, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import lockfile from "proper-lockfile";

export const SHORT_TIMEOUT_MS = 5_000;
export const MAINTENANCE_TIMEOUT_MS = 60_000;

const LOCK_RELATIVE = ".tasks/.cache/lock";

export async function atomicWrite(targetPath, content) {
  const dir = dirname(targetPath);
  await mkdir(dir, { recursive: true });
  const tmp = join(dir, `.${randomBytes(6).toString("hex")}.tmp`);
  const fh = await open(tmp, "w");
  try {
    await fh.writeFile(content);
    await fh.sync();
  } finally {
    await fh.close();
  }
  try {
    await rename(tmp, targetPath);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
  const dh = await open(dir, "r");
  try {
    await dh.sync();
  } catch {
    // some filesystems reject fsync on directories; best-effort only
  } finally {
    await dh.close();
  }
}

async function ensureLockFile(cwd) {
  const lockPath = join(cwd, LOCK_RELATIVE);
  await mkdir(dirname(lockPath), { recursive: true });
  if (!existsSync(lockPath)) await writeFile(lockPath, "");
  return lockPath;
}

// Option A: shared/exclusive collapse to exclusive under the hood.
// Queries serialize against mutations; solo-dev workflow makes this cost trivial.
export async function withLock(cwd, { timeoutMs = SHORT_TIMEOUT_MS } = {}, fn) {
  const lockPath = await ensureLockFile(cwd);
  let release;
  try {
    release = await lockfile.lock(lockPath, {
      retries: {
        retries: 10,
        minTimeout: 50,
        maxTimeout: 500,
        factor: 1.5,
      },
      stale: timeoutMs * 2,
    });
  } catch (err) {
    const e = new Error(`lock contention on ${lockPath}: ${err.message}`);
    e.exitCode = 5;
    throw e;
  }
  try {
    return await fn();
  } finally {
    try {
      await release();
    } catch {
      // release failures are non-fatal; lock will go stale and recover
    }
  }
}

export const withReadLock = withLock;
export const withWriteLock = withLock;

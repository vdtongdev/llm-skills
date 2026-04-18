// CLI entrypoint — arg parse + dispatch.

import { existsSync } from "node:fs";
import { appendFile, readFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import { rebuildCache } from "./cache.mjs";
import { cmdNew, cmdImport } from "./commands/create.mjs";
import { cmdList, cmdShow, cmdNext, cmdDeps, cmdGrep, cmdWhy } from "./commands/query.mjs";
import {
  cmdSetStatus, cmdEdit, cmdAddFile, cmdRmFile, cmdAddChange,
  cmdAddDep, cmdRmDep, cmdAddSubtask, cmdEditSubtask,
  cmdAddNote, cmdAddTest, cmdAddSource, cmdRmSource,
  cmdMove, cmdRm, cmdCancel, cmdReopen,
} from "./commands/mutate.mjs";
import { cmdArchive, cmdReindex, cmdRenumber, cmdMigrate } from "./commands/lifecycle.mjs";

const ROUTER = {
  init: cmdInit,
  new: (cwd, args) => cmdNew(cwd, args),
  import: (cwd, args) => cmdImport(cwd, args._[0]),
  list: cmdList,
  show: cmdShow,
  next: (cwd) => cmdNext(cwd),
  deps: cmdDeps,
  grep: cmdGrep,
  why: cmdWhy,
  "set-status": cmdSetStatus,
  edit: cmdEdit,
  "add-file": cmdAddFile,
  "rm-file": cmdRmFile,
  "add-change": cmdAddChange,
  "add-dep": cmdAddDep,
  "rm-dep": cmdRmDep,
  "add-subtask": cmdAddSubtask,
  "edit-subtask": cmdEditSubtask,
  "add-note": cmdAddNote,
  "add-test": cmdAddTest,
  "add-source": cmdAddSource,
  "rm-source": cmdRmSource,
  move: cmdMove,
  rm: cmdRm,
  cancel: cmdCancel,
  reopen: cmdReopen,
  archive: cmdArchive,
  reindex: (cwd) => cmdReindex(cwd),
  renumber: (cwd) => cmdRenumber(cwd),
  migrate: cmdMigrate,
};

export async function main(argv, { cwd }) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "-h" || cmd === "--help") return printHelp();
  if (cmd === "-v" || cmd === "--version") {
    const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    console.log(`managing-tasks ${pkg.version}`);
    return 0;
  }
  const handler = ROUTER[cmd];
  if (!handler) {
    console.error(`unknown command: ${cmd}`);
    return printHelp(3);
  }
  const args = parseArgs(rest);
  const res = await handler(cwd, args);
  if (res?.raw) {
    console.log(res.raw);
  } else if (res) {
    console.log(YAML.stringify(res));
  }
  return 0;
}

async function cmdInit(cwd) {
  const tasksDir = join(cwd, ".tasks");
  const cacheDir = join(tasksDir, ".cache");
  await mkdir(cacheDir, { recursive: true });

  const gi = join(cwd, ".gitignore");
  const line = ".tasks/.cache/";
  let content = "";
  if (existsSync(gi)) content = await readFile(gi, "utf8");
  if (!content.split(/\r?\n/).some((l) => l.trim() === line)) {
    const sep = content && !content.endsWith("\n") ? "\n" : "";
    await appendFile(gi, `${sep}${line}\n`);
  }
  await rebuildCache(cwd);
  return { contract_version: 1, ok: true, tasks_dir: ".tasks" };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith("--")) {
      const eq = tok.indexOf("=");
      if (eq > -1) {
        assignFlag(out, tok.slice(2, eq), tok.slice(eq + 1));
      } else {
        const key = tok.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("-")) {
          assignFlag(out, key, next);
          i++;
        } else {
          assignFlag(out, key, true);
        }
      }
    } else {
      out._.push(tok);
    }
  }
  return out;
}

function assignFlag(out, key, val) {
  if (out[key] === undefined) out[key] = val;
  else if (Array.isArray(out[key])) out[key].push(val);
  else out[key] = [out[key], val];
}

function printHelp(code = 0) {
  const help = `Usage: task <command> [args]
Commands:
  init                            Bootstrap .tasks/ and gitignore
  new "<title>" [--goal ..] [--file path:kind] [--depends-on id] [--source 'kind=..,ref=..']
  import <batch.yaml>             Atomic batch create; returns label_map
  list [--compact|--all|--ready|--status s|--touching path|--blocked|--archived]
  show <id>
  next
  deps <id>
  grep <pattern>
  why <id>
  set-status <id> <status> [--force]
  edit <id> [--title ..] [--goal ..]
  add-file <id> <path:kind>       rm-file <id> <path>
  add-change <id> <path> <text>
  add-dep <id> <dep>              rm-dep <id> <dep>
  add-subtask <id> <sub> <title> [--kind k]
  edit-subtask <id> <sub> [--status ..] [--title ..]
  add-note <id> <text>            add-test <id> <text>
  add-source <id> --source '..'   rm-source <id> <ref>
  move <id> --after <other>
  rm <id> [--force]               cancel <id> [--force]              reopen <id>
  archive --id <id> | --older-than <days>
  reindex   renumber   migrate [--dry-run]
Exit: 0 ok  1 internal  2 not-found  3 bad-input  4 domain-violation  5 lock  6 schema`;
  console.log(help);
  return code;
}

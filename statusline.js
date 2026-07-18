#!/usr/bin/env node
// Claude Code status line (colored, single line):
//   Left:  project · model · context window · lines changed
//   Right: 5h session usage · 7d weekly usage (reset times in Asia/Saigon)

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TZ = "Asia/Ho_Chi_Minh"; // Saigon

// ── ANSI colors ────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  gray: "\x1b[38;5;245m",
  cyan: "\x1b[38;5;44m",
  blue: "\x1b[38;5;39m",
  purple: "\x1b[38;5;177m",
  green: "\x1b[38;5;78m",
  yellow: "\x1b[38;5;221m",
  orange: "\x1b[38;5;215m",
  red: "\x1b[38;5;203m",
};
const c = (color, s) => `${color}${s}${C.reset}`;

// Pick a color for a usage ratio (0..1): green → yellow → orange → red.
function levelColor(ratio) {
  if (ratio >= 0.9) return C.red;
  if (ratio >= 0.75) return C.orange;
  if (ratio >= 0.5) return C.yellow;
  return C.green;
}

const SEP = `  ${C.gray}|${C.reset}  `;

// Strip ANSI escape codes to measure the actual printable width of a string.
function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function visibleLength(s) {
  return stripAnsi(s).length;
}

// Terminal width for right-aligning row 2. statusLine's stdout is piped, so
// process.stdout.columns is usually unavailable and COLUMNS is rarely
// exported to child processes; query the controlling terminal directly.
function terminalWidth() {
  if (process.stdout.columns) return process.stdout.columns;
  const envCols = parseInt(process.env.COLUMNS, 10);
  if (Number.isFinite(envCols) && envCols > 0) return envCols;
  try {
    const out = execSync("stty size < /dev/tty", { encoding: "utf8" }).trim();
    const cols = parseInt(out.split(" ")[1], 10);
    if (Number.isFinite(cols) && cols > 0) return cols;
  } catch { /* no controlling tty available */ }
  return 120;
}

// Context window size (tokens), derived from the active model.
// Claude Code runs in the 200K standard window and extends toward the model's
// full window only once the session crosses 200K (exceeds_200k_tokens flag).
function contextLimit(data) {
  const id = (data.model?.id || "").toLowerCase();
  const supports1M = /opus-4-[678]|sonnet-4-6|fable-5|mythos-5/.test(id);
  if (supports1M && data.exceeds_200k_tokens) return 1000000;
  return 200000;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch { /* ignore */ }
  process.stdout.write(render(data));
});

function fmtClock(epochSec, withDay) {
  if (epochSec == null) return "?";
  const d = new Date(epochSec * 1000);
  const opts = withDay
    ? { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }
    : { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ };
  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}

function countdown(epochSec) {
  if (epochSec == null) return "";
  const ms = epochSec * 1000 - Date.now();
  if (ms <= 0) return "now";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m`;
}

function pct(v) {
  return v == null ? "—" : `${Math.round(v)}%`;
}

// Colored progress bar: █ filled (level color), ░ empty (dim gray).
function bar(ratio, width = 8) {
  ratio = Math.max(0, Math.min(1, ratio || 0));
  const filled = Math.round(ratio * width);
  const fill = c(levelColor(ratio), "█".repeat(filled));
  const empty = c(C.gray, "░".repeat(width - filled));
  return fill + empty;
}

// Read the transcript and return tokens currently in the context window
// (input + cache_read + cache_creation of the most recent assistant message).
function contextTokens(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
    const lines = fs.readFileSync(transcriptPath, "utf8").split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      const u = obj?.message?.usage;
      if (u && obj.message?.role === "assistant") {
        return (u.input_tokens || 0)
          + (u.cache_read_input_tokens || 0)
          + (u.cache_creation_input_tokens || 0);
      }
    }
  } catch { /* ignore */ }
  return null;
}

function fmtTokens(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
}

function render(data) {
  const rl = data.rate_limits || {};
  const five = rl.five_hour;
  const week = rl.seven_day;

  // ── Row 1: project · model · context · lines ────────────────────────────
  const row1 = [];

  const projDir = data.workspace?.project_dir || data.workspace?.current_dir || data.cwd;
  if (projDir) row1.push(`📁 ${c(C.cyan, path.basename(projDir))}`);

  const model = data.model?.display_name || data.model?.id;
  if (model) row1.push(`🤖 ${c(C.purple, model)}`);

  const ctx = contextTokens(data.transcript_path);
  if (ctx != null) {
    const limit = contextLimit(data);
    const r = ctx / limit;
    row1.push(`🧠 ${bar(r)} ${c(C.gray, `${fmtTokens(ctx)}/${fmtTokens(limit)}`)} ${c(levelColor(r), pct(r * 100))}`);
  }

  const added = data.cost?.total_lines_added || 0;
  const removed = data.cost?.total_lines_removed || 0;
  if (added || removed) row1.push(`${c(C.green, `+${added}`)}${c(C.gray, "/")}${c(C.red, `-${removed}`)}`);

  // ── Row 2: 5h · 7d usage ────────────────────────────────────────────────
  const row2 = [];

  if (five) {
    const r = (five.used_percentage || 0) / 100;
    row2.push(`${c(C.bold + C.blue, "5h")} ${bar(r)} ${c(levelColor(r), pct(five.used_percentage))} ${c(C.gray, `↻ ${fmtClock(five.resets_at, false)} · ${countdown(five.resets_at)}`)}`);
  } else {
    row2.push(`${c(C.bold + C.blue, "5h")} ${c(C.gray, "—")}`);
  }

  if (week) {
    const r = (week.used_percentage || 0) / 100;
    row2.push(`${c(C.bold + C.blue, "7d")} ${bar(r)} ${c(levelColor(r), pct(week.used_percentage))} ${c(C.gray, `↻ ${fmtClock(week.resets_at, true)} · ${countdown(week.resets_at)}`)}`);
  } else {
    row2.push(`${c(C.bold + C.blue, "7d")} ${c(C.gray, "—")}`);
  }

  const left = row1.join(SEP);
  const right = row2.join(SEP);

  // Not enough room to fit both on one line with a readable gap: fall back
  // to the original two-row, top/bottom layout.
  const MIN_GAP = 2;
  const tw = terminalWidth();
  const leftLen = visibleLength(left);
  const rightLen = visibleLength(right);
  const gap = tw - leftLen - rightLen;

  if (gap < MIN_GAP) return left + "\n" + right;

  return left + " ".repeat(gap) + right;
}

#!/usr/bin/env python3
"""Switch Claude Code between .credentials-<n>.json slots.

Swapping the credentials alone leaves ~/.claude.json holding the old account's
identity, so /usage keeps showing the previous email for up to 24h. This drops
oauthAccount.profileFetchedAt to force a re-fetch.

usage:  switch-account.py            list slots
        switch-account.py <n>        switch to slot n
        switch-account.py write <n>  save the live credentials into slot n
        switch-account.py bak        undo the last switch
"""

import json
import os
import shutil
import sys
import time
from pathlib import Path

CFG = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude"))
LIVE = CFG / ".credentials.json"
GLOBAL = CFG / ".claude.json" if os.environ.get("CLAUDE_CONFIG_DIR") else Path.home() / ".claude.json"
BAK = CFG / ".credentials.bak"
ME = Path(sys.argv[0]).name


def slots():
    """Slot names present in the config dir."""
    return sorted(p.name[13:-5] for p in CFG.glob(".credentials-*.json"))


def slot_file(n):
    """Path of slot n."""
    return CFG / f".credentials-{n}.json"


def tokens(path):
    """The claudeAiOauth block of a credentials file, or {}."""
    try:
        return json.loads(path.read_text()).get("claudeAiOauth") or {}
    except Exception:
        return {}


def wiped(o):
    """True if the tokens were blanked, which Claude Code does on invalid_grant."""
    return not o.get("accessToken") or not o.get("refreshToken")


def state(o):
    """One-word health of a token set."""
    if not o:
        return "unreadable"
    if wiped(o):
        return "WIPED"
    if o.get("refreshTokenExpiresAt", 0) < time.time() * 1000:
        return "DEAD"
    return "ok"


def when(ms):
    """A ms timestamp as an absolute time plus a relative offset."""
    if not ms:
        return "-"
    d = (ms - time.time() * 1000) / 1000
    unit = f"{abs(d) / 3600:.0f}h" if abs(d) < 86400 else f"{abs(d) / 86400:.0f}d"
    return f"{time.strftime('%Y-%m-%d %H:%M', time.localtime(ms / 1000))} ({unit + ' ago' if d < 0 else 'in ' + unit})"


def live_slot():
    """Slot holding the same refresh token as the live file, if any."""
    rt = tokens(LIVE).get("refreshToken")
    if not rt:
        return None
    return next((n for n in slots() if tokens(slot_file(n)).get("refreshToken") == rt), None)


def copy(src, dst):
    """Copy, keeping mode 600."""
    shutil.copy2(src, dst)
    os.chmod(dst, 0o600)


def die(msg):
    """Exit with an error."""
    sys.exit(f"error: {msg}")


def running():
    """PID of a running Claude Code, or None."""
    me = os.getpid()
    for p in Path("/proc").iterdir():
        if not p.name.isdigit() or int(p.name) == me:
            continue
        try:
            cmd = (p / "cmdline").read_bytes().decode("utf-8", "replace")
        except OSError:
            continue
        if "switch-account.py" in cmd:
            continue
        if any(os.path.basename(a) == "claude" or "claude-patched" in a for a in cmd.split("\0") if a):
            return p.name
    return None


def resync():
    """Drop profileFetchedAt so the next run re-fetches the account identity."""
    try:
        cfg = json.loads(GLOBAL.read_text())
    except Exception:
        return
    acct = cfg.get("oauthAccount")
    if isinstance(acct, dict) and acct.pop("profileFetchedAt", None) is not None:
        shutil.copy2(GLOBAL, GLOBAL.with_suffix(".json.bak"))
        GLOBAL.write_text(json.dumps(cfg))


def note_running():
    """Say when a running Claude Code will notice the swap."""
    if pid := running():
        print(f"note: Claude Code is running (pid {pid}); it re-reads the file at\n      its next token check, not immediately")


def show():
    """List the live credentials and every slot."""
    cur = live_slot()
    for name, path in [("live", LIVE)] + [(n, slot_file(n)) for n in slots()]:
        o = tokens(path)
        mark = "->" if name == cur else "  "
        print(
            f"{mark} {name:<6} {state(o):<10} access {when(o.get('expiresAt', 0)):<28} "
            f"refresh {when(o.get('refreshTokenExpiresAt', 0))}"
        )
    if cur is None:
        print(f"\nlive tokens match no slot; save them with: {ME} write N")
    elif tokens(LIVE).get("accessToken") != tokens(slot_file(cur)).get("accessToken"):
        print(f"\nslot {cur} has the same refresh token but an older access token;")
        print(f"run '{ME} write {cur}' to update it")
    if BAK.exists():
        print("\n'bak' restores the previous credentials")


def switch(n):
    """Make slot n live, backing up the current credentials."""
    if n not in slots():
        die(f"no slot {n!r}; have: {', '.join(slots()) or 'none'}")
    incoming = tokens(slot_file(n))
    if not incoming:
        die(f"slot {n} is unreadable")
    if wiped(incoming):
        die(f"slot {n} is blanked; that account needs /login")
    if live_slot() == n:
        print(f"slot {n} is already live")
        return

    copy(LIVE, BAK)
    copy(slot_file(n), LIVE)
    resync()
    print(f"switched to slot {n} ('bak' undoes this)")
    note_running()


def write(n):
    """Save the live credentials into slot n."""
    if not n.isdigit():
        die("write needs a slot number, for example: write 1")
    live = tokens(LIVE)
    if not live:
        die("live credentials are unreadable")
    if wiped(live):
        die("live credentials are blanked; nothing to save")

    dst = slot_file(n)
    if dst.exists():
        print(f"replacing slot {n} ({state(tokens(dst))})")
    copy(LIVE, dst)
    print(f"saved live credentials to slot {n}")


def restore():
    """Put the backed up credentials back."""
    if not BAK.exists():
        die("no .credentials.bak to restore")
    if wiped(tokens(BAK)):
        die(".credentials.bak is blanked; it cannot be restored")
    copy(BAK, LIVE)
    resync()
    print("restored .credentials.bak" + (f" (slot {n})" if (n := live_slot()) else ""))
    note_running()


if __name__ == "__main__":
    if not CFG.is_dir():
        die(f"no config dir at {CFG}")
    args = sys.argv[1:]
    if not args:
        show()
    elif args[0] == "bak":
        restore()
    elif args[0] == "write":
        write(args[1] if len(args) > 1 else "")
    else:
        switch(args[0])

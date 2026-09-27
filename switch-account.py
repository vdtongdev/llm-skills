#!/usr/bin/env python3
"""Switch Claude Code between .credentials-<n>.json slots.

Swapping the credentials alone leaves ~/.claude.json holding the old account's
identity, so /usage keeps showing the previous email for up to 24h. This drops
oauthAccount.profileFetchedAt to force a re-fetch.

Claude Code rotates the refresh token on every refresh, so the live account is
matched to a slot by refresh token expiry, which stays fixed per login. Before
swapping, the live tokens are saved into their slot so rotated tokens are kept.

Quota comes from .usage-cache.json, which statusline.js writes while a login is
live, so each slot shows its last seen 5h and 7d usage.

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

CONFIG_DIR = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude"))
LIVE_CREDENTIALS = CONFIG_DIR / ".credentials.json"
GLOBAL_CONFIG = CONFIG_DIR / ".claude.json" if os.environ.get("CLAUDE_CONFIG_DIR") else Path.home() / ".claude.json"
BACKUP_CREDENTIALS = CONFIG_DIR / ".credentials.bak"
USAGE_CACHE = CONFIG_DIR / ".usage-cache.json"
SCRIPT_NAME = Path(sys.argv[0]).name
# Refresh expiry is computed client-side from the current time, so it jitters by under a second.
REFRESH_EXPIRY_TOLERANCE_MS = 5_000
ROW_FORMAT = "{:2} {:<6} {:<10} {:<22} {:<22} {:<12}  {:<12}  {}"
DURATION_UNITS = (("d", 86400), ("h", 3600), ("m", 60), ("s", 1))


def list_slots():
    """Slot names present in the config dir."""
    return sorted(path.stem.removeprefix(".credentials-") for path in CONFIG_DIR.glob(".credentials-*.json"))


def slot_path(slot):
    """Path of a slot's credentials file."""
    return CONFIG_DIR / f".credentials-{slot}.json"


def read_oauth(path):
    """The claudeAiOauth block of a credentials file, or {}."""
    try:
        return json.loads(path.read_text()).get("claudeAiOauth") or {}
    except Exception:
        return {}


def is_wiped(oauth):
    """True if the tokens were blanked, which Claude Code does on invalid_grant."""
    return not oauth.get("accessToken") or not oauth.get("refreshToken")


def describe_health(oauth):
    """One-word health of a token set."""
    if not oauth:
        return "unreadable"
    if is_wiped(oauth):
        return "WIPED"
    if oauth.get("refreshTokenExpiresAt", 0) < time.time() * 1000:
        return "DEAD"
    return "ok"


def format_span(seconds):
    """A duration in whole minutes, hours, or days."""
    if abs(seconds) < 3600:
        return f"{abs(seconds) / 60:.0f}m"
    if abs(seconds) < 86400:
        return f"{abs(seconds) / 3600:.0f}h"
    return f"{abs(seconds) / 86400:.0f}d"


def format_time_left(seconds):
    """A duration in its two largest units: 6d23h, 4h39m, 20m34s, 10s."""
    seconds = int(seconds)
    for index, (name, unit_seconds) in enumerate(DURATION_UNITS[:-1]):
        if seconds >= unit_seconds:
            next_name, next_unit_seconds = DURATION_UNITS[index + 1]
            return f"{seconds // unit_seconds}{name}{seconds % unit_seconds // next_unit_seconds}{next_name}"
    return f"{seconds}s"


def format_timestamp(ms_timestamp):
    """A ms timestamp as an absolute time plus a relative offset."""
    if not ms_timestamp:
        return "-"
    offset_seconds = (ms_timestamp - time.time() * 1000) / 1000
    span = format_span(offset_seconds)
    relative = f"{span} ago" if offset_seconds < 0 else f"in {span}"
    return f"{time.strftime('%m-%d %H:%M', time.localtime(ms_timestamp / 1000))} ({relative})"


def is_same_login(refresh_expiry, other_refresh_expiry):
    """True if two refresh token expiries belong to the same login."""
    return bool(refresh_expiry) and abs(refresh_expiry - other_refresh_expiry) <= REFRESH_EXPIRY_TOLERANCE_MS


def find_same_login(candidates, refresh_expiry, expiry_of):
    """The candidate of the same login with the closest refresh expiry, or None."""
    matches = [candidate for candidate in candidates if is_same_login(refresh_expiry, expiry_of(candidate))]
    return min(matches, key=lambda candidate: abs(expiry_of(candidate) - refresh_expiry), default=None)


def find_slot(oauth):
    """Slot holding the same login as a token set."""
    return find_same_login(
        list_slots(),
        oauth.get("refreshTokenExpiresAt"),
        lambda slot: read_oauth(slot_path(slot)).get("refreshTokenExpiresAt", 0),
    )


def find_live_slot():
    """Slot holding the same login as the live file."""
    return find_slot(read_oauth(LIVE_CREDENTIALS))


def is_newer(oauth, other_oauth):
    """True if a token set was refreshed after another; each refresh extends the access expiry."""
    return oauth.get("expiresAt", 0) > other_oauth.get("expiresAt", 0)


def read_usage_cache():
    """Quota entries written by statusline.js, or []."""
    try:
        return json.loads(USAGE_CACHE.read_text())
    except Exception:
        return []


def format_window(window):
    """Used percentage of a rate limit window and time until it resets, 0% once it has reset."""
    if not window:
        return f"{'-':>4}"
    resets_at = window.get("resets_at")
    if not resets_at:
        return f"{window.get('used_percentage') or 0:>3.0f}%"
    seconds_left = resets_at - time.time()
    if seconds_left <= 0:
        return f"{0:>3}%"
    return f"{window.get('used_percentage') or 0:>3.0f}% ({format_time_left(seconds_left)})"


def usage_columns(usage_cache, oauth):
    """Last seen 5h usage, 7d usage, and age of a login's quota."""
    entry = find_same_login(
        usage_cache,
        oauth.get("refreshTokenExpiresAt"),
        lambda entry: entry.get("refresh_expires_at") or 0,
    )
    if entry is None:
        return f"{'-':>4}", f"{'-':>4}", "-"
    seen_ago = format_span(time.time() - entry.get("seen_at", 0) / 1000)
    return format_window(entry.get("five_hour")), format_window(entry.get("seven_day")), f"{seen_ago} ago"


def copy_private(source, destination):
    """Copy, keeping mode 600."""
    shutil.copy2(source, destination)
    os.chmod(destination, 0o600)


def is_confirmed(prompt):
    """True if the user answers yes; no input counts as no."""
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def exit_with_error(message):
    """Exit with an error."""
    sys.exit(f"error: {message}")


def force_profile_refetch():
    """Drop profileFetchedAt so the next run re-fetches the account identity."""
    try:
        config = json.loads(GLOBAL_CONFIG.read_text())
    except Exception:
        return
    account = config.get("oauthAccount")
    if isinstance(account, dict) and account.pop("profileFetchedAt", None) is not None:
        shutil.copy2(GLOBAL_CONFIG, GLOBAL_CONFIG.with_suffix(".json.bak"))
        GLOBAL_CONFIG.write_text(json.dumps(config))


def save_live_to_matching_slot():
    """Copy newer live tokens into the slot of the same login. Returns that slot, or None."""
    live_slot = find_live_slot()
    live_oauth = read_oauth(LIVE_CREDENTIALS)
    if live_slot is None or is_wiped(live_oauth):
        return live_slot
    if is_newer(live_oauth, read_oauth(slot_path(live_slot))):
        copy_private(LIVE_CREDENTIALS, slot_path(live_slot))
        print(f"updated slot {live_slot} with the live tokens")
    return live_slot


def show_slots():
    """List the live credentials and every slot."""
    live_slot = find_live_slot()
    usage_cache = read_usage_cache()
    print(ROW_FORMAT.format("", "slot", "health", "access", "refresh", f"{'5h':>4}", f"{'7d':>4}", "seen"))
    for name, path in [("live", LIVE_CREDENTIALS)] + [(slot, slot_path(slot)) for slot in list_slots()]:
        oauth = read_oauth(path)
        print(
            ROW_FORMAT.format(
                "->" if name == live_slot else "",
                name,
                describe_health(oauth),
                format_timestamp(oauth.get("expiresAt", 0)),
                format_timestamp(oauth.get("refreshTokenExpiresAt", 0)),
                *usage_columns(usage_cache, oauth),
            ),
        )
    live_oauth = read_oauth(LIVE_CREDENTIALS)
    if live_slot is None:
        print(f"\nlive tokens match no slot; save them with: {SCRIPT_NAME} write N")
    elif is_wiped(live_oauth) or is_newer(read_oauth(slot_path(live_slot)), live_oauth):
        print(f"\nslot {live_slot} holds newer tokens than live; load them with: {SCRIPT_NAME} {live_slot}")
    elif is_newer(live_oauth, read_oauth(slot_path(live_slot))):
        print(f"\nslot {live_slot} holds older tokens of the live login; the next switch updates it")
    if BACKUP_CREDENTIALS.exists():
        print("\n'bak' restores the previous credentials")


def switch_to_slot(slot):
    """Make a slot live, backing up the current credentials."""
    if slot not in list_slots():
        exit_with_error(f"no slot {slot!r}; have: {', '.join(list_slots()) or 'none'}")
    live_oauth = read_oauth(LIVE_CREDENTIALS)
    live_slot = save_live_to_matching_slot()
    incoming_oauth = read_oauth(slot_path(slot))
    if live_slot == slot and not is_wiped(live_oauth) and not is_newer(incoming_oauth, live_oauth):
        print(f"slot {slot} is already live")
        return
    if not incoming_oauth:
        exit_with_error(f"slot {slot} is unreadable")
    if is_wiped(incoming_oauth):
        exit_with_error(f"slot {slot} is blanked; that account needs /login")

    copy_private(LIVE_CREDENTIALS, BACKUP_CREDENTIALS)
    copy_private(slot_path(slot), LIVE_CREDENTIALS)
    force_profile_refetch()
    print(f"switched to slot {slot} ('bak' undoes this)")


def save_live_to_slot(slot):
    """Save the live credentials into a slot."""
    if not slot.isdigit():
        exit_with_error("write needs a slot number, for example: write 1")
    live_oauth = read_oauth(LIVE_CREDENTIALS)
    if not live_oauth:
        exit_with_error("live credentials are unreadable")
    if is_wiped(live_oauth):
        exit_with_error("live credentials are blanked; nothing to save")

    destination = slot_path(slot)
    if destination.exists() and not is_confirmed(
        f"slot {slot} exists ({describe_health(read_oauth(destination))}); overwrite it? [y/N] "
    ):
        sys.exit("cancelled")
    copy_private(LIVE_CREDENTIALS, destination)
    print(f"saved live credentials to slot {slot}")


def restore_backup():
    """Put the backed up credentials back."""
    if not BACKUP_CREDENTIALS.exists():
        exit_with_error("no .credentials.bak to restore")
    if is_wiped(read_oauth(BACKUP_CREDENTIALS)):
        exit_with_error(".credentials.bak is blanked; it cannot be restored")
    save_live_to_matching_slot()
    backup_oauth = read_oauth(BACKUP_CREDENTIALS)
    backup_slot = find_slot(backup_oauth)
    if backup_slot is not None and is_newer(read_oauth(slot_path(backup_slot)), backup_oauth):
        copy_private(slot_path(backup_slot), LIVE_CREDENTIALS)
        print(f"restored slot {backup_slot}, which holds newer tokens than .credentials.bak")
    else:
        copy_private(BACKUP_CREDENTIALS, LIVE_CREDENTIALS)
        print("restored .credentials.bak" + (f" (slot {backup_slot})" if backup_slot is not None else ""))
    force_profile_refetch()


if __name__ == "__main__":
    if not CONFIG_DIR.is_dir():
        exit_with_error(f"no config dir at {CONFIG_DIR}")
    arguments = sys.argv[1:]
    if not arguments:
        show_slots()
    elif arguments[0] == "bak":
        restore_backup()
    elif arguments[0] == "write":
        save_live_to_slot(arguments[1] if len(arguments) > 1 else "")
    else:
        switch_to_slot(arguments[0])

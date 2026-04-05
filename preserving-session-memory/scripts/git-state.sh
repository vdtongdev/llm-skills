#!/usr/bin/env bash
# Git state snapshot for session onboard/offboard
# Usage: bash ~/.claude/skills/preserving-session-memory/scripts/git-state.sh

set -euo pipefail

echo "=== Branch ==="
git branch --show-current

echo ""
echo "=== Status ==="
git status --short

echo ""
echo "=== Stash ==="
git stash list 2>/dev/null || echo "(no stashes)"

echo ""
echo "=== Recent Commits ==="
git log --oneline -10

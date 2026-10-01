# Tag Workflow

A release tag message describes what changed since the previous tag. It replaces reading the MRs, so it must stand alone.

## 1. Find the Range

```bash
git tag --sort=-creatordate | head -5                 # naming pattern and previous tag
git log --merges --format='%b' <previous-tag>..HEAD | grep -o '![0-9]\+'   # MRs in range
glab mr view <iid>                                    # read each MR body
```

Name the new tag after the existing pattern, for example `v2026.09.28.0-release`.

## 2. Write the Message

- Length: one third to one half of the combined word count of the MR bodies in range.
- Content: what users get compared to the previous tag. Group by feature and fix.
- Exclude commit hashes and `see !N` pointers.
- Never start a line with `#`: `git tag` strips it as a comment, so markdown headings vanish.

```text
Lunar calendar support and month view.

Features:
- Month view on desktop and phone, with entries per day.
- Lunar calendar: lunar dates in the schedule view and lunar recurrences.
- Entries take a start date.

Removed:
- People management.
```

## 3. Create

```bash
git tag -a <tag> -F - <<'EOF'
<message>
EOF
```

Push the tag only under SKILL.md § Conventions **Push**.

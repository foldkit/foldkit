#!/usr/bin/env bash
set -euo pipefail

FOUND=0

for file in .changeset/*.md; do
  [ "$(basename "$file")" = "README.md" ] && continue
  [ ! -f "$file" ] && continue

  # Only check between the --- frontmatter delimiters for ': major'
  if sed -n '/^---$/,/^---$/p' "$file" | grep -q ': major$'; then
    echo "  - $file"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "ERROR: Major changesets found. Foldkit is pre-1.0 — use 'minor' for breaking changes."
  exit 1
fi

echo "No major changesets found."

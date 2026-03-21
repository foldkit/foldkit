#!/usr/bin/env bash
set -euo pipefail

# Check for CLAUDE: comments that should be resolved before merging.
# Searches all tracked (and staged) files, ignoring this script itself.

MATCHES=$(git grep -n 'CLAUDE:' -- ':!scripts/check-no-claude-comments.sh' ':!CLAUDE.md' || true)

if [ -n "$MATCHES" ]; then
  echo ""
  echo "❌ Found unresolved CLAUDE: comments:"
  echo ""
  echo "$MATCHES"
  echo ""
  echo "Resolve or remove these comments before pushing."
  exit 1
fi

echo "No CLAUDE: comments found."

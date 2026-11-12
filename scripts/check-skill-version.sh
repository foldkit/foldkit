#!/usr/bin/env bash
set -euo pipefail

CLAUDE_MANIFEST=.claude-plugin/plugin.json
CURSOR_MANIFEST=.cursor-plugin/plugin.json

read_version() {
  grep '"version"' "$1" | sed 's/.*: *"\(.*\)".*/\1/' || true
}

for MANIFEST in "$CLAUDE_MANIFEST" "$CURSOR_MANIFEST"; do
  if [ ! -f "$MANIFEST" ]; then
    echo "ERROR: $MANIFEST is missing."
    echo ""
    echo "Restore it with the same \"version\" field as the other plugin manifest."
    exit 1
  fi

  if [ -z "$(read_version "$MANIFEST")" ]; then
    echo "ERROR: $MANIFEST has no \"version\" field."
    echo ""
    echo "Set the same \"version\" field in $CLAUDE_MANIFEST and $CURSOR_MANIFEST."
    exit 1
  fi
done

CLAUDE_VERSION=$(read_version "$CLAUDE_MANIFEST")
CURSOR_VERSION=$(read_version "$CURSOR_MANIFEST")

if [ "$CLAUDE_VERSION" != "$CURSOR_VERSION" ]; then
  echo "ERROR: Plugin manifest versions differ: $CLAUDE_MANIFEST is $CLAUDE_VERSION, $CURSOR_MANIFEST is $CURSOR_VERSION."
  echo ""
  echo "Set the same \"version\" field in $CLAUDE_MANIFEST and $CURSOR_MANIFEST."
  exit 1
fi

BASE=$(git merge-base origin/main HEAD)

SKILL_CHANGES=$(git diff --name-only "$BASE" HEAD -- \
  skills/foldkit/ \
  skills/generate-program/ \
  skills/audit-program/)
VERSION_CHANGED=$(git diff --name-only "$BASE" HEAD -- "$CLAUDE_MANIFEST")

if [ -z "$SKILL_CHANGES" ]; then
  echo "No skill changes detected. Skipping version check."
  exit 0
fi

if [ -z "$VERSION_CHANGED" ]; then
  echo "ERROR: Skill files changed but $CLAUDE_MANIFEST version was not bumped."
  echo ""
  echo "Changed skill files:"
  echo "$SKILL_CHANGES" | sed 's/^/  - /'
  echo ""
  echo "Bump the \"version\" field in $CLAUDE_MANIFEST and $CURSOR_MANIFEST so users pick up the new skills."
  exit 1
fi

MAIN_VERSION=$(git show "$BASE:$CLAUDE_MANIFEST" | grep '"version"' | sed 's/.*: *"\(.*\)".*/\1/')

if [ "$MAIN_VERSION" = "$CLAUDE_VERSION" ]; then
  echo "ERROR: $CLAUDE_MANIFEST was modified but the version is unchanged ($MAIN_VERSION)."
  echo ""
  echo "Bump the \"version\" field in $CLAUDE_MANIFEST and $CURSOR_MANIFEST so users pick up the new skills."
  exit 1
fi

echo "Plugin version bumped: $MAIN_VERSION → $CLAUDE_VERSION"

#!/usr/bin/env bash
set -euo pipefail

CLAUDE_MANIFEST=.claude-plugin/plugin.json
CURSOR_MANIFEST=.cursor-plugin/plugin.json

read_version() {
  grep '"version"' | sed 's/.*: *"\(.*\)".*/\1/' || true
}

require_version() {
  if [ -z "$2" ]; then
    echo "ERROR: $1 has no \"version\" field."
    echo ""
    echo "Set the same \"version\" field in $CLAUDE_MANIFEST and $CURSOR_MANIFEST."
    exit 1
  fi
}

read_skills() {
  tr -d '[:space:]' | sed -n 's/.*"skills":\(\[[^]]*\]\).*/\1/p'
}

for MANIFEST in "$CLAUDE_MANIFEST" "$CURSOR_MANIFEST"; do
  if [ ! -f "$MANIFEST" ]; then
    echo "ERROR: $MANIFEST is missing."
    echo ""
    echo "Restore $MANIFEST. Both plugin manifests must declare the same \"version\"."
    exit 1
  fi
done

CLAUDE_VERSION=$(read_version < "$CLAUDE_MANIFEST")
CURSOR_VERSION=$(read_version < "$CURSOR_MANIFEST")

require_version "$CLAUDE_MANIFEST" "$CLAUDE_VERSION"
require_version "$CURSOR_MANIFEST" "$CURSOR_VERSION"

if [ "$CLAUDE_VERSION" != "$CURSOR_VERSION" ]; then
  echo "ERROR: Plugin manifest versions differ: $CLAUDE_MANIFEST is $CLAUDE_VERSION, $CURSOR_MANIFEST is $CURSOR_VERSION."
  echo ""
  echo "Set the same \"version\" field in $CLAUDE_MANIFEST and $CURSOR_MANIFEST."
  exit 1
fi

CLAUDE_SKILLS=$(read_skills < "$CLAUDE_MANIFEST")
CURSOR_SKILLS=$(read_skills < "$CURSOR_MANIFEST")

if [ "$CLAUDE_SKILLS" != "$CURSOR_SKILLS" ]; then
  echo "ERROR: Plugin manifest skills differ: $CLAUDE_MANIFEST lists $CLAUDE_SKILLS, $CURSOR_MANIFEST lists $CURSOR_SKILLS."
  echo ""
  echo "List the same \"skills\" in $CLAUDE_MANIFEST and $CURSOR_MANIFEST."
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

MAIN_VERSION=$(git show "$BASE:$CLAUDE_MANIFEST" | read_version)

if [ "$MAIN_VERSION" = "$CLAUDE_VERSION" ]; then
  echo "ERROR: $CLAUDE_MANIFEST was modified but the version is unchanged ($MAIN_VERSION)."
  echo ""
  echo "Bump the \"version\" field in $CLAUDE_MANIFEST and $CURSOR_MANIFEST so users pick up the new skills."
  exit 1
fi

echo "Plugin version bumped: $MAIN_VERSION → $CLAUDE_VERSION"

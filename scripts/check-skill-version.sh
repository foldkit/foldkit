#!/usr/bin/env bash
set -euo pipefail

BASE=$(git merge-base origin/main HEAD)

SKILL_CHANGES=$(git diff --name-only "$BASE" HEAD -- skills/ .claude/commands/)
VERSION_CHANGED=$(git diff --name-only "$BASE" HEAD -- .claude-plugin/plugin.json)

if [ -z "$SKILL_CHANGES" ]; then
  echo "No skill changes detected. Skipping version check."
  exit 0
fi

if [ -z "$VERSION_CHANGED" ]; then
  echo "ERROR: Skill files changed but .claude-plugin/plugin.json version was not bumped."
  echo ""
  echo "Changed skill files:"
  echo "$SKILL_CHANGES" | sed 's/^/  - /'
  echo ""
  echo "Bump the \"version\" field in .claude-plugin/plugin.json so users pick up the new skills."
  exit 1
fi

MAIN_VERSION=$(git show "$BASE":.claude-plugin/plugin.json | grep '"version"' | sed 's/.*: *"\(.*\)".*/\1/')
HEAD_VERSION=$(grep '"version"' .claude-plugin/plugin.json | sed 's/.*: *"\(.*\)".*/\1/')

if [ "$MAIN_VERSION" = "$HEAD_VERSION" ]; then
  echo "ERROR: plugin.json was modified but the version is unchanged ($MAIN_VERSION)."
  echo ""
  echo "Bump the \"version\" field in .claude-plugin/plugin.json so users pick up the new skills."
  exit 1
fi

echo "Plugin version bumped: $MAIN_VERSION → $HEAD_VERSION"

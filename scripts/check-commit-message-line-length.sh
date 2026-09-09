#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-origin/main}"
MAX_LINE_LENGTH=80

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "Could not resolve $BASE_REF. Fetch main and try again." >&2
  exit 1
fi

FOUND_LONG_LINE=0
COMMIT_COUNT=0

while IFS= read -r COMMIT; do
  if [ -z "$COMMIT" ]; then
    continue
  fi

  COMMIT_COUNT=$((COMMIT_COUNT + 1))
  SUBJECT=$(git log -1 --format=%s "$COMMIT")
  LINE_NUMBER=0

  while IFS= read -r LINE || [ -n "$LINE" ]; do
    LINE_NUMBER=$((LINE_NUMBER + 1))
    LENGTH=${#LINE}

    if [ "$LENGTH" -gt "$MAX_LINE_LENGTH" ] && [[ "${LINE:$MAX_LINE_LENGTH}" =~ [[:space:]] ]]; then
      if [ "$FOUND_LONG_LINE" -eq 0 ]; then
        echo ""
        echo "Commit message prose must wrap at ${MAX_LINE_LENGTH} characters."
        echo "Unbreakable lines (URLs, Co-authored-by trailers) are exempt."
      fi

      FOUND_LONG_LINE=1
      echo ""
      echo "${COMMIT:0:8} $SUBJECT"
      echo "  line $LINE_NUMBER: $LENGTH characters"
      echo "  $LINE"
    fi
  done < <(git log -1 --format=%B "$COMMIT")
# Skip merge commits. Their messages are auto-generated boilerplate, including
# the "Merge <sha> into <sha>" commit GitHub synthesizes for a pull request
# merge ref when this check runs in CI.
done < <(git rev-list --reverse --no-merges "$BASE_REF..HEAD")

if [ "$FOUND_LONG_LINE" -ne 0 ]; then
  echo ""
  echo "Wrap the commit message before pushing."
  exit 1
fi

if [ "$COMMIT_COUNT" -eq 1 ]; then
  COMMIT_LABEL="commit"
else
  COMMIT_LABEL="commits"
fi

echo "Commit message line length OK: $COMMIT_COUNT $COMMIT_LABEL checked against $BASE_REF."

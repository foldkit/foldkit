#!/usr/bin/env bash
set -euo pipefail

# Detect circular dependencies in application source directories.
# Uses madge to trace the import graph and fails on any cycle not in the
# allowlist. Excludes .d.ts files (library dist cycles are harmless).
#
# To update the allowlist after intentionally adding a safe cycle, run:
#   pnpm madge --circular --extensions ts --exclude '\.d\.ts$' <dir>
# and add the new cycle below.

ALLOWLIST=(
  # View-layer cycles: view files import message constructors from the parent
  # barrel. Safe because view functions execute at render time, not module init.
  "message.ts > page/index.ts > page/home/index.ts > page/home/view.ts"
  "message.ts > page/index.ts > page/home/index.ts > page/home/view.ts > view/html.ts"
  "message.ts > page/index.ts > page/room/index.ts > page/room/view/index.ts > page/room/view/view.ts"
  "message.ts > page/index.ts > page/room/index.ts > page/room/view/index.ts > page/room/view/view.ts > page/room/view/playing.ts"

  # Mutual type dependency between room update helpers.
  "page/room/update/handleRoomUpdates.ts > page/room/update/update.ts"
)

DIRS=(
  packages/typing-game/client/src
)

FOUND_NEW=0

for DIR in "${DIRS[@]}"; do
  if [ ! -d "$DIR" ]; then
    continue
  fi

  OUTPUT=$(pnpm madge --circular --extensions ts --exclude '\.d\.ts$' "$DIR" 2>&1 || true)
  CYCLES=$(echo "$OUTPUT" | grep -E '^\d+\)' || true)

  if [ -z "$CYCLES" ]; then
    continue
  fi

  while IFS= read -r LINE; do
    CYCLE=$(echo "$LINE" | sed 's/^[0-9]*) //')

    IS_ALLOWED=false
    for ALLOWED in "${ALLOWLIST[@]}"; do
      if [ "$CYCLE" = "$ALLOWED" ]; then
        IS_ALLOWED=true
        break
      fi
    done

    if [ "$IS_ALLOWED" = false ]; then
      if [ "$FOUND_NEW" -eq 0 ]; then
        echo ""
        echo "❌ Found new circular dependencies:"
        echo ""
      fi
      echo "  $DIR: $CYCLE"
      FOUND_NEW=1
    fi
  done <<< "$CYCLES"
done

if [ "$FOUND_NEW" -eq 1 ]; then
  echo ""
  echo "Circular dependencies can cause 'Cannot access X before initialization'"
  echo "errors in production builds. Break the cycle by moving imports or"
  echo "restructuring the module graph."
  echo ""
  echo "If this cycle is intentionally safe (e.g. view-layer only), add it to"
  echo "the allowlist in scripts/check-circular-deps.sh."
  exit 1
fi

echo "No new circular dependencies found."

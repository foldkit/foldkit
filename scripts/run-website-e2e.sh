#!/usr/bin/env bash
set -euo pipefail

# Run the website playwright e2e suite, skipping cleanly when the required
# browsers are not installed locally.
#
# Claude Code cloud sessions (and similar ephemeral sandboxes) often lack
# the right playwright browser version and cannot install one. Without this
# wrapper, the pre-push hook blocks those environments and forces developers
# to push with --no-verify.
#
# CI installs browsers explicitly and runs the full e2e suite on every PR,
# so skipping here does not weaken the guarantees on merged code.

cd "$(git rev-parse --show-toplevel)/packages/website"

DRY_RUN=$(pnpm exec playwright install --dry-run chromium 2>/dev/null || true)
INSTALL_PATHS=$(echo "$DRY_RUN" | awk '/Install location:/ {print $NF}')

MISSING=()
if [ -z "$INSTALL_PATHS" ]; then
  MISSING+=("playwright dry-run produced no install paths")
else
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    [ -d "$path" ] || MISSING+=("$path")
  done <<< "$INSTALL_PATHS"
fi

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo ""
  echo "=============================================================================="
  echo "WARNING: Skipping website e2e tests. Required playwright browsers are missing."
  echo "=============================================================================="
  echo ""
  echo "Missing:"
  for path in "${MISSING[@]}"; do
    echo "  $path"
  done
  echo ""
  echo "To install locally:"
  echo "  pnpm --filter website exec playwright install chromium"
  echo ""
  echo "CI installs browsers explicitly and runs the full suite on every PR."
  echo ""
  exit 0
fi

exec pnpm playwright test

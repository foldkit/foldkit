#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLES_DIR="$REPO_ROOT/examples"
OUTPUT_DIR="$REPO_ROOT/packages/website/public/example-apps-embed"

SLUGS=(
  counter
  todo
  stopwatch
  form
)

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

for slug in "${SLUGS[@]}"; do
  echo "Building example: $slug"
  (
    cd "$EXAMPLES_DIR/$slug"
    npx vite build \
      --base "/example-apps-embed/$slug/" \
      --outDir "$OUTPUT_DIR/$slug"
  )
  echo "  → $OUTPUT_DIR/$slug"
done

echo ""
echo "Built ${#SLUGS[@]} examples into $OUTPUT_DIR"

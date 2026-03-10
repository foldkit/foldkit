#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLES_DIR="$REPO_ROOT/examples"
OUTPUT_DIR="$REPO_ROOT/packages/website/public/example-apps-embed"
BRIDGE_SCRIPT="$REPO_ROOT/scripts/example-bridge.js"

SLUGS=(
  counter
  todo
  stopwatch
  form
  weather
  routing
  query-sync
  shopping-cart
  auth
  snake
  error-view
  websocket-chat
  ui-showcase
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

  # Copy bridge script and inject reference into built HTML
  cp "$BRIDGE_SCRIPT" "$OUTPUT_DIR/$slug/bridge.js"
  BUILT_HTML="$OUTPUT_DIR/$slug/index.html"
  if [ -f "$BUILT_HTML" ]; then
    TEMP_FILE="$(mktemp)"
    sed 's|</head>|<script src="bridge.js"></script></head>|' "$BUILT_HTML" > "$TEMP_FILE" && mv "$TEMP_FILE" "$BUILT_HTML"
    echo "  → injected bridge script"
  fi

  echo "  → $OUTPUT_DIR/$slug"
done

echo ""
echo "Built ${#SLUGS[@]} examples into $OUTPUT_DIR"

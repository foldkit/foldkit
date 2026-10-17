#!/bin/sh
inputs="$(dirname "$0")"

echo run >> "$inputs/runs"
run="$(wc -l < "$inputs/runs" | tr -d ' ')"
printf '%s' "$FOLDKIT_DEVTOOLS_PROBED_DIRECTORY" > "$inputs/received"

if [ -f "$inputs/reply-$run" ]; then
  cat "$inputs/reply-$run"
elif [ -f "$inputs/reply" ]; then
  cat "$inputs/reply"
fi

if [ -f "$inputs/delay" ]; then
  sleep "$(cat "$inputs/delay")"
fi

if [ -f "$inputs/status" ]; then
  exit "$(cat "$inputs/status")"
fi

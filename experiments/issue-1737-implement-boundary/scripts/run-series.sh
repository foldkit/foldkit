#!/bin/sh
# Serial, interleaved native measurements for foldkit#1737.
# Usage: run-series.sh SERIES_NAME REPS MODE... (arms: baseline, candidate)
set -u
SERIES="$1"; shift
REPS="$1"; shift
OUT=/private/tmp/fk1737/reports/$SERIES
mkdir -p "$OUT"
BASE=/private/tmp/fk1737/foldkit-1737-repro
CAND=${CANDIDATE_WORKSPACE:-/private/tmp/fk1737/foldkit-1737-candidate}
for MODE in "$@"; do
  if [ "$MODE" = root-hover ]; then PROBE=/private/tmp/fk1737/tools-hover/scope-root-editor-probe.mjs; else PROBE=/private/tmp/fk1737/tools/scope-root-editor-probe.mjs; fi
  rep=1
  while [ $rep -le "$REPS" ]; do
    if [ $((rep % 2)) -eq 1 ]; then ORDER="baseline candidate"; else ORDER="candidate baseline"; fi
    for ARM in $ORDER; do
      if [ "$ARM" = baseline ]; then WS=$BASE; else WS=$CAND; fi
      NAME="$MODE-$ARM-$rep"
      LOAD=$(sysctl -n vm.loadavg)
      START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
      env -u GOMEMLIMIT -u GOGC node "$PROBE" --workspace "$WS" --disposable-workspace --output "$OUT/$NAME.json" --mode "$MODE" > "$OUT/$NAME.stdout" 2> "$OUT/$NAME.stderr"
      CODE=$?
      printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$NAME" "$MODE" "$ARM" "$rep" "$CODE" "$START $LOAD" >> "$OUT/index.tsv"
      tail -1 "$OUT/$NAME.stdout" | cut -c1-120
    done
    rep=$((rep + 1))
  done
done

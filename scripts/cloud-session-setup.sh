#!/usr/bin/env bash
#
# Prepare the workspace for a Claude Code cloud session.
#
# Cloud sandboxes are provisioned from a cached working-directory snapshot. That
# snapshot can carry three kinds of state that look like pre-existing branch
# problems but are not:
#
#   * Stale node_modules    -> downstream typecheck/build hits "Property X does
#     not exist on type Y" because the wrong dependency version resolved.
#   * Missing dist/         -> downstream typecheck fails with "Cannot find
#     module 'foldkit'" because foldkit's package.json `exports` map points at
#     dist/.
#   * Stale untracked files -> a never-committed leftover baked into the
#     snapshot reappears as an untracked file every session, tripping the
#     "commit and push" Stop hook into nagging about work nobody did.
#
# Reconciling node_modules to the lockfile, building the prerequisite packages,
# and removing known stale leftovers eliminates all three classes of phantom
# problem before the agent runs any checks.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# The @foldkit/devtools extraction moved overlay-styles.ts out of the foldkit
# core package, but a never-tracked copy lingers in cloud snapshots at the old
# path and reappears as an untracked file every session. The canonical file now
# lives at packages/devtools/src/overlay-styles.ts. Remove the leftover, guarded
# on "still untracked" so a file legitimately committed here later is untouched.
stale_leftovers=(
  'packages/foldkit/src/devTools/overlay-styles.ts'
)
for path in "${stale_leftovers[@]}"; do
  if [[ -f "$path" ]] && ! git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
    echo "[setup] removing stale untracked leftover: $path"
    rm -f "$path"
  fi
done

echo "[setup] reconciling node_modules with pnpm-lock.yaml"
pnpm install --frozen-lockfile

prerequisite_packages=(
  'foldkit:packages/foldkit'
  '@foldkit/vite-plugin:packages/vite-plugin-foldkit'
  '@typing-game/shared:packages/typing-game/shared'
)

build_filters=()
for spec in "${prerequisite_packages[@]}"; do
  pkg="${spec%%:*}"
  dir="${spec#*:}"
  if [[ ! -d "$dir/dist" ]]; then
    build_filters+=("-F" "$pkg")
  fi
done

if (( ${#build_filters[@]} > 0 )); then
  echo "[setup] building prerequisite packages: ${build_filters[*]}"
  pnpm "${build_filters[@]}" build
else
  echo "[setup] prerequisite package dist/ directories already present"
fi

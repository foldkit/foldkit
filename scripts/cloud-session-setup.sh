#!/usr/bin/env bash
#
# Prepare the workspace for a Claude Code cloud session.
#
# Cloud sandboxes are provisioned with a node_modules that may be stale (wrong
# package versions) and never has packages built. Both states produce errors
# that look like pre-existing branch problems but are not:
#
#   * Stale node_modules -> downstream typecheck/build hits "Property X does not
#     exist on type Y" because the wrong dependency version resolved.
#   * Missing dist/      -> downstream typecheck fails with "Cannot find module
#     'foldkit'" because foldkit's package.json `exports` map points at dist/.
#
# Reconciling node_modules to the lockfile and building the three prerequisite
# packages eliminates both classes of phantom error before the agent runs any
# checks.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

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

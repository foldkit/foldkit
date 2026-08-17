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

# Every workspace package another package imports by name, because that import
# resolves through the dependency's `exports` map into dist/. A package missing
# from this list is a package the agent has to notice and build by hand, after
# reading a "Cannot find module" or a wall of `never` and index-signature errors
# that read like branch breakage. Packages nothing imports, such as the CLIs and
# the typing game server, stay out: they are built by the tasks that need them.
prerequisite_packages=(
  'foldkit:packages/foldkit'
  '@foldkit/markdown:packages/markdown'
  '@foldkit/ui:packages/ui'
  '@foldkit/devtools:packages/devtools'
  '@foldkit/vite-plugin:packages/vite-plugin-foldkit'
  '@foldkit/oxlint-plugin:packages/oxlint-plugin-foldkit'
  '@typing-game/shared:packages/typing-game/shared'
)

#   * Stale dist/       -> the same failure as a missing one, because the build
#     output predates the sources it claims to export.
#
# Compares against the oldest file inside dist/, not the directory itself: a
# directory's mtime tracks entries added or removed, so it can be newer than the
# stale contents it holds and report a rebuilt tree that never was.
is_dist_stale() {
  local dir="$1"
  [[ -d "$dir/dist" && -d "$dir/src" && -r "$dir/src" ]] || return 0

  local oldest_built
  oldest_built=$(find "$dir/dist" -type f -printf '%T@ %p\n' 2>/dev/null |
    sort -n | head -1 | cut -d' ' -f2-)
  [[ -n "$oldest_built" ]] || return 0

  local newer_source scan_status
  newer_source=$(find "$dir/src" -type f -newer "$oldest_built" -print -quit 2>/dev/null)
  scan_status=$?

  [[ $scan_status -ne 0 || -n "$newer_source" ]]
}

build_filters=()
for spec in "${prerequisite_packages[@]}"; do
  pkg="${spec%%:*}"
  dir="${spec#*:}"
  if is_dist_stale "$dir"; then
    build_filters+=("-F" "$pkg")
  fi
done

if (( ${#build_filters[@]} > 0 )); then
  echo "[setup] building prerequisite packages (missing or stale dist/): ${build_filters[*]}"
  pnpm "${build_filters[@]}" build
else
  echo "[setup] prerequisite package dist/ directories present and up to date"
fi

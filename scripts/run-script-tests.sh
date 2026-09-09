#!/usr/bin/env bash
set -euo pipefail

# NOTE: knip's Node.js plugin enables itself for every workspace when it finds
# `node ... --test` in the root package.json, which makes it treat `**/test/**`
# across the whole repository (including the vendored repos/ subtrees) as entry
# points. Only these scripts use the built-in runner, so the invocation lives
# here rather than in a package.json script.

node --test "scripts/**/*.test.mjs"

#!/usr/bin/env bash
set -euo pipefail

unset $(git rev-parse --local-env-vars)
exec pnpm pre-push

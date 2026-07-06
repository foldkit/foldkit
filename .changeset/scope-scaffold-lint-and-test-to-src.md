---
'create-foldkit-app': patch
---

Scope the generated `lint` script and Vitest config to `src`, and ignore `.claude/worktrees/`. Tooling in a scaffolded project no longer reaches into vendored `repos/` subtrees.

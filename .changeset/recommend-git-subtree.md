---
'create-foldkit-app': patch
---

Recommend `git subtree` instead of `git submodule` for vendoring the Foldkit repo into a project so AI assistants can reference its source, examples, and docs.

The post-scaffold success message now prints subtree commands, and the scaffolded `AGENTS.md` ships with a `subtree_prompted: false` flag (renamed from `submodule_prompted`) for agents to check on future sessions.

```bash
git subtree add --prefix=repos/foldkit \
  https://github.com/foldkit/foldkit.git main --squash
```

Unlike a submodule, a subtree is checked into the user's repository, so a fresh clone (a teammate, a CI runner, a cloud agent) has the Foldkit source on disk immediately with no `--recurse-submodules` step to remember.

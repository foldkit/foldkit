---
'foldkit': patch
'create-foldkit-app': patch
---

Rename colocated test files to name them after their test style: `story.test.ts` for Story tests (which drive `update`) and `scene.test.ts` for Scene tests (which drive the rendered view). The previous `*.story.test.ts` / `*.scene.test.ts` scheme prefixed the file with `main` or `index`, which in split-file apps named neither the update nor the view it tested. `create-foldkit-app`'s scaffolded AGENTS.md now documents the convention. No runtime or public API changes.

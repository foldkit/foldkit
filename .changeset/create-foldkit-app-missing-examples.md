---
'create-foldkit-app': minor
---

Add `crash-view`, `job-application`, `kanban`, and `pixel-art` to the `--example` choice list. These four examples already shipped in the monorepo and on the website but were missing from the create-foldkit-app selectable list, so users could not scaffold them via `pnpm create foldkit-app`. Reorder the choice list and CLI help descriptions to match the website's example ordering.

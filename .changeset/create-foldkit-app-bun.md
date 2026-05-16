---
'create-foldkit-app': minor
---

`create-foldkit-app` now accepts `bun` as a package manager alongside `pnpm`, `npm`, and `yarn`. The interactive prompt lists Bun as a choice, and `--package-manager bun` skips the prompt and uses it directly. Dependencies install with `bun add`, and the post-scaffold success message prints the matching `bun dev` command.

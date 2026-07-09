---
'create-foldkit-app': minor
---

The scaffold `.oxlintrc.json` now extends the `@foldkit/oxlint-plugin` recommended preset instead of hand-listing a subset of foldkit rules, keeping only app-specific config (the core TypeScript rules and `ignorePatterns`) inline. Freshly scaffolded apps get the full foldkit ruleset and can never drift from the preset again, while the preset's own `overrides` keep those rules off in test files.

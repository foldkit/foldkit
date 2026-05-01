# Placeholder packages

This directory exists to reserve npm names commonly mistyped or guessed for Foldkit, so that bad actors cannot squat on them. The packages here are deliberately outside the pnpm workspace and are not part of the regular release flow.

| Package          | Redirects to                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| `create-foldkit` | [`create-foldkit-app`](https://www.npmjs.com/package/create-foldkit-app) |

Only `create-foldkit` lives here as a published placeholder. The other obvious typos (`fold-kit`, `fold_kit`, `create-fold-kit-app`) are already protected by npm's package name similarity policy: the registry collapses `-` and `_` during normalization, so any name that reduces to `foldkit` or `create-foldkit-app` is rejected on publish. `create-foldkit` is the one variant that is genuinely a different string after normalization, so it has to be claimed explicitly.

The package's `index.js` exits with a redirect message when run as a CLI. It is published once at `0.0.1` and then deprecated, so `npm install` surfaces a redirect to the canonical package. Publishing is manual and not part of any release flow.

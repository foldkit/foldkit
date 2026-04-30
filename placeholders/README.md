# Placeholder packages

These packages exist only to reserve npm names commonly mistyped or guessed for Foldkit, so that bad actors cannot squat on them. They are deliberately outside the pnpm workspace and are not part of the regular release flow.

| Package               | Redirects to                                                             |
| --------------------- | ------------------------------------------------------------------------ |
| `fold-kit`            | [`foldkit`](https://www.npmjs.com/package/foldkit)                       |
| `fold_kit`            | [`foldkit`](https://www.npmjs.com/package/foldkit)                       |
| `create-foldkit`      | [`create-foldkit-app`](https://www.npmjs.com/package/create-foldkit-app) |
| `create-fold-kit-app` | [`create-foldkit-app`](https://www.npmjs.com/package/create-foldkit-app) |

Each package's `index.js` either throws on import or exits with a redirect message when run as a CLI.

Each placeholder is published once at `0.0.1` and then deprecated, so `npm install` surfaces a redirect to the canonical package. Publishing is manual and not part of any release flow.

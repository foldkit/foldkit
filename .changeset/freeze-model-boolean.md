---
'foldkit': minor
---

Simplify the `freezeModel` runtime config to `boolean`. The wrapper object and `'Always'` mode have been removed.

Migration:

- `freezeModel: { show: 'Development' }` → omit, or `freezeModel: true`
- `freezeModel: { show: 'Always' }` → no direct replacement; freezing now only runs when Vite HMR is active.
- `freezeModel: false` → unchanged.

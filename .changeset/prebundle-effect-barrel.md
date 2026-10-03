---
'@foldkit/vite-plugin': patch
---

Pre-bundle the bare `effect` barrel in dev. foldkit's dist imports `'effect'`, so a consumer that imports only Effect subpaths (`effect/Option`, `effect/Schema`) loaded two Effect instances: route query encoding rejected the app's `Option` ("Query parameter encoding failed: Expected string") and views crashed with "Cannot convert a Symbol value to a string".

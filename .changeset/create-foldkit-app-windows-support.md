---
'create-foldkit-app': patch
---

Fix `create-foldkit-app` failing on Windows. Use `where` instead of `which` for package manager lookup, and run install commands through the shell so Windows can resolve the `.cmd` shims that npm, pnpm, and yarn ship as.

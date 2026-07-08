---
'create-foldkit-app': patch
---

Rewrite the `File Organization` section of the generated `AGENTS.md` to lead with the runtime-boot invariant (the definitions stay importable from tests because only `entry.ts` calls `Runtime.run`) and to describe when to split a growing app across more files. It now covers the revealed-seam heuristic, the two forced splits, and exemplars from the example apps.

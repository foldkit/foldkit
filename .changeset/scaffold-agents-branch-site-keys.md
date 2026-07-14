---
'create-foldkit-app': patch
---

Update the keying rule in the generated `AGENTS.md`: key every view branch even when the branch root tags differ, key inline branch roots directly instead of introducing a wrapper element only to carry a key, and key a single wrapper at the branch site when the branches delegate to other view functions.

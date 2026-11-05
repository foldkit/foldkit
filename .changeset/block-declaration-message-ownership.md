---
'@foldkit/oxlint-plugin': patch
---

Recognize a feature's own Message imports from its canonical `block.ts` declaration in Commands and extracted update helpers. Keep rejecting child Block Message construction through child exports, renamed imports, and constructor aliases, including those reexported through the parent's barrel.

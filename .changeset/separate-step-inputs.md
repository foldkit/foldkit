---
'foldkit': patch
---

Allow Definition Step helper types to distinguish accepted input Messages from local Command result Messages. Existing helper contracts keep their defaults. Extracted producers retain the exact complete input variant when local and input unions share a tag, while narrowed payloads and input-only Command results remain rejected.

---
'foldkit': patch
---

Submodel boundary registration no longer formats an Error stack on every render. Foldkit keeps the captured Error for duplicate-slot diagnostics and formats its stack only when reporting a duplicate `slotId`, preserving the registration locations in the error message.

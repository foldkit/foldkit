---
'foldkit': patch
---

Support Effect 4 stable's lazy Schema constructor helpers in callable Message and Route variants. Read getters on the underlying Schema so repeated `.make`, `.makeOption`, and `.makeEffect` calls preserve validation and can be combined with direct constructor calls.

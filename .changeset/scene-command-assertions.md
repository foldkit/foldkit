---
'foldkit': minor
---

Add `expectHasCommands`, `expectExactCommands`, and `expectNoCommands` to Scene, aligning its API with Story. Extract shared command assertion logic to internal helpers to eliminate duplication between Scene and Story.

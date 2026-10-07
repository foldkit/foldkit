---
'foldkit': minor
'@foldkit/devtools': minor
---

Add persistent per-tag recording controls to DevTools Settings. Every Message is recorded by default. Developers can stop and resume recording selected tags while debugging, and saved choices apply before the app starts after reload. Application-configured `excludeFromHistory` tags remain excluded.

Keep each recorded history index fixed after excluded Messages update the Live Model. Indexed reads and the history inspector now return the Model immediately after that recorded Message; use the non-indexed `foldkit_get_model` request to read Live. Replay checkpoints preserve excluded state changes without forcing every entry to store a full snapshot, and clearing history starts a new replay baseline from Live.

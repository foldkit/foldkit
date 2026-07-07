---
'foldkit': minor
---

Remove `Update.noOp`.

It only wrapped `[model, []]`, the update return with an empty Command
batch. The tuple is already the clearest form and stays edit-stable when a
branch later gains a Command (you just fill the empty slot), so the wrapper
did not earn its keep. Return `[model, []]` directly.

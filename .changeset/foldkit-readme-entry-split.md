---
'foldkit': patch
---

Update README to document the `main.ts` / `entry.ts` split and `Document` view return type.

The counter example now shows `src/main.ts` exporting Model, Message, init, update, and view, and `src/entry.ts` importing them to boot the runtime with `Runtime.makeProgram` + `Runtime.run`. The view returns a `Document` (`{ title, body }`) so the program can set the document title declaratively.

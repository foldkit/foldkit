---
'foldkit': patch
---

Fix mobile search input focus by setting the native `open` property on `<dialog>` synchronously during patch and using an `OnInsert` hook for focus, preserving the user-gesture call stack that mobile browsers require. Remove `focusSelector` from `Ui.Dialog` model and `Task.showModal` — focus is now handled by consumers via `OnInsert`.

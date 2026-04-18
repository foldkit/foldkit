---
'foldkit': minor
---

`FileDrop.ReceivedFiles` now carries `NonEmptyArray<File>` instead of `Array<File>`, and a new `FileDrop.DroppedWithoutFiles` Message and OutMessage covers the case where a drop or input-change event fires without files (typically a drag of non-file data like text, URLs, or images from another page).

Migration: if your parent update handled `ReceivedFiles({ files })` and branched on `Array.isEmptyArray(files)`, move that branch to a new handler for `DroppedWithoutFiles`. The files list in `ReceivedFiles` is now guaranteed non-empty, so you can drop the empty check on the happy path.

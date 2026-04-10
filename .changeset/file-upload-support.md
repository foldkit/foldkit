---
'foldkit': minor
---

Add File module for file upload support.

New `foldkit/file` module exports an opaque `File` type, metadata accessors (`name`, `size`, `mimeType`), and Effects for file selection and reading — all mirroring Elm's `elm/file` package design:

- `File.select(accept)` and `File.selectMultiple(accept)` open the native file picker and resolve with the selected files.
- `File.readAsText(file)`, `File.readAsDataUrl(file)`, and `File.readAsArrayBuffer(file)` wrap the browser `FileReader` API.
- `FileReadError` tagged error for reader failures.

Two new event attributes in the `foldkit/html` module for use with form file inputs and drag-and-drop zones:

- `OnFileChange` decodes `event.target.files` for `<input type="file">` elements.
- `OnDropFiles` decodes `event.dataTransfer.files` on drop events and calls `preventDefault`.

Two new scene test helpers in `foldkit` (`Scene.changeFiles` and `Scene.dropFiles`) for asserting file upload flows in scene tests. Both helpers throw a clear error when applied to an element whose change or drop handler was registered via `OnChange`/`OnDrop` instead of the file-aware variant, preventing silent misuse that would otherwise dispatch the wrong message with an empty value.

`Scene.role('img', { name })` now resolves `alt` attributes as the accessible name, matching the W3C AccName 1.2 "text alternative from native host language" step. Previously Scene only resolved `aria-labelledby`, `aria-label`, `<label for>`, text content, and `title`, so images required `Scene.altText` as a workaround.

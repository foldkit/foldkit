---
'foldkit': minor
---

Add `Ui.FileDrop`, a headless component for file upload zones that accept both drag-and-drop and click-to-browse. Encapsulates the `<label>` + hidden `<input type="file">` composition plus the drag-state machine that every file-upload UI otherwise reimplements.

FileDrop exposes a `ReceivedFiles` OutMessage carrying `ReadonlyArray<File>` that fires via both paths (drop and input change), so consumers handle one event regardless of how the user brought the files in. The component Model tracks `isDragOver` and exposes it via `data-drag-over` on the root for styling.

```ts
Ui.FileDrop.view({
  model: model.uploader,
  toParentMessage: message => GotFileDropMessage({ message }),
  multiple: true,
  accept: ['application/pdf', '.doc', '.docx'],
  toView: attributes =>
    label(
      [...attributes.root, Class('...')],
      [p([], ['Drop files or click to browse']), input(attributes.input)],
    ),
})
```

Also in this release:

- `AllowDrop()`: new html primitive that calls `preventDefault` on `dragover` without dispatching a Message. Use it on drop zones that just need to be valid drop targets (the HTML5 requirement for `drop` to fire) without flooding the update function with per-tick Messages.
- `OnDragEnter` and `OnDragLeave` now dedupe via an internal per-element target set with a microtask-deferred empty-check, matching the target-tracking pattern used by react-dropzone and @react-aria/dnd. Pruning stale targets on each event self-heals cases where `dragleave` failed to fire; the microtask deferral prevents a transient false "left" when the pointer crosses from the zone's padding onto a child in synchronous-dispatch rendering.

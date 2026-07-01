---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
---

Hand the Dialog's title and description ids to the consumer through `RenderInfo`
so they are never hand-rolled.

`RenderInfo` gains `title` and `description` attribute groups (siblings of
`dialog` / `backdrop` / `panel` / `closeButton`). Spread them onto your heading
and description elements:

```ts
toView: ({ dialog, backdrop, panel, title, description, closeButton }) => ...
h.h2([...title], ['My dialog'])
h.p([...description], ['...'])
```

The dialog's own `aria-labelledby` / `aria-describedby` point at the same
framework-managed ids, so labelling wires up without the consumer constructing
any id. This removes the class of bug where a consumer independently built a
dialog-scoped id such as `${dialogId}-title` for a form field literally called
"title" and silently collided with the dialog's own heading id.

Migration: destructure `title` / `description` from the `toView` render info and
spread them, instead of `h.Id(Dialog.titleId(model))` / `descriptionId`. The
`Dialog.titleId` / `Dialog.descriptionId` helpers remain as an escape hatch for
referencing the id as a value outside `toView` (a Command calling
`getElementById`, a cross-element reference, or a test).

Defense in depth alongside the `RenderInfo` change:

- The reserved ids are namespaced. The helpers and rendered ids now use the
  `-dialog-title` / `-dialog-description` suffixes rather than the bare `-title`
  / `-description`, so even a hand-rolled id is far less likely to collide.
- The runtime gains a development-only diagnostic: it scans the
  Foldkit-rendered root for elements sharing an `id` and emits a
  `[foldkit]`-prefixed `console.warn` naming the duplicated id. The scan is
  coalesced on a trailing timer so rapid successive renders trigger at most one
  full-tree scan per second, warns once per id, is scoped to the app root, never
  throws, and is tree-shaken out of production builds.

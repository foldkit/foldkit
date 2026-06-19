---
'@foldkit/ui': patch
---

Make anchored overlays (Listbox, Menu, Combobox, Popover) work when the app is
mounted inside a shadow root, such as the DevTools overlay. The panel portals
into the element's containing root instead of always `document.body` (keeping its
scoped styles), resolves its anchor button and focus target within that root
(`document.getElementById`/`querySelector` do not pierce shadow boundaries), and
positions with Floating UI's `fixed` strategy in a shadow context (the `absolute`
strategy mismeasures against the shadow host as `offsetParent`). Light-DOM apps
are unchanged.

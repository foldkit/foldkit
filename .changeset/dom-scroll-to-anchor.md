---
'foldkit': minor
---

Add `Dom.scrollIntoViewAfterPaint`, a sibling of `Dom.scrollIntoView` that waits for `Render.afterPaint` instead of `Render.afterCommit` before resolving the selector. Reach for it when the scroll target was just brought into the DOM by the same Message that dispatches the scroll, such as a routing flow landing at a URL fragment.

Extend `Dom.scrollIntoView` and `Dom.scrollIntoViewAfterPaint` with a `{ block?: ScrollLogicalPosition }` option, defaulting to `'nearest'`.

Extend `Dom.focus` with `{ preventScroll?: boolean; makeFocusable?: boolean }` options. `makeFocusable` injects `tabindex="-1"` on the target when it has no `tabindex`. `preventScroll` suppresses the browser's default scroll-on-focus.

The three helpers compose for URL-fragment-navigation accessibility:

```ts
const ScrollToAnchor = Command.define(
  'ScrollToAnchor',
  { hash: S.String },
  CompletedScrollToAnchor,
)(({ hash }) =>
  Effect.gen(function* () {
    const target = `#${hash}`
    yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
    yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
    return CompletedScrollToAnchor()
  }),
)
```

`scrollIntoViewAfterPaint` waits for the new Model to commit and the browser to lay it out. `focus` with `makeFocusable: true` makes non-natively-focusable targets (like `<h2>` section headings) receive keyboard focus. `preventScroll: true` keeps the focus call from undoing the scroll.

---
'foldkit': minor
'create-foldkit-app': patch
---

`routing.onUrlRequest` is now optional. Before, every routed application had to provide it, and with it a `ClickedLink` Message, a Command that calls `pushUrl` for an Internal request, and a Command that calls `load` for an External one. None of that made a decision; it moved the click to the history push. It was also a trap. The runtime prevents the browser's default on every same-origin click, so an application whose `ClickedLink` handler returned no Command had links that did nothing, with no error to point at.

Without `onUrlRequest`, the runtime handles the click itself. A same-origin link is pushed to browser history and reported through `onUrlChange`, exactly as a `pushUrl` or a back or forward navigation is. A link that only changes the fragment of the current URL is left to the browser, which scrolls to the anchor and pushes the entry; that history change reaches `onUrlChange` too. A cross-origin link is left to the browser. The modifier-key, mouse-button, `target`, and `download` checks run before any of this, as they did before.

```ts
// Before
routing: {
  onUrlRequest: request => Message.ClickedLink({ request }),
  onUrlChange: url => Message.ChangedUrl({ url }),
},

// After
routing: {
  onUrlChange: url => Message.ChangedUrl({ url }),
},
```

Provide `onUrlRequest` when a click needs a decision, such as confirming before leaving a form with unsaved edits. With the handler present the runtime behaves exactly as before: every same-origin click, fragment links included, arrives as an Internal request and update owns the navigation. `pushUrl` and `replaceUrl` now document that the new URL arrives through `onUrlChange`, so the route is parsed in one place.

The `create-foldkit-app` SSG template drops its `ClickedLink` handler and both navigation Commands.

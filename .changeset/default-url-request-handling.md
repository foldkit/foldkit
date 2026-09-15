---
'foldkit': minor
'create-foldkit-app': patch
---

`routing.onUrlRequest` is optional. Without it the runtime handles link clicks itself: a same-origin link is pushed to history and reported through `onUrlChange`, a cross-origin link is left to the browser. Provide the handler only to decide per click, in which case update owns the navigation as before. `pushUrl` and `replaceUrl` document that the new URL arrives through `onUrlChange`, so the route is parsed in one place. The SSG template drops its `ClickedLink` handler and navigation Commands accordingly.

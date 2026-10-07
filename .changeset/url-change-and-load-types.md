---
'foldkit': minor
'create-foldkit-app': patch
---

A routed app can now put the reader back where they were on Back, Forward, and reload. `routing.onUrlChange` receives a second argument, a `UrlChangeType` from `foldkit/navigation`: `Push` after `pushUrl`, `Replace` after `replaceUrl`, and `Traverse` after Back or Forward. A routing `init` receives a `LoadType` after the URL: `Push` for a new visit, `Reload` for a reload, and `Traverse` for Back or Forward into the page. Only the first routing `init` in a page receives `Reload` or `Traverse`, and any later `init` in the same page, of this app or another, such as the one `Runtime.embed` runs after a dispose, receives `Push`. Each union has only the variants its entry point can receive, so a `match` on it needs no unreachable branch. `Reload` and `Traverse` carry `maybeSavedScrollPosition`, an `Option<ScrollPosition>` holding the window position the reader last had on that history entry, which is `Option.none()` when none was recorded. `ScrollPosition` is a new export from `foldkit/navigation`: a Schema struct of the window's `x` and `y` scroll offsets in CSS pixels.

The runtime only reports. It never scrolls the window and never changes `history.scrollRestoration`, so an app that ignores the new argument scrolls exactly as before. `pushUrl` and `replaceUrl` now write `{ foldkitEntryKey }` to `history.state` instead of `{}`. An entry without a key, such as one another script pushed, is given one, and keeps its other state when that state is a plain object. The positions are saved to `sessionStorage` under `foldkit:scroll-positions`.

Handlers that declare only the URL still typecheck. Code that calls a typed routing `init` or `routing.onUrlChange` directly, such as a Story test, must now pass the `LoadType` or the `UrlChangeType`:

```ts
import { LoadType, UrlChangeType } from 'foldkit/navigation'

const init_ = init(url, LoadType.Push())
const message = routing.onUrlChange(url, UrlChangeType.Push())
```

`renderToString` from `foldkit/experimental/server` passes `LoadType.Push()` to a routing `init`, and its `RoutingApplicationConfig` and `RoutingApplicationConfigWithFlags` types carry the new `init` parameter.

The Scroll Position section of the routing guide shows how to scroll to the top on `Push` and restore the position on `Reload` and `Traverse`. In `create-foldkit-app`, the SSG template and the `routing` starter (`--example routing`) follow that pattern, so a new app created from either restores the position on Back, Forward, and reload. The personal blog and SSG examples follow it too.

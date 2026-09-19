---
'foldkit': minor
---

`Document.canonical` no longer defaults to `window.location`, and `Server.renderToString` no longer defaults it to `Request.url`. Only the application knows which route and query values identify a page. For example: `?page=2` may identify a different page, while `?utm_source=newsletter` usually does not.

Derive `canonical` from the typed route in the Model. If no render supplies it, the client leaves the served `<link rel="canonical">` unchanged or keeps the document without one. When the client first writes `canonical`, it records the existing `href`. A later omission restores that value, or removes the element if the runtime created it. On a hydrated page, the recorded value can be the initial route's server-rendered canonical.

`ogUrl` can be supplied independently. When it is omitted alongside an explicit `canonical`, it uses that canonical. Its client-side restore and removal behavior matches `canonical`.

Server rendering returns `canonical` only when the view supplies it. It returns `ogUrl` when the view supplies it or uses an explicit `canonical` as the fallback. Template injection leaves either tag unchanged when the corresponding field is absent.

**Migration:** applications that relied on the old default must return `canonical` from view. Build it from the route in the Model, as you would build `title`, rather than reading the address bar.

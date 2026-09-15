---
'foldkit': minor
---

`Document.canonical` is no longer derived from the address bar. A view that omits it leaves `<link rel="canonical">` to the served HTML, and the server render carries `canonical` and `ogUrl` through as the view returns them instead of defaulting them to the request URL.

The default was a guess the runtime could not make correctly. Only the application knows which query parameters are part of a page's identity: `?page=2` names a different page, `?utm_source=newsletter` does not. A view that never set `canonical` shipped a self-referencing canonical for every tracking variant of every page, and a hydrating client overwrote the canonical the served HTML carried with the live location, query string included. Both are gone: an application that never sets `canonical` keeps whatever its `index.html` declares, or has no canonical at all, and one that sets it from the route gets exactly that, on the server and after hydration.

An omitted `canonical` is restored rather than left as it is, which is where it differs from `lang` and `dir`. A view that sets `canonical` on one page and omits it on the next gets the served `<link rel="canonical">` back on the next page, or no element where the runtime had created one, so a canonical never outlives the page that set it. An omitted `lang` or `dir` keeps whatever the attribute holds, including a value an earlier render wrote. `ogUrl` still follows `canonical` when only the canonical is set, since the share URL should name the same page, and is restored the same way; when neither is set, `<meta property="og:url">` is left alone too.

**Migration:** this is a breaking change for applications that relied on the default. Return the canonical from the view, built from the route the same way `title` is built from the Model, rather than read from the location.

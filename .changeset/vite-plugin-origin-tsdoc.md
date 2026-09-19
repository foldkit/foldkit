---
'@foldkit/vite-plugin': patch
---

`FoldkitPrerenderOptions.origin` now documents that it sets the origin of `Request.url` during generation. Canonical and Open Graph metadata change only when the server entry derives those fields from that request URL.

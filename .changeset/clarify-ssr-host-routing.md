---
'create-foldkit-app': patch
---

The SSR scaffold's Node host now explains why directory page requests reach the server's `fetch` handler. An `ssr.build` build no longer publishes the unrendered `index.html` template beside the browser assets.

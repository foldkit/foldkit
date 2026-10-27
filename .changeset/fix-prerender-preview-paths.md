---
'@foldkit/vite-plugin': patch
'create-foldkit-app': patch
---

Serve prerendered directory-index pages at their declared extensionless paths
during Vite preview. A generated `/about` link now receives the About HTML
before JavaScript runs, matching `/about/` and `/about/index.html`.

Preserve configured base paths, proxy ownership, flat HTML precedence, static
assets, request methods, and existing fallback behavior. Preview still serves
files through Vite and never executes the server entry. Document the equivalent
directory-index or redirect behavior required from deployed static hosts.

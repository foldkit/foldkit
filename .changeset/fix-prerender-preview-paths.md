---
'@foldkit/vite-plugin': patch
'create-foldkit-app': patch
---

Serve prerendered directory-index pages at their declared extensionless paths during Vite preview. A generated `/about` link now receives the About HTML before JavaScript runs, matching `/about/` and `/about/index.html`.

Enable resolution only for prerendered builds. Preserve configured base paths, enabled proxies before and after internal rewriting, exact-file and flat HTML precedence, static assets, request methods, and existing fallback behavior. Reject escaping symlinks and paths whose decoding differs from Vite. Preview still serves files through Vite and never executes the server entry. Document the equivalent directory-index or redirect behavior required from deployed static hosts.

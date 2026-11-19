---
'@foldkit/vite-plugin': patch
'create-foldkit-app': patch
---

Vite preview serves prerendered directory-index pages at their declared routes without a trailing slash. Previously, the generated SSG app returned Home HTML at `/about` even though `about/index.html` contained the About page. Preview now resolves that document internally, preserving the browser URL, query string, and Vite's file serving and fallback behavior. Build output and the public API are unchanged.

The generator's bundled package snapshot includes the corrected plugin for newly created apps.

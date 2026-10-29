---
'foldkit': minor
'create-foldkit-app': patch
---

Add `Route.parsePathWithFallback` to decode an origin-relative path and its query parameters into a typed Route. It uses the same URL normalization and complete-path matching as full-URL parsing, ignores fragments, and returns the configured fallback for unsupported paths, absolute URLs, and network paths.

Document query decoding at the URL boundary so applications store typed return Routes in their Models and use those values directly in rendering and selectors.

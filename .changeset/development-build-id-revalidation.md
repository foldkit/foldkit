---
'@foldkit/vite-plugin': patch
---

Preserve SSR hydration after a development server restart when installed Foldkit modules remain in the browser's immutable dependency cache. Development build-token modules now import the current identity from a virtual module that the browser revalidates. Production builds still inline their identity and retain deployment mismatch checks. Adapts [#1752](https://github.com/foldkit/foldkit/pull/1752) for [#1677](https://github.com/foldkit/foldkit/issues/1677).

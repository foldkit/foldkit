---
'foldkit': minor
---

Add `render` from `foldkit/test/dom` for structural DOM and accessibility tests. Pass an Html or Document view callback to render through Foldkit's patch and shared-Html deduplication. The result provides an attached `container` and an idempotent `dispose()` that removes the view and restores Document title, lang, and dir.

Mounts do not execute, and Foldkit event handlers are not installed. The helper does not run update, Commands, or Subscriptions. Use Scene to test state transitions and a browser test for layout or Mount-dependent accessibility. A DOM environment such as happy-dom is required.

```ts
import { render } from 'foldkit/test/dom'

const rendered = render(h => ({
  title: 'Settings',
  lang: 'en',
  body: h.main([], [h.h1([], ['Settings'])]),
}))

try {
  // Assert on rendered.container or pass it to an accessibility checker.
} finally {
  rendered.dispose()
}
```

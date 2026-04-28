---
'foldkit': minor
---

`view` now returns a `Document` instead of `Html`, and the `title` callback on `makeProgram` is gone.

A `Document` is `{ title, body, canonical?, ogUrl? }`. The runtime applies all four on every render: `document.title` is set from `title`, `<link rel="canonical">` and `<meta property="og:url">` are upserted from `canonical` and `ogUrl` (creating the tags if they're not already in the document head), and `body` is patched into the application container as before. When `canonical` is omitted it defaults to the current URL (origin + pathname + search); when `ogUrl` is omitted it falls back to `canonical`.

This fixes a bug where Safari's system Share menu would copy the URL the page was originally loaded from rather than the page the user navigated to. `<link rel="canonical">` was static, and Safari reads canonical first when copying a link.

Migrating an existing app:

```ts
// Before
import { Html } from 'foldkit/html'

const view = (model: Model): Html => div([], [...])

Runtime.makeProgram({
  view,
  title: (model) => `Page ${model.page}`,
  // ...
})

// After
import { Document } from 'foldkit/html'

const view = (model: Model): Document => ({
  title: `Page ${model.page}`,
  body: div([], [...]),
})

Runtime.makeProgram({
  view,
  // title field removed
})
```

`crash.view` follows the same shape and now returns a `Document` too.

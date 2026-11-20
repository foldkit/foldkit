---
'foldkit': minor
---

**Breaking:** `Url` keeps an empty fragment and an empty query apart from a missing one. `Url.fromString('https://app.example.com/docs#')` now has `hash: Option.some('')`, and `/docs?` has `search: Option.some('')`. Both were `Option.none()`, the same as `/docs`. The URLs the runtime passes to `onUrlRequest` and `onUrlChange` for a link click, Back and Forward, and a programmatic navigation follow the same rule, so a click on `<a href="#">` reports `hash: Option.some('')`. The query runs to the first `#` and the fragment to the end, so `/login?next=/units?page=2#section#sub` keeps `next=/units?page=2` and `section#sub`. `Url.toString` writes the `#` and the `?` back, so the round trip is exact.

Code that passes `url.hash` to a selector must handle the empty string. `document.querySelector('#')` throws a `SyntaxError`. The HTML Standard sends an empty fragment to the top of the document:

```ts
Option.match(url.hash, {
  onNone: () => [],
  onSome: hash => [
    String.isEmpty(hash) ? ScrollToTop() : ScrollToAnchor({ hash }),
  ],
})
```

Code that reads `url.search` through `URLSearchParams` or a Foldkit route parser needs no change. An empty query has no parameters.

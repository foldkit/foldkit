---
'foldkit': minor
---

Complete Scene's AccName 1.2 "text alternative from native host language" coverage and expand the implicit role map.

`Scene.role(tag, { name })` now resolves accessible names from every native-host source in the W3C AccName 1.2 spec:

- `img.alt` and `area.alt`
- `input[type="image"].alt`
- `input[type="submit|button|reset"].value`
- `<fieldset>` → text of its `<legend>` child
- `<figure>` → text of its `<figcaption>` child
- `<table>` → text of its `<caption>` child

The implicit role map was extended with common elements that previously matched nothing: `p` (paragraph), `hr` (separator), `dialog`, `main`, `aside` (complementary), `fieldset`/`details` (group), `figure`, `output` (status), `progress` (progressbar), `meter`, `summary` (button), `tr` (row), `td` (cell). `input[type="image|button"]` now correctly map to role `button`.

Edge cases from the ARIA-in-HTML spec are now handled:

- `<img alt="">` has role `presentation`, not `img`.
- `<a>` and `<area>` without an `href` have role `generic`, not `link`.
- `<th scope="row">` has role `rowheader`; otherwise `columnheader`.

Context-sensitive landmark roles are now resolved by walking the ancestor chain:

- `<header>` has role `banner` unless it descends from `<article>`, `<aside>`, `<main>`, `<nav>`, or `<section>`, in which case it's `generic`.
- `<footer>` has role `contentinfo` under the same conditions.
- `<section>` has role `region` when it has an accessible name (via `aria-label`, `aria-labelledby`, or `title`); otherwise `generic`.

---
'@foldkit/ui': minor
---

Add `Ui.Nav`, a stateless, headless primitive for URL-driven navigation. It renders a navigation landmark whose items are links, marking the current destination with `aria-current="page"`, derived from an `isItemCurrent` predicate the consumer drives from the URL. Reach for `Ui.Tabs` instead when switching content within a single page.

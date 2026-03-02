---
'foldkit': minor
---

### Breaking Changes

- **Subscriptions extracted to domain module** — `makeSubscriptions` moved out of runtime into a dedicated `subscription` module
- **Listbox split into single-select and multi-select** — the listbox component is now two separate modules (`listbox/single` and `listbox/multi`) instead of a unified component. `selectedValues` is now derived inside `makeView` instead of being required in `ViewBehavior`

### Features

- **Managed resources** — add model-driven acquire/release lifecycle for long-lived browser resources tied to model state
- **View memoization** — add `createLazy` and `createKeyedLazy` for caching expensive view subtrees
- **Dev-mode slow view warning** — runtime logs a warning when view builds exceed a performance threshold

### Fixes

- **Disclosure** — escape CSS selector for button focus on close
- **HTML** — handle multiline class name strings

---
'foldkit': minor
---

Expand `Scene.role(...)` / `getByRole(...)` options to match RTL semantics. In addition to `name`, the options object now accepts `level` (heading level, from `aria-level` or `h1`–`h6`), `checked` (`boolean | 'mixed'`), `selected`, `pressed` (`boolean | 'mixed'`), `expanded`, and `disabled`. State filters read from the corresponding ARIA attributes (`aria-checked`, `aria-selected`, `aria-pressed`, `aria-expanded`, `aria-disabled`) with fallback to the native props (`checked`, `selected`, `disabled`) where appropriate.

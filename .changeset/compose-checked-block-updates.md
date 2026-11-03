---
'foldkit': minor
'create-foldkit-app': patch
---

Add checked update composition while keeping the exhaustive handler record as the default.

Use `makeUpdate.cases` for additional local handlers, `each` for every dispatch, `on` for selected local Messages, and `except` for every dispatch except selected local tags. `each` and `except` also run for child delivery. Shared pieces return silent Steps or results and cannot emit OutMessages.

Combine pieces into reusable bundles with `makeUpdate.compose`. The completed update contains exactly one full exhaustive update. Pieces run in order against the latest Model, with the original parent Model available as `before` across grouping. Child delivery runs once at the full update's position. Per-Message Command requirements and OutMessages remain checked, and conflicting emitters are rejected. Commands are collected in order without sequencing their effects.

Update scaffold and consumer guidance with the composition rules. Init and receive remain separate entry points.

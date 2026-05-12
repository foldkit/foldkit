---
'foldkit': minor
---

Widen `makeProgram`'s `container` input to `HTMLElement | null`.

The common `document.getElementById('root')` call now passes through without a `!` non-null assertion. If the element is missing, the runtime throws a clear, actionable error at the `makeProgram` call site rather than failing later with a cryptic message.

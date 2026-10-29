---
'foldkit': patch
---

Reject literal backslashes, ASCII control characters and normalized network-path forms in `Route.parsePathWithFallback`, preserving the original input in fallback Routes. Preserve complete URL query and fragment values after their first delimiters so additional `?` or `#` characters are not discarded before route Schema validation. Percent-encoded data, ordinary dot-segment normalization and fragment-independent route matching retain their existing behavior.

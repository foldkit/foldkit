---
'@foldkit/devtools': patch
---

Migrate the overlay to the parent-owned value API in `@foldkit/ui`: the overlay Model now owns the active inspector tab and the scrubber value, passing them in through view inputs and folding the Tabs `Selected` and Slider `ChangedValue` OutMessages. No user-facing behavior change. Part of #676.

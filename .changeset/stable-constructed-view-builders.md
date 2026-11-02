---
'foldkit': patch
---

Keep each acquired Block's Html builder stable across renders and extracted view helpers so lazy views can reuse unchanged results. Preserve separate child graph connections for independently acquired implementations.

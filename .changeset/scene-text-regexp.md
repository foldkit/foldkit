---
'foldkit': minor
---

Accept regular expressions in `Scene.text`, `Scene.all.text`, `Scene.getByText`, and `Scene.getAllByText`. Tests can now locate dynamic text such as `Scene.text(/^save \d+ items$/i)` without supplying the full literal value.

Patterns match combined element text, including nested content. Anchors and flags control matching; the `exact` option applies only to strings. Each candidate is tested from index zero, including global and sticky patterns, without changing the supplied regular expression's `lastIndex`.

Existing string matching stays the same. Single text queries still return the first most-specific matching element, while multi-match queries include matching ancestors in traversal order.

---
'foldkit': minor
---

`Scene.text`, `Scene.all.text`, `Scene.getByText`, and `Scene.getAllByText` now accept regular expressions. For example, `Scene.text(/^save \d+ items$/i)` finds `Save 3 items` without hard-coding the number or capitalization.

A regular expression tests an element's full text, including text from nested elements. Scene starts at index zero for each element and leaves the expression's `lastIndex` unchanged, so global and sticky expressions produce the same results when a query runs more than once. The `exact` option applies only to strings.

String matching has not changed. When an ancestor and one of its descendants both match, a single text query returns the descendant. A multi-match query returns both in traversal order.

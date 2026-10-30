---
foldkit: patch
---

A click on an SVG link goes through `onUrlRequest`, including one written with `xlink:href`. A chart bar or a map region no longer loads a new document, and the click listener no longer throws when that link's `href` is not a string. A cross-origin SVG link reports the resolved URL, the same way an HTML link does.

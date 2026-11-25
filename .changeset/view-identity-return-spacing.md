---
'@foldkit/vite-plugin': patch
---

Stop the view identity transform from breaking functions whose `return` is followed directly by its value (`return"text"`). The transform joined `return` and the branding call into one identifier, so calling the function threw a `ReferenceError`. It now separates them with a space.

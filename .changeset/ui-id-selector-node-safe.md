---
'@foldkit/ui': patch
---

Build id selectors with a local CSS identifier escape instead of the `CSS` browser global, so views that construct selectors also render under Node during server rendering.

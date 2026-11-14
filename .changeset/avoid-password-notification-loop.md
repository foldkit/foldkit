---
'foldkit': patch
---

Exclude 1Password notification hosts from modal isolation to prevent competing inert observers from freezing the page. Background isolation and the dialog focus trap remain active. Resolve every matching allowed overlay, including notifications inserted after a dialog opens.

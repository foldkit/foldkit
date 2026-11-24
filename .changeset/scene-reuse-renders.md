---
'foldkit': patch
---

Scene tests no longer render the view again after a step that leaves the Model unchanged, such as an assertion. Each scene also keeps one boundary registry across its renders, as the runtime does for an app, so `createLazy` and `createKeyedLazy` views reuse their cached VNodes between steps while their arguments are unchanged. A scene that makes many assertions against a large view renders it once instead of once per assertion.

---
'foldkit': patch
---

Fix beveled appearance of DevTools inspector tabs, the resume button, and the filter button. A find-and-replace during a recent refactor accidentally inlined `h.` into three CSS class strings (`dt-tab-h.button`, `dt-resume-h.button`, `dt-filter-h.button`), so each button fell back to UA-default styling (white background, system bevel). The class names are restored to `dt-tab-button`, `dt-resume-button`, and `dt-filter-button`.

---
'foldkit': minor
---

Add deep submodel filtering to DevTools. The message filter now recursively unwraps nested `Got*Message` wrappers, so submodels at any depth appear in the filter dropdown. Each filter level displays the tag one level deeper than the selected submodel, giving distinct views at each nesting depth. Also fixes the filter button hover state when the listbox is open, and fixes a listbox bug where closing via pointer down would reset state needed by the subsequent click handler.

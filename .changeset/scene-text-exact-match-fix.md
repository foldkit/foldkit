---
'foldkit': patch
---

Fix `Scene.text` exact match failing on text nodes with sibling elements. When a text node is a direct child of an element alongside other element children, exact matching now checks individual text nodes instead of only the parent's combined textContent.

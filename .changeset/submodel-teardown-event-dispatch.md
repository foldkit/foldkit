---
'foldkit': patch
---

A Submodel's boundary now stays registered until every `destroy` hook in the removed subtree has run, so an event that one of those hooks causes on an element that still listens reaches `update` instead of throwing `dispatchAcrossBoundary missing wrap`. Say a Submodel renders only a Popover panel, and the panel has focus. Pressing Escape closes the Popover and empties the Submodel's slot in one patch. The panel's Mount release removes the portaled panel, and Chromium fires `blur` on it. The `OnBlur` listener used to dispatch through a boundary that was already deregistered, which threw on every such close.

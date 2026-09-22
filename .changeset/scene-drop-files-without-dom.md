---
'foldkit': patch
---

`Scene.dropFiles` now delivers files to `OnDropFiles` in Node without requiring DOM globals. Previously, the handler referenced `Element` while checking drag-zone state and threw before dispatching the Message.

`OnDragEnter`, `OnDragLeave`, and `OnDrop` also skip element bookkeeping when `Element` is unavailable. Browser drag tracking, default prevention, and file delivery are unchanged.

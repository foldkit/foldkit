---
'foldkit': minor
---

Scene starts a Mount when its element is inserted. An `OnMount` added to an element that is already in the tree no longer stays pending, because the runtime reuses that DOM node and does not run `execute`. A test that resolved that Mount has to drop the resolve.

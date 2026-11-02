---
'@foldkit/devtools': patch
---

Rebuild the DevTools overlay as a Block program. Its root `Application` Block holds its Foldkit UI components as child instances, and `Program.makeElement` provides their Layers and the overlay's store, ShadowRoot, and browser storage services.

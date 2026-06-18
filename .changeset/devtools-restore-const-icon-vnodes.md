---
'@foldkit/devtools': patch
---

Render the overlay's shared icons (pause, diff dots, filter check, scroll-to-top
arrow) and the empty-inspector placeholder from plain `VNode` constants again.
The per-call factory workaround these used is no longer needed now that the
runtime clones a reused `VNode` before patching, so a shared constant can sit at
more than one position safely. No visible behavior change.

---
'@foldkit/ui': patch
---

Declare the Messages emitted by Toast's swipe-pointer and Escape-key Subscriptions so Scene can validate their outputs. Register `Toast.subscriptions` in the Scene config when using `Subscription.emit` for swipe Messages.

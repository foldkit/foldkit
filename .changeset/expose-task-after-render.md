---
'foldkit': minor
---

Expose `Task.afterRender`, an Effect that completes after the runtime's next render commits. The Task DOM helpers (`focus`, `clickElement`, `scrollIntoView`, etc.) already gate themselves with this internally; reach for it directly when building custom Commands or DOM-observing Subscriptions whose targets were just brought into existence (or moved, or had their attributes changed) by the same Message.

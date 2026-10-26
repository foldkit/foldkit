---
'create-foldkit-app': patch
---

Clarify Subscription handler organization: split modules export their registry, and local handler bundles compose `Feature.subscriptions.layer` directly. A Block with only that registry passes `EffectsLayer: subscriptions.layer` to `prepareBlock`.

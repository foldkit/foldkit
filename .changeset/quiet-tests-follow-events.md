---
'foldkit': minor
'create-foldkit-app': patch
---

Add test steps for event ordering and Model-derived Messages.

`Scene.Command.keepPending` lets one exact Command invocation remain pending while a later interaction or delivered Message arrives. The Command stays visible to assertions and resolution, and both `resolveAllExact` and the final Scene completeness check still require it to be resolved.

`Story.messageWith(model => message)` builds a Message from the Model held when its step runs. It follows the same pending Command behavior as `Story.message`.

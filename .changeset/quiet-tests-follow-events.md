---
'foldkit': minor
'create-foldkit-app': patch
---

Add focused test steps for event ordering and Model-derived Messages.

`Scene.Command.keepPending` lets one exact ordinary Command invocation remain active while a later interaction or Subscription Message arrives. The Command stays visible to assertions and resolution, and both `resolveAllExact` and final Scene completeness still require it.

`Story.messageWith` builds a Message from the Model held when its step runs. `Story.Subscription.from(CompletedBlock.subscriptions).emit(entry, message)` delivers a decoded Message through a registered Subscription's generated parent mapping. Both retain Story's existing pending Command behavior.

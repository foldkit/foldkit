---
'@foldkit/ui': minor
---

Add `Animation.test.paint` and `Animation.test.settled` steps for Story and Scene tests. Each step reads the generation from the actual pending Animation Command and resolves it through the runner, including its parent Message mapping. Tests can cover repeated enter and leave transitions without counting generations by hand.

Add `Animation.test.resolveAll` to compose these steps with ordinary `[Command, resultMessage]` resolvers. Ordinary resolvers retain their cascade and carry behavior. Each generation entry resolves one dispatch; unmatched generation entries are skipped and do not carry across calls. Standalone steps report missing Commands with a list of pending Commands.

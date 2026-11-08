---
'foldkit': minor
---

Allow Scene views and Document bodies to render `h.empty`. Empty roots produce no Locator matches, can transition to and from ordinary elements, and preserve root Mount disposal and ordinary interaction failures.

Export `Scene.Step<typeof subject>` and `Story.Step<typeof subject>` for reusable Block-aware test helpers. The types retain the selected implementation Layer's Messages, OutMessages, InMessages, keyed Subscription graph and routing through source and relocated declarations; the paired subject keeps the runner's exact update and InMessage Context requirements.

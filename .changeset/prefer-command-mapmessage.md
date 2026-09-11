---
'@foldkit/oxlint-plugin': minor
'foldkit': patch
---

Add the `prefer-command-mapmessage` rule, which flags lifting a Command result Message through `Command.mapEffect` with an `Effect.map` that returns a Message constructor. The manual wrap dispatches correctly in production but records nothing on the message-mapping chain that Story and Scene `resolve` replay, so tests see the raw child Message. Use `Command.mapMessage` or `Command.mapMessages`, which record the lift. `Command.mapEffect`'s TSDoc now points to the rule.

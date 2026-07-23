---
'@foldkit/oxlint-plugin': minor
'foldkit': patch
---

Add the `prefer-command-mapmessage` rule, which flags lifting a Command result Message through `Command.mapEffect` (an `Effect.map` whose arrow returns a Message constructor) and steers to `Command.mapMessage` / `mapMessages`. The manual wrap dispatches correctly in production but records nothing on the message-mapping chain that `Story` / `Scene` `resolve` replays, so the test sees the raw child Message instead of the wrapped one. `Command.mapEffect`'s TSDoc now points to the rule.

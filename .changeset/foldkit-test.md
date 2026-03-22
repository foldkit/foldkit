---
'foldkit': minor
---

Add `foldkit/test` — a testing module for Foldkit programs. Six functions:

- `Test.story` — run a test story for an update function, throw on unresolved Commands
- `Test.with` — set the initial Model for a story
- `Test.message` — send a Message (throws if Commands from a previous step are unresolved)
- `Test.resolve` — resolve one Command inline with its result (throws if the Command isn't pending; accepts an optional `toParentMessage` mapper for Submodel testing)
- `Test.resolveAll` — resolve many Commands inline with cascading support
- `Test.tap` — assert on model, message, commands, outMessage

Also requires result Message schemas on `Command.define`:

```ts
Command.define('FetchWeather', SucceededFetchWeather, FailedFetchWeather)
```

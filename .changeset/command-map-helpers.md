---
'foldkit': minor
---

Add `Command.mapMessage` and `Command.mapMessages` for lifting Commands through a Message-mapping function. Collapses the `Command.mapEffect` composed with `Effect.map` boilerplate that Submodel embeddings used to write at every delegate site.

### `Command.mapMessages`

Lifts every Command in a list through a Message mapper.

```ts
const mapMessages: <FromMessage, ToMessage, E = never, R = never>(
  commands: ReadonlyArray<Command.Command<FromMessage, E, R>>,
  f: (message: FromMessage) => ToMessage,
) => ReadonlyArray<Command.Command<ToMessage, E, R>>
```

### `Command.mapMessage`

The singular complement. Lifts a single Command's result Message through a mapper. Reach for it when a child returns one Command (e.g. an animation leave Command); reach for `mapMessages` when it returns a list.

```ts
const mapMessage: <FromMessage, ToMessage, E = never, R = never>(
  command: Command.Command<FromMessage, E, R>,
  f: (message: FromMessage) => ToMessage,
) => Command.Command<ToMessage, E, R>
```

### Migration

Before:

```ts
const mappedCommands = commands.map(
  Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
)
```

After:

```ts
const mappedCommands = Command.mapMessages(commands, message =>
  GotChildMessage({ message }),
)
```

Both helpers preserve each Command's `name` and `args`, so DevTools traces still attribute the Command to the originating Submodel. `Command.mapEffect` stays exposed for the rare case where the Effect itself (not just its result Message) needs transformation.

---
'foldkit': minor
---

Replace `Story.tap` with focused assertion helpers: `Story.model` for Model assertions, `Story.expectHasCommand` / `Story.expectCommands` / `Story.expectNoCommands` for Command assertions, and `Story.expectOutMessage` / `Story.expectNoOutMessage` for OutMessage assertions. Remove `message` from the public `StorySimulation` type.

Migrate from `Story.tap`:

- `Story.tap(({ model }) => { ... })` → `Story.model(model => { ... })`
- `Story.tap(({ commands }) => { expect(commands[0]?.name).toBe(Foo.name) })` → `Story.expectHasCommand(Foo)`
- `Story.tap(({ commands }) => { expect(commands).toHaveLength(0) })` → `Story.expectNoCommands()`
- `Story.tap(({ outMessage }) => { expect(outMessage).toEqual(Option.some(Foo())) })` → `Story.expectOutMessage(Foo())`
- `Story.tap(({ outMessage }) => { expect(outMessage).toEqual(Option.none()) })` → `Story.expectNoOutMessage()`

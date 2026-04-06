---
'foldkit': minor
---

Add purpose-specific Story assertion functions: `model`, `expectHasCommand`, `expectCommands`, `expectNoCommands`, `expectOutMessage`, `expectNoOutMessage`. Remove `tap` — use the new functions instead.

Migration:

- `Story.tap(({ model }) => { ... })` → `Story.model(model => { ... })`
- `Story.tap(({ commands }) => { expect(commands[0]?.name).toBe(X.name) })` → `Story.expectHasCommand(X)`
- `Story.tap(({ commands }) => { expect(commands).toHaveLength(0) })` → `Story.expectNoCommands()`
- `Story.tap(({ outMessage }) => { expect(outMessage).toEqual(Option.some(x)) })` → `Story.expectOutMessage(x)`
- `Story.tap(({ outMessage }) => { expect(outMessage).toEqual(Option.none()) })` → `Story.expectNoOutMessage()`

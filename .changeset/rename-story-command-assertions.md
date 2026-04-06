---
'foldkit': minor
---

Rename Story Command assertion helpers for clarity:

- `Story.expectHasCommand(definition)` → `Story.expectHasCommands(...definitions)` — now accepts one or more Command definitions and asserts all are present among pending Commands
- `Story.expectCommands(...definitions)` → `Story.expectExactCommands(...definitions)` — same behavior, clearer name

Migration:

```ts
// Before
Story.expectHasCommand(FetchWeather)
Story.expectCommands(FetchWeather, SaveBoard)

// After
Story.expectHasCommands(FetchWeather)
Story.expectExactCommands(FetchWeather, SaveBoard)
```

---
'foldkit': minor
---

Replace `Command.make` with `Command.define` — a branded `CommandDefinition` that is the only way to create Commands. Definitions are PascalCase constants that carry type-level identity (literal name, `CommandDefinitionTypeId` brand). Access the name via `.name` on the definition.

**Breaking:** `Command.make` is removed. Replace all usages:

```ts
// Before
const fetchWeather = (city: string) =>
  Effect.gen(function* () { ... }).pipe(
    Effect.catchAll(() => Effect.succeed(FailedFetchWeather())),
    Command.make('FetchWeather'),
  )

// After
const FetchWeather = Command.define('FetchWeather')

const fetchWeather = (city: string) =>
  FetchWeather(
    Effect.gen(function* () { ... }).pipe(
      Effect.catchAll(() => Effect.succeed(FailedFetchWeather())),
    ),
  )
```

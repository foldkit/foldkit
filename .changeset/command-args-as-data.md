---
'foldkit': minor
'@foldkit/devtools-mcp': minor
---

Take Command args as data in `Command.define`.

`Command.define` is now a curried call. The first call binds the name and result Message schemas (and optionally an args Schema record); the second binds the Effect, or an effect builder when args are declared. The returned Definition is callable to produce a Command instance: pass the declared args, or call with no args for argless Commands.

Each Command instance carries its args as a field, and the runtime surfaces that field through:

- **OpenTelemetry span attributes**: the args record is attached to the span wrapping the Command's Effect.
- **The DevTools Commands tab**: each Command renders as a tag at the top of its row with the declared args as a data tree below (chevrons for nested fields). Argless Commands show only the name.
- **The MCP wire protocol** consumed by `@foldkit/devtools-mcp`: `SerializedEntry.commandNames` and `ResponseInit.commandNames` are replaced by `commands: Array<{ name: string; args: Option<Record<string, unknown>> }>`.
- **`Story.Command` / `Scene.Command` matchers** (`expectHas`, `expectExact`, `resolve`, `resolveAll`): each now accepts either a Command Definition (matches by name; existing lax behavior) or a Command instance (matches by name AND structural-equal args; new strict behavior). Pass a Definition when the test only cares that the Command was dispatched; pass an instance when the test should verify the args the runtime captured.

```ts
// Lax: matches any FetchWeather, regardless of args
Scene.Command.expectExact(FetchWeather)

// Strict: only matches FetchWeather({ zipCode: '90210' })
Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))
```

Failure messages now show the args dispatched alongside the args expected, so a wrong-args mismatch reads `FetchWeather {"zipCode":"99999"}` vs `FetchWeather {"zipCode":"90210"}` rather than just `FetchWeather`.

## Migration

### Argless Commands

```ts
// Before
const LockScroll = Command.define('LockScroll', CompletedLockScroll)
const lockScroll = LockScroll(
  Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
)

// At the call site:
return [model, [lockScroll]]
```

```ts
// After
const LockScroll = Command.define(
  'LockScroll',
  CompletedLockScroll,
)(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())))

// At the call site:
return [model, [LockScroll()]]
```

The camelCase factory (`lockScroll`) goes away. The PascalCase Definition (`LockScroll`) is now the thing you call directly with `()`.

### Commands that previously closed over values

If your old Command captured values via closure:

```ts
// Before
const FetchWeather = Command.define(
  'FetchWeather',
  SucceededFetchWeather,
  FailedFetchWeather,
)
const fetchWeather = (zipCode: string) =>
  FetchWeather(
    Effect.gen(function* () {
      // ...uses zipCode via closure...
    }),
  )

// At the call site:
return [model, [fetchWeather('90210')]]
```

declare those values as Schema-typed args:

```ts
// After
const FetchWeather = Command.define(
  'FetchWeather',
  { zipCode: S.String },
  SucceededFetchWeather,
  FailedFetchWeather,
)(({ zipCode }) =>
  Effect.gen(function* () {
    // ...uses zipCode from the destructured args...
  }),
)

// At the call site:
return [model, [FetchWeather({ zipCode: '90210' })]]
```

Only values that vary per dispatch should become args. Module-level constants stay in lexical scope. Runtime dependencies stay where they live: app-wide ones in `Resources`, model-driven ones in `ManagedResources`, anything else as a service tag on the Effect's context channel. The Effect pulls them all with `yield*`.

### Submodel patterns

`Command.mapEffect` still preserves both name and args through wrapping, so Submodel chains via `Got*Message` continue to work unchanged. No edits needed at sites like:

```ts
childCommands.map(
  Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
)
```

### `@foldkit/devtools-mcp` consumers

The wire shape changed:

```diff
- SerializedEntry.commandNames: Array<string>
+ SerializedEntry.commands: Array<{ name: string; args: Option<Record<string, unknown>> }>
- ResponseInit.commandNames: Array<string>
+ ResponseInit.commands: Array<{ name: string; args: Option<Record<string, unknown>> }>
```

Reading the previous string: pull `command.name`. Reading the new args data: read `command.args` as `Option<Record<string, unknown>>` (`None` for argless Commands, `Some(record)` when args were declared).

### Tests

Existing `Story.Command` / `Scene.Command` calls keep working, since passing a Definition still matches by name (lax). To strengthen a test, pass a Command instance instead of the Definition:

```ts
// Lax (old, still works)
Scene.Command.expectExact(FetchWeather)

// Strict (new, locks in the args)
Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))
```

Use the strict form when the args carry meaning for the test's claim.

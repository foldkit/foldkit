---
'foldkit': minor
'@foldkit/devtools-mcp': minor
---

Take Command args as data in `Command.define` and surface them through to DevTools and the MCP wire protocol.

`Command.define` now collapses the definition + factory pattern into a single declaration whose args are Schema-typed and visible at the value level. The Effect (or effect builder) is bound at definition time; the returned Definition is callable with the declared args (or with no args for argless Commands). Args hang off the resulting Command instance and flow through to OpenTelemetry span attributes attached to the Command's Effect.

```ts
// No args:
const LockScroll = Command.define('LockScroll', CompletedLockScroll)(
  Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
)
LockScroll() // → Command

// With args:
const FetchWeather = Command.define(
  'FetchWeather',
  { zipCode: S.String },
  SucceededFetchWeather,
  FailedFetchWeather,
)(({ zipCode }) =>
  Effect.gen(function* () { ... }),
)
FetchWeather({ zipCode: '90210' }) // → Command, args inspectable on the value
```

The DevTools panel's Commands tab now renders each Command using the same tree the Messages tab uses: the Command name appears as the tag at the top of its row and declared args appear as a data tree below, with chevrons for nested fields. Argless Commands show only the name.

`Story.Command` and `Scene.Command` matchers (`expectHas`, `expectExact`, `resolve`, `resolveAll`) now accept either a Command Definition (matches by name; the existing lax behavior) or a Command instance (matches by name AND structural-equal args; new strict behavior). Pass a Definition when the test only cares that some Command was dispatched; pass an instance when the test should verify the args the runtime captured.

```ts
// Lax: matches any FetchWeather, regardless of args
Scene.Command.expectExact(FetchWeather)

// Strict: only matches FetchWeather({ zipCode: '90210' })
Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))
```

Failure messages now show the args that were dispatched alongside the args that were expected, so a wrong-args mismatch reads like `FetchWeather {"zipCode":"99999"}` vs `FetchWeather {"zipCode":"90210"}` rather than just `FetchWeather`.

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

The args record now flows through to OTel span attributes, the DevTools Commands tab, the MCP wire shape, and Story/Scene matchers, instead of being invisible closure state.

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

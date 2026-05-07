---
'foldkit': minor
'@foldkit/devtools-mcp': minor
---

Take Command args as data in `Command.define` and surface them through to DevTools and the MCP wire protocol.

`Command.define` now collapses the definition + factory pattern into a single declaration whose args are Schema-typed and visible at the value level. The Effect (or effect builder) is bound at definition time; the returned Definition is callable with the declared args (or with no args for argless Commands). Args hang off the resulting Command instance and flow through to OpenTelemetry span attributes for free observability.

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

This is a breaking change to `Command.define`. Existing call sites should migrate from the previous shape (`Command.define(name, ...results)` returning a factory that took an Effect) to the new curried shape (`Command.define(name, ...results)(effect)` for argless, or `Command.define(name, args, ...results)(builder)` when you want args on the value).

It is also a breaking change to the DevTools wire protocol consumed by `@foldkit/devtools-mcp`. `SerializedEntry.commandNames: Array<string>` is replaced by `commands: Array<{ name: string; args: Option<Record<string, unknown>> }>`, and the same shape replaces `commandNames` on `ResponseInit`. MCP clients reading these fields need to pull `command.name` for the previous string and read `command.args` for the new args data.

`Story.Command` and `Scene.Command` matchers (`expectHas`, `expectExact`, `resolve`, `resolveAll`) now accept either a Command Definition (matches by name; the existing lax behavior) or a Command instance (matches by name AND structural-equal args; new strict behavior). Pass a Definition when the test only cares that some Command was dispatched; pass an instance when the test should verify the args the runtime captured.

```ts
// Lax: matches any FetchWeather, regardless of args
Scene.Command.expectExact(FetchWeather)

// Strict: only matches FetchWeather({ zipCode: '90210' })
Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))
```

Existing tests keep working unchanged. Failure messages now show the args that were dispatched alongside the args that were expected, so a wrong-args mismatch reads like `FetchWeather {"zipCode":"99999"}` vs `FetchWeather {"zipCode":"90210"}` rather than just `FetchWeather`.

# The single `execute` Command pattern: findings

An honest evaluation of replacing Foldkit's "a Command is a named Effect that carries its own requirements" model with the Elm effects pattern: Commands as inert tagged data, interpreted by a single `execute` function, with all requirements provided once at the runtime boundary.

This is a spike. Do not merge.

## The implementation

- Pattern module: `packages/foldkit/src/dataCommand/dataCommand.ts` (exported as `DataCommand` from the main barrel and as `foldkit/dataCommand`).
- Converted apps, all committed on this branch:
  - `examples/weather` (HttpClient requirement)
  - `examples/todo` (KeyValueStore requirement, flags)
  - `examples/auth` (routing, flags, nested Submodels with OutMessage)
  - `packages/typing-game/client` (RPC client, sessionStorage, Subscriptions, Submodels with context and OutMessage)

Branch note: the task asked for `experiment/execute-pattern`; this environment mandates `claude/steelman-execute-pattern-7fml6z`, so the work lives there. The findings file sits at `experiment/execute-pattern/FINDINGS.md` as requested.

The module is small. The whole pattern fits in four exports:

```ts
/** A Command expressed as inert tagged data. */
export type DataCommand = Readonly<{ _tag: string }>

/** The single interpreter. Total over the union, never fails. */
export type Execute<Command extends DataCommand, Message, R = never> = (
  command: Command,
) => Effect.Effect<Message, never, R>

/** Interprets one data Command into the runtime's Command record.
 *  `_tag` drives the span name, the remaining fields the span attributes. */
export const toCommand: <Command extends DataCommand, Message, R>(
  execute: Execute<Command, Message, R>,
) => (command: Command) => InterpretedCommand<Message, R>

/** The data-world `Command.mapMessage`: lifts a child's execute into the
 *  parent's Message universe. Lives at the interpreter, not the update. */
export const delegate: <ChildCommand, ChildMessage, ParentMessage, R>(
  execute: Execute<ChildCommand, ChildMessage, R>,
  liftMessage: (message: ChildMessage) => ParentMessage,
) => Execute<ChildCommand, ParentMessage, R>
```

plus `DataCommand.makeProgram`, which mirrors the four `Runtime.makeProgram` config shapes, takes `execute`, and interprets every Command at the runtime boundary before handing off to the existing runtime.

### Why the runtime needed no changes, and why that is itself a finding

The spec says "the runtime calls `execute` instead of reading `command.effect`". Implementing that literally would have meant editing two lines in `runtime.ts` (lines 779 and 912, `command.effect` becomes `execute(command)`) and duplicating six program config types. Nothing else in 1,800 lines would change, because the runtime already is an interpreter over `{ name, args, effect }` records: it already discharges requirements in exactly one place (`provideAllResources`, runtime.ts:656) and already spans on `name`/`args`. So `makeProgram` here adapts at the boundary instead: `init` and `update` are composed with `toCommands(execute)`, and the runtime behaves identically (effects are lazy; constructing them at the boundary runs nothing).

This is the first honest result: **the architectural property the proposal is chasing (interpretation at the edge, requirements provided once) is not absent from Foldkit. It is where the runtime already lives.** The proposal only moves the point where an Effect gets attached to a Command from `Command.define` (app code, distributed) to `execute` (app code, centralized). The runtime is indifferent.

## Current model summary (the baseline being compared against)

- `Command<T, E, R>` is `{ name, args?, effect }`. `Command.define(name, args?, ...results)(effect)` binds the Effect at definition time and returns a callable Definition carrying a type-level brand.
- Commands reach the runtime typed `Command<Message, never, Resources | ManagedResourceServices>`. The runtime wraps each in `Effect.withSpan(command.name, { attributes: command.args })` and discharges requirements once via `provideAllResources` (the `resources` Layer plus ManagedResource services).
- In practice the example apps discharge most requirements per Command (`Effect.provide(FetchHttpClient.layer)`, `Effect.provide(RoomsClientLive)`, `Effect.provide(BrowserKeyValueStore.layerLocalStorage)`) inside `Command.define`, reserving the `resources` Layer for long-lived stateful resources. The RuntimeConfig docs explicitly recommend this split.
- Submodel boundaries use `Command.mapMessage` / `mapMessages`, which transform the result Message inside the carried Effect while preserving `name`/`args` for trace attribution. `mapEffect` transforms the Effect itself.
- Convention: "Commands are colocated with the update function that returns them. Never centralize all Commands in one file."

## Per-app conversion log

| App                | Status                         | Evidence                                                                                                                                                                                                                        |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| weather            | Worked                         | `pnpm typecheck` clean, 11 unit tests pass, Playwright e2e passes (2/2)                                                                                                                                                         |
| todo               | Worked                         | typecheck clean, 23 unit tests pass, e2e passes (2/2)                                                                                                                                                                           |
| auth               | Worked                         | typecheck clean, 12 unit tests pass, e2e passes (2/2) including the init-time redirect Command                                                                                                                                  |
| typing-game client | Worked, with one real incident | typecheck clean, 13 unit tests pass, full create-room flow verified in a browser against the live game server (RPC create, URL navigation, sessionStorage save, room Subscription streaming). See the resources incident below. |

Also: all 1,816 existing foldkit package tests pass, the whole workspace typechecks, and lint is clean.

### The typing-game incident: centralized resources couple unrelated Commands

The only behavioral regression found in four app conversions, and it is a direct consequence of the pattern, not a conversion mistake.

`typing-game/client` has no `.env` by default (`VITE_SERVER_URL` unset). Building `RoomsClientLive` therefore throws inside `ViteEnvConfigLive`. On `main`, only RPC Commands build that Layer, so the home page boots fine and the username input is focused by the init-time `FocusUsernameInput` Command; the app degrades gracefully until you actually call the server. On the converted branch, `resources: Layer.merge(RoomsClientLive, BrowserKeyValueStore.layerSessionStorage)` is provided to **every** Command effect. The Layer fails to build, the forked Command fiber dies, and `Effect.forkDetach` swallows it. Result, measured with an instrumented browser:

```
main    : {"focusCalls":[{"id":"username","tag":"INPUT"}],"activeId":"username"}
dataCmd : {"focusCalls":[],"activeId":""}
```

A DOM focus Command silently stopped working because the RPC client configuration was broken. With a `.env` present, the converted app behaves identically to main (verified end to end).

The general statement: **"provide the union of all requirements once" makes every Command's liveness depend on the construction of every service in the union.** The current model's per-Command provide is not just a style choice; it is the mechanism that isolates failure domains. (A mitigation worth doing regardless of this experiment: the runtime could surface resource-Layer construction failure in the crash view instead of letting detached fibers die silently.)

## The six measurements

### 1. Colocation

Where implementations ended up, per app:

- **weather, todo (single-file apps):** `execute` sits in the same file as `update`. Zero colocation cost. The pattern is at its best here.
- **auth:** the current model had Commands defined in three places, each next to its use: `command.ts` (session Commands), `update.ts` (navigation Commands, defined inline above the update that emits them), and `main.ts` (redirect Commands for init, duplicating two definitions from `update.ts`). The data model forces all eight root Commands plus the child delegation case into one union with one exhaustive interpreter, so everything moved to `command.ts`:

  ```ts
  // examples/auth/src/command.ts now owns all of:
  ;(SaveSession,
    ClearSession,
    LogError,
    NavigateInternal,
    LoadExternal,
    RedirectToLogin,
    RedirectToDashboard,
    RedirectToHome,
    LiftLoggedOut)
  ```

  `update.ts` emits `NavigateInternal({ url })` whose implementation now lives a file away. This directly violates the "never centralize Commands" convention, and the violation is structural: `M.tagsExhaustive` over one union means one file must see every branch. You cannot split the interpreter across files without inventing a sub-union per file and composing interpreters, which is exactly the Submodel machinery again, one level down.

- **typing-game:** the damage is bounded because each Submodel keeps its own union and `execute` (`home/command.ts`, `room/command.ts`), and the root only adds its own Commands plus two `Lift*` cases. So the steelman version is not one god-`execute`; it is a tree of `execute`s mirroring the Submodel tree. But within each node, centralization is total: `NavigateHome`, previously defined inline in `room/update/update.ts` next to the `leaveRoom` helper that emits it, had to move to `room/command.ts`.

Net: a tree of interpreters keeps the pattern from collapsing into a single file, but inside every tree node the convention inverts from "definition next to use" to "all definitions in the union file". Adding a Command emitted from `update.ts` now touches two files instead of one.

### 2. Requirement precision

Submodels still express precise requirements. This worked better than expected:

```ts
// home/command.ts
export const execute = (command: Command): Effect.Effect<Message, never, RoomsClient>

// room/command.ts
export const execute = (
  command: Command,
): Effect.Effect<Message, never, RoomsClient | KeyValueStore.KeyValueStore>

// src/command.ts (root): the union of children plus its own
export const execute = (
  command: Command,
): Effect.Effect<Message, never, RoomsClient | KeyValueStore.KeyValueStore>
```

Effect's covariant `R` means a child needing less slots into a parent needing more with no ceremony. `Execute<C, Message, never>` is assignable wherever `Execute<C, Message, Resources>` is expected, so leaf interpreters with no requirements (login's `SimulateAuthRequest`) need no annotation games.

What widens when one Command gains a new service: the owning Submodel's `execute` annotation, every ancestor `execute` annotation up to the root (if annotated; inference would carry it silently, at the cost of errors surfacing far away at `makeProgram`), and `entry.ts`, which must merge the new Layer into `resources`. Three to four files for typing-game. In the current model: zero files beyond the Command itself, because the Command provides its own Layer.

And the precision has a hole the current model does not have: see "same service, different implementation" under walls.

### 3. Boundary transforms

`mapMessage`/`mapMessages` cannot exist for inert data: the result Message does not exist until interpretation, so the lift must live where the Effect is created. The reimplementation is a wrapper variant in the parent's union plus a `delegate` case in the parent's interpreter:

```ts
// Parent union gains a case per child:
export const LiftLogin = ts('LiftLogin', { command: Login.Command })
export const Command = S.Union([LiftLogin])

// update: what used to be
//   Command.mapMessages(commands, message => GotLoginMessage({ message }))
// becomes
const liftedCommands = Array.map(commands, command => LiftLogin({ command }))

// execute: the half that used to be inside mapMessages
LiftLogin: ({ command }) =>
  DataCommand.delegate(Login.execute, message =>
    GotLoginMessage({ message }),
  )(command),
```

One `Command.mapMessages` call became three coordinated pieces in two places (a schema wrapper, an `Array.map`, an interpreter case). In auth, a login Command crosses two boundaries and arrives at the runtime as

```ts
LiftLoggedOut({
  command: LiftLogin({ command: SimulateAuthRequest({ email, password }) }),
})
```

with type

```ts
{ readonly _tag: 'LiftLoggedOut'; readonly command:
  { readonly _tag: 'LiftLogin'; readonly command:
    { readonly _tag: 'SimulateAuthRequest'; readonly email: string; readonly password: string } } }
```

So yes: **the interpreter must know about the hierarchy.** Every parent enumerates its children by name in its union and its interpreter. In the current model the hierarchy is invisible to Commands; `mapMessages` is a single polymorphic function and the parent's update never names the child's Command types at all.

One pleasant exception: a child with no Commands (auth's `loggedIn`) can type its Command list as `ReadonlyArray<never>` and the parent spreads it with no wrapper. Until the child grows its first Command, at which point the parent must add the wrapper, the union case, and the delegate. In the current model that day costs the parent nothing.

`mapEffect` has **no equivalent at all**. A parent that today wraps a child Command's Effect (timeout, retry, race against a cancellation signal) cannot do so from `update`, because there is no Effect to wrap. The transformation itself would have to become data (`WithTimeout({ command, millis })`) with an interpreter case, recursively re-encoding Effect's combinator vocabulary as a Command DSL. I did not find a way around this; it is the sharpest wall in the experiment.

### 4. Tracing

Naively, broken: `toCommand` on the nested value above would name the span `LiftLoggedOut` with a wrapper blob as attributes, and DevTools history would show wrapper tags instead of `SimulateAuthRequest`. The current model's `mapMessages` explicitly preserves `name`/`args` through boundaries.

Engineered around: `toCommand` unwraps lift wrappers (any Command whose only field is `command` holding tagged data) before deriving `name`/`args`, while still executing the full wrapped Command. Spans and DevTools records attribute to the leaf again, and the auth scene test asserting `{ name: 'SimulateAuthRequest' }` at the root proves it works through two layers.

The cost is that the framework now blesses a structural wrapper convention. The heuristic ("exactly one field, named `command`, holding tagged data") would misfire on a legitimate leaf Command shaped like `ScheduleCommand({ command: ... })`. A production version needs an explicit wrapper registry or a branded wrapper constructor, which is more machinery than the thing it replaces (`mapMessage` simply never loses the name because the record is never rewrapped).

One small delta in the other direction: with `Command.define` you choose which args to declare (and therefore what lands in span attributes); a data Command _is_ its args, so a `SaveTodos` span now always carries the entire todos array as attributes.

### 5. The cited benefit: did centralizing requirements buy anything?

Measured outcome: **no, with one conditional exception.**

- The mechanism already exists. `provideAllResources` discharges a single Layer in one place today. The pattern did not add a capability; it removed the alternative (per-Command provide) and forced everything through the existing one.
- It cannot even cover everything. `flags` is typed `Effect.Effect<Flags>` with `R = never`, so auth and todo still call `Effect.provide(BrowserKeyValueStore.layerLocalStorage)` inside `flags`. The promise of "provided in exactly one place" is false on the first app with flags that touch storage: the same Layer appears in `entry.ts` and in `flags`.
- It actively hurt once: the typing-game incident above, where one broken Layer silently killed unrelated DOM Commands.
- The conditional exception: `RoomsClientLive` used to be provided per Command, so every `CreateRoom`/`JoinRoom`/`StartGame` invocation rebuilt the RPC client and its HTTP protocol stack. With `resources`, the runtime memoizes the Layer and one client serves the app's lifetime. That is a genuine improvement in the converted app, but it is **available in the current model today** by passing `RoomsClientLive` as `resources` and deleting the per-Command provides. It is evidence that the example apps underuse `resources`, not evidence for data Commands.

### 6. DX deltas

Adding one new Command with args and a service requirement, files touched and lines:

|                                          | Current model                                                          | Data model                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Definition                               | one `Command.define` block (~8 to 12 lines), in the file that emits it | constructor (1 to 4 lines) + union member (1 line) + interpreter case (~5 to 10 lines), in the union file |
| Files touched (Command in same Submodel) | 1                                                                      | 1 to 2 (`command.ts` plus the emitting `update.ts` if separate)                                           |
| Files touched (new service)              | 1 (provide inside the Command)                                         | 3 to 4 (Submodel `execute` type, each ancestor `execute` type, `entry.ts` resources)                      |
| New child Submodel's first Command       | parent unchanged (`mapMessages` already polymorphic)                   | parent union + wrapper + delegate case                                                                    |

Raw size: the four converted apps went from 726 to 851 lines across 32 files (+17%), with no functionality change.

Inference and annotation burden: low, and roughly equal to the current model. `withReturnType<readonly [Model, ReadonlyArray<Command>]>` replaces `withReturnType<readonly [Model, ReadonlyArray<Command.Command<Message>>]>`. The `execute` return annotation is the one new annotation per module, and it is also the module's requirements manifest, which reads well.

Error quality: good when the union and interpreter disagree (`M.tagsExhaustive` errors name the missing tag precisely). Bad at a distance: forget to merge a Layer into `resources` and the error appears at the `makeProgram` call as an overload mismatch naming `Execute<..., R>` against `never`, several files from the Command that needs the service. The current model's equivalent mistake (forgetting a provide) errors directly on the `Command.define` body.

Test harness: `Story.Command.resolve(FetchWeather, ...)` matches by Definition brand, which schema constructors do not have. Converted tests either interpret on the fly (`resolve(interpret(FetchWeather({ zipCode: '90210' })), ...)`) or pass plain `{ name: 'FetchWeather' }` matchers. Workable, uglier, and it means the Story/Scene Command API would need a data-aware variant if this pattern shipped.

## Where it hits a wall

1. **`mapEffect` has no data equivalent.** Parents cannot transform child Effects from `update`. Every Effect-level transformation must be re-encoded as a Command variant plus interpreter case. This is the wall I could not engineer around (measurement 3).
2. **Same service, different implementation.** Todo and auth use `KeyValueStore` over localStorage; typing-game uses it over sessionStorage. An app needing both cannot express it: the union contains `KeyValueStore.KeyValueStore` once, and `resources` can bind it to one Layer. The current model handles this trivially because each Command provides its own Layer. The workaround (app-defined `LocalStore`/`SessionStore` wrapper services) is real work created by the pattern.
3. **Failure-domain coupling.** The typing-game incident: one failing service Layer silently disabled every Command in the app, including pure DOM ones. Per-Command provide is failure isolation, not boilerplate.
4. **Parents must enumerate children.** Wrapper variant + delegate case per child, growing with the Submodel tree, plus the tracing unwrap convention to undo the wrapping the pattern itself introduced.

## Where DX is worse

- Two files per Command in any app with a separate `update.ts` (definition and implementation in `command.ts`, emission in `update.ts`), against the convention the codebase optimizes for.
- Adding a service requirement ripples through every ancestor `execute` signature and `entry.ts`.
- Boundary code went from one `mapMessages` call to wrapper + map + delegate spread across two files.
- Test matchers lose the Definition shorthand and need interpret shims or stringly `{ name }` matchers.
- The first Command on a previously Command-less child Submodel forces parent edits.

## Where it is actually better

Fairness requires saying these clearly:

- **Commands are values you can assert on.** The weather story test became `expect(commands).toEqual([FetchWeather({ zipCode: '90210' })])`. No harness, no matcher DSL, structural equality just works. This is genuinely nicer than name/args matching against opaque records.
- **Commands are serializable.** The union is a Schema, so the DevTools record of a dispatch's Commands is the Command, not a projection of it. A future record/replay or remote-debugging story (re-running `execute` over a recorded Command log) falls out for free. In the current model a Command cannot be reconstructed from its record because the Effect is a closure.
- **`execute` is a requirements manifest.** One signature per Submodel states everything it needs from the world. Auditing "what can this module do" means reading one union instead of grepping for `Command.define`.
- **One union forbids duplicate definitions.** Auth's `RedirectToDashboard` was defined twice on main (in `update.ts` and `main.ts`); the union made that impossible.
- **The single-file case is free.** For weather and todo the pattern costs nothing and reads beautifully. The costs are a function of Submodel depth, not of the pattern in isolation.
- It pushed the apps toward Layer memoization (`RoomsClientLive` built once), though the current model offers the same via `resources`.

## Verdict

The pattern is implementable on Foldkit without touching the runtime, and all four apps, including the hardest one, work end to end under it. After honest effort to make it good, it is the wrong default for Foldkit, for one structural reason and two Effect-specific reasons:

1. The headline benefit is already shipped. Foldkit's runtime is the central interpreter the proposal asks for; `provideAllResources` is the single provision point. The proposal relocates Effect construction from definition site to a parallel tagged-union dispatch, and that relocation, not interpretation, is what produces every cost above.
2. Effect's requirement system _is_ the inspectable-Command benefit, natively. The thing Elm gains from data Commands (the runtime can see what an effect is) Foldkit already gets at the type level from `R`, per Command, with failure isolation and same-tag-different-Layer flexibility that a single union mathematically cannot express.
3. Elm's `Cmd.map` works because the runtime owns an opaque functor. Re-encoding it as data forces the Submodel hierarchy into every parent's Command union, kills `mapEffect` outright, and requires a blessed wrapper convention just to keep traces attributable.

What is worth stealing: the serializable-Command testing and replay story. A bounded version (an optional `Command.defineData` whose args are the full payload and whose Definition exposes the inert constructor for tests and DevTools, while still binding its Effect at definition) would capture most of the inspectability win with none of the boundary or requirement losses. And independently of this experiment: surface resource-Layer construction failures in the crash view, and consider moving stateless-but-expensive Layers like `RoomsClientLive` into `resources` in the typing-game app.

## Reproduction

```
pnpm --filter foldkit build
pnpm --filter weather-example --filter todo-example --filter auth-example --filter @typing-game/client typecheck
pnpm --filter weather-example --filter todo-example --filter auth-example --filter @typing-game/client test
EXAMPLE_SLUG=weather pnpm --filter @foldkit/examples-e2e test:e2e   # also todo, auth
# typing-game manual run: cp packages/typing-game/client/.env.example packages/typing-game/client/.env
# then pnpm dev:typing-game:server and pnpm dev:typing-game:client
```

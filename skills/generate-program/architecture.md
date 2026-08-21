# Foldkit Architecture Guide

> **Note:** This file is a snapshot of the architecture as practiced in the live Foldkit codebase. If anything here contradicts what `repos/foldkit/examples/` or `repos/foldkit/packages/foldkit/src/` actually do, the live code is canonical. The duplication is intentional so the skill works in downstream projects that haven't vendored the foldkit subtree.

## The TEA Loop

Every Foldkit app follows The Elm Architecture (TEA). A Message arrives. The user clicked a button, a timer fired, an HTTP response came back. The update function receives the current Model and the Message and returns a new Model along with any Commands to execute. The view function renders the new Model as HTML. When the user interacts with the view, it produces another Message, and the loop continues.

The complete cycle, including Subscriptions and ManagedResources:

```
          +------------------------------------------------------+
          |                                                      |
          ↓                                                      |
       Message                                                   |
          |                                                      |
          ↓                                                      |
  +---------------+                                              |
  |    update     |                                              |
  +-------+-------+                                              |
  ↓               ↓                                              |
Model    Command<Message>[]                                      |
  |               |                                              |
  |               +-> Runtime -----------------------------------+
  |                                                              |
  +-> view -> Browser -> user events ----------------------------+
  |                                                              |
  +-> Subscriptions -> Stream<Message> -> Runtime ----------------+
  |                                                              |
  +-> ManagedResources -> lifecycle -----------------------------+
```

Every path on the right side produces a Message that feeds back into update. Commands are one-shot effects. Subscriptions emit a continuous stream of Messages. ManagedResources dispatch Messages when they're acquired, released, or fail to acquire. The Browser sends Messages when the user interacts with the DOM. Four sources, one loop.

There are no escape hatches:

- **Model** is the single source of truth: an Effect Schema struct
- **Messages** are facts about what happened: past-tense, never imperative
- **update** is a pure function: `(model, message) → { model, commands? }`
- **view** is a pure function: `(model, h) → Html`, where `h` is the builder the runtime supplies
- **Commands** are the only place side effects happen. They return Messages

## Core Invariants

### 1. update is Pure

The update function must be deterministic. Given the same Model and Message, it must always return the same result. This means:

- No `Date.now()`, `Math.random()`, or any non-deterministic call
- No DOM access (`document.*`, `window.*`)
- No `console.log` or other I/O
- No `Effect.runSync` / `Effect.runPromise`
- No `async` / `await`
- No mutation of any kind

These operations belong in Commands, which return their results as Messages.

### 2. view is Pure

The view function takes the Model and the builder `h`, and returns Html. It must not:

- Access external state
- Perform side effects
- Close over mutable variables
- Call functions with side effects

Event handlers in the view dispatch Messages. They don't perform actions directly.

### 3. Commands Catch All Errors

Define Command identities with `Command.define`, whose second argument is a config object: `args` (optional) declares the args Schema, `messages` lists every Message the Command can produce, `execute` holds the Effect, and `interrupt` opts into interruption. Every Command must handle its own errors via `Effect.catch(() => Effect.succeed(Message.FailedX(...)))` and convert them to Messages. Commands never throw, so the app never crashes from an unhandled side effect.

Always assign definitions to PascalCase constants. Never use `Command.define` inline in a pipe chain. Definitions live where they're produced, colocated with the update function. Let TypeScript infer Command return types. The `messages` array constrains the Effect's return type at the type level.

For the canonical shapes, study the live examples directly. They stay synced with the API:

- **With args, fallible** (HTTP fetch): `repos/foldkit/examples/weather/src/main.ts` (`FetchWeather`)
- **With args, infallible** (random + return): `repos/foldkit/examples/kanban/src/command.ts` (`GenerateCardId`)
- **With args, storage**: `repos/foldkit/examples/kanban/src/command.ts` (`SaveBoard`)
- **Argless, DOM side effect**: `repos/foldkit/examples/kanban/src/command.ts` (`FocusAddCardInput`)

### 4. Model Encodes All Possible States

Use discriminated unions to make impossible states unrepresentable:

```ts
// WRONG: boolean flags allow impossible combinations
const Model = S.Struct({
  isLoading: S.Boolean,
  isError: S.Boolean,
  data: S.Option(Data),
  error: S.Option(S.String),
})

// RIGHT: each state is a distinct variant
const Idle = ts('Idle')
const Loading = ts('Loading')
const Error = ts('Error', { error: S.String })
const Ok = ts('Ok', { data: Data })
const DataState = S.Union([Idle, Loading, Error, Ok])

const Model = S.Struct({
  dataState: DataState,
})
```

With booleans, you can have `isLoading: true` AND `isError: true`, an impossible state. With unions, you're always in exactly one state.

For **remote data specifically**, don't hand-roll the union. The `AsyncData` module ships it:

```ts
import { AsyncData } from 'foldkit'

const WeatherAsyncData = AsyncData.Schema(WeatherData, S.String)

const Model = S.Struct({
  weather: WeatherAsyncData.schema,
})
```

That gives six states, not four: `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, `Success`. The two extra ones are the reason to use it. `Refreshing` carries the previous data while a reload runs, so a refetch doesn't blank the screen. `Stale` carries both the previous data and the new error, so a failed reload doesn't discard what the user was reading. A hand-rolled `Idle | Loading | Error | Ok` forces both of those regressions.

The module also supplies the operations: `AsyncData.match`, `matchData`, `isPending`, `hasData`, `getData`, `map`, `revalidate`, `revalidateOrLoad`, `loadIfMissing`, `zipWith`, `all`.

`match` hands each branch the bare value rather than the tagged variant, with one exception:

```ts
AsyncData.match(model.notes, {
  onIdle: () => h.empty,
  onLoading: () => spinnerView,
  onRefreshing: data => listView(data),
  onFailure: error => errorView(error),
  onStale: ({ error, data }) => staleView(error, data),
  onSuccess: data => listView(data),
})
```

`onRefreshing`, `onFailure`, and `onSuccess` each take one bare value. `onStale` takes `{ error, data }` because it carries both. `onIdle` and `onLoading` take nothing at all, since there is no payload in those states. Destructuring `({ data })` in `onSuccess` or `onRefreshing` is the easy mistake. Read `foldkit/asyncData`'s `public.d.ts` for the full surface. `repos/foldkit/examples/weather/src/main.ts` is the canonical use.

### 5. Messages Are Facts, Not Commands

Messages describe what happened, not what should happen. The update function decides what to do. Messages don't dictate the response:

```ts
// WRONG: imperative, tells the system what to do
const Message = defineMessageUnion({
  FetchData: {},
  SetFilter: { filter: S.String },
  ShowModal: {},
})

// RIGHT: past-tense, describes what happened
const Message = defineMessageUnion({
  ClickedRefresh: {},
  SelectedFilter: { filter: S.String },
  ClickedOpenModal: {},
})
```

## The update Return Type

`foldkit/update` names the shape so you don't have to:

```ts
import { Update } from 'foldkit'

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    // ...
  })
```

`Update.ReturnWithOutMessage<Model, Message, OutMessage>` is the Submodel counterpart, adding an optional `outMessage` field.

The rule that matters is **name the alias once per file**. `Update.Return` is the clearest spelling and the right default for new code. Its `outMessage?: never` guard prevents an OutMessage-bearing return from flowing into a plain update and being silently discarded. A hand-written plain-return alias is equivalent only when it includes that guard. `Message.match<UpdateReturn>` constrains the whole function, so do not repeat `: UpdateReturn` on the update signature. Use `M.withReturnType<UpdateReturn>()` only when an Effect `Match` over some other tagged union inside a handler needs the same constraint.

The module also carries two combinators for handlers that fan out after a mutation succeeds:

- `Update.combine(model, [step, step, ...])` sequences update steps over one Model, threading the Model through and collecting the Commands.
- `Update.refresh({ read, revalidate, write, load })` builds a step that reloads a cache **only when it already holds data**. A cache sitting at `Idle` returns `{ model }`. That one rule is what makes blanket revalidation safe: a `Succeeded*` handler can list every cache that might be affected without refetching ones nobody has looked at.

```ts
SucceededUpdateNote: ({ note }) =>
  Update.combine(model, [
    replaceNoteInCaches(note),
    refreshNote(note.id),
    refreshAllNotes,
    showToast('Success', `Updated ${note.title}`),
  ])
```

`repos/foldkit/examples/route-transitions/src/main.ts` uses both.

## Flags: Side Effects That Seed the Initial Model

When the initial Model needs data from a side effect (current time, localStorage, browser APIs), use Flags, not module-level constants:

```ts
// WRONG: module-level side effect (stale on HMR, non-deterministic, untestable)
const now = Date.now()
const init = () => ({ model: { createdAt: now } })

// RIGHT: Flags run as an Effect before init, result passed in
const Flags = S.Struct({
  createdAt: S.Number,
})

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis
  return Flags({ createdAt: now })
})

const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => ({
  model: { createdAt: flags.createdAt },
})
```

For a fresh browser boot, Flags are produced by an `Effect<Flags>`. The runtime executes it once before init and passes the result in. This keeps init pure while still allowing side effects to populate the initial Model. Common uses:

- Reading from localStorage/sessionStorage (restoring saved state)
- Getting the current time
- Reading browser capabilities (`navigator.language`, `matchMedia`)

Declare the `Flags` Schema on `Runtime.makeApplication`, then pass the Effect to `Runtime.run`:

```ts
const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
})

Runtime.run(application, { flags })
```

Hydrated applications do not provide a browser Flags Effect. `Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })` decodes the exact Schema-encoded Flags payload emitted by the server. The build id is required and names the deployment the client belongs to; hydration compares it against the id the server stamped on the root before it reads the handoff at all. Missing or invalid server handoff data, and a page from another deployment, are fatal boot errors.

A service used only at startup is discharged inside `flags` with `Effect.provide`, the same way a Command discharges its own (`Effect.provide(BrowserKeyValueStore.layerLocalStorage)`). When the service is an app-wide singleton that Commands also use, leave the requirement in the flags type as `Effect<Flags, never, ApiClientService>` and let `resources` provide it. The runtime builds that Layer once and shares it with Flags, Commands, and Subscriptions. Never provide the same Layer to `flags` and pass it as `resources`: that builds it twice and hands the app two instances of whatever it holds.

## The Submodel Pattern

When a module grows too large, extract a Submodel: a child module with its own Model, Message, init, update, and view.

### Communication

Parent → Child: the parent calls the child's update with child Messages
Child → Parent: the child returns a record with an optional `outMessage`

```ts
// Child update return type
type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

// Child signals to parent
CreatedRoom: ({ roomId, player }) => ({
  model,
  outMessage: OutMessage.SucceededCreateRoom({ roomId, player }),
})

// Parent folds the child update and handles its OutMessage
const foldChildOutMessage = M.type<Child.OutMessage>().pipe(
  M.withReturnType<Update.Step<ParentModel, ParentMessage>>(),
  M.tagsExhaustive({
    SucceededCreateRoom:
      ({ roomId }) =>
      model => ({
        model,
        commands: [navigateToRoom(roomId)],
      }),
  }),
)

const foldChild = Update.foldChild({
  update: Child.update,
  read: (model: ParentModel) => Option.some(model.child),
  write: (model, nextChild) => evo(model, { child: () => nextChild }),
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
  foldOutMessage: foldChildOutMessage,
})

type ParentUpdateReturn = Update.Return<ParentModel, ParentMessage>

const update = (model: ParentModel, message: ParentMessage) =>
  ParentMessage.match<ParentUpdateReturn>(message, {
    GotChildMessage: ({ message }) => foldChild(model, message),
  })
```

### View Delegation

Child views are embedded via `h.submodel`. The child writes a pure `(model, h) => Html` view (no awareness of the parent); the parent declares the Message wrap as data at the embed site:

```ts
// Parent view
h.submodel({
  slotId: 'submit-section',
  view: Child.view,
  model: model.child,
  toParentMessage: message => Message.GotChildMessage({ message }),
})

// Child view, branded with Submodel.defineView
export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.button([h.OnClick(Message.ClickedSubmit())], ['Submit']),
)
```

The runtime resolves the `toParentMessage` wrap at event-fire time through a scope registry, so the child's view stays pure and dispatches in its own Message type. Brand the view with `Submodel.defineView<Model, Message>` so `h.submodel` can infer the child's Message type at the embed site. The `h` the child receives is typed by the child's own Message: the runtime supplies it per frame, so handlers built in the child's body can only carry Messages the child's boundary dispatches.

## Subscriptions

Subscriptions are model-driven streams. They automatically start and stop based on model state.

Build them with `Subscription.make<Model, Message>()(entry => ({ ... }))`. The builder callback receives an `entry(fields, callbacks)` helper. For each subscription, you provide:

- A `fields` map (the bare field map passed as `entry`'s first argument) naming every dependency. The builder calls `S.Struct(fields)` internally and infers the dependency type from this map.
- A `modelToDependencies(model)` function that returns the parameters the stream needs. Wrap an absent dependency in `Option` at the field level. The runtime restarts the stream whenever the dependencies change.
- A `dependenciesToStream(dependencies)` function that turns those parameters into a `Stream<Message>`. Errors should be mapped to a `Failed*` Message inside the stream rather than thrown.

For always-active Subscriptions (keyboard listeners, window resize, animation frame ticks), pass `{}` as the `entry` fields argument and return `{}` from `modelToDependencies`. The Subscription then never stops.

Canonical live examples:

- **Always-active keyboard input**: `repos/foldkit/examples/snake/src/main.ts`
- **Animation-frame-driven game tick**: `repos/foldkit/examples/canvas-art/src/main.ts`
- **Conditional WebSocket connection** (active only when a session exists): `repos/foldkit/examples/websocket-chat/src/main.ts`
- **Production multi-stream pattern**: `repos/foldkit/packages/typing-game/client/src/subscription.ts`

## View Identity and Keys

View functions are the differ's identity boundaries. `@foldkit/vite-plugin` brands every view function's return with that function's identity, so switching between branches that render through different view functions replaces the old subtree instead of patching it, even when both branch roots share a tag. Branches are never keyed. `if`/`else`, ternaries, Effect `Match`, and `switch` all behave the same way: each arm's view function carries its own identity, and continuity is structural.

Extract the arms into named view functions when a same-tag inline ternary must reset DOM state on switch. An inline `cond ? div(...) : div(...)` renders both arms through the enclosing function, so they share one identity and patch in place; two named functions give each arm its own identity.

Write keys in exactly two places:

- **Mapped list items**, keyed by a stable Model id, never by array position. Rows rendered by one row view function all share that function's identity, so the key is what distinguishes them.
- **A shared view function rendering different entities at one position** (a detail page across slugs or ids), keyed by the entity id, so switching entities resets DOM state instead of bleeding it across.

```ts
// Mapped list: key each row by its stable Model id
Array.map(model.items, item => keyed('li')(item.id, [...], [...]))

// Shared view function across entities: key by the entity id
keyed('article')(model.selectedProduct.id, [...], [...])
```

Keys carry identity, never data. A key answers which item or entity occupies a position, not what it currently shows. Never derive a key from displayed data to force a refresh when content changes:

```ts
// Wrong: the key restates displayed data, so every toggle tears the
// panel down, discarding focus, scroll, and any open details element
keyed('div')(`${model.isCardSelected}:${model.isTermsAccepted}`, [...], [...])

// Right: same thing on every render, no key; changed content patches in place
div([...], [...])
```

If a key can change while the same conceptual thing stays on screen, the key is doing change detection, and patching already does that. Always build with `@foldkit/vite-plugin`; without it, branch identity falls back to positional-plus-key semantics and every branch point needs a hand-written key.

## DOM and Effect Helpers

Commands that interact with the DOM use Foldkit's `Dom` module. Time, randomness, and delays use Effect's built-in services. Both are pure Effect wrappers, so they compose naturally in Commands.

### Foldkit `Dom` module

Import as `import { Dom } from 'foldkit'` (or `import * as Dom from 'foldkit/dom'`).

| Helper                             | What it does                                                 |
| ---------------------------------- | ------------------------------------------------------------ |
| `Dom.focus(selector)`              | Focus a DOM element by CSS selector                          |
| `Dom.advanceFocus(direction)`      | Move focus to the next/previous focusable element            |
| `Dom.scrollIntoView(selector)`     | Scroll an element into view                                  |
| `Dom.showDialog(selector)`         | Open a `<dialog>` element with `show()`                      |
| `Dom.closeDialog(selector)`        | Close a `<dialog>` element                                   |
| `Dom.clickElement(selector)`       | Programmatically click an element                            |
| `Dom.lockScroll` / `unlockScroll`  | Prevent / restore page scroll (e.g. behind modals)           |
| `Dom.inertOthers` / `restoreInert` | Toggle `inert` on siblings of an element (focus containment) |
| `Dom.detectElementMovement(...)`   | Observe an element for layout-affecting movement             |
| `Dom.waitForAnimationSettled(sel)` | Wait for CSS animations/transitions on an element to finish  |

### Effect built-ins

Use these directly from the `effect` package for non-DOM concerns. No Foldkit wrapper is needed.

| Need                  | Use                                                    |
| --------------------- | ------------------------------------------------------ |
| Current time (millis) | `yield* Clock.currentTimeMillis`                       |
| Current calendar date | `yield* Calendar.today.local` (returns `CalendarDate`) |
| Random integer        | `yield* Random.nextIntBetween(min, max)`               |
| Random float          | `yield* Random.nextBetween(min, max)`                  |
| UUID                  | `yield* Effect.uuid`                                   |
| Delay                 | `yield* Effect.sleep(Duration.millis(500))`            |

Use these instead of raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()`. They compose naturally inside `Command.define`. For canonical wiring, see `repos/foldkit/examples/kanban/src/command.ts` (`FocusAddCardInput` wraps `Dom.focus`) and `repos/foldkit/examples/stopwatch/src/main.ts` (`Clock.currentTimeMillis` inside an `Effect.gen`).

## With and Without URL Routing

`Runtime.makeApplication` handles both cases. Add a `routing` config when the app needs URL routing.

### Without Routing

For single-page apps that own the page but don't navigate. init receives only Flags (if any):

```ts
const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(application)
```

### With Routing

For apps with pages, navigation, and URL-driven state. init receives Flags (if any) and the current URL. Add a `routing` config with two Message constructors:

```ts
const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
})

Runtime.run(application)
```

### Scoped to a Node (Embedded Widgets)

`makeApplication` assumes it owns the page: its `view` returns a `Document` (`{ title, lang?, dir?, canonical?, ogUrl?, body }`) and the runtime writes `document.title`, the `lang` / `dir` attributes on `<html>`, and the canonical / og:url tags on every render. For a widget embedded on a page you do not control, that clobbers the host page's metadata.

Use `Runtime.makeElement` instead. Its `view` returns `Html` directly (no title to discard) and the runtime never touches the document `<head>` or the `<html>` element. Everything else (Model, init, update, Commands, Subscriptions, Flags, crash handling) is identical. Embedded apps don't own the URL bar, so `makeElement` has no `routing` config.

```ts
const element = Runtime.makeElement({
  Model,
  init,
  update,
  view, // view: (model, h) => Html
  container: document.getElementById('widget'),
})

Runtime.run(element)
```

When the host application needs to control the embedded app (mount and unmount it, push data in, receive values out), start it with `Runtime.embed(program)` instead of `Runtime.run`. `embed` returns a handle with `dispose` plus one entry per Port declared on the config: the host sends on inbound Ports, subscribes to outbound Ports, and disposes on unmount, never touching the Model. Inbound Ports are consumed by the app as Subscription sources and outbound Ports are written from Commands, so the app itself stays inside the standard architecture. `repos/foldkit/examples/embedding/` shows the full pattern: the widget in `src/main.ts`, the host in `src/host.ts`.

### Document Metadata

With `makeApplication`, the `view` returns a `Document`. The runtime sets `document.title` from its `title` field after every render and syncs the canonical / og:url tags (`canonical` defaults to the current URL, and `ogUrl` defaults to `canonical`, so setting `canonical` alone moves both). With `makeElement`, there is no title or metadata management at all.

`lang` and `dir` sync to the `<html>` element, so an app that switches language at runtime drives them from the Model. `dir` is `TextDirection` from `foldkit/html`, a Schema over `'Ltr' | 'Rtl' | 'Auto'` that you can drop straight into a Model `S.Struct`, and the runtime writes it as the lowercase attribute value. Both fields are optional and have no default: when a view omits one, the runtime does not touch that attribute, leaving whatever value it currently holds, so a view that never sets it leaves the served HTML in place.

`onUrlRequest` fires when the user clicks a link. The Message receives a `UrlRequest` (a tagged union from the `Navigation` namespace) which you handle in update by matching on its `_tag`. `onUrlChange` fires when the browser URL changes (back/forward buttons); the handler updates the route from the new URL.

For the canonical update-handler shapes (the exact `UrlRequest` tag names, how to dispatch `pushUrl` vs an external load Command, and how to derive the route from a `Url`), see `repos/foldkit/examples/routing/src/main.ts`.

### How to Choose

- App is a widget embedded on a page it does not own (must not touch the host `<head>`) → `makeElement`
- The host application also needs to drive it (lifecycle, data in, values out) → `makeElement` started with `Runtime.embed`, communicating through Flags and Ports
- App owns the page and mentions "pages", "navigation", "routes", URLs → `makeApplication` with `routing` config
- App owns the page with no navigation → `makeApplication` without `routing`

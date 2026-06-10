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
- **update** is a pure function: `(model, message) → [nextModel, commands]`
- **view** is a pure function: `(model) → Html`
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

The view function takes the Model and returns Html. It must not:

- Access external state
- Perform side effects
- Close over mutable variables
- Call functions with side effects

Event handlers in the view dispatch Messages. They don't perform actions directly.

### 3. Commands Catch All Errors

Define Command identities with `Command.define`, which is curried: the first call binds the name (optional args schema, then result Message schemas), and the second call binds the Effect. Every Command must handle its own errors via `Effect.catch(() => Effect.succeed(FailedX(...)))` and convert them to Messages. Commands never throw, so the app never crashes from an unhandled side effect.

Always assign definitions to PascalCase constants. Never use `Command.define` inline in a pipe chain. Definitions live where they're produced, colocated with the update function. Let TypeScript infer Command return types. The result Message schemas constrain the Effect's return type at the type level.

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

### 5. Messages Are Facts, Not Commands

Messages describe what happened, not what should happen. The update function decides what to do. Messages don't dictate the response:

```ts
// WRONG: imperative, tells the system what to do
const FetchData = m('FetchData')
const SetFilter = m('SetFilter', { filter: S.String })
const ShowModal = m('ShowModal')

// RIGHT: past-tense, describes what happened
const ClickedRefresh = m('ClickedRefresh')
const SelectedFilter = m('SelectedFilter', { filter: S.String })
const ClickedOpenModal = m('ClickedOpenModal')
```

## Flags: Side Effects That Seed the Initial Model

When the initial Model needs data from a side effect (current time, localStorage, browser APIs), use flags, not module-level constants:

```ts
// WRONG: module-level side effect (stale on HMR, non-deterministic, untestable)
const now = Date.now()
const init = () => [{ createdAt: now }, []]

// RIGHT: flags run as an Effect before init, result passed in
const Flags = S.Struct({
  createdAt: S.Number,
})

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis
  return Flags({ createdAt: now })
})

const init: Runtime.ApplicationInit<Model, Message, Flags> = (flags) => [
  { createdAt: flags.createdAt },
  [],
]
```

Flags are an `Effect<Flags>`. The runtime executes them once before init, and passes the result in. This keeps init pure while still allowing side effects to populate the initial Model. Common uses:

- Reading from localStorage/sessionStorage (restoring saved state)
- Getting the current time
- Reading browser capabilities (`navigator.language`, `matchMedia`)
- Decoding data embedded in the HTML (`<script type="application/json">`)

Pass `Flags` and `flags` to `Runtime.makeApplication`:

```ts
const application = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
})
```

## The Submodel Pattern

When a module grows too large, extract a Submodel: a child module with its own Model, Message, init, update, and view.

### Communication

Parent → Child: the parent calls the child's update with child Messages
Child → Parent: the child returns an `Option<OutMessage>` as a third tuple element

```ts
// Child update return type
type UpdateReturn = [
  Model,
  ReadonlyArray<Command<Message>>,
  Option.Option<OutMessage>,
]

// Child signals to parent
CreatedRoom: ({ roomId, player }) => [
  model,
  [],
  Option.some(SucceededCreateRoom({ roomId, player })),
]

// Parent handles OutMessage
GotChildMessage: ({ message }) => {
  const [nextChildModel, childCommands, maybeOutMessage] = Child.update(
    model.child,
    message,
  )

  const mappedCommands = childCommands.map(
    Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { child: () => nextChildModel }), mappedCommands],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          SucceededCreateRoom: ({ roomId }) => [
            evo(model, { child: () => nextChildModel }),
            [...mappedCommands, navigateToRoom(roomId)],
          ],
        }),
      ),
  })
}
```

### View Delegation

Child views are embedded via `h.submodel`. The child writes a pure `(model) => Html` view (no awareness of the parent); the parent declares the Message wrap as data at the embed site:

```ts
// Parent view
h.submodel({
  slotId: 'submit-section',
  view: Child.view,
  model: model.child,
  toParentMessage: message => GotChildMessage({ message }),
})

// Child view, branded with Submodel.defineView
export const view = Submodel.defineView<Model, Message>(model => {
  const h = html<Message>()
  return h.button([h.OnClick(ClickedSubmit())], ['Submit'])
})
```

The runtime resolves the `toParentMessage` wrap at event-fire time through a scope registry, so the child's view stays pure and dispatches in its own Message type. Brand the view with `Submodel.defineView<Model, Message>` so `h.submodel` can infer the child's Message type at the embed site.

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

## Keyed Views

Use `keyed` wrappers when the view branches into structurally different layouts:

```ts
// Key layout branches: prevents vdom from diffing landing into docs
keyed('div')('landing', [...], [...])
keyed('div')('docs', [...], [...])

// Key content areas on route tag: replaces content on navigation
keyed('div')(model.route._tag, [...], [...])
```

Without keying, the virtual DOM tries to patch one layout into another, causing stale DOM, mismatched event handlers, and rendering bugs.

## DOM and Effect Helpers

Commands that interact with the DOM use Foldkit's `Dom` module. Time, randomness, and delays use Effect's built-in services. Both are pure Effect wrappers, so they compose naturally in Commands.

### Foldkit `Dom` module

Import as `import { Dom } from 'foldkit'` (or `import * as Dom from 'foldkit/dom'`).

| Helper                             | What it does                                                 |
| ---------------------------------- | ------------------------------------------------------------ |
| `Dom.focus(selector)`              | Focus a DOM element by CSS selector                          |
| `Dom.advanceFocus(direction)`      | Move focus to the next/previous focusable element            |
| `Dom.scrollIntoView(selector)`     | Scroll an element into view                                  |
| `Dom.showModal(selector)`          | Show a `<dialog>` element as a modal                         |
| `Dom.closeModal(selector)`         | Close a `<dialog>` element                                   |
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

For single-page apps that own the page but don't navigate. init receives only flags (if any):

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

For apps with pages, navigation, and URL-driven state. init receives flags (if any) and the current URL. Add a `routing` config with two Message constructors:

```ts
const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(application)
```

### Scoped to a Node (Embedded Widgets)

`makeApplication` assumes it owns the page: its `view` returns a `Document` (`{ title, canonical?, ogUrl?, body }`) and the runtime writes `document.title` and manages the canonical / og:url tags on every render. For a widget embedded on a page you do not control, that clobbers the host page's metadata.

Use `Runtime.makeElement` instead. Its `view` returns `Html` directly (no title to discard) and the runtime never touches the document `<head>`. Everything else (Model, init, update, Commands, Subscriptions, flags, crash handling) is identical. Embedded apps don't own the URL bar, so `makeElement` has no `routing` config.

```ts
const element = Runtime.makeElement({
  Model,
  init,
  update,
  view, // view: (model) => Html
  container: document.getElementById('widget'),
})

Runtime.run(element)
```

When the host application needs to control the embedded app (mount and unmount it, push data in, receive values out), start it with `Runtime.embed(program)` instead of `Runtime.run`. `embed` returns a handle with `dispose` plus one entry per Port declared on the config: the host sends on inbound Ports, subscribes to outbound Ports, and disposes on unmount, never touching the Model. Inbound Ports are consumed by the app as Subscription sources and outbound Ports are written from Commands, so the app itself stays inside the standard architecture. `repos/foldkit/examples/embedding/` shows the full pattern: the widget in `src/main.ts`, the host in `src/host.ts`.

### Document Title

With `makeApplication`, the `view` returns a `Document`. The runtime sets `document.title` from its `title` field after every render and syncs the canonical / og:url tags (both default to the current URL when omitted). With `makeElement`, there is no title or head management at all.

`onUrlRequest` fires when the user clicks a link. The Message receives a `UrlRequest` (a tagged union from the `Navigation` namespace) which you handle in update by matching on its `_tag`. `onUrlChange` fires when the browser URL changes (back/forward buttons); the handler updates the route from the new URL.

For the canonical update-handler shapes (the exact `UrlRequest` tag names, how to dispatch `pushUrl` vs an external load Command, and how to derive the route from a `Url`), see `repos/foldkit/examples/routing/src/main.ts`.

### How to Choose

- App is a widget embedded on a page it does not own (must not touch the host `<head>`) → `makeElement`
- The host application also needs to drive it (lifecycle, data in, values out) → `makeElement` started with `Runtime.embed`, communicating through Flags and Ports
- App owns the page and mentions "pages", "navigation", "routes", URLs → `makeApplication` with `routing` config
- App owns the page with no navigation → `makeApplication` without `routing`

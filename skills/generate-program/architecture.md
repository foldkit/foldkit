# Foldkit Architecture Guide

## The TEA Loop

Every Foldkit app follows The Elm Architecture (TEA). A Message arrives — the user clicked a button, a timer fired, an HTTP response came back. The update function receives the current Model and the Message and returns a new Model along with any Commands to execute. The view function renders the new Model as HTML. When the user interacts with the view, it produces another Message, and the loop continues.

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

- **Model** is the single source of truth — an Effect Schema struct
- **Messages** are facts about what happened — past-tense, never imperative
- **update** is a pure function — `(model, message) → [nextModel, commands]`
- **view** is a pure function — `(model) → Html`
- **Commands** are the only place side effects happen — they return Messages

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

Event handlers in the view dispatch Messages — they don't perform actions directly.

### 3. Commands Catch All Errors

Every Command must handle its own errors and convert them to Messages:

```ts
const fetchData = (
  id: string,
): Command<typeof SucceededFetch | typeof FailedFetch> =>
  Effect.gen(function* () {
    const response = yield* httpClient.get(`/api/data/${id}`)
    return SucceededFetch({ data: response })
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedFetch({ error: String(error) })),
    ),
  )
```

Commands never throw. The app never crashes from an unhandled side effect.

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
const DataState = S.Union(Idle, Loading, Error, Ok)

const Model = S.Struct({
  dataState: DataState,
})
```

With booleans, you can have `isLoading: true` AND `isError: true` — an impossible state. With unions, you're always in exactly one state.

### 5. Messages Are Facts, Not Commands

Messages describe what happened, not what should happen. The update function decides what to do — Messages don't dictate the response:

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

When the initial Model needs data from a side effect (current time, localStorage, browser APIs), use flags — not module-level constants:

```ts
// WRONG: module-level side effect — stale on HMR, non-deterministic, untestable
const now = Date.now()
const init = () => [{ createdAt: now }, []]

// RIGHT: flags run as an Effect before init, result passed in
const Flags = S.Struct({
  createdAt: S.Number,
})

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const clock = yield* Clock.Clock
  const now = yield* clock.currentTimeMillis
  return Flags({ createdAt: now })
})

const init: Runtime.ElementInit<Model, Message, Flags> = (flags) => [
  { createdAt: flags.createdAt },
  [],
]
```

Flags are an `Effect<Flags>` — the runtime executes them once before init, and passes the result in. This keeps init pure while still allowing side effects to populate the initial Model. Common uses:

- Reading from localStorage/sessionStorage (restoring saved state)
- Getting the current time
- Reading browser capabilities (`navigator.language`, `matchMedia`)
- Decoding data embedded in the HTML (`<script type="application/json">`)

Pass `Flags` and `flags` to `Runtime.makeElement` or `Runtime.makeApplication`:

```ts
const app = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
})
```

## The Submodel Pattern

When a module grows too large, extract a Submodel — a child module with its own Model, Message, init, update, and view.

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
  Option.some(SucceededRoomCreation({ roomId, player })),
]

// Parent handles OutMessage
GotChildMessage: ({ message }) => {
  const [nextChildModel, childCommands, maybeOutMessage] = Child.update(
    model.child,
    message,
  )

  const mappedCommands = childCommands.map(
    Effect.map(message => GotChildMessage({ message })),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { child: () => nextChildModel }), mappedCommands],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          SucceededRoomCreation: ({ roomId }) => [
            evo(model, { child: () => nextChildModel }),
            [...mappedCommands, navigateToRoom(roomId)],
          ],
        }),
      ),
  })
}
```

### View Delegation

Child views accept a `toMessage` function to wrap their messages for the parent:

```ts
// Parent view
Child.view(model.child, message => GotChildMessage({ message }))

// Child view signature
const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const { div, button } = html<ParentMessage>()
  return div(
    [],
    [button([OnClick(() => toMessage(ClickedSubmit()))], ['Submit'])],
  )
}
```

## Subscriptions

Subscriptions are model-driven streams. They automatically start and stop based on model state:

```ts
const subscriptions = Subscription.makeSubscriptions(Deps)<Model, Message>({
  mySubscription: {
    // Extract parameters from model — return Option.none() to stop
    modelToDependencies: model =>
      Option.map(model.maybeSession, session => ({
        userId: session.id,
      })),

    // Build stream from dependencies
    dependenciesToStream: maybeDeps =>
      Option.match(maybeDeps, {
        onNone: () => Stream.empty,
        onSome: ({ userId }) =>
          someStream(userId).pipe(
            Stream.map(data => Effect.succeed(UpdatedData({ data }))),
            Stream.catchAll(error =>
              Stream.make(
                Effect.succeed(FailedStream({ error: String(error) })),
              ),
            ),
          ),
      }),
  },
})
```

When Model state changes such that `modelToDependencies` returns `None`, the Subscription stops. When it returns `Some`, the Subscription starts with the new dependencies.

### Subscriptions With No Model Dependencies

Some Subscriptions are always active (e.g., keyboard listeners, window resize). Use `S.Null` for the dependency type:

```ts
const SubscriptionDeps = S.Struct({
  keyboard: S.Null,
})

export const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  keyboard: {
    modelToDependencies: () => null,
    dependenciesToStream: () =>
      Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
        Stream.map(event => Effect.succeed(PressedKey({ key: event.key }))),
      ),
  },
})
```

The `S.Null` dependency means the Subscription is always active — it never stops based on Model state.

## Keyed Views

Use `keyed` wrappers when the view branches into structurally different layouts:

```ts
// Key layout branches — prevents vdom from diffing landing into docs
keyed('div')('landing', [...], [...])
keyed('div')('docs', [...], [...])

// Key content areas on route tag — replaces content on navigation
keyed('div')(model.route._tag, [...], [...])
```

Without keying, the virtual DOM tries to patch one layout into another, causing stale DOM, mismatched event handlers, and rendering bugs.

## Task Helpers

Commands that interact with the DOM or browser APIs should use `Task` helpers — pure Effect wrappers around browser operations:

| Helper                              | What it does                                             |
| ----------------------------------- | -------------------------------------------------------- |
| `Task.focus(selector)`              | Focus a DOM element by CSS selector                      |
| `Task.scrollIntoView(selector)`     | Scroll an element into view                              |
| `Task.showModal(selector)`          | Show a `<dialog>` element as a modal                     |
| `Task.closeModal(selector)`         | Close a `<dialog>` element                               |
| `Task.clickElement(selector)`       | Programmatically click an element                        |
| `Task.delay(duration)`              | Wait for a duration (e.g., `'1 second'`, `'500 millis'`) |
| `Task.nextFrame`                    | Wait for the next animation frame                        |
| `Task.waitForTransitions(selector)` | Wait for CSS transitions to finish                       |
| `Task.getTime`                      | Get current time via Effect's Clock service              |
| `Task.randomInt(min, max)`          | Generate a random integer via Effect's Random service    |

Use these instead of raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()`. They return Effects that compose naturally in Commands:

```ts
const focusInput: Command<typeof CompletedInputFocus> = Task.focus(
  `#${EMAIL_INPUT_ID}`,
).pipe(Effect.ignore, Effect.as(CompletedInputFocus()))

const showConfirmation: Command<typeof CompletedDialogShow> = Task.showModal(
  `#${CONFIRM_DIALOG_ID}`,
).pipe(Effect.ignore, Effect.as(CompletedDialogShow()))
```

## Element vs Application

Foldkit has two runtime modes. Choose based on whether the app needs URL routing:

### `Runtime.makeElement` — No URL Routing

For self-contained widgets, embedded components, or single-page apps without navigation. init receives only flags (if any):

```ts
const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
```

### `Runtime.makeApplication` — With URL Routing

For apps with pages, navigation, and URL-driven state. init receives flags (if any) and the current URL. Requires a `browser` config with two Message constructors:

```ts
const app = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(app)
```

`onUrlRequest` fires when the user clicks a link. The Message receives a `UrlRequest` (either `InternalUrl` or `ExternalUrl`). Handle it in update:

```ts
ClickedLink: ({ request }) =>
  M.value(request).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      InternalUrl: ({ url }) => [
        evo(model, { route: () => urlToAppRoute(url) }),
        [pushUrl(url)],
      ],
      ExternalUrl: ({ href }) => [model, [loadExternalUrl(href)]],
    }),
  ),
```

`onUrlChange` fires when the browser URL changes (back/forward buttons). Update the route from the new URL:

```ts
ChangedUrl: ({ url }) => [
  evo(model, { route: () => urlToAppRoute(url) }),
  [],
],
```

### How to Choose

- Description mentions "pages", "navigation", "routes", URLs → `makeApplication`
- Everything else → `makeElement`

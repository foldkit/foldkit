# Foldkit Conventions

Foldkit owns this file. `create-foldkit-app` writes it and upgrades replace it whole, so anything added here is lost. Project-specific instructions go in `AGENTS.md`.

This is a Foldkit app, a framework built on Effect-TS, architected like Elm.

## Getting the canonical references

The live Foldkit code is the canonical reference for everything: which APIs exist, what idiomatic apps look like, what the current conventions are. Written docs (including this one) can drift; the code can't.

If `./repos/foldkit` exists, it contains the full Foldkit repository, vendored in as a git subtree. Read from it directly:

- `repos/foldkit/examples/`: runnable example apps spanning every complexity tier. Usually your first stop when looking for a precedent for how to write something.
- `repos/foldkit/packages/foldkit/src/`: framework source. Ground truth for API signatures. Blocks live in `packages/foldkit/src/blocks/`.
- `repos/foldkit/packages/typing-game/client/src/` and `repos/foldkit/packages/website/src/`: production apps built with Foldkit. Highest-fidelity reference for application architecture, Blocks, and OutMessage.

Treat the subtree as read-only reference: never import from `repos/foldkit/` in your project source. Imports must come from the `foldkit` npm package.

If `./repos/foldkit` does not exist and `AGENTS.md` says `subtree_prompted: false`, offer to vendor the repository. It gives you access to the full source, examples, and docs. Pin it to the release git tag matching the installed `foldkit` package; vendoring `main` instead can hand you examples and APIs from a release the project has not installed:

```sh
git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
```

A canary install has no release tag to pin to. Its version names its source commit (`0.156.0-canary.<commit>`); use the full hash of that commit as the ref instead. GitHub expands the short hash at `https://github.com/foldkit/foldkit/commit/<commit>`.

Whether the user accepts or declines, set that line in `AGENTS.md` to `true` so it isn't asked again.

If `foldkit-skills` is installed as a Claude Code plugin, the `generate-program` and `audit-program` skills carry snapshot architecture and conventions guides synced from the live code.

## After a Foldkit upgrade

Two things go stale when the project upgrades its Foldkit packages: the vendored subtree and this file. Bring both forward, subtree first, since the fresh copy of this file comes from it.

Re-pin the subtree to the newly installed release (for a canary install, pin to the commit its version names, as above):

```sh
git subtree pull --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
```

Then replace this file whole. Foldkit's conventions change with its APIs, and a stale copy sends agents after APIs the installed packages no longer export. Copy `repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md` over this file. Without the subtree, take the template from GitHub at the tag matching the installed version: `https://github.com/foldkit/foldkit/blob/foldkit@<version>/packages/create-foldkit-app/templates/base/FOLDKIT.md`. There is nothing here to merge or preserve.

## Project Conventions

- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS.
- Model fields must be Schema types (the Model is a Schema). Plain TypeScript types are fine elsewhere (function return types, local variables, etc.).
- Use full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting).
- Name a Block class for the feature it is (`Search`, `IssueBoard`, `Application`) and its Layer with a `Live` suffix (`SearchLive`, `ApplicationLive`). The class's string id matches the class name.
- Suffix Model fields containing an `AsyncData` value with `AsyncData`, such as `workspaceAsyncData` or `weatherAsyncData`.
- Declare every variant together: `defineMessageUnion()` for Messages and OutMessages, `defineTaggedUnion()` for other domain unions, and `defineRouteUnion()` for Routes.
- Keep constructors on their union: `Message.ClickedSubmit()`, `FetchState.Ok({ data })`, and `ApplicationRoute.Home()`.
- Use `taggedStruct()` only when the variants cannot be declared together, such as a recursive union.
- Push back on any direction that violates Elm Architecture principles: unidirectional data flow, Messages as facts (not commands), Model as single source of truth, side effects confined to Commands. If a prompt suggests mutating state, imperative event handlers, or two-way bindings, flag the issue and propose the idiomatic Foldkit approach.
- Never name a Message `NoOp`. Every Message describes what happened. A Command's result Message is named from the Command, not from the fact it reports, whether or not it carries a payload: `LockScroll` → `CompletedLockScroll`, `DetermineStartTime` → `CompletedDetermineStartTime` (never `DeterminedStartTime`).

## Blocks

A Block is a class. The class declares the contract: its Model, Message, OutMessage, and the Commands and Mounts it owns. `make` implements it and returns an Effect Layer. Every app has at least one Block, the root `Application`.

```ts
const Message = defineMessageUnion({
  ClickedSave: {},
  SucceededSave: {},
  FailedSave: { reason: Schema.String },
})
type Message = typeof Message.Type

const Save = Command.define('Save', {
  args: { count: Schema.Number },
  messages: [Message.SucceededSave, Message.FailedSave],
})

export class Counter extends Block<Counter, Readonly<{ max: number }>>()(
  'Counter',
  {
    Model: Schema.Struct({ count: Schema.Number }),
    Message,
    OutMessage: defineMessageUnion({ ReachedMax: {} }),
    Command: [Save],
  },
) {}

export const CounterLive = Counter.make(
  Effect.fn(function* (id, { max }) {
    const store = yield* CountStore

    return {
      model: { count: 0 },
      update: {
        ClickedSave: model => ({
          model,
          commands: [Save({ count: model.count })],
        }),
        SucceededSave: model => ({ model }),
        FailedSave: model => ({ model }),
      },
      commands: {
        Save: ({ count }) =>
          store.save(id, count).pipe(
            Effect.as(Message.SucceededSave()),
            Effect.catch(error =>
              Effect.succeed(Message.FailedSave({ reason: String(error) })),
            ),
          ),
      },
      view: (model, h) =>
        h.button([h.OnClick(Message.ClickedSave())], [`${model.count}`]),
    }
  }),
)
```

- Declare Messages, OutMessages, Commands, and Mounts at module level, before the class. The class lists them; nothing else registers them.
- The type parameters of `Block<Self, Args, ViewInput, Exposed>()` are the class itself, its constructor args (default `void`), the input its view takes from a parent (default `void`), and the value it exposes to its parent's Commands (default `never`).
- The constructor passed to `make` is an `Effect.fn` that receives the instance id and args. It runs once per instance, synchronously, when the instance enters its parent's Model. Yield Services there and close over them in handlers.
- The constructor returns `{ model, start?, update, commands?, mounts?, stream?, subscriptions?, expose?, view }`. Omit `model` for a Block without state and `update` for a Block without Messages.
- Constructors do no asynchronous work. Load data with a Command listed in `start`, which runs when the instance appears.
- `update` has one handler per Message tag. Each receives the Model and the exact Message and returns `{ model, commands?, outMessage?, messages? }`.
- `commands` has one handler per listed Command and `mounts` one per listed Mount. Handlers get their argument types from the definition and must return an Effect with no remaining requirements, which is why they close over constructor Services. A listed Command or Mount without a handler fails at runtime.
- The root view returns `{ title, body }`. Every other view returns `Html`.

Use a Block when a feature owns interaction state, effects, or lifecycle. Pure domain functions and render-only helpers remain ordinary functions. Do not turn a render helper into a Block for structural symmetry.

## Children

A parent holds child instances in its Model. The child class itself is the Schema for that field.

```ts
export class Board extends Block<Board>()('Board', {
  Model: Schema.Struct({
    search: Search,
    maybeDialog: Schema.Option(Dialog),
    columns: Schema.Array(Column),
  }),
  Message,
}) {}

export const BoardLive = Board.make(
  Effect.fn(function* () {
    const search = yield* new Search('search', { placeholder: 'Find' })
    const dialog = yield* new Dialog('dialog', { id: 'confirm' })
    const column = yield* Column.each('columns', { isCollapsible: true })

    return {
      model: { search, maybeDialog: Option.none(), columns: [] },
      update: {
        ClickedOpenDialog: model => ({
          model: modifyFields(model, {
            maybeDialog: () => Option.some(dialog),
          }),
        }),
        ClickedAddColumn: (model, { columnId }) => ({
          model: modifyFields(model, {
            columns: Array.append(column(columnId)),
          }),
        }),
        ...search.on({
          SubmittedQuery: (model, { query }) => ({
            model,
            messages: Array.map(model.columns, boardColumn =>
              boardColumn.send(Column.Message.InformedOfQuery({ query })),
            ),
          }),
        }),
        ...column.on({
          RequestedRemove: (model, _, removedColumn) => ({
            model: modifyFields(model, {
              columns: Array.filter(({ id }) => id !== removedColumn.id),
            }),
          }),
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            model.search.view(),
            ...Array.map(model.columns, boardColumn =>
              h.keyed('section')(boardColumn.id, [], [boardColumn.view()]),
            ),
          ],
        ),
    }
  }),
)
```

- `yield* new Child(id, args)` declares one instance. `yield* Child.each(collection, args)` returns a factory; `factory(key)` declares a keyed instance whose id is the key, and `factory(key, args)` overrides the factory's args for that instance. Ids are unique within the parent.
- An instance is live while it is in the Model. Putting it in the Model constructs it; removing it closes its scope, which stops its Streams and Subscriptions and runs finalizers registered in its constructor. Putting the same declared instance back constructs it fresh, and replacing an instance at the same path closes the old one.
- Instances can live in Struct fields, `Option`, arrays, Records, and tagged union variants. Not in HashMap, HashSet, or class instances; convert those to arrays or Records.
- The parent reads child state through `model.search.model`. It changes the child only by sending it a Message: return `messages: [model.search.send(Search.Message.RequestedClear())]`. Name those Messages as facts: `RequestedClear` for a request, `InformedOfQuery` for a notification.
- The parent receives child facts by spreading `...instance.on({ Tag: (model, outMessage, instance) => result })` or `...factory.on({ ... })` into its update record. An `.on` handler can return `outMessage` to report a fact to its own parent.
- Render a child with `model.search.view()`. Never reach into a child's Model fields to change them from the parent.

### View input

When a parent renders a child with callbacks, such as a headless UI component's `toView`, declare the input type as the third type parameter and pass it to `view`:

```ts
type DialogViewInput = Readonly<{
  toView: (attributes: DialogAttributes) => Html
}>

export class Dialog extends Block<Dialog, DialogArgs, DialogViewInput>()(
  'Dialog',
  { Model, Message },
) {}

// child:  view: (model, h, { toView }) => toView({ dialog: childAttributes([...]) })
// parent: model.dialog.view({ toView: attributes => h.dialog([...attributes.dialog], [...]) })
```

Functions in the input run as the parent, so Messages they create are the parent's. Attributes the child builds for the parent to spread use `childAttributes(...)`, so they keep the child's dispatch. Pass stable functions (module-level or memoized) when the child caches on their identity.

### Exposed values

A Block can expose a value to its parent's Commands with `expose`. A parent Command handler reads it with `instance.use`, which fails with `NotConnected` while the instance is not in the Model. This is how a stateful handle such as a socket is shared: a child Block acquires it in its constructor with `Effect.acquireRelease`, exposes it, and the parent holds the child in an `Option` field while the handle should exist.

## Foldkit Patterns

### Asynchronous data

Use `AsyncData` for remote data owned by a Block's Model. Keep one authoritative collection rather than copying fetched data into a second Model field.

### State ownership

Keep the canonical domain data with its owner. Give each editor its own baseline, draft, and submission state. A baseline is an intentional historical value; current display data such as comments belongs in view input. Send an `InformedOf*` Message when an external event requires the child to transition, return a Command, or emit an OutMessage. Avoid acknowledgement Messages that repeat a transition the child already performed.

Build around the application's requirements and normal user workflows, including reasonable failure and retry behavior. Introduce abstractions for concrete repeated responsibilities; unusual event combinations do not by themselves justify additional framework APIs or application orchestration.

Independent interactions need independent pending and failure state. A project save should not block an unrelated issue move or share feedback that a background response can clear. Keep exclusivity explicit when operations really must serialize.

For a multi-state flow whose legal transitions need real tracing, consider experimental `Machine` from `foldkit/experimental/machine`. See `repos/foldkit/examples/state-machine/` for the pattern.

Decide what navigation does to unfinished work. Repeated URL delivery or a refresh should not silently replace a dirty draft. Keeping a keyed editor instance in the Model lets its draft and pending save survive navigation. Removing it ends its lifecycle; keep the owner present when its result must still update the application. Apply mutation results to the data that operation owns, so a delayed response cannot replace unrelated newer state.

### Update

Return handler results directly. Extract a substantial single-Message handler into a function named `handle<MessageTag>` and pass it as the record value. Give reusable Model-first transitions a descriptive name ending in `Step`, such as `refreshStep`, and sequence pure Steps with `Update.combineSteps`. Name an inline Step parameter `stepModel`.

Use `modifyFields` from `foldkit/struct` for immutable Model updates, including nested updates. Never spread or `Object.assign` an existing Model. Pass field transformers point-free when the update depends only on that field's current value (`count: Number.increment`, `rows: Array.map(toRow)`); use `() => value` when replacing a field with a Message payload or a value derived from another field.

Keep an update-like result together under an operation name such as `dialogClose`, then access its fields. Do not destructure or rename `model`, `commands`, or `outMessage`.

Omit `commands` when a handler statically creates none. Return a computed collection directly, even when empty. Never write a literal `commands: []`. A Boolean-conditioned Command group uses `Array.filter(commands, () => condition)`. The same holds for `messages`.

### Routing

The root Block's args are `{ url }` when the Program has routing. Parse that URL in the constructor and later URLs in the `ChangedUrl` handler, then store a typed `ApplicationRoute` in the Model. Use `Route.parseUrlWithFallback` for a full `Url` and `Route.parsePathWithFallback` for an origin-relative path, including query parameters.

When a page Block needs to react to a route change, the root sends it an `InformedOfRouteChange` Message from `ChangedUrl`. `Transition.make` and `Transition.matchOrElse` from `foldkit/route` describe entered, stayed, and exited pages.

When a query value represents a Route or another domain value, decode it through a Schema transformation passed to `Route.query`. Keep the application Route Schema plain so Model serialization carries the decoded value. Encode the value back to a string when building the URL.

### View

Every view receives `h`, the typed Html builder, after the Model. Never annotate the primary view's inferred `h` parameter and never construct a builder. Extracted helpers are plain functions that take only the values they read, followed by `h`, typed with a local alias: `type SearchViewBuilder = HtmlBuilder<Message>` from `foldkit/html`. Let TypeScript infer whether a helper returns one `Html` value or an array. Only where no builder is in scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih`. Use `h.empty` (not `null`) for conditional rendering, the union's own exhaustive `match` for discriminated unions, and `Array.match` for lists that may be empty.

Key mapped list items and entity slots by stable identity: key each row by a stable Model identifier (`h.keyed('li')(item.id, [], [...])`), never by array position, and never derive a key from displayed data. Key an entity slot by entity ID when its identity changes at the same position. Never key branches; the build gives each view function's output its own identity, so branch switches replace DOM automatically. When switching an inline same-tag ternary must reset DOM state, extract each arm into its own named view function.

Omit the children argument when an element has none: `h.div([h.Class('divider')])`, never `h.div([h.Class('divider')], [])`. The same holds for `keyed`: `h.keyed('li')(key, [attrs])`, never `h.keyed('li')(key, [attrs], [])`. Attributes stay required on element builders, so `h.div([])` is an element with neither.

### Commands

Define a Command at module level with `Command.define(name, { args, messages })`; omit `args` when it takes none. Assign definitions to PascalCase constants and list them under the class's `Command`. Implement each under the constructor's `commands` record. Name the work the handler performs, not the later Model transition caused by its result: a timer that waits before update begins dismissal is `WaitBeforeDismissal`. Convert expected failures to result Messages with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. Defects follow the application's crash handling. Commands belong to the Block whose update returns them.

Command args contain values already in the Model or Message. Read time, randomness, and UUIDs inside the handler Effect and return them in result Messages. Use `Dom` for browser operations and Effect's `Clock`, `Random`, `Crypto.Crypto`, and `Effect.sleep`. Avoid raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()` in app transitions.

A child's Command result returns to the child that issued it.

### Lifecycle effects

Pick the primitive by what causes the side effect:

- A Message just dispatched: a Command.
- An element exists in the rendered tree, and the handler uses that element: a Mount. Define it with `Mount.define(name, { messages })` or `Mount.defineStream` for continuous events, list it under `Mount`, implement it under `mounts`, and attach it in the view with `h.OnMount(FocusInput())`.
- An external event source that runs for the whole life of the instance: `stream`, a Stream of the Block's own Messages.
- An event source gated by Model state: `subscriptions: { name: { dependencies: model => ..., stream: dependencies => Stream } }`. The runtime recomputes dependencies after every update and restarts the Stream when they change. Return `Stream.empty` when the condition is off.
- A stateful handle that Commands need: a child Block that acquires it in its constructor and exposes it.
- A native web component: `CustomElement`.

If a Mount's handler doesn't read or write its element, you've misidentified the cause. Mount args are captured at mount, not refreshed across renders.

Services yielded in a constructor last as long as the instance. A Command Effect lasts for one dispatch. Subscription Streams follow their dependencies. A Mount follows one DOM element. A handler must not capture current time, Command args, Subscription dependencies, or a DOM element in the constructor.

Handlers and Services may own mutable execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.

`Effect.acquireRelease` registers the release only after the acquire body completes. Construct the resource inside the acquire Effect, never before it.

### Program

`entry.ts` creates the Program and starts the Runtime:

```ts
const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(Layer.mergeAll(SearchLive, DialogLive)),
    Layer.provide(ApplicationLayer),
  ),
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.run(program)
```

The `layer` provides the root Block, every Block the graph creates, and their Services. A child Block's Layer must be provided to every parent Layer that creates it. The root's args are `{ url }` with `routing`, `{ flags }` with `Flags`, both, or none. `Program.makeElement` creates a container-scoped program whose view returns `Html`.

### File organization

One file, one Block. A Block's file holds everything that defines it: its Message and OutMessage unions, Model Schema, Command and Mount definitions, the class, and its `Live` Layer with update, Command handlers, and view. Name the file for the Block in camelCase; the root is `application.ts`, and `IssueBoard` lives in `issueBoard.ts`. Never split one Block across `message.ts`, `model.ts`, `update.ts`, `command.ts`, or `view.ts`. When a Block grows too large to read in one file, extract a feature into a child Block in its own file.

Order the file so it reads top to bottom: the contract (Messages, Model, Commands, Mounts, and the class), then the `Live` Layer directly after the class, then the Steps, selectors, and view helpers the Layer uses. Create child instances with `yield*` at the top of the Layer constructor, not in a separate helper.

The only source files that are not Blocks are entries (`entry.ts`, `entry.server.ts`), `services.ts` for the root `ApplicationLayer` of ordinary Services (a test provider is `ApplicationTestLayer`), `route.ts` when several Blocks share the root Route union `ApplicationRoute`, and `domain/` modules of Schemas and pure functions used by more than one Block. Tests sit beside the Block they test. Group a page with the child Blocks only it uses in a folder named for the page: `page/settings/settings.ts` and `page/settings/themePicker.ts`.

`index.ts` is always a barrel. Export intended names explicitly. Declare each Schema's decoded type on the next line, with the same name and no blank line: `const Foo = Schema.Struct(...)` followed by `type Foo = typeof Foo.Type`. Use `Foo` in decoded-value annotations and `typeof Foo` when an API needs the Schema type. Across a child boundary, derive aliases from the class, such as `type SearchMessage = typeof Search.Message.Type`.

When using Tailwind, keep reusable static control recipes in the stylesheet's `@layer components`, where ordinary utilities can override them. Use `@utility` when adding an actual utility that needs variants. Keep `clsx` for conditional classes.

Only entries start execution. Client rendering uses `Runtime.run`; SSR/SSG hydrates with `Runtime.hydrate`. A client app references `entry.ts` from `index.html`. SSR/SSG instead names `ssr.clientEntry` in `vite.config.ts`, imports CSS there, and exports `renderDocument` from `entry.server.ts`; it has no source `index.html`. Keep classes and Layers importable by tests and server rendering.

When a server entry creates a long-lived `ManagedRuntime` or another resource, register an `import.meta.hot.dispose` callback in that entry to release it during development reloads.

Use section headers only when a long file needs wayfinding. Use `// NOTE:` for a surprising browser or timing constraint; ordinary behavior should be clear from names and structure.

### Testing

Tests run on `@effect/vitest` against a Block's Layer. `story` drives update: send Messages, assert on the Model and Commands. `scene` drives the rendered view with accessible locators. Neither runs Command handlers; you assert on the Commands update returned and resolve them with result Messages.

```ts
import { describe, expect, it } from '@effect/vitest'
import { Command, message, model, story } from 'foldkit/story'

it.effect('ClickedSave saves the count', () =>
  story(
    CounterLive,
    { max: 3 },
    message(Message.ClickedSave()),
    Command.expectExact(Save),
    Command.resolve(Save, Message.FailedSave({ reason: 'offline' })),
    model(model => {
      expect(model.count).toBe(0)
    }),
  ).pipe(Effect.provide(CountStoreTest)),
)
```

- `story(layer, args?, ...steps)` and `scene(layer, args?, ...steps)` build the instance from its Layer and start from the Model its constructor returns. Pass constructor args after the Layer when the Block takes them. `start` Commands are not in the ledger.
- The Layer must provide exactly one root Block. Provide children with `Layer.provide`, not `Layer.merge`. Provide Services the constructor yields with `.pipe(Effect.provide(TestLayer))` on the returned Effect.
- In tests the Model is resolved: every instance appears as its own Model (`model.search.query`). `given` can set child state but cannot add or remove instances; do that with Messages.
- Deliver a child's Message with `message(Block.deliver(Search, 'search', Search.Message.SubmittedQuery({ query })))`. Keyed instances use the path form `['columns', 'todo']`. Stream and Subscription emissions are Messages too: deliver them the same way.
- A child's Command result routes back to the child automatically when you resolve it.

Import the steps as named imports from `foldkit/story` or `foldkit/scene`. A test file needs only one of the two modules. If a single file ever tests both, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `Story.given` and `Scene.given` stay distinguishable.

Name each test file for its test style, beside the code under test: `story.test.ts` for Story tests and `scene.test.ts` for Scene tests. When one folder holds more than one test of a kind, prefix with the subject: `login.story.test.ts`. Put a page's own tests in its folder, driving its own Layer, and keep root-level tests for flows that cross pages. A Scene root cannot take a view input; test such a Block through a small test-only parent Block that renders it.

For an execution test of a Command handler, provide controlled Services to the production Layer and run the program, or test the Effect the handler wraps directly.

## Code Style

- Encode state in discriminated unions, not booleans or nullable fields. `Idle | Loading | Error | Ok`, not `isLoading: boolean`. Make impossible states unrepresentable.
- Use `Option` for absence in the Model and domain values instead of `null` or `undefined`. Foldkit return records are the exception: omit `commands`, `outMessage`, and `messages` when absent. Prefix Option-typed values with `maybe*`. Match with `Option.match`; don't unwrap with `Option.map(...)` + `Option.getOrElse(...)` when you can just match.
- Use Effect modules over native methods in `pipe` chains (`Array.map`, `String.startsWith`, `Array.findFirst`). Native methods are fine when calling directly on a named variable.
- Never cast Schema values with `as Type`. Use the callable constructor: `Message.SucceededLogin({ sessionId })`, not `{ _tag: 'SucceededLogin', sessionId } as Message`.
- Use `Array.match` for empty/non-empty branches. Use `Array.isReadonlyArrayEmpty` / `Array.isReadonlyArrayNonEmpty` for readonly Model collections, or the mutable predicates for mutable arrays; avoid `.length === 0` / `.length > 0`.
- Prefer `const` and pure collection transformations. Keep unavoidable mutation local to a tight algorithm or resource lifecycle; never hide workflow state in mutable module variables.
- Never use `T[]`. Always `Array<T>` or `ReadonlyArray<T>`.
- Branch on already-typed domain and Route variants through their owning union's exhaustive `match`; use Effect `Match` for partial or grouped matches and unions without a matcher. Reserve Schema decoding or `Schema.is` for actual boundary validation. Never use `switch`.
- Use `Calendar` for date-only values and Effect `DateTime` / `Duration` for timestamps and elapsed time. Read the current time in a Command, Subscription, or Flags.
- Always use braces for control flow: `if (foo) { return true }`.
- Use direct `value === undefined` and `value !== undefined` comparisons for undefined checks.
- Use blank lines to show the phases of non-trivial control flow, and prefer a blank line when uncertain. Separate setup, a value read from the guard that consumes it, independent guards or validation cases, writes, and the final return.
- Name selectors for derived values (`visibleIssues`), pure transitions for the Model change they describe (`applyWorkspaceSnapshot`), and dedicated handlers `handle<MessageTag>`. Reserve `sync` and `observe` for actual synchronization or observation. Commands describe effects for the Runtime; update only computes state and Commands.
- Don't add inline comments to explain code. Use better names instead. Reserve `// NOTE:` for behavior that would mislead a careful reader.

## Message Layout

Declare the whole Message union with `defineMessageUnion()`:

```ts
const Message = defineMessageUnion({
  ClickedSubmit: {},
  UpdatedEmail: { value: Schema.String },
})
type Message = typeof Message.Type
```

Keep the `Message` type alias immediately below its Schema, with no blank line. Construct values through the namespace (`Message.ClickedSubmit()`) and handle every tag in the Block's `update` record. Never destructure constructors from `Message` or `OutMessage`; the owning namespace stays visible at every call site.

Keep each case's payload object on one line when it fits. Let Oxfmt wrap payloads that need more space, so the declaration remains easy to scan as one variant per line.

Messages are verb-first past-tense. Common prefixes: `Clicked*`, `Updated*` (input changes and external state updates), `Submitted*`, `Pressed*`, `Selected*`, `Requested*` and `InformedOf*` (sent by a parent), `Succeeded*` / `Failed*` (paired async results), and `Completed*` (every other Command result).

## Debugging

This project ships with `@foldkit/devtools-mcp` pre-wired. When the dev server is running and the app is open in a browser, `foldkit_*` MCP tools let you inspect Model, Message history, and time-travel. The generated entry opts into external Message dispatch with `devTools: { dispatch: true }`. Reach for those tools before adding `console.log` whenever the question is about state or Message flow.

Treat those tools as privileged access to the application. They can return Models, Message payloads, and Command and Mount arguments to the agent. Keep credentials and private data out of browser state. Use Effect `Redacted` for sensitive values the browser must temporarily hold, and set `devToolsMcpPort: false` in the Foldkit Vite plugin options when an agent should not inspect the running application.

## Going Deeper

For Blocks and OutMessage, Subscriptions, Mount / CustomElement, field validation, routing, accessibility, and the full convention set, read the live Foldkit code in `repos/foldkit/`. The `examples/` directory and the production apps (`packages/typing-game/`, `packages/website/`) are the highest-fidelity references for any specific pattern. The `foldkit-skills` plugin's `generate-program` and `audit-program` skills carry written snapshot guides if you want a structured walkthrough.

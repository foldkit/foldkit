# @foldkit/oxlint-plugin

## 0.12.0

### Minor Changes

- [#1270](https://github.com/foldkit/foldkit/pull/1270) [`49d911a`](https://github.com/foldkit/foldkit/commit/49d911a3b592b658cd44918e668d28f10b19cde2) Thanks [@devinjameson](https://github.com/devinjameson)! - Resolve imported Foldkit, UI, Effect, and child Message APIs through Oxlint's scope manager. Rules now recognize aliased imports, ignore local shadows, and distinguish Submodel Message payloads from unrelated `message` fields without requiring TypeScript parser services.

  This can introduce lint failures where an alias previously hid parent-owned construction of a child Message. Expose an update capability from the child and invoke it through `Update.foldChild` or `Update.foldChildStep` instead.

  Expose Animation `show` and `hide` update capabilities so parents can drive visibility through `Update.foldChildStep` without constructing child Messages.

- [#1213](https://github.com/foldkit/foldkit/pull/1213) [`57e2436`](https://github.com/foldkit/foldkit/commit/57e24366c8997cd235002f58c9dc38477a6cb1a3) Thanks [@devinjameson](https://github.com/devinjameson)! - Add the recommended `foldkit/prefer-effect-module-names` rule. It reports PascalCase modules imported from `effect` under abbreviated or trailing-underscore aliases and safely fixes aliases when the exported name is available. Qualify a same-named JavaScript or TypeScript global through `globalThis`. An explicit conflict alias such as `Order as EffectOrder` remains valid when an existing local or public binding must keep the module name.

  Projects that want to keep Effect module aliases can disable the rule:

  ```json
  {
    "rules": {
      "foldkit/prefer-effect-module-names": "off"
    }
  }
  ```

- [#1234](https://github.com/foldkit/foldkit/pull/1234) [`c9f9c65`](https://github.com/foldkit/foldkit/commit/c9f9c65ffa49f50e838be794e369a7513f8d0d8a) Thanks [@devinjameson](https://github.com/devinjameson)! - Add `foldkit/no-impure-call-at-decision-time`, which flags direct time and randomness calls unless they appear inside a recognized deferred Effect or lifecycle execution callback. The rule reports a call whether it appears directly in Command args or is assigned to a local variable first. It respects shadowed globals, stays off in tests, runtime entry files, and host server files, and is enabled by the recommended preset used in newly scaffolded apps.

  This can introduce lint failures in existing applications that use the recommended or all preset. Move reported calls into an Effect or lifecycle execution callback, then return generated values through Messages. Consumers can temporarily disable the rule while migrating.

## 0.11.0

### Minor Changes

- [#1188](https://github.com/foldkit/foldkit/pull/1188) [`4e7d8d4`](https://github.com/foldkit/foldkit/commit/4e7d8d4010be5a84dd37d1dc48bb97b4f4e599f3) Thanks [@devinjameson](https://github.com/devinjameson)! - Take every `Mount.define` and `Mount.defineStream` input as a named field, with the work in a single flat `execute`.

  Both constructors took their inputs positionally, with the result Messages as a variadic tail and the work supplied by a second call. With args declared, that second call was itself curried: `args => element => Effect<Message>`. The outer function ran the moment a view constructed the MountAction, so anything an author wrote between the two arrows ran on every render, inside a pure view. `Command.define` had the same hazard and defers its body with `Effect.suspend`; a Mount had no equivalent.

  Inputs are now named fields on a config object: `args` declares the args Schema, `messages` lists the Messages the Mount can produce, and `execute` does the work. `execute` takes one parameter that carries the live element as `element` alongside the declared args, so the curried middle step is gone. Constructing a MountAction now runs nothing at all; the runtime calls `execute` when the element enters the DOM.

  `execute` keeps the same shape whether or not `args` is declared, because a Mount always has an element. An args field named `element` is rejected where you declare it, since it would collide with the element `execute` receives.

  ## Migration

  Move each positional argument to its field, wrap the result Messages in an array, and collapse the two arrows into one `execute` that destructures `element` alongside the args.

  ```ts
  // before
  const AnchorPopover = Mount.define(
    'AnchorPopover',
    { buttonId: S.String, anchor: AnchorConfig },
    CompletedAnchorPopover,
  )(({ buttonId, anchor }) => element => Effect.gen(function* () { ... }))

  // after
  const AnchorPopover = Mount.define('AnchorPopover', {
    args: { buttonId: S.String, anchor: AnchorConfig },
    messages: [CompletedAnchorPopover],
    execute: ({ element, buttonId, anchor }) => Effect.gen(function* () { ... }),
  })
  ```

  A Mount with no args omits `args` and keeps the same `execute`.

  ```ts
  // before
  const PortalToBody = Mount.define('PortalToBody', CompletedPortalToBody)(
    element => Effect.gen(function* () { ... }),
  )

  // after
  const PortalToBody = Mount.define('PortalToBody', {
    messages: [CompletedPortalToBody],
    execute: ({ element }) => Effect.gen(function* () { ... }),
  })
  ```

  `Mount.defineStream` migrates the same way, with `execute` returning a `Stream<Message>`.

  `@foldkit/ui` now requires `foldkit` 0.155.0 or newer because its Mount definitions use this config shape.

  `foldkit/mount-factory-must-use-element` reads the new shape. It looks for `element` in `execute`'s destructuring pattern, and reports on `execute` itself. A Mount whose `execute` ignores its element is still an error: the element is the reason a Mount exists, and work that does not need it belongs in a Command, Subscription, or ManagedResource.

  Destructure `element` and the rule checks the read, reading through a default value so `{ element = document.body }` is still checked. Reading `input.element` off an unpacked parameter is checked too. Hand the whole input somewhere the rule cannot follow, such as `attachObserver(input)` or `input[key]`, and it stops checking rather than reporting a Mount that does use its element. Reading only some other field off that input still reports, and so does an `execute` that never references its parameter at all.

### Patch Changes

- [#1228](https://github.com/foldkit/foldkit/pull/1228) [`d123798`](https://github.com/foldkit/foldkit/commit/d1237986f304337743e568b395df0e78c66a12a7) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade effect-oxlint for its current Effect RC peer range.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade development dependencies to Node 26 type definitions and Happy DOM 20.11.8.

- [#1205](https://github.com/foldkit/foldkit/pull/1205) [`9601382`](https://github.com/foldkit/foldkit/commit/960138253f09310ff1dca45d2cf84d25fb86d12d) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade `effect-oxlint` to 0.3.3.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the TypeScript compiler used to build and test packages to 7.0.2 while keeping compiler API tools on the official TypeScript 6 compatibility package.

## 0.10.0

### Minor Changes

- 6716de6: Add `foldkit/no-empty-to-parent-out-message` to the recommended and all presets. The rule flags an inline `toParentOutMessage` mapper that directly returns `undefined`. That mapper forwards nothing to the parent, so the property should be omitted.

  The rule fixes straightforward object literals. It reports without a fix when comments, spreads, dynamic computed keys, or duplicate `toParentOutMessage` properties make removal ambiguous. It does not inspect async functions, generators, getters, setters, or mappers referenced by name.

  The existing `foldkit/no-empty-commands-array` rule now follows the same autofix safeguards. In particular, it still reports `commands: []` when the same object has a dynamic computed property, but it leaves the edit to the author because the computed property might also be named `commands` at runtime.

## 0.9.0

### Minor Changes

- 64387ef: Routes and other tagged unions now use the same one-object declaration as Messages. The old `r` and `ts` helpers are gone:

  - Use `defineRouteUnion` for `AppRoute`.
  - Use `defineTaggedUnion` for Model states and other domain unions.
  - Use `taggedStruct` when a tagged struct must be declared on its own.

  Both union helpers return a Schema that also holds the variant constructors. For example, `AppRoute.Person` is the `Person` Schema, and `AppRoute.Person({ personId: 42 })` constructs a value. They also provide `match`, `guards`, `isAnyOf`, `subset`, and `members`. A `defineTaggedUnion` result can be passed directly to `Machine.define`. Message unions still expose only their constructors and exhaustive `match`.

  ## Migrate Routes

  Declare every route in one `AppRoute` object, then use variants through that namespace. Do not name the union `Route`; Foldkit already uses that name for the route module.

  Before:

  ```typescript
  import { int, literal, mapTo, r, root, slash } from 'foldkit/route'

  export const HomeRoute = r('Home')
  export const PersonRoute = r('Person', { personId: S.Number })
  export const NotFoundRoute = r('NotFound', { path: S.String })

  export const AppRoute = S.Union([HomeRoute, PersonRoute, NotFoundRoute])

  export type HomeRoute = typeof HomeRoute.Type
  export type PersonRoute = typeof PersonRoute.Type
  export type NotFoundRoute = typeof NotFoundRoute.Type
  export type AppRoute = typeof AppRoute.Type

  export const homeRouter = pipe(root, mapTo(HomeRoute))
  export const personRouter = pipe(
    literal('people'),
    slash(int('personId')),
    mapTo(PersonRoute),
  )

  export const urlToAppRoute = parseUrlWithFallback(routeParser, NotFoundRoute)
  ```

  After:

  ```typescript
  import {
    defineRouteUnion,
    int,
    literal,
    mapTo,
    root,
    slash,
  } from 'foldkit/route'

  export const AppRoute = defineRouteUnion({
    Home: {},
    Person: { personId: S.Number },
    NotFound: { path: S.String },
  })
  export type AppRoute = typeof AppRoute.Type

  export const homeRouter = pipe(root, mapTo(AppRoute.Home))
  export const personRouter = pipe(
    literal('people'),
    slash(int('personId')),
    mapTo(AppRoute.Person),
  )

  export const urlToAppRoute = parseUrlWithFallback(
    routeParser,
    AppRoute.NotFound,
  )
  ```

  The old `XxxRoute` suffix kept separate exports from colliding. `AppRoute` now provides that context, so write `AppRoute.Person({ personId: 42 })` instead of `PersonRoute({ personId: 42 })`.

  ## Migrate Route subsets

  Use `subset` when a Model or Schema accepts only some application Routes. This keeps the allowed Routes tied to `AppRoute` without declaring another union.

  Before:

  ```typescript
  export const LoggedOutRoute = S.Union([HomeRoute, LoginRoute, NotFoundRoute])
  export const LoggedInRoute = S.Union([
    DashboardRoute,
    SettingsRoute,
    NotFoundRoute,
  ])
  ```

  After:

  ```typescript
  export const LoggedOutRoute = AppRoute.subset(['Home', 'Login', 'NotFound'])
  export const LoggedInRoute = AppRoute.subset([
    'Dashboard',
    'Settings',
    'NotFound',
  ])
  ```

  `subset` includes only the tags you name. If you add a Route to `AppRoute` later, neither Schema above will accept it until you add its tag. There is no `omit`: an exclusion list would silently accept every Route added later.

  If a module needs to name one variant's type, export an alias beside `AppRoute` instead of repeating `typeof AppRoute.Person.Type`:

  ```typescript
  export type PersonRoute = typeof AppRoute.Person.Type
  ```

  ## Replace hand-written route guards

  Use `isAnyOf` when one guard accepts several tags.

  Before:

  ```typescript
  export const isBlogRoute = (
    route: AppRoute,
  ): route is BlogRoute | BlogPostRoute =>
    route._tag === 'Blog' || route._tag === 'BlogPost'
  ```

  After:

  ```typescript
  export const isBlogRoute = AppRoute.isAnyOf(['Blog', 'BlogPost'])
  ```

  ## Migrate domain unions

  Use `defineTaggedUnion` when the variants of a domain union can be declared together.

  Before:

  ```typescript
  import { ts } from 'foldkit/schema'

  export const NotSubmitted = ts('NotSubmitted')
  export const Submitting = ts('Submitting')
  export const SubmitSuccess = ts('SubmitSuccess')
  export const SubmitError = ts('SubmitError', { error: S.String })

  export const Submission = S.Union([
    NotSubmitted,
    Submitting,
    SubmitSuccess,
    SubmitError,
  ])
  export type Submission = typeof Submission.Type
  ```

  After:

  ```typescript
  import { defineTaggedUnion } from 'foldkit/schema'

  export const Submission = defineTaggedUnion({
    NotSubmitted: {},
    Submitting: {},
    SubmitSuccess: {},
    SubmitError: { error: S.String },
  })
  export type Submission = typeof Submission.Type
  ```

  Use the union's `match` method when every tag must be handled:

  ```typescript
  // Before
  M.value(submission).pipe(
    M.withReturnType<Html>(),
    M.tagsExhaustive({ ... }),
  )

  // After
  Submission.match<Html>(submission, { ... })
  ```

  Because `match` runs at runtime, a file that calls it must import the union as a value. Keep using Effect `Match` for partial matching, fallbacks, or one handler shared by several tags.

  ## Remove repeated union names from tags

  The union name now provides the context a tag needs. Prefer `ConnectionState.Connected` to `ConnectionState.ConnectionConnected`.

  Renaming a tag also changes its `_tag` value. Do not shorten tags stored in a Model, URL, or wire protocol unless that external value is meant to change.

  ## Rename `ts` to `taggedStruct`

  `taggedStruct` is the new name for `ts`. Most unions should move to `defineTaggedUnion`; `taggedStruct` remains for variants that must be declared separately.

  ```typescript
  // Before
  import { ts } from 'foldkit/schema'
  const TableRow = ts('TableRow', { cells: S.Array(TableCell) })

  // After
  import { taggedStruct } from 'foldkit/schema'
  const TableRow = taggedStruct('TableRow', { cells: S.Array(TableCell) })
  ```

  Use `taggedStruct` in these cases:

  - A recursive union, such as `Canvas.Shape` or the markdown AST.
  - A union assembled from variants owned by different modules, such as a parent Model built from two Submodel Models.
  - A tagged child struct that is not one variant of a choice, such as `TableRow`.
  - A variant created inside a generic Schema factory, such as `AsyncData`.

  If recursion forces one union in a module to use `taggedStruct`, use `taggedStruct` for the module's sibling unions too.

  ## Variants are no longer separate exports

  `Navigation` and `Interruptible` no longer export their variants as separate top-level names. Access each variant through its union instead.

  ```typescript
  // Before
  Navigation.Internal({ url })
  Interruptible.Interrupted()

  // After
  Navigation.UrlRequest.Internal({ url })
  Interruptible.Outcome.Interrupted()
  ```

  The DevTools protocol now follows the same rule. Its variants live under `Request`, `Response`, `Event`, `DiffValue`, and `MessageSchemaResult`. The `_tag` strings did not change, so old and new DevTools clients still speak the same wire protocol.

  `@foldkit/ui`, `@foldkit/devtools`, `@foldkit/devtools-mcp`, `@foldkit/markdown`, and `@foldkit/vite-plugin` now require Foldkit `>=0.153.0` because their published code calls these new APIs. Each gets a minor release so consumers on older pre-1.0 ranges do not receive an incompatible update.

  ## Lint

  `foldkit/no-empty-object-tagged-call` now catches no-field Route and domain constructors as well as Messages. It recognizes namespaces whose names end in Message, Route, or State, plus unions declared in the same file with Foldkit's union helpers. It does not assume every PascalCase namespace is a Foldkit union.

  The [Routing & Navigation guide](https://foldkit.dev/core/routing-and-navigation) covers the route union in depth, and the [Model guide](https://foldkit.dev/core/model) covers state modeling with `defineTaggedUnion`.

### Patch Changes

- 07b0f05: Ship type declarations for `@foldkit/oxlint-plugin`. The package built with esbuild alone, which bundles the runtime but emits no `.d.ts`, so importing it from an `oxlint.config.ts` failed with "Could not find a declaration file for module '@foldkit/oxlint-plugin'". The build now also runs `tsc` to emit declarations into `dist`, and `package.json` points at them through `types` and a `types` condition in its exports.

## 0.8.0

### Minor Changes

- 11e0b0e: Update, init, boot, and component helpers now return records instead of tuples. Every producer and consumer of those results must migrate. The Runtime no longer accepts the tuple form. The `Update.Return<Model, Message>` and `Update.ReturnWithOutMessage<Model, Message, OutMessage>` names stay the same; the values assigned to them change shape.

  ## Upgrade order

  If your application uses Foldkit 0.148.x or earlier, upgrade to 0.149.0 and complete the Message union migration first. The examples below assume Messages use `defineMessageUnion` and updates use `Message.match`.

  ## Migrate producers

  Change every two-element tuple returned by update, init, boot, or a component helper from `[model, commands]` to `{ model, commands }`. Apply the change to every branch of an update. Omit `commands` wherever the producer statically creates none.

  Before:

  ```typescript
  type UpdateReturn = Update.Return<Model, Message>

  export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
      ClickedSave: () => [model, [SaveNote()]],
      SucceededSave: ({ note }) => [evo(model, { note: () => note }), []],
    })
  ```

  After:

  ```typescript
  export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
      ClickedSave: () => ({ model, commands: [SaveNote()] }),
      SucceededSave: ({ note }) => ({
        model: evo(model, { note: () => note }),
      }),
    })
  ```

  An `UpdateReturn` alias still works. Foldkit's authoring convention is to inline the return type when `Message.match` is its only use. Keep the alias when another matcher, helper, or exported signature reuses it. The match generic constrains the whole update, so do not repeat `: UpdateReturn` on the function.

  When a producer computes a Commands collection, return it directly even if the collection may be empty:

  ```typescript
  return { model: nextModel, commands: buildCommands(model) }
  ```

  Do not inspect a computed collection only to omit the property when it is empty. Use `commands ?? []` only where another operation requires an array for spreading, concatenating, execution, or an assertion. The new `foldkit/no-empty-commands-array` rule rejects a literal `commands: []` property.

  ## Migrate consumers

  Keep the whole result attached to the operation that produced it. For example, a test should keep the result of submitting a form together:

  Before:

  ```typescript
  const [nextModel, commands] = update(model, Message.SubmittedForm())

  expect(nextModel.status).toBe('Submitting')
  expect(commands).toHaveLength(1)
  ```

  After:

  ```typescript
  const formSubmit = update(model, Message.SubmittedForm())

  expect(formSubmit.model.status).toBe('Submitting')
  expect(formSubmit.commands ?? []).toHaveLength(1)
  ```

  Do not replace tuple destructuring with record destructuring such as `const { model: nextModel, commands } = update(...)`. Dot access does not force a caller to read `outMessage`, but it keeps the operation and every returned field visibly connected. When the operation name collides with the function, use a trailing underscore such as `init_`.

  The same convention applies when assembling independent init results.

  Before:

  ```typescript
  const [homeModel, homeCommands] = Home.init()

  return [
    { home: homeModel },
    Command.mapMessages(homeCommands, message =>
      Message.GotHomeMessage({ message }),
    ),
  ]
  ```

  After:

  ```typescript
  const homeInit = Home.init()

  return {
    model: { home: homeInit.model },
    commands: Command.mapMessages(homeInit.commands, message =>
      Message.GotHomeMessage({ message }),
    ),
  }
  ```

  `Command.mapMessages` accepts an optional Commands field in both call forms and returns an empty array when the field is absent. Pass `homeInit.commands` directly instead of writing `homeInit.commands ?? []`.

  TypeScript rejects this manual composition when the enclosing update returns `Update.Return<Model, Message>`:

  ```typescript
  const dialogOpen = openDialog(model)

  return {
    model: evo(dialogOpen.model, { isSubmitting: () => false }),
    // Type error: with exactOptionalPropertyTypes, this property must be
    // omitted when dialogOpen.commands is undefined.
    commands: dialogOpen.commands,
  }
  ```

  Every Foldkit template enables `exactOptionalPropertyTypes`. With that setting, the optional `commands` property may be absent. When the property is present, it must contain Commands. `dialogOpen.commands` has the type `Update.Commands<Message> | undefined`, so TypeScript rejects `commands: dialogOpen.commands`.

  This error often points to update results being composed by hand. When a later operation needs the Model produced by an earlier operation, express both as Steps and compose them with `Update.combine`:

  ```typescript
  return Update.combine(model, [
    openDialog,
    stepModel => ({
      model: evo(stepModel, { isSubmitting: () => false }),
    }),
  ])
  ```

  ## Migrate OutMessages

  `Update.ReturnWithOutMessage<Model, Message, OutMessage>` now carries an optional `outMessage` field instead of an `Option<OutMessage>` tuple element. Include `outMessage` when the update emits one and omit the field otherwise.

  Before:

  ```typescript
  SucceededAuthenticate: ({ session }) => [
    model,
    [],
    Option.some(OutMessage.SucceededLogin({ session })),
  ],
  FailedAuthenticate: () => [model, [], Option.none()],
  ```

  After:

  ```typescript
  SucceededAuthenticate: ({ session }) => ({
    model,
    outMessage: OutMessage.SucceededLogin({ session }),
  }),
  FailedAuthenticate: () => ({ model }),
  ```

  Use `Update.Return<Model, Message>` when an update cannot emit an OutMessage. TypeScript rejects assigning a result that may contain an OutMessage to that type, so a caller cannot keep the Model and Commands while losing the OutMessage:

  ```typescript
  const childUpdate: Update.ReturnWithOutMessage<
    Child.Model,
    Child.Message,
    Child.OutMessage
  > = Child.update(model.child, message)

  // Type error: childUpdate may contain an OutMessage.
  const plainChildUpdate: Update.Return<Child.Model, Child.Message> =
    childUpdate
  ```

  An OutMessage-aware API can still accept a plain result. A missing `outMessage` field means that update emitted nothing:

  ```typescript
  const plainUpdate: Update.Return<Model, Message> = { model }

  const submodelUpdate: Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage
  > = plainUpdate
  ```

  When an update definitely emits an OutMessage, include it directly:

  ```typescript
  return { model, outMessage: OutMessage.ClearedDate() }
  ```

  When the OutMessage may be `undefined`, use `Update.withOutMessage`. It omits the property when the update emitted nothing and preserves the Model and Commands of an existing result:

  ```typescript
  return pipe(dialogClose, Update.withOutMessage(outMessage))
  ```

  A child fold's `toParentOutMessage` mapper now returns the parent OutMessage directly. Return `undefined` for each named child variant that stops at the current Submodel.

  Before:

  ```typescript
  const toParentOutMessage = M.type<Child.OutMessage>().pipe(
    M.withReturnType<Option.Option<OutMessage>>(),
    M.tagsExhaustive({
      Submitted: ({ id }) => Option.some(OutMessage.Submitted({ id })),
      Cancelled: () => Option.none(),
    }),
  )
  ```

  After:

  ```typescript
  const toParentOutMessage = M.type<Child.OutMessage>().pipe(
    M.withReturnType<OutMessage | undefined>(),
    M.tagsExhaustive({
      Submitted: ({ id }) => OutMessage.Submitted({ id }),
      Cancelled: () => undefined,
    }),
  )
  ```

  Add `toParentOutMessage` only when at least one child OutMessage is forwarded from the current Submodel to its parent. Omit it when no variant is forwarded. A forwarded variant may still be handled locally by `foldOutMessage`. `Update.foldChildStep` supports the same forwarding for child entry points that take only the child Model.

  ## Migrate composed operations

  Do not translate manual child tuple unpacking into separate reads of `result.model`, `result.commands`, and `result.outMessage`. Use `Update.foldChild` for child Messages and `Update.foldChildStep` for child entry points that take only the child Model.

  The old code below writes the next Dialog Model and maps its Commands. The two-slot destructure silently drops the Dialog OutMessage:

  Before:

  ```typescript
  const [nextDialog, dialogCommands] = Dialog.close(model.dialog)

  return [
    evo(model, {
      dialog: () => nextDialog,
      isSubmitting: () => false,
    }),
    Command.mapMessages(dialogCommands, toGotDialogMessage),
  ]
  ```

  The replacement intentionally does more than translate the return shape. It handles the Dialog OutMessage that the old code discarded.

  After:

  ```typescript
  const foldDialogClose = Update.foldChildStep({
    update: Dialog.close,
    read: model => Option.some(model.dialog),
    write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
    toParentMessage: toGotDialogMessage,
    foldOutMessage: foldDialogOutMessage,
  })

  return Update.combine(model, [
    foldDialogClose,
    stepModel => ({
      model: evo(stepModel, { isSubmitting: () => false }),
    }),
  ])
  ```

  Use `Update.combine` for two or more Steps when a later Step needs the Model produced by an earlier Step. It collects Commands in Step order, but the Runtime forks them independently after update returns. Name an inline Step parameter `stepModel`; it contains the Model produced by the preceding Step. Call a single operation directly. Independent child inits do not form a sequence, so initialize them separately and assemble their Models into the parent.

  Foldkit UI component helpers, the DevTools overlay, the SSR fixtures, and generated `create-foldkit-app` templates now use the same record shape. The [Update guide](https://foldkit.dev/core/update) and [Submodels guide](https://foldkit.dev/core/submodel) cover the permanent authoring conventions in more depth.

## 0.7.0

### Minor Changes

- 504344b: Replace `m` with `defineMessageUnion` in `foldkit/message`. `defineMessageUnion` declares a whole Message union from one record of fields per variant instead of naming each variant once as a constructor and again in the union list.

  The result is a Schema, so it decodes and nests in a Model. Its focused Message surface is exhaustive `match` plus one callable constructor per variant. Each constructor is itself a schema, which is what `Command.define` needs for its `messages` list. Use `Message.match` for exhaustive dispatch. Effect `Match` remains available for partial matching, fallbacks, and one handler shared across several tags.

  This removes the `m` export. Declare Message and OutMessage as separate `defineMessageUnion()` unions, even when two variants happen to carry the same fields. Constructors stay on their owning union namespace rather than being exported as sibling bindings.

  Update `@foldkit/oxlint-plugin` to recognize `defineMessageUnion()` declarations in the Message naming rules. Remove `message-binding-matches-tag`, since variants no longer have separate constructor bindings whose names can drift from their tags.

  Update `create-foldkit-app` templates to declare and match Messages with the new API.

  ```typescript
  import { Schema as S } from 'effect'
  import { Update } from 'foldkit'
  import { defineMessageUnion } from 'foldkit/message'
  import { evo } from 'foldkit/struct'

  const Model = S.Struct({ count: S.Number })
  type Model = typeof Model.Type

  export const Message = defineMessageUnion({
    ClickedReset: {},
    ChangedCount: { count: S.Number },
  })
  export type Message = typeof Message.Type

  type UpdateReturn = Update.Return<Model, Message>

  export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
      ClickedReset: () => [evo(model, { count: () => 0 }), []],
      ChangedCount: ({ count }) => [evo(model, { count: () => count }), []],
    })
  ```

- e041379: Add `foldkit/no-nonportable-server-globals` to both presets. The rule catches common browser-only globals in `entry.server.ts`, `entry.server.tsx`, TypeScript files under a `server` directory, and `prerender.ts`. Colocated files ending in `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` are excluded.

  The curated list covers `document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `history`, `location`, `alert`, `confirm`, `prompt`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, `cancelIdleCallback`, `getComputedStyle`, `matchMedia`, `customElements`, `screen`, `IntersectionObserver`, `ResizeObserver`, and `MutationObserver`. The same names are caught when read through a static `globalThis` property or destructured directly from `globalThis`.

  Local bindings, parameters, and type-only `typeof` queries remain valid. `Request`, `Response`, `Headers`, `fetch`, and `URL` remain available for host code. The Foldkit-owned rule composes with any `no-restricted-globals` policy in the consuming project instead of replacing it.

  This is a portability guardrail, not an exhaustive list of browser APIs or a security boundary. Lint may newly fail when a recognized server file reads one of the listed globals at runtime.

## 0.6.0

### Minor Changes

- 23423bd: Adds `foldkit/no-empty-children-array`, which flags a builder call that passes an inline empty array as children. The argument is optional, so `h.div([h.Class('divider')], [])` should be written `h.div([h.Class('divider')])`, and `h.keyed('li')(key, [attrs], [])` should be written `h.keyed('li')(key, [attrs])`. Calls that pass a variable, a call, a conditional, or a non-empty array are left alone, and so is any method that is not an element builder. An array whose only content is a comment is also left alone, since dropping the argument would delete the comment with it.

  The rule is on at error severity in `recommended`. The fix it asks for needs the `foldkit` release that made children optional, so bump `foldkit` alongside the plugin. On an older `foldkit`, omitting the argument does not compile.

## 0.5.0

### Minor Changes

- 5d77a97: Take every `Command.define` input as a named field, and fold interruption into it.

  `Command.define` took its inputs positionally, with the result Messages as a variadic tail and the Effect supplied by a second call. That signature had no room to grow: a rest parameter has no trailing slot, so the one Command modifier that exists, interruption, had to live in its own namespace as `Command.Interruptible.define`. Namespaces do not compose. A second modifier would have had nowhere to go, and the positional `toKey` in the interruptible form was the only argument whose meaning a reader could not recover from its shape.

  Inputs are now named fields on a config object: `args` declares the args Schema, `messages` lists the Messages the Command can produce, `execute` holds the Effect, and `interrupt` opts into interruption. `Command.Interruptible.define` is removed; `Command.Interruptible` remains for the outcome vocabulary (`Outcome`, `Interrupted`, `NotFound`), which update functions still match on.

  `interrupt: true` keys every invocation by the Command name, which is what a single-instance flow wants. `interrupt: { keyFields, toKey }` derives the key part from selected args so concurrent invocations can be interrupted independently. `keyFields` gives `toKey` its parameter type and declares the exact args the `Interrupt` constructor requires, so the annotation the positional form required is no longer needed.

  ## Migration

  Move each positional argument to its field, wrap the result Messages in an array, and move the Effect from the second call into `execute`.

  ```ts
  // before
  const FetchWeather = Command.define(
    'FetchWeather',
    { zipCode: S.String },
    SucceededFetchWeather,
    FailedFetchWeather,
  )(({ zipCode }) => Effect.gen(function* () { ... }))

  // after
  const FetchWeather = Command.define('FetchWeather', {
    args: { zipCode: S.String },
    messages: [SucceededFetchWeather, FailedFetchWeather],
    execute: ({ zipCode }) => Effect.gen(function* () { ... }),
  })
  ```

  A Command with no args omits `args` and gives `execute` a bare Effect.

  ```ts
  // before
  const LockScroll = Command.define(
    'LockScroll',
    CompletedLockScroll,
  )(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())))

  // after
  const LockScroll = Command.define('LockScroll', {
    messages: [CompletedLockScroll],
    execute: Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
  })
  ```

  Interruptible Commands move to `Command.define` with an `interrupt` field. The `Interrupt` constructor and its outcome Message are unchanged.

  ```ts
  // before
  const UploadFile = Command.Interruptible.define(
    'UploadFile',
    { uploadId: S.Number, file: S.instanceOf(File) },
    ({ uploadId }: UploadKey) => String(uploadId),
    SucceededUploadFile,
    FailedUploadFile,
  )(({ uploadId, file }) => Effect.gen(function* () { ... }))

  // after
  const UploadFile = Command.define('UploadFile', {
    args: { uploadId: S.Number, file: S.instanceOf(File) },
    messages: [SucceededUploadFile, FailedUploadFile],
    interrupt: {
      keyFields: ['uploadId'],
      toKey: ({ uploadId }) => String(uploadId),
    },
    execute: ({ uploadId, file }) => Effect.gen(function* () { ... }),
  })
  ```

  An interruptible Command that omits `toKey` becomes `interrupt: true`.

  One edge to know about: `interrupt` is discriminated by the literal `true`, so hoisting the config into a variable without `as const` widens it to `boolean` and fails to compile. The error names the widening directly, and writing the config inline at the definition site, which is the normal form, is unaffected.

## 0.4.0

### Minor Changes

- a25f769: Ship `recommended.json` and `all.json` preset files so a JSON `.oxlintrc.json` can extend a preset directly instead of hand-copying rule lists: `{ "extends": ["./node_modules/@foldkit/oxlint-plugin/recommended.json"] }`. The files are generated at build time from the same source as `configs.recommended` / `configs.all`, ship in `files`, and are reachable through the `./recommended.json` and `./all.json` export subpaths. Consumers pick up new rules with a version bump instead of a config diff.

  Both presets now scope every foldkit rule off in test files (`**/*.test.ts`, `**/*.test.tsx`) via an `overrides` entry. Foldkit rules police application definitions that tests exercise rather than write, and some invert in tests (a route-parsing test must build the URL the router under test parses; a Command test double is hand-rolled by design). Scoping them off by default keeps the ruleset stable as new rules ship in batches, and a rule that wants test coverage can opt in explicitly.

### Patch Changes

- 8dd1906: Drop `RadioGroup` from the `selection-submodel-factory-at-module-scope` rule. RadioGroup is now a stateless controlled render helper with no `create` factory, so the rule covers Combobox, Listbox, Menu, and Tabs.

## 0.3.0

### Minor Changes

- 2d3e621: Add 16 convention rules, taking the plugin from 8 to 24. Rule designs come from [`@mpsuesser/oxlint-plugin-foldkit`](https://github.com/mpsuesser/oxlint-plugin-foldkit) by Marc Suesser (MIT), curated for Foldkit in #607 by @artile, and reimplemented here from behavior specs in house style.

  - Command shape: `command-define-pascal-const`, `no-hand-rolled-command-struct`
  - Submodel wiring: `wrap-child-output-in-got-message`, `got-wrapper-carries-only-routing`, `no-child-message-construction-in-root`, `selection-submodel-factory-at-module-scope`
  - Model updates: `no-spread-in-evo`
  - View keying and accessibility: `no-array-index-view-keys`, `keyed-required-for-mapped-rows`, `require-rel-for-external-link`, `no-raw-dom-event-attributes`
  - Routing: `no-hardcoded-route-strings`
  - Lifecycle: `mount-factory-must-use-element`, `no-duplicate-onmount-per-element`, `lazy-view-stable-references`
  - Dev config: `no-disabling-dev-guardrails`

  Every rule lives in `src/rules/` with a colocated unit test and a real-oxlint integration fixture. The generated `recommended` preset (every rule at error) and `all` preset now carry the package specifier, so consumers can spread either into their oxlint config and have the plugin resolve. Nothing is enabled in the scaffold preset; adopting any of these stays opt-in per app, so existing projects see no change.

## 0.2.0

### Minor Changes

- 2d23b39: Add `foldkit/no-module-level-mutable-state`, a lint rule that flags module-level `let` and `var` declarations (including `export let`), which hold state outside the Model. Ambient `declare let` declarations are not flagged. Scaffolded projects enable the rule in their generated `.oxlintrc.json`.

  Ported from the purity-boundary rule family in `@mpsuesser/oxlint-plugin-foldkit` by Marc Suesser.

## 0.1.0

### Minor Changes

- 86b2250: Publish the Foldkit oxlint plugin and scaffold new apps with oxlint and the Foldkit-specific lint rules.

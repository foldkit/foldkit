# @foldkit/ui

## 0.158.0

## 0.157.0

### Minor Changes

- [#1270](https://github.com/foldkit/foldkit/pull/1270) [`49d911a`](https://github.com/foldkit/foldkit/commit/49d911a3b592b658cd44918e668d28f10b19cde2) Thanks [@devinjameson](https://github.com/devinjameson)! - Resolve imported Foldkit, UI, Effect, and child Message APIs through Oxlint's scope manager. Rules now recognize aliased imports, ignore local shadows, and distinguish Submodel Message payloads from unrelated `message` fields without requiring TypeScript parser services.

  This can introduce lint failures where an alias previously hid parent-owned construction of a child Message. Expose an update capability from the child and invoke it through `Update.foldChild` or `Update.foldChildStep` instead.

  Expose Animation `show` and `hide` update capabilities so parents can drive visibility through `Update.foldChildStep` without constructing child Messages.

- [#1268](https://github.com/foldkit/foldkit/pull/1268) [`3a4ccd0`](https://github.com/foldkit/foldkit/commit/3a4ccd0f6611f3ef90a5af43a821bbc2d8821fbe) Thanks [@devinjameson](https://github.com/devinjameson)! - Preserve structurally refined payload types in exhaustive Foldkit union matchers, migrate OutMessage folds to their owning union matcher, and add `Animation.toggle` as a child-owned visibility entry point.

- [#1269](https://github.com/foldkit/foldkit/pull/1269) [`b5ec356`](https://github.com/foldkit/foldkit/commit/b5ec356d1d88d136f77bca416b753479d4aa7b50) Thanks [@devinjameson](https://github.com/devinjameson)! - Reject children and `h.InnerHTML` passed to `h.textarea` or `h.keyed('textarea')` so the Model remains the field's single source of truth. This is a breaking change: move textarea content into the live value property with `h.Value(text)`. The UI Textarea helper now exposes the narrower `TextareaAttribute` group. Animation wrapper elements and Virtual List row elements also exclude `textarea` because both render children.

### Patch Changes

- [#1213](https://github.com/foldkit/foldkit/pull/1213) [`57e2436`](https://github.com/foldkit/foldkit/commit/57e24366c8997cd235002f58c9dc38477a6cb1a3) Thanks [@devinjameson](https://github.com/devinjameson)! - Use full Effect module names in published source, examples, templates, and documentation. JavaScript and TypeScript globals that share an Effect module name are now qualified through `globalThis`.

## 0.156.0

### Minor Changes

- [#1240](https://github.com/foldkit/foldkit/pull/1240) [`12a51d6`](https://github.com/foldkit/foldkit/commit/12a51d6b03863e613436251545781cbb15b4dd2e) Thanks [@devinjameson](https://github.com/devinjameson)! - Close HoverIntent without the pointer grace delay when focus leaves the trigger and panel. The zero-delay close still lets focus moving into the panel cancel dismissal before it resolves, while explicit click-away and Tab-away interactions now feel immediate.

  Add `HoverIntent.close` for parent domain events that should dismiss the panel immediately, such as selecting an item from a hover menu. It invalidates pending transitions, clears panel engagement, and emits `Closed` when visibility changes.

## 0.155.0

### Minor Changes

- [#1191](https://github.com/foldkit/foldkit/pull/1191) [`2d85d5a`](https://github.com/foldkit/foldkit/commit/2d85d5ae9536e3fc9c9595442c233a72c0395122) Thanks [@wmaurer](https://github.com/wmaurer)! - `ShowDialog` now reports whether the dialog opened. It produces `SucceededShowDialog` when the show completes and `FailedShowDialog` when the dialog element is already gone by the time the show runs. `CompletedShowDialog` is renamed to `SucceededShowDialog`. Update any test that resolves `ShowDialog`:

  ```ts
  // Before
  Command.resolve(Dialog.ShowDialog, DialogMessage.CompletedShowDialog())

  // After
  Command.resolve(Dialog.ShowDialog, DialogMessage.SucceededShowDialog())
  ```

  A failed show now releases the scroll lock that the Command took, and `update` closes the Model on `FailedShowDialog`. Before this change, the page stayed locked with no dialog open. The Model also still said the dialog was open. The same dialog could then render again with no lock and no focus trap. If another overlay was open, closing the dialog released that overlay's lock, and the page under it could scroll. `ShowDialog` also releases the lock when the Command is interrupted while it waits for the commit.

  `CloseDialog` now releases the dialog's resources when the element is already gone by the time the close runs. Before this change, a close with no element was ignored and the lock was never released.

  `CloseDialog` also unlocks page scroll only when the close released the resources that `ShowDialog` installed. A close that runs before the show has finished leaves the lock alone. When the show then fails, it releases the lock itself. When the show succeeds, `update` closes the dialog again. Without the check on the close result, a close that ran before the show finished would release the lock, and the failed show would release it again. With another overlay open, the page under that overlay could then scroll.

- [#1179](https://github.com/foldkit/foldkit/pull/1179) [`8c8758e`](https://github.com/foldkit/foldkit/commit/8c8758e64c00172c5615090e5064f83791d2ee8a) Thanks [@SyahrulBhudiF](https://github.com/SyahrulBhudiF)! - Add HoverIntent, a behavior-only Submodel for delayed hover and focus reveal across a trigger and panel.

  HoverIntent opens after a configurable pointer-entry delay, keeps the interaction visible while the pointer or focus moves between its trigger and panel, and closes after a configurable grace delay. Escape closes immediately and suppresses reopening until the interaction fully disengages. The component returns headless trigger and panel event bundles only. It does not impose markup, ARIA semantics, positioning, or styling, so Hover Card and Navigation Menu implementations can compose it with their own UI behavior.

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

- [#1205](https://github.com/foldkit/foldkit/pull/1205) [`9601382`](https://github.com/foldkit/foldkit/commit/960138253f09310ff1dca45d2cf84d25fb86d12d) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade `@floating-ui/dom` to 1.8.0.

- [#1220](https://github.com/foldkit/foldkit/pull/1220) [`16b392c`](https://github.com/foldkit/foldkit/commit/16b392c5e304bbbea62c0aae5a4a36f90d472f71) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade Happy DOM to include its latest custom-element event-listener fix.

- [#1207](https://github.com/foldkit/foldkit/pull/1207) [`2a88e37`](https://github.com/foldkit/foldkit/commit/2a88e3738d4841525be25f2ba16d958164b4f1a9) Thanks [@devinjameson](https://github.com/devinjameson)! - Move TypeDoc generation into a private workspace so package TypeScript upgrades are independent from TypeDoc's compiler support.

- [#1231](https://github.com/foldkit/foldkit/pull/1231) [`aaff2e5`](https://github.com/foldkit/foldkit/commit/aaff2e53f5bf5742ae0428c5fda89a5d6974ac43) Thanks [@devinjameson](https://github.com/devinjameson)! - Match `defineTaggedUnion` and `defineRouteUnion` values through the union's own `match` instead of `Match.value` pipes with `Match.tagsExhaustive`. Internal call sites, the ssg template, and the generated FOLDKIT.md guidance now use the union method; behavior is unchanged.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade development dependencies to Node 26 type definitions and Happy DOM 20.11.8.

- [#1220](https://github.com/foldkit/foldkit/pull/1220) [`16b392c`](https://github.com/foldkit/foldkit/commit/16b392c5e304bbbea62c0aae5a4a36f90d472f71) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the Happy DOM development dependency used by package tests.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the TypeScript compiler used to build and test packages to 7.0.2 while keeping compiler API tools on the official TypeScript 6 compatibility package.

## 0.154.0

### Minor Changes

- 35bd456: Position an arrow for Popover, so a panel can point at its trigger and keep pointing at it as the panel flips and shifts. Popover does not draw the arrow. `toView` receives an `arrow` attribute bundle to spread onto your own element inside the panel, `Popover.arrowId` returns its id as `Popover.buttonId` does for the trigger, and `arrowPadding` keeps the arrow clear of the panel's corners. The Popover docs show the CSS.

  `anchorSetup` takes `arrowId` and an optional `arrowPadding`. When the id resolves to an element inside the panel, of any type including `<svg>`, it appends Floating UI's `arrow` middleware and publishes the offset as `--arrow-x` and `--arrow-y` on the panel. One axis is set per placement, the other is reset to `initial`, and both are removed on cleanup. An id that resolves outside the panel is ignored. With an arrow, `anchorSetup` no longer writes `overflow-y: auto` and `overscroll-behavior: none` on the panel, and still writes `max-height`, so a panel that can outgrow the viewport scrolls through a child of its own. Cleanup now also removes `overflow-y` and `overscroll-behavior`, so a panel set up again, this time with an arrow, does not keep the scroll container the earlier run wrote. Panels with no arrow are otherwise unchanged.

  Two things break. `RenderInfo` gains an `arrow` field, so code that constructs a `RenderInfo` literal, such as a test fixture, needs `arrow: []`. Popover's panel Mount args now always carry `arrowId`, so a Scene test matching the Mount by instance, `Scene.Mount.expectHas(Popover.AnchorPopover({ buttonId, anchor }))`, stops matching until `arrowId: Popover.arrowId(id)` is added to the expected args.

## 0.153.0

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

## 0.152.0

### Minor Changes

- da9e505: Bump Effect to `4.0.0-rc.112` (from `4.0.0-rc.111`). Foldkit's `effect` peer dependency now requires `4.0.0-rc.112`, and `@foldkit/devtools` pins its `@effect/platform-browser` peer dependency to the same version.

  Pin your Effect packages to `4.0.0-rc.112` to match this release. While Effect v4 is in prerelease, use exact pins rather than ranges:

  ```sh
  pnpm add effect@4.0.0-rc.112 @effect/platform-browser@4.0.0-rc.112
  pnpm add -D @effect/vitest@4.0.0-rc.112
  ```

## 0.151.0

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

## 0.150.0

### Minor Changes

- 9869cf7: Bump Effect to `4.0.0-rc.111` (from `4.0.0-rc.109`). Foldkit's `effect` peer dependency now requires `4.0.0-rc.111`, and `@foldkit/devtools` pins its `@effect/platform-browser` peer dependency to the same version.

  Pin your Effect packages to `4.0.0-rc.111` to match this release. While Effect v4 is in prerelease, use exact pins rather than ranges:

  ```sh
  pnpm add effect@4.0.0-rc.111 @effect/platform-browser@4.0.0-rc.111
  pnpm add -D @effect/vitest@4.0.0-rc.111
  ```

## 0.149.0

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

## 0.148.2

## 0.148.1

## 0.148.0

## 0.147.0

### Patch Changes

- 664a8bd: Build id selectors with a local CSS identifier escape instead of the `CSS` browser global, so views that construct selectors also render under Node during server rendering.

## 0.146.0

### Minor Changes

- ee7bdb6: Make the anchor positioning runtime public under a new `@foldkit/ui/anchor` subpath, so an application can build its own anchored component without rendering one of the six components that accept an `anchor` prop.

  `AnchorConfig` was already re-exported as a type from `combobox`, `listbox`, `menu`, `popover` and `tooltip`, so a consumer could describe an anchor config but had no way to act on one. The subpath exports the runtime side alongside it:

  ```ts
  import {
    AnchorConfig,
    Padding,
    Placement,
    anchorSetup,
    portalToContainingRoot,
  } from '@foldkit/ui/anchor'
  ```

  `anchorSetup` and `portalToContainingRoot` are plain DOM functions that return a cleanup, meant to be called inside `Effect.sync` in a Mount and stashed in the Mount result. `AnchorConfig`, `Placement` and `Padding` are now available as Schema values, not only as types.

  The module is also exported from the root barrel, as `import { Anchor } from '@foldkit/ui'`, and appears in the API reference as `Ui.Anchor`.

  Nothing is removed or renamed. `src/anchor.ts` moved to `src/anchor/`, which is internal layout only.

  Thanks @wmaurer for contributing this feature!

- 7014ef6: Name the config `anchorSetup` takes, and give `Placement` and `Padding` type companions, so the `@foldkit/ui/anchor` surface can be described without reaching for `Parameters` or `typeof`.

  ```ts
  import type { Padding, Placement, SetupConfig } from '@foldkit/ui/anchor'
  ```

  `SetupConfig` matches the `InitConfig` and `ViewInputs` types the stateful components export. `Placement` and `Padding` each export a type of the same name alongside their Schema value, the way `AnchorConfig` already did.

  `anchorSetup` takes the element first, as `anchorSetup(element, config)`, matching `portalToContainingRoot(element)`.

- da05bfc: Bump Effect to `4.0.0-rc.109` (from `4.0.0-rc.108`). Foldkit's `effect` peer dependency now requires `4.0.0-rc.109`, and `@foldkit/devtools` pins its `@effect/platform-browser` peer dependency to the same version.

  Pin your Effect packages to `4.0.0-rc.109` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.109 @effect/platform-browser@4.0.0-rc.109
  pnpm add -D @effect/vitest@4.0.0-rc.109
  ```

### Patch Changes

- 4d9e0fb: Report a failed anchor positioning tick through `console.error` instead of letting it escape as an unhandled rejection, and apply the tick gate to every panel rather than only to placement-locked ones.

  `anchorSetup` positions through a promise chain that had no rejection handler. `computePosition` awaits platform measurement and every middleware, so a throw in any of them rejects the tick, and that rejection reached the window unhandled.

  It is now reported, rather than either escaping or being swallowed silently. A panel that never appears with nothing logged is the hard case to debug, since the caller renders `visibility: hidden` and only a successful tick clears it. A run of consecutive failures is reported once, because the panel repositions on every scroll and resize and a persistent failure would otherwise repeat on each one. A fresh failure after a recovery is reported again.

  The gate that keeps at most one tick in flight, so the last write always wins, was conditional on `isPlacementLocked`. That tied a concurrency guard to an unrelated positioning flag. It now applies to every anchored panel. This part changes no behavior: with the current `@floating-ui/dom` a tick settles inside a microtask chain, and each `autoUpdate` callback returns through a microtask checkpoint, so two ticks are never in flight together and the gate does not engage. It makes the invariant hold by construction rather than by coincidence.

  Placement locking is unchanged.

## 0.145.0

### Minor Changes

- 1dc70c7: Widen `AnchorConfig.padding` to accept a partial per-side object alongside the existing scalar, mirroring `@floating-ui/dom`'s `Padding` type. A number still pads every side uniformly; `{ top: 88, right: 16, bottom: 16, left: 16 }` bounds each side independently. The value is forwarded unchanged to the `flip`, `shift`, and `size` middleware.

  With a single scalar, a panel that `flip` moves above its button can slide to within that scalar of the viewport top, under fixed chrome such as a sticky site header, which then paints over the panel. Per-side padding gives the top the extra clearance the header needs while the other sides keep the tighter viewport bound.

### Patch Changes

- 71556de: Assert the read-only commit suppression through `Scene.expectHandled()` instead of a hand-rolled `update` wrapper, and harden three tests that asserted nothing.

  Listbox and Combobox recorded dispatched Messages by wrapping `update` and matching on the `SuppressedItemCommit` tag, because Scene could not express what the component actually promises. It promises the keypress is consumed, so the browser default is suppressed; the Message tag is the mechanism. Those four sites now use `expectHandled()` and `expectIgnored()` and drop the wrapper.

  Three tests elsewhere asserted inertness with no assertion behind it, and now say so: RadioGroup's read-only Space, and Calendar's disabled-month and disabled-year Enter. Each held whether the key was correctly ignored or its handler had started producing a Message with no visible effect, which is the regression they exist to catch. Removing the handler outright has always thrown from the interaction step.

  Test-only change. No API or behavior change.

## 0.144.0

### Minor Changes

- 3feb9ba: Bump Effect to `4.0.0-rc.108` (from `4.0.0-beta.107`), the first Effect v4 release candidate. Foldkit's peer dependencies now require `effect@4.0.0-rc.108` and `@effect/platform-browser@4.0.0-rc.108`.

  Pin your Effect packages to `4.0.0-rc.108` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.108 @effect/platform-browser@4.0.0-rc.108
  pnpm add -D @effect/vitest@4.0.0-rc.108
  ```

## 0.143.0

### Minor Changes

- a614c5e: Stop a multi-select Combobox emitting `ClearedSelection` when it closes.

  `handleClose` read an empty `inputValue` on close as the user having cleared the selection. That inference holds for single-select, where the input displays the current selection and the user has to empty it deliberately. It never held for multi-select, whose `restingInputValue` is an empty string by design, so the condition was true on every close. A nullable multi-select therefore wiped the parent's whole selection each time it closed, by `Escape`, blur, the toggle button, or a backdrop click, without the user doing anything to ask for it.

  Multi-select now never emits `ClearedSelection`. Clearing a multi-select is toggling its values off, one `Selected` at a time, which is the channel it already had. Single-select is unchanged, and `nullable` continues to govern its empty-input close.

- a614c5e: Add `isReadOnly` to the view inputs of both Combobox variants.

  A read-only Combobox emits the native `readonly` attribute plus `aria-readonly="true"` on the input, `aria-readonly="true"` on the items panel, and `data-readonly` on the wrapper, input, toggle button, items panel, and every item. It still opens, navigates, and closes, and the input still takes focus and allows text selection and copying. Five paths that would change the parent's selection close: typing is frozen, items carry no click handler, `Enter` on the active item emits a `SuppressedItemCommit` Message instead of selecting, an `immediate` Combobox stops committing as the arrow keys move, and a nullable Combobox no longer emits `ClearedSelection` when a user close finds an empty input. `itemToConfig`'s context gains `isReadOnly`, so an item can style itself for the state without closing over the view inputs.

  `Closed`, `BlurredInput`, and `PressedToggleButton` gained an `isClearable` field, since the close path lives in `update` and cannot see `isReadOnly`, which is a view input. The view passes it, and the programmatic `close` helpers pass `true`, so `close(model)` clears exactly as before.

  Typing is frozen rather than left to filter because `inputValue` is both the filter query and the display of the selection, so a typable read-only Combobox would have a visible value the user can change.

  `isReadOnly` and `isDisabled` are independent: setting both emits both attribute sets, and `isDisabled` still wins for interaction, since it drops every handler, so a Combobox that is both read-only and disabled cannot be opened at all.

## 0.142.1

### Patch Changes

- 87e9dbf: Bump Effect to `4.0.0-beta.107` (from `4.0.0-beta.106`). Foldkit's peer dependencies now require `effect@4.0.0-beta.107` and `@effect/platform-browser@4.0.0-beta.107`.

  Pin your Effect packages to `4.0.0-beta.107` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.107 @effect/platform-browser@4.0.0-beta.107
  pnpm add -D @effect/vitest@4.0.0-beta.107
  ```

## 0.142.0

### Minor Changes

- b2704a4: Add `isReadOnly` to the view inputs of both Listbox variants.

  A read-only Listbox emits `aria-readonly="true"` on the items panel and `data-readonly` on the wrapper, button, items panel, and every item. It still opens, navigates, and searches, but items carry no click handler and `Enter` or `Space` on the active item emits a `SuppressedItemCommit` Message instead of selecting. `itemToConfig`'s context gains `isReadOnly`, so an item can style itself for the state without closing over the view inputs.

  `isReadOnly` and `isDisabled` are independent: setting both emits both attribute sets, and `isDisabled` still wins for interaction, since its button drops every handler, so a Listbox that is both read-only and disabled cannot be opened at all.

- 7632ab7: Turn RadioGroup into a Submodel and add `isReadOnly` to its view inputs.

  RadioGroup now owns its keyboard focus in a Model. Create it with `RadioGroup.create<Value>()`, hold `RadioGroup.Model` in your Model, initialize it with `RadioGroup.init({ id })`, embed it with `h.submodel`, and fold the `Selected` OutMessage back into the field you pass in as `selectedValue`. The `id` and `onSelect` fields are gone: `id` moves to `init`, and the committed value now arrives as an OutMessage instead of a Message the config builds. Focus moves through a `FocusOption` Command rather than inside the view's event handlers, so a scene or story test resolves it like any other Command.

  A read-only group keeps arrow, Home, End, PageUp, and PageDown focus navigation, reporting each move as a `FocusedOption` Message, and makes Space and clicking inert. The group carries `aria-readonly="true"` and `data-readonly`, and each option carries `data-readonly`. Because focus is modeled, `data-active`, `OptionInfo.isActive`, and `tabindex` follow the keyboard rather than staying pinned to the selection. `isReadOnly` and `isDisabled` are independent; a disabled option drops both its click and its keydown handler.

- bea1da5: Add `isReadOnly` to Slider's view inputs.

  A read-only Slider emits `aria-readonly="true"` on the thumb and `data-readonly` on every attribute group, remains focusable, and omits its pointerdown and keydown handlers. `isReadOnly` and `isDisabled` are independent, and either one removes the interaction handlers.

### Patch Changes

- b49c0b8: Fold the DatePicker's Popover entry points with `Update.foldChildStep`. The hand-written `closePopover` Step and the `Opened` and `Closed` handlers now run `Popover.open` and `Popover.close` through the helper instead of calling them directly and lifting their Commands with `Command.mapMessages`, so the Popover's read, write, and Message lift are stated once and shared with the existing `Update.foldChild` config. Internal refactor with no API change.
- 47e861a: Document `isDisabled` on Checkbox, Switch, and Slider.

  Each component documented `isReadOnly` and left `isDisabled` bare, so the only description of what `isDisabled` emits lived inside its neighbor's comment. Each now describes the attributes it emits, that the control stays focusable, and which of the two flags to reach for. The Slider docs page gains the same guidance.

- 8f7312d: Drop the redundant function-type annotation from the component internals' `fold<Child>OutMessage` consts. `M.type<X.OutMessage>()` names the OutMessage and `M.withReturnType<Update.Step<Model, Message>>()` names the Step, so the standalone annotation restated both. Calendar, Popover, Menu, Combobox, and Listbox folds now bind the pipe directly. The Dialog and Toast leave-animation folds keep their annotation, since they take the fold's `Update.FoldContext` as a second parameter and nothing else types it. Internal refactor with no API or behavior change.
- e515c76: Fold child Submodels inside component internals with `Update.foldChild`. Dialog, Popover, Menu, DatePicker, Listbox, Combobox, and Toast now build their child folds from the helper instead of hand-writing `Command.mapMessages` plus an OutMessage match. The Dialog and Toast leave-animation folds take the fold's `Update.FoldContext` and lift the overridable leave Command with `liftCommand`. Internal refactor with no API or behavior change.

## 0.141.2

### Patch Changes

- 84050fc: Bump Effect to `4.0.0-beta.106` (from `4.0.0-beta.105`). Foldkit's peer dependencies now require `effect@4.0.0-beta.106` and `@effect/platform-browser@4.0.0-beta.106`.

  Pin your Effect packages to `4.0.0-beta.106` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.106 @effect/platform-browser@4.0.0-beta.106
  pnpm add -D @effect/vitest@4.0.0-beta.106
  ```

## 0.141.1

## 0.141.0

## 0.140.1

### Patch Changes

- 40ccffe: Bump Effect to `4.0.0-beta.105` (from `4.0.0-beta.103`). Foldkit's peer dependencies now require `effect@4.0.0-beta.105` and `@effect/platform-browser@4.0.0-beta.105`.

  Pin your Effect packages to `4.0.0-beta.105` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.105 @effect/platform-browser@4.0.0-beta.105
  pnpm add -D @effect/vitest@4.0.0-beta.105
  ```

## 0.140.0

### Minor Changes

- 107cfa5: Stop emitting `aria-disabled` from Input, Select, and Textarea

  These three set the native `disabled` attribute, which already carries the state, so the extra `aria-disabled` restated native semantics in ARIA. The native attribute and `data-disabled` are unchanged. If you select on `[aria-disabled]` in CSS for one of these three, switch to `[data-disabled]`.

- cfe987a: Add `isReadOnly` to Input's and Textarea's `ViewConfig`.

  A read-only field sets the native `readonly` attribute plus `data-readonly`, stays focusable and selectable, and omits its input handler. `isReadOnly` and `isDisabled` are independent, and either one removes the input handler.

- d5566ad: Export `Switch.labelId` and `Switch.descriptionId`

  Switch derived `${id}-label` and `${id}-description` from module-private consts, so a consumer that needed to reference the label or description element, to point `aria-details` at it, to style it, or to find it in a test, had to re-declare the convention and hope it did not drift. `Checkbox`, `Fieldset`, `Dialog`, `Select`, `Textarea`, `Input`, and `Popover` already export their equivalents; Switch now matches. No behavior change.

- 5926900: Add `isReadOnly` to Switch's `ViewConfig`.

  A read-only Switch emits `aria-readonly="true"` and `data-readonly`, remains focusable, and omits its click and Space handlers. `isReadOnly` and `isDisabled` are independent, and either one removes the interaction handlers.

### Patch Changes

- 23d9329: Release scroll locks and inert page content whenever a modal Combobox closes, while keeping multi-select Comboboxes open and modal after selection.
- 6396b63: Set `type="button"` on the headless attribute groups a consumer can render as a `button`.

  A `button` element with no `type` defaults to `type="submit"`, and `h.OnClick` dispatches a Message without calling `preventDefault`. Checkbox, Switch, Disclosure, RadioGroup, and Dialog hand their control attributes to the consumer's `toView` callback, so the consumer picks the element and the component could not know it was a button. Spreading one of those groups onto a `button` inside a `form`, which is an expected setup given that Checkbox, Switch, and RadioGroup support forms through `name` and `value`, meant a click both toggled the control and submitted the form.

  The affected groups now emit `type="button"`: Checkbox's `checkbox`, Switch's `button`, Disclosure's `button`, RadioGroup's `option`, and Dialog's `closeButton`. It is emitted in every state, including disabled, read-only, and while a Dialog leave animation runs, because a bare `button` submits its form whether or not the component attached a handler.

  Setting it is harmless on the other elements these groups target, such as a `div` or a `span`, because the builder assigns a DOM property rather than an HTML attribute. Nothing is serialized into the markup. Attributes apply in order, so a consumer who wants a submit control spreads a later `h.Type` to override it.

  Menu, Listbox, and Combobox render their own `div` for items, so the consumer never chooses that element and they are unaffected.

## 0.139.0

### Minor Changes

- c4822d9: Add `isReadOnly` to Checkbox's `ViewConfig`.

  A read-only Checkbox emits `aria-readonly="true"` and `data-readonly`, remains focusable, and omits its click and Space handlers. `isReadOnly` and `isDisabled` are independent, and either one removes the interaction handlers.

  Thanks @wmaurer!

### Patch Changes

- aa1c805: Preserve focus on a draggable item after each keyboard move. Moving a lifted item re-renders it at its next position and can replace or detach the focused element, which previously left focus on the document body until the drag was dropped or cancelled. DragAndDrop now focuses the item again after resolving every keyboard move, matching its existing drop and cancel behavior.

  Thanks @artile!

- c947f47: Bump Effect to `4.0.0-beta.103` (from `4.0.0-beta.102`). Foldkit's peer dependencies now require `effect@4.0.0-beta.103` and `@effect/platform-browser@4.0.0-beta.103`.

  Pin your Effect packages to `4.0.0-beta.103` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.103 @effect/platform-browser@4.0.0-beta.103
  pnpm add -D @effect/vitest@4.0.0-beta.103
  ```

  `SchemaIssue.InvalidValue` dropped its `actual` argument in this Effect release and now takes annotations as its only argument. Decode failures for `CalendarDateFromIsoString` and `Url` are migrated to the new signature and carry their detail on the `message` annotation, which is the key the default formatter reads. Those two failures previously passed their detail as `description`, which the formatter ignored, so the messages now read as intended instead of falling back to a generic one. If you construct `SchemaIssue.InvalidValue` in your own schemas, drop the leading `Option` argument and move any detail to `message`.

- d50f8a5: Closing an already-closed Menu or Listbox no longer returns Commands. `closeMenu` and `closeListbox` had no open check, so `Closed` on a closed component returned `FocusButton` and focus jumped to a trigger whose panel was never open. A modal Menu or Listbox also returned `UnlockScroll` and `RestoreInert` for a scroll lock and an inert tree it never applied, the same pair leaked when the items container blurred while closed, and an animated component started a leave cascade for a panel that was not showing. Popover and Dialog already treat closing a closed Model as a no-op, and this brings Menu and Listbox in line with them.

  An open Menu or Listbox is unchanged. It still returns `FocusButton`, still returns the modal Commands when `isModal` is set, still emits `Selected` on selection, and an animated one still runs its full leave cascade.

  `SelectedItem` on a closed Menu or single-select Listbox still emits the `Selected` OutMessage. Selection is independent of the open-state transition: programmatic selection has no open precondition, and multi-select Listbox also emits while closed. This fix changes only the leaked Commands.

  Thanks @artile!

- f639d3f: Closing an already-closed Popover no longer returns Commands. `RequestedClose` on a closed Popover returned the caller's Commands unchanged, so `FocusButton` survived and focus jumped to a trigger whose panel was never open. A modal Popover also returned `UnlockScroll` and `RestoreInert` for a scroll lock and an inert tree it never applied, and the same leak reached `BlurredPanel`. The docs already described `Popover.close` on a closed Model as a no-op, and Dialog already behaves that way, so this brings the code in line with both.

  An open Popover is unchanged. It still returns `FocusButton`, still returns the modal Commands when `isModal` is set, still emits `Closed`, and an animated Popover still runs its full leave cascade. Only the already-closed path changed, and it now returns no Commands and no OutMessage, matching `RequestedOpen` on an already-open Popover.

  DatePicker picks this up for free, since its `Closed` Message delegates to `Popover.close`.

  Thanks @artile!

## 0.138.0

### Minor Changes

- dcc207f: Write `data-placement` on every anchored panel, not only the placement-locked ones.

  `anchorSetup` set `data-placement` inside the `isPlacementLocked` branch and removed it on cleanup under the same condition. A panel that did not opt into placement locking exposed nothing to CSS, so side-specific rules such as an arrow's edge styling or a `data-[placement=top]` reordering had no attribute to match. The only way to get the attribute was to lock the placement, which also drops `flip` from every later update. That is a positioning decision, unrelated to wanting to style the side the panel landed on.

  The attribute is now written on every reposition. Without `isPlacementLocked` it tracks the side each update resolves to, including the ones `flip` moves. With `isPlacementLocked` it holds the locked side, exactly as before. Cleanup removes it either way.

  This affects Popover, Tooltip, Listbox, Menu, Combobox, and DatePicker panels, all of which position through `anchorSetup`. Any `data-[placement=...]` rule already written against a panel that is not placement-locked was inert and now applies.

- b4b5eb9: Export `Checkbox.labelId` and `Checkbox.descriptionId`

  The checkbox derived `${id}-label` and `${id}-description` from module-private consts, so a consumer that needed to reference the label or description element, to point `aria-details` at it, to style it, or to find it in a test, had to re-declare the convention and hope it did not drift. `Fieldset` already exports its equivalents (`legendId`, `descriptionId`); the checkbox now matches. No behaviour change.

- 1f1703f: Export a `Bundle` type alongside every `create` factory, covering `Menu`, `Tabs`, `Listbox`, `Listbox.Multi`, `Combobox`, and `Combobox.Multi`.

  Each factory declared its return type inline, so what `create` produced had no name. That stays invisible while the value is only ever called at module scope, since inference covers it. It surfaces when a consumer emits its own declarations: TypeScript has to write the factory's result into the generated `.d.ts`, and with no name to reference it expands the whole structure at every use site. Where that expansion reaches a type the consumer cannot name, the compiler refuses and reports the inferred type as not portable without an explicit annotation.

  `Bundle` is that name. It takes the same type parameters as the factory that returns it, so `Menu.Bundle<Action>` describes exactly what `Menu.create<Action>()` produces, with `Action` threaded through `view`, `update`, and the programmatic helpers the same way.

  Naming the result also makes a bundle something you can pass around rather than only call. A config object with a field typed `Combobox.Bundle<City>`, or a helper that accepts a created bundle instead of calling `create` itself, previously had no way to spell the annotation.

  ```ts
  const ColorListbox = Listbox.create<Color>()

  const toPickerView = (listbox: Listbox.Bundle<Color>, colors: ReadonlyArray<Color>): Html =>
    h.submodel({ view: listbox.view, viewInputs: { items: colors, ... }, ... })
  ```

  Additive only. The object each factory builds is unchanged, every existing call site keeps compiling, and nothing needs updating to take the new type.

  Thanks @IMax153 for contributing this fix!

- 722ffe2: Export the Message constructors that `Combobox`, `Listbox`, `Menu`, `Popover`, and `Slider` only re-exported as types.

  Each of these barrels listed part of its Message union under `export type { ... }`. That re-exports the type and shadows the value, so the constructor was unreachable even though it was implemented and exported from the module behind the barrel. The deep import path resolved to the same barrel, so there was no way around it.

  ```ts
  import { Combobox } from '@foldkit/ui'

  typeof Combobox.Selected // 'function'
  typeof Combobox.UpdatedInputValue // was 'undefined', now 'function'
  ```

  42 constructors across the five components are now callable. Each already had both a `const` and a matching type alias in its source module, so a value re-export carries the type as well and nothing that referenced these names as types has to change.

  | Namespace  | Union members | Previously constructible | Restored |
  | ---------- | ------------- | ------------------------ | -------- |
  | `Combobox` | 22            | 13                       | 9        |
  | `Listbox`  | 24            | 13                       | 11       |
  | `Menu`     | 25            | 13                       | 12       |
  | `Popover`  | 15            | 11                       | 4        |
  | `Slider`   | 6             | 0                        | 6        |

  This matters for writing a headless `Story` against a component that embeds one of these, where driving the component means dispatching its Messages. It also matters for tooling that reads a Message union as a schema, such as the DevTools surface, which advertised tags that could not be built.

  `AnchorConfig` stays type-only, since exposing the schema value is the subject of a separate question about the anchor runtime surface. So do the `ActivationTrigger` and `ActivationMode` literal schemas, which name no Message and need no constructor. `Orientation` is a literal schema of the same kind, already exported as a value by `Listbox` and type-only on `Tabs`, and this change leaves both as they were.

  A test now audits every component barrel and fails when a Message union declares a tag the barrel does not export as a callable.

  Thanks @artile for the report.

- d16b69c: Export `Orientation` as a value from `Tabs`, matching `Listbox` and `RadioGroup`.

  Three components define an `Orientation` literal schema for the same consumer-facing config field. `Listbox` and `RadioGroup` re-exported it from their barrel as a value. `Tabs` listed it under `export type { ... }`, which re-exports the type and shadows the value, so the schema was unreachable.

  ```ts
  import { Tabs } from '@foldkit/ui'

  typeof Tabs.Orientation // was 'undefined', now 'function'
  ```

  `ActivationMode` on `Tabs` and `ActivationTrigger` on `Combobox`, `Listbox`, and `Menu` stay type-only. No barrel exports either of them as a value, so they are already consistent, and promoting them would widen the public surface rather than settle a disagreement between barrels. `AnchorConfig` stays type-only as well, since its runtime side is the subject of a separate question about the anchor surface.

### Patch Changes

- 399bddd: Focus the anchored items panel on open for `Listbox` and `Menu`.

  An anchored panel renders `visibility: hidden` and stays hidden until Floating UI resolves its first position. `.focus()` does not land on a hidden element, so the `FocusItems` Command that runs once the render commits had nothing to focus, and opening the panel left focus on the button.

  The panel is what carries `role="listbox"` (or `role="menu"`) and `aria-activedescendant`, so assistive technology never followed the user into the open panel. Closing on blur is also armed by the panel holding focus, so a panel opened from the keyboard stayed open when the user tabbed away. Arrow keys and typeahead still worked, since the button's key handler delegates to the panel's while the panel is open.

  Both components now pass `focusAfterPosition` to their anchor Mount, focusing the panel as part of the same reveal that clears `visibility`. `Popover` already did this. `FocusItems` still focuses the panel when no anchor is configured, where the panel is visible as soon as the render commits.

## 0.137.0

### Minor Changes

- d31d95a: Add `isPlacementLocked` to `AnchorConfig`. It keeps the placement that an anchored panel resolves the first time it is positioned.

  Foldkit uses Floating UI to position anchored panels. Its `autoUpdate` helper calls `computePosition` again when the trigger, panel, or viewport changes. The positioning call uses Floating UI middleware: `flip` can move the panel to another side when its preferred side overflows, `shift` moves it to keep it in view, and `size` reports the available space so Foldkit can constrain its height.

  Without placement locking, `flip` runs after every observed change. A panel that changes height while it is open can therefore move from below the trigger to above it, and back again, as its content grows and shrinks. In a filterable dropdown this can happen on every keystroke. The panel can jump to the other side while the user types. Even if each placement is correct on its own, repeatedly switching sides disrupts what the user is reading and makes options harder to select.

  When `isPlacementLocked` is true, the first positioning call can still choose the side with enough room. Later calls keep that resolved side. Scrolling and resizing still reposition the panel, and the panel still shrinks when its available space runs out, but it does not move to another side.

  The same ticks write the locked side to `data-placement` on the floating element, as one of `'top'`, `'right'`, `'bottom'`, or `'left'`. A panel that opens upwards usually needs its content reversed, so that the row closest to the trigger stays closest to the trigger. With the side in an attribute, CSS can do this on its own, and the placement does not have to live in a Model.

  `isPlacementLocked` defaults to false. Both behaviors only apply when it is true, so a caller that does not opt in is positioned exactly as before and gets no new attribute. It works in every component that already accepts an `anchor` config, including `Combobox`, `Listbox`, `Menu`, `Popover`, `Tooltip`, and `DatePicker`.

  Thanks @wmaurer for contributing this feature!

- 1c6ed84: Breaking: align Command result pairs with the effects they represent.

  The convention already said `Completed*` mirrors the Command name verb-first, but it was written as a rule for fire-and-forget acknowledgments, so Commands that resolved to a value drifted into conjugating their own verb instead: `DetermineStartTime` produced `DeterminedStartTime`, `GenerateCardId` produced `GeneratedCardId`, `SaveTodos` produced `SavedTodos`. Those names read like facts that arrived on their own, which hides the Command→Message pair in a DevTools timeline and in Story and Scene tests.

  A payload does not change the rule. A Command whose result cannot meaningfully fail names that result `Completed<Command>` and carries the value as the payload. `Succeeded*`/`Failed*` still cover Commands that can fail. The one exception is a Message with more than one cause: when several Commands resolve to the same Message, or a Command synthesizes a Message another source also emits, name it for the fact. `EndedAnimation` stays as it is because both the `WaitForAnimationSettled` Command and each component's `DetectMovementOrAnimationEnd` race produce it.

  Derive the result only after checking that the Command itself names the effect its `execute` body performs. Timer Commands that only wait now say so instead of claiming the later Model transition.

  ## Migration

  Renamed Command result pairs on `@foldkit/ui`:

  | Component     | Command                                | Message                                                 |
  | ------------- | -------------------------------------- | ------------------------------------------------------- |
  | `Animation`   | `RequestFrame` → `WaitForPaint`        | `AdvancedAnimationFrame` → `CompletedWaitForPaint`      |
  | `DragAndDrop` | `ResolveKeyboardMove`                  | `ResolvedKeyboardMove` → `CompletedResolveKeyboardMove` |
  | `Listbox`     | `DelayClearSearch`                     | `ClearedSearch` → `CompletedDelayClearSearch`           |
  | `Menu`        | `DelayClearSearch`                     | `ClearedSearch` → `CompletedDelayClearSearch`           |
  | `Toast`       | `DismissAfter` → `WaitBeforeDismissal` | `ElapsedDuration` → `CompletedWaitBeforeDismissal`      |
  | `Tooltip`     | `ShowAfterDelay` → `WaitBeforeShowing` | `ElapsedShowDelay` → `CompletedWaitBeforeShowing`       |

  Apps reference these when they resolve a component Command in a Story or Scene test, or match on a component Message they forwarded through `Got*`. Update both names in those call sites when the Command changed.

### Patch Changes

- 1e3dcbe: Defer a Command's `execute` body until the runtime executes it.

  `Command.define` invoked the `execute` body as soon as update constructed the Command. Only the resulting Effect was deferred, so every expression the body evaluated on the way to returning that Effect ran immediately, inside a pure reducer.

  A body that reaches for a browser API therefore threw from update itself. `Popover.update` raised `ReferenceError: CSS is not defined` outside a browser, because `InertOthers` builds its selectors with `CSS.escape` and update constructs that Command unconditionally. It threw for a non-modal popover too, where the Command is built and then discarded. That made `@foldkit/ui` popovers, and the picker, combobox, menu, and date picker built on them, unusable in a headless Story even though no Effect ever ran.

  The body is now suspended, so constructing a Command runs none of it. No side effect the body performs and no exception it raises can reach update, a Command that update builds and discards runs nothing at all, and a throwing body surfaces as a contained Effect failure the runtime reports with the Message that caused it, rather than an exception escaping the reducer.

  This applies to Commands that declare `args`, on both the plain and the interruptible paths. A Command with no `args` already received `execute` as an Effect value and never had the problem. Interrupt keys are still derived at construction, so nothing about interrupt addressing changes.

  Thanks @artile for the report and the diagnosis.

## 0.136.0

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
  const LockScroll = Command.define('LockScroll', CompletedLockScroll)(
    Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
  )

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

## 0.135.0

### Patch Changes

- 35c2560: Correct the root view example in the 0.134.0 migration guide. The snippet returned an `Html` value annotated as `Document`, which does not compile. `Document` is `{ title, body, ... }`, so both the before and after form now return that struct.
- cf98218: Rename the Scene and Story `with` step to `given`.

  `Scene.with` and `Story.with` are now `Scene.given` and `Story.given`. Story's exported `WithStep` type is now `Story.GivenStep`. Scene's equivalent stays module-private, as it was before; `Scene.SceneStep` is the exported step type there.

  `with` is a reserved word, so it could never be a named import binding. The module worked around that internally by defining `with_` and exporting it as `with`, which kept `Story.with` readable at the cost of forcing `import { with as with_ }` on anyone importing the steps by name. `given` has no such problem, reads the same in both call styles, and names what the step does: it establishes the precondition the rest of the chain runs against. It also lines up with the Given/When/Then vocabulary the steps already follow, since a story is `given`, then `message`, then `model`.

  ## Migration

  Rename the step at every call site.

  ```ts
  // before
  Story.story(update, Story.with(model), Story.message(Clicked()))
  Scene.scene({ update, view }, Scene.with(model), Scene.click(role('button')))

  // after
  Story.story(update, Story.given(model), Story.message(Clicked()))
  Scene.scene({ update, view }, Scene.given(model), Scene.click(role('button')))
  ```

  If you referenced the step type, rename it too:

  ```ts
  // before
  const step: Story.WithStep<Model> = Story.with(model)
  // after
  const step: Story.GivenStep<Model> = Story.given(model)
  ```

  ## Importing the steps by name

  Because `given` is a legal binding, a test file can now import the steps it uses instead of the whole namespace, which removes the prefix from every call site:

  ```ts
  import { Command, given, message, model, story } from 'foldkit/story'

  test('restarting resets the score', () => {
    story(
      update,
      given(playingModel),
      message(PressedKey({ key: 'r' })),
      model(model => {
        expect(model.points).toBe(0)
      }),
      Command.expectHas(GenerateApplePosition),
    )
  })
  ```

  A test file normally needs only one of the two testing modules, so this reads well in practice. When one file tests both a story and a scene, keep the namespace imports so `Story.given` and `Scene.given` stay distinguishable.

## 0.134.0

### Minor Changes

- a313fc4: Supply the html builder from the render frame.

  `html<Message>()` is removed. It returned a process-wide singleton cast to a caller-chosen type, so the Message type parameter was a phantom: the developer wrote it and the runtime ignored it. A shared view helper that named the app's Message worked at the root and broke inside a Submodel, because the boundary rejected the foreign Message when the handler fired. `Html` is not parameterized by Message, so nothing caught it at compile time.

  The builder now comes from the frame that renders the view and cannot be conjured, so the Message type can no longer disagree with the boundary that will dispatch it.

  ## Migration

  Views receive `h` as their last parameter. Delete the line that built it.

  ```ts
  // before
  export const view = (model: Model): Document => {
    const h = html<Message>()
    return {
      title: 'Example',
      body: h.div([], [h.button([h.OnClick(Clicked())], ['go'])]),
    }
  }

  // after
  export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: 'Example',
    body: h.div([], [h.button([h.OnClick(Clicked())], ['go'])]),
  })
  ```

  The same applies to `crash.view`, which now takes `(context, h)`, and to `Scene.scene`'s `view`.

  Submodel views take the builder after their view inputs:

  ```ts
  // before
  Submodel.defineView<Model, Message, ViewInputs>((model, viewInputs) => { ... })
  // after
  Submodel.defineView<Model, Message, ViewInputs>((model, viewInputs, h) => { ... })
  ```

  A view helper defined at module level takes the builder as its last parameter, and callers pass it along:

  ```ts
  const rowView = (item: Item, h: HtmlBuilder<Message>): Html => ...
  ```

  A memoized helper receives it through the existing args array. The builder is referentially stable, so memoization is unaffected:

  ```ts
  lazyRow(rowView, [item, h])
  ```

  Where no builder is in scope, typically module scope, use `inertHtml`. It is typed `HtmlBuilder<never>`, so element and attribute constructors work while every event-handler constructor is uncallable. Its attributes are `Attribute<never>` and flow into any Message universe by covariance, which also makes it the builder for library code emitting handler-free attribute bundles:

  ```ts
  import { inertHtml as ih } from 'foldkit/html'

  const PagefindBody = ih.DataAttribute('pagefind-body', '')
  ```

  Inside a view, use the view's own `h`. The view already holds a builder, and reaching past it is the habit that made a caller-chosen Message type possible to begin with.

  `@foldkit/ui` components take the consumer's builder as their last argument, and the explicit type argument goes away because it is inferred from the builder:

  ```ts
  // before
  Button.view<Message>({ toView, onClick: Clicked() })
  // after
  Button.view({ toView, onClick: Clicked() }, h)
  ```

  `Canvas.view(config, h)` and the `CustomElement` spec's `withMessage(h)` follow the same shape.

  `crash.view` receives `HtmlBuilder<never>`, not the app's builder. The crash view renders after the dispatch loop has stopped, so a Message it produced could never reach `update`. `never` makes that structural: `h.OnClick(...)` is a compile error rather than a handler that silently does nothing, and a reload control uses `h.Attribute('onclick', 'location.reload()')` as before.

  `DragAndDrop.droppable` and `DragAndDrop.sortable` lose their type parameter and return `ReadonlyArray<Attribute<never>>`. Both produce only data attributes, never handlers, so `never` is the accurate Message type and the result flows into any Message universe by covariance. Drop the explicit type argument: `droppable<Message>(id)` becomes `droppable(id)`. `DragAndDrop.draggable` is unchanged and stays parameterized, because it does dispatch.

  The stateless `@foldkit/ui` helpers name their type parameter `Message`. Button, Fieldset, Input, RadioGroup, Select, and Textarea previously called it `ParentMessage` while Checkbox, Disclosure, and Switch called it `Message`, though none of them opens a Submodel boundary, so there is no child Message for a parent to be named against. Components that do lift a child Message, such as DragAndDrop, keep `ParentMessage`. Type parameter names are not part of the type contract, so call sites are unchanged.

  `h.submodel` now types the lift: `toParentMessage` must return the embedding builder's Message, where it previously returned `unknown`. Lifting into the wrong Message union is a compile error.

  `childAttributes` and slotted Submodels are unchanged.

  ## Testing a view

  A view can no longer be called directly in a test, because there is no way to produce a builder outside a render. Render through the `Scene` harness instead, which supplies one the same way the runtime does. Tests that asserted on the result of `view(model)` become tests that assert on what the scene rendered.

  ## What this does not cover

  A view can still assign its builder to module state where another frame reads it. TypeScript cannot express the restriction that would prevent that, so treat a stored builder as a bug the types will not catch.

## 0.133.0

### Patch Changes

- d16d7f7: Bump Effect to `4.0.0-beta.102` (from `4.0.0-beta.101`). Foldkit's peer dependencies now require `effect@4.0.0-beta.102` and `@effect/platform-browser@4.0.0-beta.102`.

  Pin your Effect packages to `4.0.0-beta.102` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.102 @effect/platform-browser@4.0.0-beta.102
  pnpm add -D @effect/vitest@4.0.0-beta.102
  ```

## 0.132.0

### Patch Changes

- 95118d8: Bump Effect to `4.0.0-beta.101` (from `4.0.0-beta.97`). Foldkit's peer dependencies now require `effect@4.0.0-beta.101` and `@effect/platform-browser@4.0.0-beta.101`.

  Pin your Effect packages to `4.0.0-beta.101` to match. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.101 @effect/platform-browser@4.0.0-beta.101
  pnpm add -D @effect/vitest@4.0.0-beta.101
  ```

## 0.131.0

## 0.130.0

### Minor Changes

- 36ae509: Automatic branch identity through an owned differ and view-function branding.

  Foldkit now ships its own differ, forked from snabbdom 3.6.3, with two independent identity axes on every vnode. `key` keeps its one job, matching siblings in dynamic lists. A new framework-managed `identity` field joins the differ's compatibility check exactly where the selector is consulted: when the identity differs, the node is replaced instead of patched, so DOM state (focus, scroll, uncontrolled input values, an open `details` element) no longer bleeds across a logical identity change. Identity never enters the keyed index, and duplicate identities among siblings are harmless because the compatibility check only ever matches compatible vnodes. An explicit key does not override identity: two different view functions sharing a key replace, matching React, where a keyed element of a different component type remounts.

  The Vite plugin brands every function return in application modules with that function's id (module path plus function name) when the returned value is a vnode with no identity yet. Identity therefore attaches at view-function boundaries, where provenance exists at runtime, and never depends on branch syntax: if/else, switch, Effect Match, and ts-pattern all behave identically. Match arms written as inline handlers are covered too, because each handler is its own function. The remaining manual rules are the ones only your data can provide: key dynamic list items by a stable Model identifier, and extract a same-tag inline ternary into named view functions when you want an identity boundary, exactly as in React.

  Builds without the plugin keep the previous positional-plus-key semantics. `create-foldkit-app` ships the plugin by default. The `snabbdom` dependency is gone; the vendored fork lives inside foldkit with its functional changes documented, and a new dependency-free `foldkit/brand` entry hosts the branding helper the plugin injects.

  `@foldkit/ui` and `@foldkit/devtools` now brand their own compiled output at package build time, so their internals carry view-function identity even in consumer apps, where prebuilt dist loads from node_modules beyond the Vite transform's reach. The transform skips already-branded modules. With identity in place everywhere the plugin or the build step reaches, redundant manual branch keys are removed across ui, devtools, the examples, the website, typing-game, and the starter template; the keys that remain are data-borne list and instance keys, which stay yours to write.

  Upgrading an existing app: build with `@foldkit/vite-plugin` (every `create-foldkit-app` project already does; without the plugin everything keeps the previous positional-plus-key behavior, so upgrading is safe either way). Existing manual branch keys and the wrapper elements that exist only to carry them are now redundant and can be deleted whenever convenient. One behavior change to check: a shared key no longer makes two different view functions patch into each other at the same position; they replace, matching React's remount on a changed component type, so if you relied on that continuity, render both states through one view function. `foldkit()` now returns an array of plugins, which `plugins: [foldkit()]` already handles because Vite flattens nested plugin arrays.

  Two kinds of keys stay, and both carry a fact only your data knows. Mapped list items: rows built by one view function are identical to the differ, so key each by its id, `entries.map(entry => h.keyed('li')(entry.id, [], [...]))`, and reordering moves DOM instead of rewriting row contents. And the same situation stretched over time: a detail page renders every article through one `articlePageView(article)` call at the same position, so without a key navigating from one article to the next patches the old page's DOM, scroll position included, into the new one; key the root by what it is showing, `h.keyed('article')(article.slug, ...)`. The keying guide on the website shows both.

## 0.129.0

## 0.128.1

### Patch Changes

- 96167d1: Bump Effect to `4.0.0-beta.97` (from `4.0.0-beta.88`). Foldkit's peer dependencies now require `effect@4.0.0-beta.97` and `@effect/platform-browser@4.0.0-beta.97`.

  Consumers should align their Effect packages to `4.0.0-beta.97` exactly during the v4 beta window:

  ```
  pnpm add effect@4.0.0-beta.97 @effect/platform-browser@4.0.0-beta.97
  pnpm add -D @effect/vitest@4.0.0-beta.97
  ```

## 0.128.0

### Minor Changes

- f7c4f17: Breaking: Calendar and DatePicker no longer store the selected date. The parent Model owns an `Option<CalendarDate>`, passes it in per render via `ViewInputs.maybeSelectedDate`, and folds the OutMessages back into its own state. DatePicker gains a `ClearedDate` OutMessage: clearing no longer silently empties internal state, it announces the fact so the parent clears its own field. `InitConfig` replaces `initialSelectedDate` with `initialViewDate`, which only controls the month the calendar opens onto; pass the parent's current value to open onto it. `reflectSelectedDate` is replaced on both components by `focusDate`, which moves the view and cursor to a plain `CalendarDate` without touching the selection. Config reflectors (`reflectMinDate`, `reflectMaxDate`, `reflectDisabledDates`, `reflectDisabledDaysOfWeek`) are unchanged, since bounds and disabled dates remain child configuration. Part of #676.

  ### Migration

  Add a field for the selected date to your Model and seed it in init:

  ```ts
  // Before
  const Model = S.Struct({
    datePicker: DatePicker.Model,
  })

  const init = (today: CalendarDate) => ({
    datePicker: DatePicker.init({
      id: 'due-date',
      today,
      initialSelectedDate: today,
    }),
  })
  ```

  ```ts
  // After
  const Model = S.Struct({
    datePicker: DatePicker.Model,
    maybeDueDate: S.Option(Calendar.CalendarDate),
  })

  const init = (today: CalendarDate) => ({
    datePicker: DatePicker.init({
      id: 'due-date',
      today,
      initialViewDate: today,
    }),
    maybeDueDate: Option.some(today),
  })
  ```

  In update, fold the `SelectedDate` and `ClearedDate` OutMessages into the parent-owned field:

  ```ts
  GotDatePickerMessage: ({ message }) => {
    const [nextDatePicker, datePickerCommands, maybeOutMessage] =
      DatePicker.update(model.datePicker, message)

    const nextMaybeDueDate = Option.match(maybeOutMessage, {
      onNone: () => model.maybeDueDate,
      onSome: M.type<DatePicker.OutMessage>().pipe(
        M.tagsExhaustive({
          SelectedDate: ({ date }) => Option.some(date),
          ClearedDate: () => Option.none(),
          ChangedViewMonth: () => model.maybeDueDate,
        }),
      ),
    })

    return [
      evo(model, {
        datePicker: () => nextDatePicker,
        maybeDueDate: () => nextMaybeDueDate,
      }),
      Command.mapMessages(datePickerCommands, message =>
        GotDatePickerMessage({ message }),
      ),
    ]
  }
  ```

  In view, pass the parent-owned selection back in (Calendar takes the same `maybeSelectedDate` view input):

  ```ts
  h.submodel({
    slotId: model.datePicker.id,
    model: model.datePicker,
    view: DatePicker.view,
    viewInputs: {
      anchor,
      maybeSelectedDate: model.maybeDueDate,
      triggerContent,
      toCalendarView,
    },
    toParentMessage: message => GotDatePickerMessage({ message }),
  })
  ```

  Callers of `reflectSelectedDate` should set the parent-owned field and, when the picker should open onto the new date, call `focusDate`:

  ```ts
  // Before
  evo(model, {
    datePicker: DatePicker.reflectSelectedDate(Option.some(date)),
  })
  ```

  ```ts
  // After
  evo(model, {
    maybeDueDate: () => Option.some(date),
    datePicker: DatePicker.focusDate(date),
  })
  ```

- 9d09804: Breaking: `Combobox` and `Combobox.Multi` no longer store the selection. The Submodel Model kept a copy of a value the parent Model already owned. The Model now holds interaction state only, including `inputValue`, the transient text being typed. The selection lives in the parent Model, flows into the view each render (`ViewInputs.maybeSelectedValue` for single-select, `ViewInputs.selectedValues` for multi-select) together with `restingInputValue` (the text the input rests at when the combobox closes), and comes back out as OutMessages the parent folds.

  API changes:

  - `Combobox.Model` drops `maybeSelectedItem` and `maybeSelectedDisplayText`; `Combobox.Multi.Model` drops `selectedItems`. `inputValue` stays.
  - `init` no longer accepts `selectedItem`, `selectedDisplayText`, or `selectedItems`. Seed the parent field instead.
  - `ViewInputs` gains a required selection input and `restingInputValue: string`. Single-select takes `maybeSelectedValue: Option<Item>`, multi-select takes `selectedValues: ReadonlyArray<Item>`. For single-select, `restingInputValue` is the selection's display text, or empty. The multi-select input always rests empty on close, so multi consumers pass `''`.
  - The `Selected` OutMessage drops `wasAdded`. It carries only the activated `value`; the parent decides what activation means (single-select stores it, multi-select toggles membership).
  - New `ClearedSelection` OutMessage: sent when a nullable combobox closes with an empty input. The parent clears the selection it owns. `OutMessage` is now the union of `Selected` and `ClearedSelection`, so exhaustive folds must handle both tags.
  - Close-path Messages carry the resting text as a payload fact: `Closed`, `BlurredInput`, and `PressedToggleButton` now have a `restingInputValue: string` payload, and `SelectedItem` carries `wasSelected: boolean` so nullable deselect works without the Model knowing the selection. The view computes these payloads from `ViewInputs`.
  - `Closed` and `BlurredInput` are no-ops while the combobox is already closed, so a stale close dispatch baked from an old render cannot rewrite `inputValue` or re-emit `ClearedSelection`.
  - `Combobox.close(model, restingInputValue)` now takes the resting text. `Combobox.Multi.close(model)` keeps its signature; the multi input always rests empty.
  - Immediate mode (`immediate: true`) now emits `Selected` on every keyboard activation while open, so arrow keys commit as they move. Combining `immediate` with `nullable` is discouraged: a toggle fold would deselect as the arrows pass back over the selected item.
  - The multi-select hidden form inputs now submit the full parent-owned selection, not just the selected items present in the currently filtered list.

  ### Migration

  Own the selection in the parent Model and stop seeding it through `init`. Declaring the values as an `S.Literals` Schema keeps the field literal-typed end to end:

  ```ts
  // Before
  const Model = S.Struct({
    cityCombobox: Combobox.Model,
  })

  const init = (): Model => ({
    cityCombobox: Combobox.init({ id: 'city-combobox', selectedItem: 'Kyiv' }),
  })

  // After
  const City = S.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
  type City = typeof City.Type

  const CityCombobox = Combobox.create<City>()

  const Model = S.Struct({
    cityCombobox: Combobox.Model,
    maybeSelectedCity: S.Option(City),
  })

  const init = (): Model => ({
    cityCombobox: Combobox.init({ id: 'city-combobox' }),
    maybeSelectedCity: Option.some('Kyiv'),
  })
  ```

  Pass the selection and the resting text into the view. Single-select passes an `Option` as `maybeSelectedValue`; multi-select passes its full array as `selectedValues` and `restingInputValue: ''`:

  ```ts
  h.submodel({
    model: model.cityCombobox,
    view: CityCombobox.view,
    viewInputs: {
      items: filteredCities,
      maybeSelectedValue: model.maybeSelectedCity,
      restingInputValue: Option.getOrElse(model.maybeSelectedCity, () => ''),
      itemToValue: city => city,
      itemToDisplayText: city => city,
      itemToConfig: cityItemConfig,
    },
    toParentMessage: message => GotCityComboboxMessage({ message }),
  })
  ```

  Fold the OutMessages into the selection you own. `ClearedSelection` only fires for nullable comboboxes; a nullable fold clears the field as shown below, while a non-nullable fold keeps its selection in that arm since it can never fire. Either way the match stays exhaustive:

  ```ts
  GotCityComboboxMessage: ({ message }) => {
    const [nextCombobox, commands, maybeOutMessage] = CityCombobox.update(
      model.cityCombobox,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotCityComboboxMessage({ message }),
    )

    return Option.match(maybeOutMessage, {
      onNone: () => [
        evo(model, { cityCombobox: () => nextCombobox }),
        mappedCommands,
      ],
      onSome: M.type<Combobox.OutMessage<City>>().pipe(
        M.tagsExhaustive({
          Selected: ({ value }) => [
            evo(model, {
              cityCombobox: () => nextCombobox,
              maybeSelectedCity: () => Option.some(value),
            }),
            mappedCommands,
          ],
          ClearedSelection: () => [
            evo(model, {
              cityCombobox: () => nextCombobox,
              maybeSelectedCity: () => Option.none(),
            }),
            mappedCommands,
          ],
        }),
      ),
    })
  }
  ```

  Multi-select folds `Selected` by toggling the value's membership in its array, exactly as the Listbox migration shows.

  Callers of `reflectSelectedItem`/`reflectSelectedItems` delete the reflect call and read the selection from the state that already owned it.

  Part of #676.

- 9fe90d6: Make `Checkbox`, `Switch`, and `Disclosure` stateless controlled render helpers and remove their Submodel forms. Following `RadioGroup`, each holds only the value the parent already owns (`isChecked` / `isOpen`), so the Submodel Model was a mirror carrying a reflect-on-every-transition sync obligation. Each now exposes a single `view(ViewConfig)`:

  - `Checkbox.view` / `Switch.view` take `isChecked` and dispatch `onToggle(isChecked)` with the new state.
  - `Disclosure.view` takes `isOpen` and dispatches `onToggle(isOpen)`, and still exposes `buttonId` plus the `animatePanel` helper.

  The parent owns the state and just stores the value in `update`. There is no focus Command: Disclosure's toggle is button-driven so focus stays on the button, and a programmatic open/close should not steal focus.

  BREAKING: `Model`, `init`, `update`, `setChecked`, `reflectChecked` (Checkbox/Switch), `toggle`, `close`, `reflectOpenState`, `FocusButton`, `CompletedFocusButton` (Disclosure), the `OutMessage`/`Message`/`Toggled`/`SetChecked`/`Closed`/`ToggledChecked`/`ToggledOpenState` schemas, and the `InitConfig`/`ViewInputs` types are removed from all three. Move each usage to a parent-owned Model field rendered with `view`: store the value, handle the `onToggle` Message in `update`, and delete the `Got*` plumbing. Your `toView` markup moves over unchanged; the attribute bundles keep their names and contents. A "select all" now sets the child fields directly instead of calling `setChecked`. Part of #676.

  Before, with the Submodel form:

  ```ts
  // model
  acceptTerms: Checkbox.Model,

  // view
  h.submodel({
    slotId: 'accept-terms',
    model: model.acceptTerms,
    view: Checkbox.view,
    viewInputs: { toView: attributes => ... },
    toParentMessage: message => GotAcceptTermsMessage({ message }),
  })

  // update: delegate to Checkbox.update, then match the ToggledChecked
  // OutMessage to read the new value
  ```

  After, with the controlled helper:

  ```ts
  // model
  acceptedTerms: S.Boolean,

  // view
  Checkbox.view<Message>({
    id: 'accept-terms',
    isChecked: model.acceptedTerms,
    onToggle: isChecked => ToggledTerms({ isChecked }),
    toView: attributes => ...,
  })

  // update
  ToggledTerms: ({ isChecked }) => [
    evo(model, { acceptedTerms: () => isChecked }),
    [],
  ],
  ```

- 9d09804: Breaking: `Listbox` and `Listbox.Multi` no longer store the selection. The Submodel Model kept a copy of a value the parent Model already owned, so every app carried two sources of truth and had to keep them in sync. The Model now holds interaction state only (open/closed, active item, activation trigger, typeahead search). The selection lives in the parent Model, flows into the view each render (`ViewInputs.maybeSelectedValue` for single-select, `ViewInputs.selectedValues` for multi-select), and comes back out as a neutral `Selected({ value })` OutMessage the parent folds: single-select stores the value, multi-select toggles the value's membership.

  API changes:

  - `Listbox.Model` drops `maybeSelectedItem`; `Listbox.Multi.Model` drops `selectedItems`.
  - `Listbox.init` no longer accepts `selectedItem`; `Listbox.Multi.init` no longer accepts `selectedItems`. Seed the parent field instead.
  - `ViewInputs` gains a required selection input: single-select takes `maybeSelectedValue: Option<Value>`, multi-select takes `selectedValues: ReadonlyArray<Value>`. It drives `aria-selected` and `data-selected` on items, which item the Listbox highlights when it opens onto a selection, and the hidden form inputs submitted under `name`.
  - The `Selected` OutMessage drops `wasAdded`. It now carries only the activated `value`; the parent owns the selection and decides what activation means.
  - `reflectSelectedItem` and `reflectSelectedItems` are removed from both variants and from `create`. To mirror external truth (a URL parameter, restored storage, a server push), update the parent field that owns the selection. The Listbox has nothing left to sync.

  ### Migration

  Own the selection in the parent Model and stop seeding it through `init`. Declaring the values as an `S.Literals` Schema keeps the field literal-typed end to end:

  ```ts
  // Before
  const Model = S.Struct({
    planListbox: Listbox.Model,
  })

  const init = (): Model => ({
    planListbox: Listbox.init({ id: 'plan-listbox', selectedItem: 'Pro' }),
  })

  // After
  const Plan = S.Literals(['Free', 'Pro', 'Enterprise'])
  type Plan = typeof Plan.Type

  const PlanListbox = Listbox.create<Plan>()

  const Model = S.Struct({
    planListbox: Listbox.Model,
    maybeSelectedPlan: S.Option(Plan),
  })

  const init = (): Model => ({
    planListbox: Listbox.init({ id: 'plan-listbox' }),
    maybeSelectedPlan: Option.some('Pro'),
  })
  ```

  Pass the selection into the view. Single-select passes an `Option` as `maybeSelectedValue`, multi-select passes its full array as `selectedValues`:

  ```ts
  h.submodel({
    model: model.planListbox,
    view: PlanListbox.view,
    viewInputs: {
      items: plans,
      maybeSelectedValue: model.maybeSelectedPlan,
      itemToConfig: planItemConfig,
      buttonContent: planButtonContent(model.maybeSelectedPlan),
    },
    toParentMessage: message => GotPlanListboxMessage({ message }),
  })
  ```

  Fold the OutMessage into the selection you own. Single-select stores the value:

  ```ts
  GotPlanListboxMessage: ({ message }) => {
    const [nextListbox, commands, maybeOutMessage] = PlanListbox.update(
      model.planListbox,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotPlanListboxMessage({ message }),
    )

    return Option.match(maybeOutMessage, {
      onNone: () => [
        evo(model, { planListbox: () => nextListbox }),
        mappedCommands,
      ],
      onSome: M.type<Listbox.OutMessage<Plan>>().pipe(
        M.tagsExhaustive({
          Selected: ({ value }) => [
            evo(model, {
              planListbox: () => nextListbox,
              maybeSelectedPlan: () => Option.some(value),
            }),
            mappedCommands,
          ],
        }),
      ),
    })
  }
  ```

  Multi-select folds the same OutMessage by toggling membership, replacing the removed `wasAdded` branch:

  ```ts
  // Before
  Selected: ({ value, wasAdded }) => [
    evo(model, {
      peopleListbox: () => nextListbox,
      selectedPeople: () =>
        wasAdded
          ? Array.append(model.selectedPeople, value)
          : Array.filter(model.selectedPeople, person => person !== value),
    }),
    mappedCommands,
  ],

  // After
  Selected: ({ value }) => [
    evo(model, {
      peopleListbox: () => nextListbox,
      selectedPeople: () =>
        Array.contains(model.selectedPeople, value)
          ? Array.filter(model.selectedPeople, person => person !== value)
          : Array.append(model.selectedPeople, value),
    }),
    mappedCommands,
  ],
  ```

  Callers of `reflectSelectedItem`/`reflectSelectedItems` delete the reflect call and read the selection from the state that already owned it.

  Part of #676.

- 8dd1906: Make `RadioGroup` a stateless controlled render helper and remove the Submodel form. `RadioGroup.view` takes a `ViewConfig` (`id`, `selectedValue`, `options`, `onSelect`, `ariaLabel`, `orientation`, `toView`, plus the optional `isOptionDisabled`, `isDisabled`, and `name`) and dispatches the parent's own Message through `onSelect(value)`. The parent owns the selection, so there is no mirrored `selectedValue` to keep in sync. Moving focus onto the newly-selected option is the radio group's own concern now: it happens inside the component's click and keydown handlers (via `OnClickFocus` and the new `OnKeyDownFocus`), so the parent's `update` only stores the value. There is no focus command or acknowledgement to wire.

  BREAKING: `RadioGroup.Model`, `init`, `update`, `select`, `create`, `reflectSelectedValue`, `FocusOption`, `CompletedFocusOption`, `SelectedOption`, `Selected`, `OutMessage`, `Message`, and the `InitConfig`/`ViewInputs` types are removed. Move each usage to a parent-owned selection field rendered with `RadioGroup.view`: store the value in your Model, handle the `onSelect` Message in `update`, and delete the `Got*` plumbing. A radio group is a select with different rendering, so it now sits with `Select`, `Input`, and `Textarea` as a controlled helper rather than a Submodel.

- f7c4f17: Breaking: Slider no longer stores its value. The parent Model owns the value, passes it in per render via `ViewInputs.value`, and folds the `ChangedValue` OutMessage back into its own state. The component keeps only private interaction state (`min`/`max`/`step` configuration and the drag phase), so the value cannot drift from parent truth. `InitConfig` drops `initialValue`; seed the parent-owned field instead, conforming it with the newly exported `snapAndClamp(value, min, max, step)`. `reflectValue` is removed; update the parent-owned field directly. `fractionOfValue` now takes `(value, min, max)` instead of a Model. `reflectRange` still reflects an externally-driven range onto the component but no longer clamps a stored value; clamp the parent-owned value with `snapAndClamp` in the same update. Part of #676.

  ### Migration

  Add a field for the value to your Model and seed it in init:

  ```ts
  // Before
  const Model = S.Struct({
    volumeSlider: Slider.Model,
  })

  const init = () => ({
    volumeSlider: Slider.init({
      id: 'volume',
      min: 0,
      max: 1,
      step: 0.05,
      initialValue: 0.5,
    }),
  })
  ```

  ```ts
  // After
  const Model = S.Struct({
    volumeSlider: Slider.Model,
    volume: S.Number,
  })

  const init = () => ({
    volumeSlider: Slider.init({ id: 'volume', min: 0, max: 1, step: 0.05 }),
    volume: Slider.snapAndClamp(0.5, 0, 1, 0.05),
  })
  ```

  In update, fold the `ChangedValue` OutMessage into the parent-owned field:

  ```ts
  GotVolumeSliderMessage: ({ message }) => {
    const [nextVolumeSlider, sliderCommands, maybeOutMessage] = Slider.update(
      model.volumeSlider,
      message,
    )

    const nextVolume = Option.match(maybeOutMessage, {
      onNone: () => model.volume,
      onSome: M.type<Slider.OutMessage>().pipe(
        M.tagsExhaustive({
          ChangedValue: ({ value }) => value,
        }),
      ),
    })

    return [
      evo(model, {
        volumeSlider: () => nextVolumeSlider,
        volume: () => nextVolume,
      }),
      Command.mapMessages(sliderCommands, message =>
        GotVolumeSliderMessage({ message }),
      ),
    ]
  }
  ```

  In view, pass the parent-owned value back in:

  ```ts
  h.submodel({
    slotId: model.volumeSlider.id,
    model: model.volumeSlider,
    view: Slider.view,
    viewInputs: {
      value: model.volume,
      ariaLabel: 'Volume',
      toView,
    },
    toParentMessage: message => GotVolumeSliderMessage({ message }),
  })
  ```

- f7c4f17: Breaking: Tabs no longer stores the active tab. The parent Model owns the selected value, passes it in per render via `ViewInputs.selectedValue`, and folds the `Selected` OutMessage back into its own state. The component keeps only private interaction state (the roving keyboard-focus cursor and the activation mode), so there is no second copy of the selection to drift from parent truth. `InitConfig` drops `activeIndex`, and `selectTab` and `reflectSelectedTab` are removed; to change the active tab, update the parent-owned field directly. Part of #676.

  ### Migration

  Add a field for the active tab to your Model and seed it in init:

  ```ts
  // Before
  const Model = S.Struct({
    tabs: Tabs.Model,
  })

  const init = () => ({
    tabs: Tabs.init({ id: 'framework-tabs', activeIndex: 0 }),
  })
  ```

  ```ts
  // After
  const Model = S.Struct({
    tabs: Tabs.Model,
    activeFramework: Framework,
  })

  const init = () => ({
    tabs: Tabs.init({ id: 'framework-tabs' }),
    activeFramework: 'Foldkit',
  })
  ```

  In update, fold the `Selected` OutMessage into the parent-owned field:

  ```ts
  GotTabsMessage: ({ message }) => {
    const [nextTabs, tabsCommands, maybeOutMessage] = FrameworkTabs.update(
      model.tabs,
      message,
    )

    const nextActiveFramework = Option.match(maybeOutMessage, {
      onNone: () => model.activeFramework,
      onSome: M.type<Tabs.OutMessage<Framework>>().pipe(
        M.tagsExhaustive({
          Selected: ({ value }) => value,
        }),
      ),
    })

    return [
      evo(model, {
        tabs: () => nextTabs,
        activeFramework: () => nextActiveFramework,
      }),
      Command.mapMessages(tabsCommands, message => GotTabsMessage({ message })),
    ]
  }
  ```

  In view, pass the parent-owned value back in:

  ```ts
  h.submodel({
    slotId: model.tabs.id,
    model: model.tabs,
    view: FrameworkTabs.view,
    viewInputs: {
      tabs: frameworks,
      selectedValue: model.activeFramework,
      ariaLabel: 'Framework comparison',
      toView,
    },
    toParentMessage: message => GotTabsMessage({ message }),
  })
  ```

- 080b391: Add `Toast.test.drainEntry` for Story tests. Showing a toast emits a multi-step animation and dismiss lifecycle, and a Story test must resolve every emitted Command or it fails on leftover Commands. The helper builds the `Story.Command.resolveAll` step that drains a single entry end to end: enter animation, settle, auto-dismiss, exit animation, settle. Each step resolves with the child's raw result Message, so `resolveAll` replays the matched Command's own wrapping and a parent that embeds the toast Submodel drains the same way. The lifecycle knowledge now lives in one place instead of being hand-rolled in each test.

## 0.127.0

### Minor Changes

- 6ebe07f: Add an `initialFocus` attribute group to Dialog's `RenderInfo`. Spread it onto the element that should receive focus when the dialog opens. `focusSelector` targets an element whose id you do not own, or a descendant selector, and takes precedence when both are set.

## 0.126.0

### Patch Changes

- 86d0c9f: `Ui.Tooltip` no longer hides when the trigger is pressed. Tooltips hide only on pointer-leave, blur, or Escape. Escape still suppresses re-opening until the user disengages.

  `PressedPointerOnTrigger` now carries only `pointerType`; the `button` field is removed, since it was only used to detect the left-click dismissal that was removed. The message still records the pointer type so the focus that follows a mouse press can be told apart from focus that affirms the tooltip (keyboard, touch, or pen).

## 0.125.0

## 0.124.0

### Minor Changes

- c395720: Add `Ui.Nav`, a stateless, headless primitive for URL-driven navigation. It renders a navigation landmark whose items are links, marking the current destination with `aria-current="page"`, derived from an `isItemCurrent` predicate the consumer drives from the URL. Reach for `Ui.Tabs` instead when switching content within a single page.

## 0.123.0

## 0.122.1

### Patch Changes

- ca64832: Typecheck test files. Each package's `typecheck` script now checks the project that includes tests instead of the build project that excludes them. No runtime changes.

## 0.122.0

### Minor Changes

- 0460a48: Hand the Dialog's title and description ids to the consumer through `RenderInfo`
  so they are never hand-rolled.

  `RenderInfo` gains `title` and `description` attribute groups (siblings of
  `dialog` / `backdrop` / `panel` / `closeButton`). Spread them onto your heading
  and description elements:

  ```ts
  toView: ({ dialog, backdrop, panel, title, description, closeButton }) => ...
  h.h2([...title], ['My dialog'])
  h.p([...description], ['...'])
  ```

  The dialog's own `aria-labelledby` / `aria-describedby` point at the same
  framework-managed ids, so labelling wires up without the consumer constructing
  any id. This removes the class of bug where a consumer independently built a
  dialog-scoped id such as `${dialogId}-title` for a form field literally called
  "title" and silently collided with the dialog's own heading id.

  Migration: destructure `title` / `description` from the `toView` render info and
  spread them, instead of `h.Id(Dialog.titleId(model))` / `descriptionId`. The
  `Dialog.titleId` / `Dialog.descriptionId` helpers remain as an escape hatch for
  referencing the id as a value outside `toView` (a Command calling
  `getElementById`, a cross-element reference, or a test).

  Defense in depth alongside the `RenderInfo` change:

  - The reserved ids are namespaced. The helpers and rendered ids now use the
    `-dialog-title` / `-dialog-description` suffixes rather than the bare `-title`
    / `-description`, so even a hand-rolled id is far less likely to collide.
  - The runtime gains a development-only diagnostic: it scans the
    Foldkit-rendered root for elements sharing an `id` and emits a
    `[foldkit]`-prefixed `console.warn` naming the duplicated id. The scan is
    coalesced on a trailing timer so rapid successive renders trigger at most one
    full-tree scan per second, warns once per id, is scoped to the app root, never
    throws, and is tree-shaken out of production builds.

## 0.121.0

### Minor Changes

- 1a0d7fc: Bring external-label support to the remaining trigger-based `@foldkit/ui`
  components, matching the `Ui.Listbox` trigger.

  `Ui.Combobox`, `Ui.Menu`, `Ui.DatePicker`, `Ui.Popover`, `Ui.Tooltip`, and
  `Ui.Disclosure` now accept optional `ariaLabel` and `ariaLabelledBy` on their
  view inputs. When provided, they are applied to the component's trigger
  element (the input for Combobox, the button for the rest), with `ariaLabel`
  taking precedence. Neither attribute is emitted when omitted, so a trigger
  never carries a dangling `aria-labelledby`.

  Each component also exposes a bare-id helper that mirrors its internal id
  convention, so a native `<label for=...>` can target the trigger without
  hardcoding the suffix: `Combobox.inputId(id)` (and `Combobox.Multi.inputId(id)`),
  `Menu.buttonId(id)`, `DatePicker.triggerId(id)`, `Popover.buttonId(id)`,
  `Tooltip.triggerId(id)`, and `Disclosure.buttonId(id)`.

### Patch Changes

- f3dee68: Clarify the Dialog docstrings about how the native `<dialog>` is opened. The
  `ShowDialog` command and the component view go through `Dom.showDialog`, which
  calls `show()` rather than native `showModal()` so other high-z-index overlays
  stay interactive. The docs now describe the high z-index, focus trap,
  component-supplied backdrop, and `cancel` event on Esc instead of implying
  native modal semantics.

## 0.120.0

### Minor Changes

- d17a0e5: Add a first-class way to associate an external label with the `Ui.Listbox`
  trigger button.

  `ViewInputs` now accepts optional `ariaLabel` and `ariaLabelledBy`. When
  provided, they are applied to the trigger button, with `ariaLabel` taking
  precedence. Neither attribute is rendered when omitted, so the trigger never
  carries a dangling `aria-labelledby`. `Listbox.buttonId(id)` (and
  `Listbox.Multi.buttonId(id)`) returns the bare id of the trigger button,
  mirroring the existing `buttonSelector`, so a native
  `<label for={Listbox.buttonId(id)}>` can drive click-to-focus without
  hardcoding the internal `-button` convention.

- 4405bd2: Rename `Dom.showModal` to `Dom.showDialog` and `Dom.closeModal` to
  `Dom.closeDialog`.

  The old names implied native `HTMLDialogElement.showModal()` semantics, but
  `Dom.showModal` deliberately calls `element.show()` plus a manual focus trap
  and a high z-index so DevTools and other overlays stay interactive above the
  dialog. `Dom.closeModal` wraps native `.close()`. The new names drop the
  misnomer and match the already-`Dialog`-flavored internals and the `Ui.Dialog`
  Commands.

  Migration: rename `Dom.showModal` to `Dom.showDialog` and `Dom.closeModal` to
  `Dom.closeDialog` at every call site. Behavior is unchanged.

## 0.119.0

### Minor Changes

- c1a545c: Add `h.OnUnmount(message)` and auto-release `Ui.Dialog` resources when the
  dialog element unmounts.

  `h.OnUnmount(message)` is a new Html attribute that dispatches a Message when
  its element is removed from the DOM by a structural patch (a key change, a
  parent re-render that drops it, route navigation away from its subtree). It
  binds to snabbdom's `destroy` hook, so the resulting Message flows through
  `update` like any other fact. When the element belongs to a Submodel, the
  boundary wrapping chain is resolved eagerly at render time, so the Message
  still reaches the parent even though the Submodel boundary is torn down in the
  same patch. It is replay-safe: the runtime suppresses the dispatch during a
  DevTools time-travel render, so scrubbing through history never re-runs the
  cleanup.

  `Ui.Dialog` uses this as a backstop. Previously, unmounting an open dialog
  without a purposeful close (the classic case being navigation away from a
  route-keyed subtree that contains it) left page scroll locked and the
  focus-trap keyboard listener installed, and could leave the Model reading a
  stale `isOpen: true`. The dialog now emits `Unmounted` on structural unmount,
  which resets the Model to a clean closed state and runs a hygiene-only
  `ReleaseDialogResources` Command (release scroll lock, restore focus, remove
  the keydown listener). The view only attaches the backstop while the dialog is
  visible (open or mid-leave), so navigating a page full of closed dialogs does
  not flood the message log. This backstop is silent: it does not emit the
  `Closed` OutMessage, run consumer close Commands, or play a leave animation. The
  purposeful close path (Escape, backdrop, close button) is unchanged. The
  cleanup is idempotent and releases the shared scroll lock exactly once, so a
  normal close followed by an unmount never double-releases.

  A new `Dom.releaseDialogResources(id)` Effect performs the idempotent,
  hygiene-only release and is exported from `foldkit/dom`. It is addressed by the
  dialog's id, not a selector, because the element is typically already gone from
  the DOM by the time the backstop runs. Because this cleanup is now keyed by id
  rather than by element, a dialog's id must be non-empty and unique within the
  document.

- 1a0a454: Add `animatePanel` to the `Ui.Disclosure` attribute bundle, so disclosures can
  animate their expand and collapse. It wraps panel content in a CSS-grid
  container that transitions height (`grid-template-rows: 0fr → 1fr` with
  `overflow: hidden`), keeping the panel mounted while collapsed so the transition
  has something to animate from and to. Render the panel unconditionally and pass
  it through `attributes.animatePanel` instead of gating it on `isOpen`. The
  collapsed content is marked `aria-hidden`. Mirrors the `Ui.Animation`
  `animateSize` flag.

## 0.118.0

## 0.117.0

### Minor Changes

- 1795e0e: Bump Effect to `4.0.0-beta.88` (from `4.0.0-beta.83`). Foldkit's peer dependencies now require `effect@4.0.0-beta.88` and `@effect/platform-browser@4.0.0-beta.88`.

  Consumers should align their Effect packages to `4.0.0-beta.88` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.88 @effect/platform-browser@4.0.0-beta.88
  pnpm add -D @effect/vitest@4.0.0-beta.88
  ```

## 0.116.0

## 0.115.0

## 0.114.1

### Patch Changes

- d2bed68: Make anchored overlays (Listbox, Menu, Combobox, Popover) work when the app is
  mounted inside a shadow root, such as the DevTools overlay. The panel portals
  into the element's containing root instead of always `document.body` (keeping its
  scoped styles), resolves its anchor button and focus target within that root
  (`document.getElementById`/`querySelector` do not pierce shadow boundaries), and
  positions with Floating UI's `fixed` strategy in a shadow context (the `absolute`
  strategy mismeasures against the shadow host as `offsetParent`). Light-DOM apps
  are unchanged.

## 0.114.0

## 0.113.1

## 0.113.0

### Minor Changes

- fcc7a94: Bump Effect to `4.0.0-beta.83` (from `4.0.0-beta.78`). Foldkit's peer dependencies now require `effect@4.0.0-beta.83` and `@effect/platform-browser@4.0.0-beta.83`.

  Consumers should align their Effect packages to `4.0.0-beta.83` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.83 @effect/platform-browser@4.0.0-beta.83
  pnpm add -D @effect/vitest@4.0.0-beta.83
  ```

### Patch Changes

- 32fd9cb: Drop the unused `@effect/platform-browser` peer dependency from `@foldkit/ui`
  and `@foldkit/devtools`. Neither package imports it, and consumers still
  receive it transitively through `foldkit`, which does use it.

## 0.112.5

### Patch Changes

- 1684a0c: Escape element ids before using them as CSS selectors. Components that focus or
  observe their own elements (Listbox, Combobox, Menu, Popover, Dialog, DatePicker,
  Calendar, RadioGroup, Tabs, Disclosure, and animated overlays) built selectors as
  `#${id}`, which threw a `querySelector` SyntaxError when the id was not a valid CSS
  identifier on its own. Ids beginning with a digit, such as UUID-prefixed ids, now
  work.

## 0.112.4

## 0.112.3

## 0.112.2

## 0.112.1

## 0.112.0

### Minor Changes

- a481ddb: Split UI components and the in-browser DevTools overlay out of core.

  The 24 UI components move from `foldkit/ui/*` to the new `@foldkit/ui` package, and the DevTools overlay moves to the new `@foldkit/devtools` package. Breaking changes in either no longer force a core version bump.

  Migration:
  - Component usage moves to named imports from the new package: `import { Ui } from 'foldkit'` with `Ui.Button.view(...)` becomes `import { Button } from '@foldkit/ui'` with `Button.view(...)`. The `foldkit/ui/button` subpath becomes `@foldkit/ui/button`. Add `@foldkit/ui` to your dependencies. When a component name collides with another import (for example core's `Calendar`), alias it: `import { Calendar as UiCalendar } from '@foldkit/ui'`.
  - The DevTools overlay is now opt-in. `devTools: true` (or a `devTools` config object) still records history and serves the WebSocket bridge for the DevTools MCP server, but no longer mounts the in-browser panel on its own. To show the panel, install `@foldkit/devtools` and pass its overlay factory:

    ```ts
    import { overlay } from '@foldkit/devtools'

    Runtime.makeApplication({
      // ...
      devTools: { Message, overlay },
    })
    ```

  New public surface on core to support the split: the `foldkit/submodel` subpath, `foldkit/devtools-host` (the instrumentation API the overlay builds on), and `DevToolsOverlay` / `DevToolsPosition` from `foldkit/runtime`.

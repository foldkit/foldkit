# @foldkit/devtools

## 0.158.0

## 0.157.0

### Patch Changes

- [#1213](https://github.com/foldkit/foldkit/pull/1213) [`57e2436`](https://github.com/foldkit/foldkit/commit/57e24366c8997cd235002f58c9dc38477a6cb1a3) Thanks [@devinjameson](https://github.com/devinjameson)! - Use full Effect module names in published source, examples, templates, and documentation. JavaScript and TypeScript globals that share an Effect module name are now qualified through `globalThis`.

- [#1268](https://github.com/foldkit/foldkit/pull/1268) [`3a4ccd0`](https://github.com/foldkit/foldkit/commit/3a4ccd0f6611f3ef90a5af43a821bbc2d8821fbe) Thanks [@devinjameson](https://github.com/devinjameson)! - Preserve structurally refined payload types in exhaustive Foldkit union matchers, migrate OutMessage folds to their owning union matcher, and add `Animation.toggle` as a child-owned visibility entry point.

## 0.156.0

## 0.155.0

### Patch Changes

- [#1231](https://github.com/foldkit/foldkit/pull/1231) [`aaff2e5`](https://github.com/foldkit/foldkit/commit/aaff2e53f5bf5742ae0428c5fda89a5d6974ac43) Thanks [@devinjameson](https://github.com/devinjameson)! - Match `defineTaggedUnion` and `defineRouteUnion` values through the union's own `match` instead of `Match.value` pipes with `Match.tagsExhaustive`. Internal call sites, the ssg template, and the generated FOLDKIT.md guidance now use the union method; behavior is unchanged.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the TypeScript compiler used to build and test packages to 7.0.2 while keeping compiler API tools on the official TypeScript 6 compatibility package.

## 0.154.0

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

### Patch Changes

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

## 0.148.2

### Patch Changes

- f9f2b22: Align the published READMEs with Foldkit's current positioning, terminology, and documentation links. Clarify the Vite plugin's Model-preserving hot reload and hydration build-id guidance.

## 0.148.1

## 0.148.0

## 0.147.0

## 0.146.0

### Minor Changes

- da05bfc: Bump Effect to `4.0.0-rc.109` (from `4.0.0-rc.108`). Foldkit's `effect` peer dependency now requires `4.0.0-rc.109`, and `@foldkit/devtools` pins its `@effect/platform-browser` peer dependency to the same version.

  Pin your Effect packages to `4.0.0-rc.109` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.109 @effect/platform-browser@4.0.0-rc.109
  pnpm add -D @effect/vitest@4.0.0-rc.109
  ```

## 0.145.0

## 0.144.0

### Minor Changes

- 3feb9ba: Bump Effect to `4.0.0-rc.108` (from `4.0.0-beta.107`), the first Effect v4 release candidate. Foldkit's peer dependencies now require `effect@4.0.0-rc.108` and `@effect/platform-browser@4.0.0-rc.108`.

  Pin your Effect packages to `4.0.0-rc.108` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.108 @effect/platform-browser@4.0.0-rc.108
  pnpm add -D @effect/vitest@4.0.0-rc.108
  ```

## 0.143.0

## 0.142.1

### Patch Changes

- 87e9dbf: Bump Effect to `4.0.0-beta.107` (from `4.0.0-beta.106`). Foldkit's peer dependencies now require `effect@4.0.0-beta.107` and `@effect/platform-browser@4.0.0-beta.107`.

  Pin your Effect packages to `4.0.0-beta.107` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.107 @effect/platform-browser@4.0.0-beta.107
  pnpm add -D @effect/vitest@4.0.0-beta.107
  ```

## 0.142.0

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

## 0.139.0

### Minor Changes

- c9b3dd3: Let the Foldkit Vite plugin mount the installed DevTools overlay automatically. Development dependencies stay out of production builds, while a regular dependency makes `show: 'Always'` sufficient to include the overlay in production. Keep `@foldkit/devtools` in generated applications' development dependencies.

  Installing `@foldkit/devtools` is now the whole opt-in: an application that never configured `devTools` gets the overlay in development as soon as the package is present. Set `devTools: false` to turn DevTools off, or uninstall the package to drop the overlay alone.

  This removes `DevToolsConfig.overlay`, the `DevToolsOverlay` export from `foldkit/runtime`, and the bare `overlay` export from `@foldkit/devtools`. Remove the overlay import and configuration field when upgrading. The Vite plugin now owns that integration through `@foldkit/devtools/vite`.

  Upgrade `foldkit`, `@foldkit/vite-plugin`, and `@foldkit/devtools` together. The plugin injects the overlay only when the installed `@foldkit/devtools` exposes `@foldkit/devtools/vite`, so an older copy skips the overlay instead of failing the build. Thanks @artile for the report.

  ## Migration

  Drop the `overlay` import and the `overlay` field. The Vite plugin mounts the overlay whenever `@foldkit/devtools` is installed, so `devTools` now carries configuration alone.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: {
      overlay,
      position: 'BottomLeft',
    },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
    devTools: {
      position: 'BottomLeft',
    },
  })
  ```

  An application whose only `devTools` field was `overlay` drops the object entirely and still gets the overlay in development.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: { overlay },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
  })
  ```

  Shipping the overlay in production keeps `show: 'Always'` and moves `@foldkit/devtools` from `devDependencies` to `dependencies`. Dependency placement is the build-time boundary, and `show` controls whether the runtime mounts it.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: {
      overlay,
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
    },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
    devTools: {
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
    },
  })
  ```

  An application that imported `DevToolsOverlay` from `foldkit/runtime` to type its own wiring no longer needs the type.

### Patch Changes

- c947f47: Bump Effect to `4.0.0-beta.103` (from `4.0.0-beta.102`). Foldkit's peer dependencies now require `effect@4.0.0-beta.103` and `@effect/platform-browser@4.0.0-beta.103`.

  Pin your Effect packages to `4.0.0-beta.103` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.103 @effect/platform-browser@4.0.0-beta.103
  pnpm add -D @effect/vitest@4.0.0-beta.103
  ```

  `SchemaIssue.InvalidValue` dropped its `actual` argument in this Effect release and now takes annotations as its only argument. Decode failures for `CalendarDateFromIsoString` and `Url` are migrated to the new signature and carry their detail on the `message` annotation, which is the key the default formatter reads. Those two failures previously passed their detail as `description`, which the formatter ignored, so the messages now read as intended instead of falling back to a generic one. If you construct `SchemaIssue.InvalidValue` in your own schemas, drop the leading `Option` argument and move any detail to `message`.

## 0.138.0

### Patch Changes

- 04a5f67: Keep the DevTools overlay out of an application's View Transitions. An application using the runtime's `viewTransition` option previously animated its own DevTools: the overlay host sat in the page the browser snapshots, so the badge and panel faded out and back in on every transition. The host now spans the viewport and carries a `view-transition-name`, which lifts it into its own snapshot pair, and those snapshots are pinned so the overlay holds still while the page animates underneath it. The host is `pointer-events: none` so its viewport-spanning box cannot swallow clicks meant for the application, and everything the shadow root renders opts back in.

## 0.137.0

### Patch Changes

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

### Patch Changes

- 9fe90d6: Update the DevTools flatten-to-leaf setting to use the controlled `Switch.view` helper while preserving the existing setting state and persistence behavior.
- 9d09804: Migrate the overlay's Message filter Listbox to the parent-owned selection API in `@foldkit/ui`. The overlay's `maybeSubmodelFilter` field is now the single source of truth: the Listbox view reads it through `ViewInputs.maybeSelectedValue`, and the redundant sync that mirrored the filter back onto the Listbox Model when a stale filter reset is gone. No behavior change.

  Part of #676.

- f7c4f17: Migrate the overlay to the parent-owned value API in `@foldkit/ui`: the overlay Model now owns the active inspector tab and the scrubber value, passing them in through view inputs and folding the Tabs `Selected` and Slider `ChangedValue` OutMessages. No user-facing behavior change. Part of #676.

## 0.127.0

## 0.126.0

## 0.125.0

### Minor Changes

- 595a641: Persist the DevTools panel's open state across page reloads.

  The overlay previously booted closed unconditionally, so every reload
  (including every dev-server full reload) meant clicking the badge again to
  reopen the panel. The open state now survives reloads: it is read at overlay
  boot and written on each badge toggle. Booting with the panel open also
  replays the open side effects, locking page scroll when the mobile breakpoint
  matches.

  DevTools persisted state (panel open and flatten-to-leaf) now lives under a
  single `foldkit-devtools` localStorage key, decoded with per-field defaults so
  a missing field falls back on its own. The previous `foldkit-devtools-flatten`
  key is no longer read, so that toggle resets once.

  A first-ever load still starts closed, and storage that is blocked or throws
  (for example private browsing) falls back to closed.

## 0.124.0

## 0.123.0

### Minor Changes

- ce2a1c4: Add a Settings screen to the overlay, opened from a gear button in the new panel footer. The first setting, "Flatten to leaf Message", labels each Message list row with its innermost Message and unwraps the inspected Message to the leaf. The preference persists in localStorage.

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

## 0.120.0

## 0.119.0

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

- d2bed68: Fix the submodel message filter dropdown, which rendered incorrectly inside the
  overlay's shadow root: it was invisible, then full-width and mispositioned, then
  layered behind the message list. The panel now anchors below its button at the
  button's width and sits above the overlay.
- 4f637ea: Render the overlay's shared icons (pause, diff dots, filter check, scroll-to-top
  arrow) and the empty-inspector placeholder from plain `VNode` constants again.
  The per-call factory workaround these used is no longer needed now that the
  runtime clones a reused `VNode` before patching, so a shared constant can sit at
  more than one position safely. No visible behavior change.

## 0.114.0

### Patch Changes

- 8f693c6: Cut avoidable per-jump overhead in DevTools time-travel navigation.

  Each navigation used to resolve the model for the target index twice: once in
  `JumpTo` to render the host app, and again in `InspectState` to feed the
  inspector panel. For a mid-segment jump that replayed the segment from the
  nearest keyframe twice. `store.jumpTo` now returns the model it resolved, and a
  single `JumpToAndInspect` command renders the host and builds the inspection
  from that one resolution. Inspect-only navigation (no host pause) still resolves
  once on its own.

  Scrubbing the timeline no longer enqueues a full jump-plus-inspect for every
  `pointermove`. The slider thumb still tracks every move (cheap, model-only), but
  the heavy navigation is coalesced to one per animation frame via a pending-index
  field and an `animationFrame` subscription, so a fast drag can't fall behind the
  cursor.

  DevTools config gains a `keyframeInterval` option (alongside `maxEntries`) to
  trade memory for faster jumps. Smaller intervals store more model snapshots and
  shorten the replay each jump walks, down to `1` where every jump is a
  constant-time snapshot lookup. It is still forced to `1` automatically when
  `excludeFromHistory` is active.

  Also fix the overlay's "Clear history" and "Jump to top" buttons, which
  silently did nothing when clicked.

## 0.113.1

### Patch Changes

- 454dbaa: Render the overlay's pause icon, inline diff dot, and other shared markers from
  zero-arg factories so each tree position gets its own `VNode`. Snabbdom records
  each element's live DOM node by mutating `vnode.elm` in place, so a single
  `VNode` object reused across positions (within a render, or at a different
  position across renders) aliased one `.elm` across multiple DOM nodes. During
  time travel this left the pause icon on previously selected rows and let diff
  dots flicker onto the wrong row. The same shape affected the empty inspector
  placeholder, which a single `VNode` rendered into every (simultaneously
  present) tab panel. The `pauseIconView`, `inlineDiffDotView`, `diffDotView`,
  `checkIconView`, `arrowUpIconView`, and `emptyInspectorView` constants are now
  factories that return a fresh `VNode` per call site.

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

## 0.112.4

## 0.112.3

### Patch Changes

- 63c8b51: Author the overlay styles as a committed source module rather than generating
  them from CSS at build time. The compiled output is unchanged.

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

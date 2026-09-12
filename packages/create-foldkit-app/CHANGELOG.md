# create-foldkit-app

## 0.33.0

### Minor Changes

- [#1343](https://github.com/foldkit/foldkit/pull/1343) [`7a173a7`](https://github.com/foldkit/foldkit/commit/7a173a785b323ccb94c3831af7339c982718fb72) Thanks [@devinjameson](https://github.com/devinjameson)! - Scaffold new projects with Oxfmt instead of Prettier. The generated project ships `.oxfmtrc.json` with the same formatting options and import grouping the Prettier setup had, its `format` script runs `oxfmt`, and its `.oxlintrc.json` enables the `sort-imports` rule so named import specifiers stay sorted, which Oxfmt does not do on its own. The `prettier` and `@trivago/prettier-plugin-sort-imports` devDependencies are no longer installed.

### Patch Changes

- [#1347](https://github.com/foldkit/foldkit/pull/1347) [`9099339`](https://github.com/foldkit/foldkit/commit/90993394590df06ee4413cbbc766b740138f09f2) Thanks [@devinjameson](https://github.com/devinjameson)! - Point the foldkit README, the create-foldkit-app homepage, and the @foldkit/devtools-mcp README at /get-started and /introduction/why-foldkit.

## 0.32.1

### Patch Changes

- [#1213](https://github.com/foldkit/foldkit/pull/1213) [`57e2436`](https://github.com/foldkit/foldkit/commit/57e24366c8997cd235002f58c9dc38477a6cb1a3) Thanks [@devinjameson](https://github.com/devinjameson)! - Use full Effect module names in published source, examples, templates, and documentation. JavaScript and TypeScript globals that share an Effect module name are now qualified through `globalThis`.

- [#1234](https://github.com/foldkit/foldkit/pull/1234) [`c9f9c65`](https://github.com/foldkit/foldkit/commit/c9f9c65ffa49f50e838be794e369a7513f8d0d8a) Thanks [@devinjameson](https://github.com/devinjameson)! - Add `foldkit/no-impure-call-at-decision-time`, which flags direct time and randomness calls unless they appear inside a recognized deferred Effect or lifecycle execution callback. The rule reports a call whether it appears directly in Command args or is assigned to a local variable first. It respects shadowed globals, stays off in tests, runtime entry files, and host server files, and is enabled by the recommended preset used in newly scaffolded apps.

  This can introduce lint failures in existing applications that use the recommended or all preset. Move reported calls into an Effect or lifecycle execution callback, then return generated values through Messages. Consumers can temporarily disable the rule while migrating.

- [#1279](https://github.com/foldkit/foldkit/pull/1279) [`0f787f3`](https://github.com/foldkit/foldkit/commit/0f787f3ff84b849c9ff90675c477026f4f011aba) Thanks [@devinjameson](https://github.com/devinjameson)! - Pin the recommended Foldkit subtree to the installed release instead of `main`, which can be ahead of the installed packages. The scaffolder's success message vendors `repos/foldkit` at the exact release it installs: the `foldkit@<version>` git tag for a stable release, the source commit for a canary. The `FOLDKIT.md` template derives the tag from the version in `node_modules/foldkit/package.json` at run time and points canary installs at the source commit their version names.

## 0.32.0

### Minor Changes

- [#1174](https://github.com/foldkit/foldkit/pull/1174) [`e129fce`](https://github.com/foldkit/foldkit/commit/e129fce14dd9cb85a22231cfa32df901e066e331) Thanks [@filipfalcon](https://github.com/filipfalcon)! - Let the plugin own the whole build. `ssr.build` declares the server environment and orchestrates it, so one `vite build` produces the browser bundle, the server bundle, and — with `ssr.build.prerender` — a page for every path the entry lists. The generated projects lose `scripts/build.mjs` and `scripts/prerender.ts`; their build command is `vite build` again.

  A Foldkit application that rendered on the server could not be deployed by anything that runs `vite build`. Its build was three commands a script chained together, and a host that injects its own Vite plugin — a Cloudflare adapter, an infrastructure tool, a platform's build step — can only join the first of them. Such a host built the browser half of the application and deployed it without the server bundle it needed. The build id had the same shape of problem: the client build and the server build were separate processes, so one script had to mint an id and pass it through the environment of each, and a project that built its halves any other way produced pages hydration then refused.

  A host plugin composes with every environment of one build, which is what makes the deployment possible at all. The id needs one thing more: Vite reads a config file once per environment, so a config that answers with a fresh value each time hands the two bundles different ids. The generated projects store their fallback back into the environment, and every later read resolves the same id.

  ```ts
  foldkit({
    buildId,
    ssr: {
      serverEntry: '/src/entry.server.ts',
      build: { prerender: true },
    },
  })
  ```

  `build.entry` names the module the server build starts from when requests reach a host that wraps the entry, such as an HTTP server or a Worker; it defaults to the entry itself, which is what a generated site wants. `build.prerender` takes the paths from the entry's `prerenderPaths` export, or from `paths` when the build names them, and `origin` sets what the entry sees as `Request.url` while generating.

  The build also writes `foldkit.build.json` beside the server bundle, naming the output directories, the server entry, and every path it generated. What a host should do with a request that matches no file follows from the build rather than from taste, and until now the build knew it and threw it away, leaving a deployment to ask its user for settings whose wrong values serve an empty page at 200.

  Generated pages take their template from the browser build that produced it rather than from `index.html` on disk. The generated `/` replaces that file, so a build that re-read it would parse a generated page as its template on any second pass over one client build.

  `ssr.serverEntry` is also safe now under a host plugin that runs the server itself. Dev-time rendering loads the entry through the `ssr` environment's module runner, which a workerd-backed environment does not have, so the plugin stands down and lets that host answer page requests through the same entry rather than failing them. It reports why once, at startup.

  Nothing changes for an application that does not set `ssr.build`: `vite build` builds the browser bundle alone, as before.

### Patch Changes

- [#1218](https://github.com/foldkit/foldkit/pull/1218) [`76cb5e1`](https://github.com/foldkit/foldkit/commit/76cb5e1f3fb1193139ee3da50340797a84717f25) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the create-foldkit-app CLI to Chalk 6.

- [#1205](https://github.com/foldkit/foldkit/pull/1205) [`9601382`](https://github.com/foldkit/foldkit/commit/960138253f09310ff1dca45d2cf84d25fb86d12d) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the development dependencies used to test the package.

- [#1231](https://github.com/foldkit/foldkit/pull/1231) [`aaff2e5`](https://github.com/foldkit/foldkit/commit/aaff2e53f5bf5742ae0428c5fda89a5d6974ac43) Thanks [@devinjameson](https://github.com/devinjameson)! - Match `defineTaggedUnion` and `defineRouteUnion` values through the union's own `match` instead of `Match.value` pipes with `Match.tagsExhaustive`. Internal call sites, the ssg template, and the generated FOLDKIT.md guidance now use the union method; behavior is unchanged.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade development dependencies to Node 26 type definitions and Happy DOM 20.11.8.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the TypeScript compiler used to build and test packages to 7.0.2 while keeping compiler API tools on the official TypeScript 6 compatibility package.

## 0.31.1

### Patch Changes

- 6716de6: Clarify the generated Foldkit guidance for update returns and child OutMessage forwarding. The revised copy describes the runtime behavior before the supporting TypeScript rules.
- f59da51: Point each package's npm metadata at its Foldkit documentation page so developers and automated tools can identify the official setup guide.

## 0.31.0

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

## 0.30.1

### Patch Changes

- df045a8: Give the SSG scaffold's `injectIntoTemplate` call the container id the rest of its prerender script already uses. `scripts/prerender.ts` names the container in one `CONTAINER_ID` constant and tests the built `index.html` for that placeholder, but the injection call fell back to its own `root` default. Renaming the container left the guard looking for the new placeholder while injection still demanded `<div id="root"></div>`, so the first prerender failed with an error naming a container id the project no longer used. The constant now drives both.

## 0.30.0

### Minor Changes

- da9e505: Bump bundled Effect dependencies to `4.0.0-rc.112`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-rc.112` to match this release (exact versions, not ranges, while Effect v4 is in prerelease).

### Patch Changes

- c170eb6: Make the SSG scaffold's prerender step repeatable. `scripts/prerender.ts` read its template from `dist/client/index.html` and then wrote the generated `/` over that same file, so a second run against one client build parsed a generated page as its template and stopped with `injectIntoTemplate found no exact <div id="root"></div> placeholder in the template`. That error names the application's `index.html`, which was never the problem, so the reported fault and the actual one were in different files.

  The script now takes the built `index.html` as its template only while that file still holds the `<div id="root"></div>` placeholder, and keeps a copy under `node_modules/.cache/foldkit/` that later runs against the same client build read instead. The placeholder is the condition `injectIntoTemplate` enforces, so the test covers a static render (`isHydratable: false`) as well as a hydratable one, where a test for the hydration stamp would have read a generated page as the template and cached it over the good copy. A client build always writes the template back to `index.html`, so the copy can never outlive the assets it names. Running the prerender step twice against one build now generates the same pages both times, and running it with no client build present fails with a message that names the missing build.

## 0.29.1

### Patch Changes

- cb55188: Split the scaffolded agent instructions into two files. `FOLDKIT.md` carries Foldkit's conventions and is replaced whole when a project upgrades its Foldkit packages. `AGENTS.md` is a short stub that points at it and holds whatever the project wants to tell its own agents.

  Before this, both lived in one file, so refreshing the conventions meant merging Foldkit's paragraphs into a file the project had also edited, with nothing to mark which paragraphs were whose. Refreshing is now a file copy. The `subtree_prompted` marker moves to `AGENTS.md`, since it is per-project state that an upgrade must not reset.

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

## 0.29.0

### Minor Changes

- 9869cf7: Bump bundled Effect dependencies to `4.0.0-rc.111`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-rc.111` to match this release (exact versions, not ranges, while Effect v4 is in prerelease).

## 0.28.0

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

### Patch Changes

- 67ea77c: Bundle every scaffold source and the exact Foldkit package versions for the CLI's release instead of fetching examples from GitHub `main` and package versions from npm `latest`.

## 0.27.3

### Patch Changes

- f9f2b22: Align the published READMEs with Foldkit's current positioning, terminology, and documentation links. Clarify the Vite plugin's Model-preserving hot reload and hydration build-id guidance.
- fca9dc3: Accept an absolute `CREATE_FOLDKIT_APP_DEPENDENCY_MANIFESTS_DIRECTORY` for repository verification. The SSR and SSG scaffold gate now generates from the example manifests in the checkout under test instead of the moving `main` branch.

## 0.27.2

### Patch Changes

- 2921c99: Keep the generated SSR and SSG build scripts concise while preserving the one-build-id invariant beside the code.

## 0.27.1

### Patch Changes

- 7dc94b6: Allow `esbuild` install scripts in pnpm scaffolds while continuing to deny `msgpackr-extract` install scripts.
- 7dc94b6: The scaffolded SSR host takes the origin it serves from configuration rather than from the request, refuses a request target that resolves to another origin, answers a missing static asset with 404 rather than the application shell, and declares `Sec-Fetch-Dest` on any response whose selection inspected it.

  The scaffolded SSR and SSG projects build through `scripts/build.mjs`, which produces one build id per build and gives it to every command that build runs, so a generated project reaches a working hydratable build through its own documented build command. `FOLDKIT_BUILD_ID` names builds from a value the deployment already has, such as a commit or a release tag. The generated README states the contract: the id is published in the page and must never contain a secret, and two deployments must never share one.

  An empty `FOLDKIT_BUILD_ID` is treated as unset by the generated build script, matching the plugin, so `FOLDKIT_BUILD_ID= npm run build` takes a generated id rather than suppressing one and failing later at the render.

## 0.27.0

### Minor Changes

- 664a8bd: Add a rendering choice to scaffolding: pass `--rendering spa|ssg|ssr`, or omit it to choose in the interactive picker, where SPA is the default and keeps the example selection. SSG scaffolds a routed app with a server entry, a prerender script, and a build that writes every route as hydratable static HTML. SSR scaffolds a cookie-driven app with a server entry and an Effect `HttpServer` host started with `start`. Both hydrate through the same client entry contract the examples use.

## 0.26.0

### Minor Changes

- da05bfc: Bump bundled Effect dependencies to `4.0.0-rc.109`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-rc.109` to match this release (exact versions, not ranges, while Effect v4 is in prerelease).

## 0.25.0

### Minor Changes

- 3feb9ba: Bump bundled Effect dependencies to `4.0.0-rc.108`, the first Effect v4 release candidate. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-rc.108` to match this release (exact versions, not ranges, while Effect v4 is in prerelease).

## 0.24.5

### Patch Changes

- 87e9dbf: Bump bundled Effect dependencies to `4.0.0-beta.107`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.107` to match this release (exact versions, not ranges, while Effect v4 is in beta).

## 0.24.4

### Patch Changes

- 14bb759: Correct the scaffolded `AGENTS.md` testing guidance and relax its Message layout rule. Scene tests do not always run from the root `update`/`view`, so the template no longer claims a single root-level `scene.test.ts` is the right home for a multi-page app. It now says a test file lives in the folder holding the code it drives, blesses a page-scoped `scene.test.ts` for behavior that page owns, keeps the root-level file for flows that cross pages, and points at `repos/foldkit/examples/auth` for the shape. The Message layout section keeps one unbroken block of `m()` declarations as the rule for small unions and allows blank-line thematic clusters once a union grows past roughly a dozen Messages, with `S.Union([...])` and `type Message` still adjacent directly after the declarations.

## 0.24.3

### Patch Changes

- 84050fc: Bump bundled Effect dependencies to `4.0.0-beta.106`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.106` to match this release (exact versions, not ranges, while Effect v4 is in beta).

## 0.24.2

### Patch Changes

- 40ccffe: Bump bundled Effect dependencies to `4.0.0-beta.105`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.105` to match this release (exact versions, not ranges, while Effect v4 is in beta).

## 0.24.1

### Patch Changes

- c947f47: Bump bundled Effect dependencies to `4.0.0-beta.103`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.103` to match this release (exact versions, not ranges, while Effect v4 is in beta).

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

## 0.24.0

### Minor Changes

- 08560ba: Add the `view-transitions` example: a gallery whose artwork grows from grid card to detail hero through the browser's View Transitions API, demonstrating the runtime's `viewTransition` option, shared-element morphs via `viewTransitionName`, and direction-aware transition types derived from the route pair.

### Patch Changes

- 23423bd: Element builders now take their children argument optionally. `h.div([h.Class('divider')])` and `h.div([h.Class('divider')], [])` build the same vnode, so an element with no children no longer needs a trailing empty array. Attributes stay required, so `h.div([])` remains the spelling for an element with neither. Void elements such as `img`, `input`, and `br` are unchanged and still accept attributes only. The scaffolded app's `AGENTS.md` teaches the shorter form.

## 0.23.2

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

## 0.23.1

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

## 0.23.0

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

- 26c97cc: Rename the `checkout-machine` example to `state-machine`. The scaffolded app is unchanged; only the example's name moved. Scripts passing `--example checkout-machine` should pass `--example state-machine` instead.

## 0.22.2

### Patch Changes

- d16d7f7: Bump bundled Effect dependencies to `4.0.0-beta.102`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.102` to match this release (exact versions, not ranges, while Effect v4 is in beta).

- e3a5f5d: Fix the Effect array predicate names in the scaffolded `AGENTS.md`. The template told agents to use `Array.isEmptyArray` / `Array.isNonEmptyArray`, which Effect does not export. The correct names are `Array.isArrayEmpty` / `Array.isArrayNonEmpty`. The same rule now also prohibits `.length > 0`, not just `.length === 0`.

## 0.22.1

### Patch Changes

- 95118d8: Bump bundled Effect dependencies to `4.0.0-beta.101`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.101` (exact versions, not ranges, while Effect v4 is in beta).

## 0.22.0

### Minor Changes

- 2fbc8dd: Rename the `upload` example to `interrupting-commands`. The scaffolded app is unchanged; only the example's name moved. Scripts passing `--example upload` should pass `--example interrupting-commands` instead.

## 0.21.1

### Patch Changes

- 96167d1: Bump bundled Effect dependencies to `4.0.0-beta.97`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI dependencies now pin `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to `4.0.0-beta.97` exactly during the v4 beta window.

- d3d7a7f: Update the keying rule in the generated `AGENTS.md`: key every view branch even when the branch root tags differ, key inline branch roots directly instead of introducing a wrapper element only to carry a key, and key a single wrapper at the branch site when the branches delegate to other view functions.

## 0.21.0

### Minor Changes

- 426b4a3: Add the `checkout-machine` example: a checkout workflow built on the experimental `foldkit/experimental/machine` module, demonstrating guarded `when` branches and edge Commands.
- 0029a3d: Add the `route-transitions` example: a gallery app with a live transition log, demonstrating the `Transition` helpers for load-on-entry, save-on-exit, and refetch-on-stay navigation policies.
- a25f769: The scaffold `.oxlintrc.json` now extends the `@foldkit/oxlint-plugin` recommended preset instead of hand-listing a subset of foldkit rules, keeping only app-specific config (the core TypeScript rules and `ignorePatterns`) inline. Freshly scaffolded apps get the full foldkit ruleset and can never drift from the preset again, while the preset's own `overrides` keep those rules off in test files.

### Patch Changes

- 519ee57: Rewrite the `File Organization` section of the generated `AGENTS.md` to lead with the runtime-boot invariant (the definitions stay importable from tests because only `entry.ts` calls `Runtime.run`) and to describe when to split a growing app across more files. It now covers the revealed-seam heuristic, the two forced splits, and exemplars from the example apps.

## 0.20.1

### Patch Changes

- 82ae73b: Generate the README's Getting Started commands from the selected package manager instead of always showing pnpm.
- 82ae73b: Scope the generated `lint` script and Vitest config to `src`, and ignore `.claude/worktrees/`. Tooling in a scaffolded project no longer reaches into vendored `repos/` subtrees.

## 0.20.0

### Minor Changes

- 2d23b39: Add `foldkit/no-module-level-mutable-state`, a lint rule that flags module-level `let` and `var` declarations (including `export let`), which hold state outside the Model. Ambient `declare let` declarations are not flagged. Scaffolded projects enable the rule in their generated `.oxlintrc.json`.

  Ported from the purity-boundary rule family in `@mpsuesser/oxlint-plugin-foldkit` by Marc Suesser.

### Patch Changes

- ca64832: Typecheck test files. Each package's `typecheck` script now checks the project that includes tests instead of the build project that excludes them. No runtime changes.

## 0.19.1

### Patch Changes

- aa83f06: Fix scrambled and misplaced dependencies in scaffolded projects.

  Projects built their `package.json` by running two `pnpm add` commands (runtime dependencies, then devDependencies). The second command could non-deterministically move already-installed runtime dependencies into `devDependencies` and overwrite their version specs with unrelated ones, so `effect` and `@effect/platform-browser` sometimes landed in `devDependencies` pinned to a dev tool's version, leaving the generated project un-reinstallable.

  The scaffold now resolves every dependency in code (third-party versions kept as the example declares them, Foldkit packages pinned to the latest published version), writes `dependencies` and `devDependencies` into `package.json` directly, and runs a single install.

## 0.19.0

### Minor Changes

- 1795e0e: Bump bundled Effect dependencies to `4.0.0-beta.88`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI dependencies now pin `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to `4.0.0-beta.88` exactly during the v4 beta window.

## 0.18.0

### Minor Changes

- 921afa8: Add the charting starter example with ECharts telemetry, website registration,
  and example app coverage.

## 0.17.2

### Patch Changes

- 51c7406: Add the slow warnings, map, and managed resource layer examples to the scaffoldable example choices.

## 0.17.1

### Patch Changes

- 060aebb: Fix pnpm scaffolds to deny the optional `msgpackr-extract` build script so pnpm installs do not fail during project creation.

## 0.17.0

### Minor Changes

- 86b2250: Publish the Foldkit oxlint plugin and scaffold new apps with oxlint and the Foldkit-specific lint rules.

## 0.16.0

### Minor Changes

- fcc7a94: Bump bundled Effect dependencies to `4.0.0-beta.83`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI dependencies now pin `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to `4.0.0-beta.83` exactly during the v4 beta window.

### Patch Changes

- 32768e5: Raise the declared minimum Node version to 22.22.2. The bundled effect
  dependency pulls in ini, which requires Node ^22.22.2, ^24.15.0, or >=26.0.0,
  so the previous >=22.19.0 declaration understated the real requirement and
  surfaced an EBADENGINE warning when installing on Node 22.19.0.

## 0.15.3

### Patch Changes

- 54ce208: Inline `@foldkit/ui` and `@foldkit/devtools` in the scaffolded app's Vitest config. A scaffolded app installs these as published packages, which Vitest externalizes by default. That loads a second copy of `foldkit` alongside the inlined one, breaking Schema and tag identity in any test that imports from either package. Inlining them keeps a single shared `foldkit` instance, the same reason `foldkit` itself is already inlined.

## 0.15.2

### Patch Changes

- a481ddb: Pin `@foldkit/ui` and `@foldkit/devtools` to `latest` when scaffolding an
  example. These ship from the same monorepo as `foldkit`, so an example that
  depends on them now installs published versions instead of leaking a
  `workspace:` specifier into the generated project.

## 0.15.1

### Patch Changes

- 3a9edc7: Rename colocated test files to name them after their test style: `story.test.ts` for Story tests (which drive `update`) and `scene.test.ts` for Scene tests (which drive the rendered view). The previous `*.story.test.ts` / `*.scene.test.ts` scheme prefixed the file with `main` or `index`, which in split-file apps named neither the update nor the view it tested. `create-foldkit-app`'s scaffolded AGENTS.md now documents the convention. No runtime or public API changes.

## 0.15.0

### Minor Changes

- bd5356d: Add the api-cache example to the scaffolding choices: query caching in the Model with stale-while-revalidate, request deduplication, invalidation, and interval refetching.

## 0.14.0

### Minor Changes

- 1e4a4e6: Add the `embedding` example: a Foldkit widget embedded in a plain TypeScript host page via `Runtime.embed`, with Flags in, typed Ports in both directions, and `dispose` on unmount.

### Patch Changes

- 127e9f5: Update the scaffolded `AGENTS.md` to reference `Runtime.makeApplication` instead of the renamed `Runtime.makeProgram`.

## 0.13.0

### Minor Changes

- 575b2ff: Bump bundled Effect dependencies to `4.0.0-beta.78`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI dependencies now pin `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to `4.0.0-beta.78` exactly during the v4 beta window.

## 0.12.4

### Patch Changes

- f1d8c31: Update the scaffolder's example catalog (the example list, descriptions, and copy) to match the current example set and the `Ui.*` Submodel / OutMessage shape that newly scaffolded apps target.

## 0.12.3

### Patch Changes

- 24b31c8: Update the Discord invite link.

## 0.12.2

### Patch Changes

- bb1eebd: Update Discord invite link.

## 0.12.1

### Patch Changes

- 5338579: Update README and template docs to recommend binding `const h = html<Message>()` inside view functions instead of at module level. The function-level binding accepts the function's actual Message type parameter (including `<ParentMessage>` for child views), keeps view functions portable across files, and removes the need to decide where the binding lives. Behavior unchanged.

## 0.12.0

### Minor Changes

- f10dffc: Bump bundled Effect dependencies to `4.0.0-beta.66`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

## 0.11.0

### Minor Changes

- c245d43: `create-foldkit-app` now accepts `bun` as a package manager alongside `pnpm`, `npm`, and `yarn`. The interactive prompt lists Bun as a choice, and `--package-manager bun` skips the prompt and uses it directly. Dependencies install with `bun add`, and the post-scaffold success message prints the matching `bun dev` command.

## 0.10.4

### Patch Changes

- deba7c0: Raise `engines.node` to `>=22.19.0` to match the actual runtime requirement. `@effect/platform-node` pulls `undici@8.x`, which requires Node 22.19. The previous `>=18.0.0` declaration was misleading — installs on older Node versions surfaced an `EBADENGINE` warning pointing at the transitive `undici` package rather than at `create-foldkit-app` itself. The runtime requirement is unchanged; this only corrects the manifest.

## 0.10.3

### Patch Changes

- 7354f7f: Fix `TypeError: state.value.asEffect is not a function` crash on startup. The pinned `@effect/platform-node@4.0.0-beta.64` declares its `@effect/platform-node-shared` dependency with a caret range, so npm would resolve a newer matching beta and pull a second `effect` version alongside the pinned one. The two Effect copies have incompatible runtime protocols, and `Effect.gen` blowing up on the first yield was the visible symptom. Pinning `@effect/platform-node-shared` to `4.0.0-beta.64` as a direct dependency forces npm to reuse the existing copy and prevents the duplicate install.

## 0.10.2

### Patch Changes

- a06493f: Slim the scaffolded `AGENTS.md` and point it at the live Foldkit code as the canonical reference.

  Two problems with the previous template:
  1. It was 215 lines and duplicated rules from the foldkit project's `CLAUDE.md` and the `foldkit-skills` plugin docs (a fourth source of truth). It also included Day-N material like the full Mount section that a freshly scaffolded project doesn't need on Day 1.
  2. It called `repos/foldkit/CLAUDE.md` the "canonical convention guide." That's wrong on two counts: `CLAUDE.md` is foldkit-repo-internal (has repo-specific scopes, file paths, dev rules) and isn't designed for consumer dev, and even within the foldkit repo, the live code (`examples/`, `packages/foldkit/src/`, the production apps) is more authoritative than any written summary.

  The new version focuses on the Day-1 bootstrap brief: framing, the subtree prompt, the critical idioms (`update`, `view`, `evo`, `Dom`, `html` factory, file split), the highest-frequency code-style rules, Message naming prefixes, and the DevTools pointer. It consistently treats the live Foldkit code as canonical. API-specific examples that drift on signature changes (e.g. the `Command.define` shape, which is curried and has already changed once) are replaced with prose plus pointers to the actual example files. Advanced patterns (Mount, ManagedResource, Submodels, OutMessage, Subscriptions, routing, accessibility) defer to the live code via a "Going Deeper" pointer.

  Existing scaffolded apps are unaffected. The change only affects new projects scaffolded with `create-foldkit-app`.

## 0.10.1

### Patch Changes

- 0a08c07: Recommend `git subtree` instead of `git submodule` for vendoring the Foldkit repo into a project so AI assistants can reference its source, examples, and docs.

  The post-scaffold success message now prints subtree commands, and the scaffolded `AGENTS.md` ships with a `subtree_prompted: false` flag (renamed from `submodule_prompted`) for agents to check on future sessions. The template also tells agents to treat the vendored `repos/foldkit/` as read-only reference and to import only from the `foldkit` npm package, not from relative paths into the subtree.

  ```bash
  git subtree add --prefix=repos/foldkit \
    https://github.com/foldkit/foldkit.git main --squash
  ```

  Unlike a submodule, a subtree is checked into the user's repository, so a fresh clone (a teammate, a CI runner, a cloud agent) has the Foldkit source on disk immediately with no `--recurse-submodules` step to remember.

- 209e074: Scaffold projects with a `main.ts` / `entry.ts` split.

  `src/main.ts` now holds the pure definitions (Model, Messages, init, update, view). A new `src/entry.ts` imports them and boots the runtime with `Runtime.makeProgram` + `Runtime.run`. `index.html` references `entry.ts`. The split keeps `main.ts` importable from tests without booting a runtime as a side effect, eliminating the runtime-container error noise that appeared in test output when entry files were imported by Vitest.

  Existing scaffolded apps are unaffected. The runtime API is unchanged.

## 0.10.0

### Minor Changes

- 450a56d: Add `CustomElement.define` for binding native web components to Foldkit programs.

  Declare the element's properties and events with Schema once. `CustomElement.define` returns a spec; call `.withMessage<Message>()` inside a view module to mint a typed builder. Property factories become PascalCase methods, event factories become `On{PascalCase}` methods, all checked against the declared Schema. Property writes diff across renders, and `CustomEvent`s come back as Messages, with no manual property or event wiring at the call site.

  ```ts
  import { Schema as S } from 'effect'
  import { CustomElement } from 'foldkit'
  import 'vanilla-colorful/hex-color-picker.js'

  const hexColorPicker = CustomElement.define({
    tag: 'hex-color-picker',
    properties: {
      color: S.String,
    },
    events: {
      'color-changed': S.Struct({ value: S.String }),
    },
  })

  const picker = hexColorPicker.withMessage<Message>()

  picker([
    picker.Color(model.color),
    picker.OnColorChanged(detail => ChangedColor({ value: detail.value })),
  ])
  ```

  Also adds a `web-components` starter to `create-foldkit-app` demonstrating the API end-to-end with two real third-party web components (`vanilla-colorful` and `@shoelace-style/shoelace`) communicating through the Model.

## 0.9.1

### Patch Changes

- dbfb1ec: Bump Effect to `4.0.0-beta.64` (from `4.0.0-beta.59`) across the workspace, and replace the hand-rolled fallback cascade in `route/parser.ts:oneOf` with `Effect.firstSuccessOf`, which was reintroduced in beta.61 ([effect-smol#2120](https://github.com/Effect-TS/effect-smol/pull/2120)).

  Consumers should align their `effect`, `@effect/platform-browser`, `@effect/platform-node`, and `@effect/vitest` pins to `4.0.0-beta.64`.

  ```bash
  pnpm add effect@4.0.0-beta.64
  pnpm add -D @effect/platform-browser@4.0.0-beta.64 @effect/platform-node@4.0.0-beta.64 @effect/vitest@4.0.0-beta.64
  ```

  Behavior is unchanged. The `oneOf` route parser still tries each parser in order and returns the first success (or the last failure if all fail).

## 0.9.0

### Minor Changes

- fb02feb: Add `generative-art` to the scaffold prompt. Selecting it produces a Perlin-noise flow field where particles trace organic curves, the cursor stirs a vortex influence, and clicks bloom radial bursts. Demonstrates `Canvas.view` with hundreds of evolving `Path` strokes, `Subscription.animationFrame` driving the simulation, and `devTools.excludeFromHistory` keeping the panel useful under high message rates.

## 0.8.0

### Minor Changes

- ef45ed5: Add `canvas-art` to the scaffold prompt. Selecting it produces a project that uses `foldkit/canvas` to render shapes into a `<canvas>` element, with `Subscription.animationFrame` and pointer events wired up.

## 0.7.2

### Patch Changes

- 1e6cb6c: Update the View section of the scaffolded `AGENTS.md` template to teach the new dotted-html convention: bind `const h = html<Message>()` per module (or `html<ParentMessage>()` inside a generic child view) and reach for elements, attributes, and event handlers via `h.div`, `h.OnClick`, etc. The previous template instructed users to call `html<Message>()` once in a dedicated `html.ts` file and re-export the destructured helpers, which contradicts the convention used in every Foldkit example.

## 0.7.1

### Patch Changes

- 61dc3fb: Bump `rimraf` to `^6.1.3` and `typescript` to `^6.0.3`.

## 0.7.0

### Minor Changes

- 40f43a9: Foldkit now targets Effect 4. **This is a breaking change.** For Effect 4's own breaking changes (Schema, Stream, Context.Service, etc.), see Effect's release notes.

  ## Upgrade

  ```bash
  pnpm add effect@4.0.0-beta.59 foldkit@latest
  pnpm add -D @foldkit/vite-plugin@latest @foldkit/devtools-mcp@latest
  ```

  Pin `effect` to the exact version foldkit declares (`4.0.0-beta.59`). The pin is intentional during the v4 beta window — letting `effect` drift to a newer beta can break foldkit's runtime until foldkit re-pins.

  ## Foldkit changes

  ### Container element needs an `id`

  The DOM element you pass as `container` to `Runtime.makeProgram` must have a non-empty `id` attribute. `Runtime.run` errors with a clear message if it's missing. Most apps already use `<div id="root"></div>`; if yours doesn't, add an id.

  The id scopes HMR model preservation per-runtime. Foldkit's DevTools overlay manages its own container internally, so it doesn't conflict with your app. If you mount multiple Foldkit runtimes in the same page yourself, give each container a unique id.

  ### `@foldkit/vite-plugin` auto-includes Effect namespaces

  The plugin now adds the full set of `effect/*` namespaces foldkit references to `optimizeDeps.include`. v4 promoted previously nested names (`SchemaIssue`, `SchemaTransformation`, `Result`, `Cause`) to top-level exports that consumers rarely mention by name, and Vite's optimizer scans only your source. Without the force-include, foldkit's transitive imports would be missing from the prebundle and crash at runtime in dev. The plugin handles it transparently — no `optimizeDeps.include` entries needed in your config.

  ### `@foldkit/devtools-mcp` resilience

  The MCP server no longer dies on startup if no Foldkit dev server is running on the relay port. It boots regardless; tool calls return a clear "Not connected to a Foldkit dev server" error string until the relay is reachable. Restarting your dev server no longer requires manually reconnecting the MCP server in your host.

  ### `@foldkit/devtools-mcp` MCP tool registration fixed

  Tool schemas now register correctly with strict MCP hosts (Claude Code, Cursor). Previously the server emitted a wrapper schema that hid `inputSchema.type === "object"` one level too deep, and hosts silently dropped every tool.

  ### `create-foldkit-app` optional flags

  The `--name`, `--example`, and `--package-manager` CLI flags are now optional. Running with no flags drops into an interactive picker for each. Pass any subset of flags to skip the matching prompts.

### Patch Changes

- 98519e1: Fix the install command in the READMEs. `create-foldkit-app` doesn't accept a `--wizard` flag — running with no flags drops into the interactive prompts. `--name`, `--example`, and `--package-manager` remain available as escape hatches that skip the matching prompts.

## 0.6.3

### Patch Changes

- 21a6d30: AGENTS.md template: document Mount with a `Mount.define` + `OnMount` example.

## 0.6.2

### Patch Changes

- 88c5bcc: Note Foldkit DevTools in the AGENTS.md template so agents reach for `foldkit_*` MCP tools before `console.log` when debugging running apps.

## 0.6.1

### Patch Changes

- 6426adb: Add DevTools MCP support so AI agents (Claude Code, Codex, Cursor, Windsurf, anything that speaks MCP) can connect to a running Foldkit app. Agents read the current Model, list and inspect Message history, replay to past states, and dispatch Messages into the runtime. The runtime's own Message Schema is published as JSON Schema so the agent discovers exactly what it can dispatch, and every payload is validated against the Schema before reaching the update loop.

  ## Migration

  The `devtools` config field on `Runtime.makeProgram` is now `devTools` (capital T). Type `DevtoolsConfig` is now `DevToolsConfig`.

  ```diff
   Runtime.makeProgram({
  -  devtools: { position: 'BottomRight' },
  +  devTools: { position: 'BottomRight' },
   })
  ```

  If you import the type directly:

  ```diff
  -import type { DevtoolsConfig } from 'foldkit'
  +import type { DevToolsConfig } from 'foldkit'
  ```

  ## What's new
  - **`foldkit/devtools-protocol`** (new entry point) exposes the typed `Request`/`Response`/`Event` Schemas and a browser-side WebSocket bridge that streams DevTools store updates to the relay.
  - **`DevToolsConfig.Message`** is a new optional field. When set to your app's `Message` Schema, the runtime publishes it as JSON Schema to the agent and validates every dispatched payload against it before reaching the update loop. Without it, dispatch is rejected; the read-only tools still work.
  - **`@foldkit/vite-plugin`** accepts a new `devToolsMcpPort` option. When set, the plugin opens a WebSocket relay on that port that forwards traffic between connected browser tabs and any external MCP client. Without it, HMR behavior is unchanged. The relay only runs at dev time; production builds never include it.
  - **`@foldkit/devtools-mcp`** is a new package: an MCP server that runs as a Node child process spawned by your AI agent. Run `npx @foldkit/devtools-mcp init` in your project root to register it. See [foldkit.dev/ai/mcp](https://foldkit.dev/ai/mcp) for the full guide.
  - **`create-foldkit-app`** scaffolds new projects with `@foldkit/devtools-mcp` installed as a dev dependency, a `.mcp.json` registering the server, and a `vite.config.ts` that passes `devToolsMcpPort: 9988` to the Foldkit plugin.

## 0.6.0

### Minor Changes

- 8364888: Add `crash-view`, `job-application`, `kanban`, and `pixel-art` to the `--example` choice list. These four examples already shipped in the monorepo and on the website but were missing from the create-foldkit-app selectable list, so users could not scaffold them via `pnpm create foldkit-app`. Reorder the choice list and CLI help descriptions to match the website's example ordering.

## 0.5.17

### Patch Changes

- 4b0a552: Adopt TypeScript 6.0 for internal tooling and migrate to Node-native ESM emit. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. Foldkit's internal tsconfigs moved from the deprecated `node10` resolution to `NodeNext`, and every relative import inside `packages/foldkit/src` now carries an explicit `.js` suffix. The emitted `dist/` is unchanged in shape but is now directly loadable by Node's ESM resolver — a prerequisite for future terminal/Node runtime support. Published type surfaces are unchanged; downstream projects on TypeScript 5.9+ continue to work.

## 0.5.16

### Patch Changes

- 4400851: Fix `create-foldkit-app` failing on Windows. Use `where` instead of `which` for package manager lookup, and run install commands through the shell so Windows can resolve the `.cmd` shims that npm, pnpm, and yarn ship as.

## 0.5.15

### Patch Changes

- e72bd7f: Wire Scene matchers into the scaffolded project. The base template now ships
  `src/vitest-setup.ts` (three lines: `import { setup } from 'foldkit/test/vitest'; setup()`) and `vitest.config.ts` registers it via `setupFiles`. Previously,
  projects scaffolded with `--example form|weather|todo|auth|kanban|pixel-art`
  pulled in the example's `src/vitest-setup.ts` and scene tests but never ran the
  setup file — Scene matcher assertions would fail at runtime.

## 0.5.14

### Patch Changes

- 60f1594: Use a precise optimizeDeps entry point (src/main.ts) so Vite's dependency scanner never crawls into the repos/ submodule.

## 0.5.13

### Patch Changes

- 015c96a: Scaffold vitest configuration in new projects. Adds `vitest.config.ts` with `server.deps.inline: ['foldkit']` so tests resolve foldkit through Vite's bundler pipeline, a `test` script in `package.json`, and vitest and happy-dom as dev dependencies.

## 0.5.12

### Patch Changes

- 321dac6: Update AGENTS.md template to use `toParentMessage` (renamed from `toMessage`).

## 0.5.11

### Patch Changes

- c6a5404: Add testing section to AGENTS.md template pointing agents to `foldkit/test` and the submodule's exemplar test files

## 0.5.10

### Patch Changes

- f456720: Exclude submodule directory from Vite dependency scanner to prevent resolution errors

## 0.5.9

### Patch Changes

- bdd444e: Add `git init` to CFA success message and use `>` prompt prefixes for shell commands

## 0.5.8

### Patch Changes

- c416561: Indent the AI-Assisted Development section body in the success message and title-case the header

## 0.5.7

### Patch Changes

- 8817558: Add AI-assisted development section to success message with submodule setup instructions.

## 0.5.6

### Patch Changes

- 9f3cde2: Add newsletter signup link to success message

## 0.5.5

### Patch Changes

- 964e13f: Rewrite scaffolding success message with personality. Fix object-first naming rationale in AGENTS.md template.

## 0.5.4

### Patch Changes

- 4b81a10: Update GitHub URLs from `devinjameson/foldkit` to `foldkit/foldkit` following org transfer.

  Update AGENTS.md template to replace `NoOp` guidance with `Completed*` message conventions.

## 0.5.3

### Patch Changes

- 8b27c43: Update scaffolding success message with personal note and links to GitHub issues and social

## 0.5.2

### Patch Changes

- 1369d6a: Use `repos/` convention for submodule path. Submodules now clone into `repos/foldkit` instead of `./foldkit`. Updated Prettier, ESLint, and editor ignore configs.

## 0.5.1

### Patch Changes

- 7c0a3b7: Sync AGENTS.md template conventions with CLAUDE.md to keep scaffolded projects aligned with current Foldkit coding standards.

## 0.5.0

### Minor Changes

- 8c9e95f: Add ui-showcase as a starter template showing every Foldkit UI component with sidebar navigation and routing.

## 0.4.3

### Patch Changes

- 15e6c87: Update base template formatting to printWidth 80 and refresh example descriptions.

## 0.4.2

### Patch Changes

- 7b164d1: Read CLI version from package.json at runtime instead of hardcoding it.

## 0.4.1

### Patch Changes

- 4ee0289: ### Fixes
  - **Update template to use subscription naming** — align starter template with the command stream to subscription rename

## 0.4.0

### Minor Changes

- 5ff61e0: ### Features
  - **AGENTS.md and .ignore in starter template** — new projects now ship with an AGENTS.md file and a .ignore file for better AI assistant and tooling support

## 0.3.2

### Patch Changes

- 598f974: Enable noUncheckedIndexedAccess in project template tsconfig

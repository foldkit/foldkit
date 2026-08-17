# @foldkit/devtools

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

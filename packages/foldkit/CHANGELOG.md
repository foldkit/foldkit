# foldkit

## 0.158.0

### Minor Changes

- [#1287](https://github.com/foldkit/foldkit/pull/1287) [`474b7c6`](https://github.com/foldkit/foldkit/commit/474b7c6d68a5cec68c36b05e635225cf41d93a51) Thanks [@devinjameson](https://github.com/devinjameson)! - Machine Edge handlers now return one `Update.Return`-shaped record with `model` and optional `commands` fields. This replaces the separate Model builder and Commands callback arguments on `to` and `when`, keeps transition outputs consistent with Foldkit update functions, and lets one derivation feed both the next state and its Commands. Migrate by returning `{ model, commands }` from the existing handler and removing the separate Commands callback.

- [#1305](https://github.com/foldkit/foldkit/pull/1305) [`e0a0528`](https://github.com/foldkit/foldkit/commit/e0a0528c239958e6af24ccea356f6ac80d0830e4) Thanks [@devinjameson](https://github.com/devinjameson)! - Add `Machine.ignore()` for explicitly declaring that a guard list should ignore its Message when every preceding `when` guard declines. `Machine.step` reports this outcome as `ExplicitlyIgnored`, and static analysis reports later Edges as `ShadowedByIgnore`.

  This adds an `Ignore` variant to `Machine.GuardedEdge` and variants to `Machine.IgnoredReason` and `Machine.DeadTransitionReason`. Update exhaustive matches over those unions to handle `Ignore`, `ExplicitlyIgnored`, and `ShadowedByIgnore`.

- [#1300](https://github.com/foldkit/foldkit/pull/1300) [`2963bc7`](https://github.com/foldkit/foldkit/commit/2963bc7e16796984f62b5f675d639ee9427751b0) Thanks [@devinjameson](https://github.com/devinjameson)! - Add `Machine.fold`, a dual helper that folds a Machine state field into its enclosing Model.

  The helper supports both data-first update calls and data-last `Update.Step` composition. Contextual Machines read their required context from the enclosing Model for each transition.

- [#997](https://github.com/foldkit/foldkit/pull/997) [`177cfb4`](https://github.com/foldkit/foldkit/commit/177cfb4c02c9c2cdc52e0838e43a76cee4b0e43b) Thanks [@devinjameson](https://github.com/devinjameson)! - The experimental Machine's `Ignored` result now carries a required `reason` field, typed as the new `IgnoredReason` export, so a step that matched no Edge says why. `OutOfAlphabet` means the Message tag appears in no state's `on` record anywhere in the table. `NotApplicable` means the tag is in the Machine's alphabet but no Edge for it exists from the current state. `GuardsFellThrough` means an Edge entry exists for this state and Message but every guard declined and no `otherwise` was present, which previously looked identical to a Message the Machine never handles. Consumers that construct or assert an `Ignored` result must add its `reason`.

- [#1288](https://github.com/foldkit/foldkit/pull/1288) [`3bc16bb`](https://github.com/foldkit/foldkit/commit/3bc16bbc80d817f26bca348c59c6adfb499c58a1) Thanks [@devinjameson](https://github.com/devinjameson)! - Add opt-in, Schema-typed read-only context to experimental Machines. Declare `context` in the first `Machine.define` stage to require it as the third argument to `transition` and `step`, expose it as the third guard parameter, and include it in `EdgeInput`.

  Context-free Machines retain their existing two-argument call signatures and Edge input shape. Use context for per-dispatch reads from data outside the Machine state; keep state-owned snapshots in the state and continue using Messages for values that should be observable facts.

- [#1314](https://github.com/foldkit/foldkit/pull/1314) [`240707a`](https://github.com/foldkit/foldkit/commit/240707af8cafdff65c52bc32c999d37616760033) Thanks [@devinjameson](https://github.com/devinjameson)! - Add `Machine.forStates(...).on(...)` and the Machine definition's `shared` array for declaring one transition map across several source states.

  Shared handlers narrow `state` to the selected state variants and `message` to each transition's Message. State-local transitions replace shared defaults for the same state and Message, while overlapping shared declarations throw when the Machine is defined. Shared transitions are expanded into the Machine's ordinary Edge set before runtime dispatch and static analysis.

- [#1303](https://github.com/foldkit/foldkit/pull/1303) [`420e3e9`](https://github.com/foldkit/foldkit/commit/420e3e91439c8b180e7c3a59259631872b9feae2) Thanks [@devinjameson](https://github.com/devinjameson)! - Export `Machine.StateTransitions` for typing an extracted state entry while preserving its Edge state and Message narrowing.

### Patch Changes

- [#999](https://github.com/foldkit/foldkit/pull/999) [`2494764`](https://github.com/foldkit/foldkit/commit/24947649807bdfe3b81a527d0149bc9ea0165d58) Thanks [@devinjameson](https://github.com/devinjameson)! - `Machine.define` now flattens nested state unions when extracting state tags instead of throwing at module load. A state Schema built as a union of unions, such as `Schema.Union([EnteringPlayers, PlayingState])` where `PlayingState` is itself a union, now works, and `stateTags` lists the tags in depth-first declaration order. Members that are neither a union nor a Struct with a literal `_tag` field still throw the existing error.

- [#1286](https://github.com/foldkit/foldkit/pull/1286) [`79d102e`](https://github.com/foldkit/foldkit/commit/79d102e5315683a2fb275461c1ea461ebd6d4a17) Thanks [@devinjameson](https://github.com/devinjameson)! - Exclude Machine Edges shadowed by an earlier `otherwise` from reachability analysis and report each dead transition once.

## 0.157.0

### Minor Changes

- [#1000](https://github.com/foldkit/foldkit/pull/1000) [`f26af99`](https://github.com/foldkit/foldkit/commit/f26af9919036186f853486ada8db73f13c61c1af) Thanks [@devinjameson](https://github.com/devinjameson)! - `Machine.unreachableStates` and `Machine.deadTransitions` accept an optional array of extra walk roots for entry states the declared Edge set does not reach from `initial`, such as states restored from persistence or entered through deep links. The roots are additive: `initial` is always a root, so passing extra roots can only shrink the findings. The analysis docs now state their assumptions plainly: the results describe the declared Edge set walked from its roots, the walk cannot see state advanced outside `transition` and `step`, and entry points other than `initial` must be passed as extra roots or the analysis reports false positives.

- [#1229](https://github.com/foldkit/foldkit/pull/1229) [`13f4f70`](https://github.com/foldkit/foldkit/commit/13f4f703eb6ab6fdd3b90b1ea9ed09155c01031b) Thanks [@devinjameson](https://github.com/devinjameson)! - Let Mount integrations observe whether the rendered view is `Live` or `Paused` through the new `viewStateChanges` Stream supplied to `Mount.define` and `Mount.defineStream` execution.

  The Stream begins with the rendered view state at the moment the Mount is acquired and stays open for the Mount's lifetime. That initial state is retained across asynchronous setup before the Stream is consumed. A live-acquired Mount that survives a time-travel render stays acquired and observes `Live`, then `Paused`, then `Live` after the latest live view has been patched back into the DOM. A Mount inserted by a replay starts in `Paused`, and a runtime without time travel reports only `Live`.

  A Mount acquired by a historical render cannot dispatch to the live Model. If the resumed live view reuses its element and declares a Mount there, Foldkit releases the replay acquisition before starting the live action with the current args and dispatch. A Mount acquired by the live view stays live so asynchronous setup and external streams can continue; its results follow the latest live Submodel wiring without crossing into historical wiring. Integrations use `viewStateChanges` to stop DOM-derived interaction while the historical view is installed. Commands, Subscriptions, ManagedResources, the live Model, and DevTools history also continue normally.

  This reserves `viewStateChanges` as a runtime-supplied Mount execution field. Rename any Mount arg with that name before upgrading. The low-level `MountAction.f` view-state parameter is now required; MountAction wrappers must accept and forward it.

  Custom renderers without time travel can pass the public `Mount.liveViewStateChanges` Stream to that parameter. It emits `Live` immediately and stays open.

- [#1268](https://github.com/foldkit/foldkit/pull/1268) [`3a4ccd0`](https://github.com/foldkit/foldkit/commit/3a4ccd0f6611f3ef90a5af43a821bbc2d8821fbe) Thanks [@devinjameson](https://github.com/devinjameson)! - Preserve structurally refined payload types in exhaustive Foldkit union matchers, migrate OutMessage folds to their owning union matcher, and add `Animation.toggle` as a child-owned visibility entry point.

- [#1273](https://github.com/foldkit/foldkit/pull/1273) [`62ae446`](https://github.com/foldkit/foldkit/commit/62ae44614013a75af0e649f6ad593ae35a59b131) Thanks [@devinjameson](https://github.com/devinjameson)! - Preserve Message and OutMessage type safety across Story and Scene steps.

  `Story.message`, `Story.expectOutMessage`, `Scene.Subscription.emit`, `Scene.expectOutMessage`, and `Scene.expectOutMessages` are now typed data steps rather than callable simulation transforms. Story and Scene validate those values against the Message and OutMessage types of the update under test, including narrow variants of a wider union.

  ## Migration

  Passing these steps directly to `story` or `scene` is unchanged. Any code that treated one of these returned steps as a function must migrate, including direct invocation, storing it as a simulation transform, or composition through Effect's `flow` or another helper in either Story or Scene.

  Use the new `Story.steps` API for a reusable Story sequence. It accepts the same steps as `story`, preserves their Model, Message, and OutMessage constraints, and can itself be passed anywhere a Story step is accepted.

  Scene has no grouped-step API. Pass `Subscription.emit` and OutMessage assertion steps as separate arguments to `scene`; do not compose them as functions.

  Before:

  ```ts
  import { flow } from 'effect'
  import { given, message } from 'foldkit/story'

  const givenIncremented = flow(
    given({ count: 0 }),
    message(ClickedIncrement()),
  )
  ```

  After:

  ```ts
  import { given, message, steps } from 'foldkit/story'

  const givenIncremented = steps(
    given({ count: 0 }),
    message(ClickedIncrement()),
  )
  ```

  Remove the `flow` import when it was used only to group Story steps. This is not a general deprecation of Effect's `flow`; continue to use it for ordinary function composition outside the Story step API.

- [#1269](https://github.com/foldkit/foldkit/pull/1269) [`b5ec356`](https://github.com/foldkit/foldkit/commit/b5ec356d1d88d136f77bca416b753479d4aa7b50) Thanks [@devinjameson](https://github.com/devinjameson)! - Reject children and `h.InnerHTML` passed to `h.textarea` or `h.keyed('textarea')` so the Model remains the field's single source of truth. This is a breaking change: move textarea content into the live value property with `h.Value(text)`. The UI Textarea helper now exposes the narrower `TextareaAttribute` group. Animation wrapper elements and Virtual List row elements also exclude `textarea` because both render children.

### Patch Changes

- [#1250](https://github.com/foldkit/foldkit/pull/1250) [`21d56b2`](https://github.com/foldkit/foldkit/commit/21d56b2de3cdc6a010d1b1e1ac9af56ee1169583) Thanks [@devinjameson](https://github.com/devinjameson)! - Rename the Foldkit philosophy page to “Why Foldkit” and update its URL in the package README.

- [#1213](https://github.com/foldkit/foldkit/pull/1213) [`57e2436`](https://github.com/foldkit/foldkit/commit/57e24366c8997cd235002f58c9dc38477a6cb1a3) Thanks [@devinjameson](https://github.com/devinjameson)! - Use full Effect module names in published source, examples, templates, and documentation. JavaScript and TypeScript globals that share an Effect module name are now qualified through `globalThis`.

- [#1114](https://github.com/foldkit/foldkit/pull/1114) [`1593f90`](https://github.com/foldkit/foldkit/commit/1593f90f783752aba16c9c77a171d3d72f9206df) Thanks [@devinjameson](https://github.com/devinjameson)! - Let a consumer export a Machine Edge built with `to` or `when` from `foldkit/experimental/machine`.

  `Edge` has a hidden field that carries the guard value type. Its key was a `unique symbol` that Foldkit did not export. TypeScript had to write that key into the consumer's `.d.ts` file, but it had no name for it, so it failed with `TS4023: ... has or is using name 'EdgeGuardValueTypeId' ... but cannot be named`. This hit any package that builds an Edge in one module and exports it, as soon as that package turned on declaration emit. `When`, `Otherwise`, and `TransitionTable` embed `Edge`, so exporting any of them hit the same error.

  The key is now a normal property, `'~foldkit/EdgeGuardValue'`, following the same fix as the runtime boot key. Consumers need to do nothing. The field is still internal and still has no runtime representation.

- [#1267](https://github.com/foldkit/foldkit/pull/1267) [`a43f524`](https://github.com/foldkit/foldkit/commit/a43f5241c4f7a6cea57386153863fea9ebf9eab8) Thanks [@devinjameson](https://github.com/devinjameson)! - Move focus into dialogs when the requested initial target is missing or cannot receive focus.

## 0.156.0

## 0.155.0

### Minor Changes

- [#1233](https://github.com/foldkit/foldkit/pull/1233) [`5c50e26`](https://github.com/foldkit/foldkit/commit/5c50e264d596fb14b149d49ed8a7cf5a53c2645b) Thanks [@devinjameson](https://github.com/devinjameson)! - Accept `ChildAttribute` in a custom element's attribute array.

  An `ElementBuilder` minted by `CustomElement.define` typed its attributes as `ReadonlyArray<Attribute<Message>>`, while every html element builder accepts `ReadonlyArray<Attribute<Message> | ChildAttribute>`. Spreading a Submodel's published `childAttributes` group into `h.div` typechecked, but spreading the same group into a defined custom element was rejected, even though the runtime routes a `ChildAttribute` through its originating Submodel's boundary regardless of the element's tag. Wrappers that forward caller attributes into a custom element inherited the narrowing, so their own attribute parameters could not accept published groups either.

  The builder's call signature now accepts the union, matching the html element builders. Nothing changes at runtime.

- [#1232](https://github.com/foldkit/foldkit/pull/1232) [`9fe0b36`](https://github.com/foldkit/foldkit/commit/9fe0b3693b432f31337721c09f3708f6a422b86d) Thanks [@devinjameson](https://github.com/devinjameson)! - Add `FieldValidation.match`, a module-level exhaustive matcher for `Field` states. It follows the `AsyncData.match` shape: data-first with the field or data-last for pipelines, handlers `onNotValidated`, `onValidating`, and `onValid` receiving the state's `value`, and `onInvalid` receiving `{ value, errors }`.

  ```typescript
  FieldValidation.match(model.email, {
    onNotValidated: () => 'border-gray-300',
    onValidating: () => 'border-blue-300',
    onValid: () => 'border-green-500',
    onInvalid: () => 'border-red-500',
  })
  ```

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

- [#1203](https://github.com/foldkit/foldkit/pull/1203) [`d56894c`](https://github.com/foldkit/foldkit/commit/d56894cdc320bad3b80c43eb14bea457bde65af9) Thanks [@devinjameson](https://github.com/devinjameson)! - Remove the deprecated `h.OnClickFocus`. Replace `h.OnClickFocus(focusSelector, message)` with `h.OnClick(message, { focusSelector })`.

- [#1208](https://github.com/foldkit/foldkit/pull/1208) [`fdc973c`](https://github.com/foldkit/foldkit/commit/fdc973cc795c2f04ce1e0f149f9cf0143cc6f3f1) Thanks [@devinjameson](https://github.com/devinjameson)! - Let Scene preserve multiple OutMessages emitted by one update-producing step in runtime order and assert the complete sequence with `expectOutMessages`.

  This changes OutMessage assertions after `Command.resolveAll`, `Command.resolveAllExact`, and `Mount.resolveAll`. `expectOutMessage` now requires exactly one OutMessage from the whole step, and `expectNoOutMessage` requires none. Use `expectOutMessages` when several resolvers emit OutMessages. When a step emits several, the singular `SceneSimulation.outMessage` field is `undefined` because no single value can represent the result.

### Patch Changes

- [#1191](https://github.com/foldkit/foldkit/pull/1191) [`2d85d5a`](https://github.com/foldkit/foldkit/commit/2d85d5ae9536e3fc9c9595442c233a72c0395122) Thanks [@wmaurer](https://github.com/wmaurer)! - `Dom.closeDialog` now resolves to a boolean. It is `true` when the close released the focus trap, return focus, and stack entry that `Dom.showDialog` installed. It is `false` when the dialog held none. For example, this happens when the close runs before the show has finished. A caller that ignores the result needs no change.

- [#1220](https://github.com/foldkit/foldkit/pull/1220) [`16b392c`](https://github.com/foldkit/foldkit/commit/16b392c5e304bbbea62c0aae5a4a36f90d472f71) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade Happy DOM to include its latest custom-element event-listener fix.

- [#1207](https://github.com/foldkit/foldkit/pull/1207) [`2a88e37`](https://github.com/foldkit/foldkit/commit/2a88e3738d4841525be25f2ba16d958164b4f1a9) Thanks [@devinjameson](https://github.com/devinjameson)! - Move TypeDoc generation into a private workspace so package TypeScript upgrades are independent from TypeDoc's compiler support.

- [#1230](https://github.com/foldkit/foldkit/pull/1230) [`92e56cf`](https://github.com/foldkit/foldkit/commit/92e56cfbc0a7bccc261cf9e50564a5132fc89d1d) Thanks [@devinjameson](https://github.com/devinjameson)! - Clear a ManagedResource reference and dispatch its release Message when the user-provided release effect fails.

- [#1231](https://github.com/foldkit/foldkit/pull/1231) [`aaff2e5`](https://github.com/foldkit/foldkit/commit/aaff2e53f5bf5742ae0428c5fda89a5d6974ac43) Thanks [@devinjameson](https://github.com/devinjameson)! - Match `defineTaggedUnion` and `defineRouteUnion` values through the union's own `match` instead of `Match.value` pipes with `Match.tagsExhaustive`. Internal call sites, the ssg template, and the generated FOLDKIT.md guidance now use the union method; behavior is unchanged.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade development dependencies to Node 26 type definitions and Happy DOM 20.11.8.

- [#1217](https://github.com/foldkit/foldkit/pull/1217) [`5f8a6e8`](https://github.com/foldkit/foldkit/commit/5f8a6e8a2ac0baf34598964a7cc8d48c81fb37c6) Thanks [@devinjameson](https://github.com/devinjameson)! - Reduce render overhead by caching unchanged document metadata, writing ordinary properties directly, and skipping masked module scans for VNodes with no module data. External metadata changes and URL updates are still reconciled on the next render.

- [#1220](https://github.com/foldkit/foldkit/pull/1220) [`16b392c`](https://github.com/foldkit/foldkit/commit/16b392c5e304bbbea62c0aae5a4a36f90d472f71) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the Happy DOM development dependency used by package tests.

- [#1210](https://github.com/foldkit/foldkit/pull/1210) [`b02ce0a`](https://github.com/foldkit/foldkit/commit/b02ce0ab32a082bd40774127b8f4f6bfd6e1043e) Thanks [@devinjameson](https://github.com/devinjameson)! - Upgrade the TypeScript compiler used to build and test packages to 7.0.2 while keeping compiler API tools on the official TypeScript 6 compatibility package.

## 0.154.0

### Minor Changes

- 186020f: Add composable `OnClick` controls for preventing the browser default, stopping DOM propagation, and synchronously focusing an existing element before dispatch. The existing one-argument call keeps its allow-and-bubble behavior, while `OnClickFocus` remains source compatible and is deprecated in favor of the new focus control. Scene now follows the full click propagation path, honors the default-action and propagation controls, and runs submit-button default actions.
- a36b809: Add `OnFocusEnter` and `OnFocusLeave` attributes for modeling focus across a compound region. Put them on a common ancestor and Foldkit dispatches only when focus crosses that ancestor's boundary, not when it moves between descendants. The new `Scene.focusEnter` and `Scene.focusLeave` interactions exercise the same Messages in scene tests.
- e13c3a0: `Update.foldChild` and `Update.foldChildStep` can now emit a derived parent OutMessage from `foldOutMessage`. Type the fold as `Update.StepWithOutMessage` when handling the child fact may also produce a different fact from the parent.

  Imagine this code lives inside a settings page module with a reusable `Select` Submodel. Choosing "Dark" makes the Select emit `Select.OutMessage.Selected`. The settings page owns the theme Model, so its local `changeTheme` Step applies the selection:

  ```typescript
  // settings/main.ts
  const changeTheme =
    (theme: Theme): Update.StepWithOutMessage<Model, Message, OutMessage> =>
    model => ({
      model: evo(model, { theme: () => theme }),
      commands: [SaveThemePreference({ theme })],
      outMessage: OutMessage.ChangedTheme({ theme }),
    })
  ```

  `changeTheme` evolves the settings Model, returns the Command that saves the preference, and reports the change to the settings page's parent.

  Before, `foldOutMessage` could only return a plain `Update.Step`, so it could not call `changeTheme`. The fold had to leave the selection for the parent Message handler:

  Before:

  ```typescript
  // settings/main.ts
  const foldThemeSelectOutMessage = M.type<Select.OutMessage<Theme>>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      Selected: () => model => ({ model }),
    }),
  )
  ```

  The `GotThemeSelectMessage` branch then had to run the child fold, inspect the child Message again, call `changeTheme`, combine both Commands collections, and preserve the optional parent OutMessage:

  ```typescript
  // settings/main.ts
  GotThemeSelectMessage: ({ message }) => {
    const themeSelectFold = foldThemeSelect(model, message)

    return Select.Message.match<
      Update.ReturnWithOutMessage<Model, Message, OutMessage>
    >(message, {
      SelectedOption: ({ option }) => {
        const themeChange = changeTheme(option)(themeSelectFold.model)

        return {
          ...themeChange,
          commands: [
            ...(themeSelectFold.commands ?? []),
            ...(themeChange.commands ?? []),
          ],
        }
      },
    })
  },
  ```

  After:

  ```typescript
  // settings/main.ts
  const foldThemeSelectOutMessage = M.type<Select.OutMessage<Theme>>().pipe(
    M.withReturnType<Update.StepWithOutMessage<Model, Message, OutMessage>>(),
    M.tagsExhaustive({
      Selected: ({ value: theme }) => changeTheme(theme),
    }),
  )
  ```

  Set `foldOutMessage` to `foldThemeSelectOutMessage` in the existing `Update.foldChild` config. The `GotThemeSelectMessage` branch only routes the child Message now:

  ```typescript
  // settings/main.ts
  const foldThemeSelect = Update.foldChild({
    update: Select.update,
    read: model => Option.some(model.themeSelect),
    write: (model, nextThemeSelect) =>
      evo(model, { themeSelect: () => nextThemeSelect }),
    toParentMessage: message => Message.GotThemeSelectMessage({ message }),
    foldOutMessage: foldThemeSelectOutMessage,
  })

  GotThemeSelectMessage: ({ message }) => foldThemeSelect(model, message),
  ```

  The Step returned by `changeTheme` now runs inside `foldThemeSelect`. `Update.foldChild` preserves the Select Commands and returns the settings page's next Model, save Command, and derived `ChangedTheme` OutMessage together.

  Keep `toParentOutMessage` for one-to-one forwarding of a child fact. No adapter is needed when every parent OutMessage is derived by `foldOutMessage`. When both paths emit, the derived OutMessage replaces the lift for that dispatch. If the Step emits nothing, the lift still runs.

### Patch Changes

- 6716de6: Clarify the public TSDoc for update returns and child folds. The revised guidance explains which child OutMessages continue to the parent, which stop at the current Submodel, and when `foldOutMessage` still runs locally.

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

### Patch Changes

- 86ef573: Prevent `foldOutMessage` from narrowing the parent Model while combining child-wrapper and OutMessage Step Message and Command service types in `Update.foldChild` and `Update.foldChildStep`.
- efd64f4: Clarify the public `foldChild` and `foldChildStep` type parameter names so each Message and service requirement identifies its source.

## 0.151.0

### Minor Changes

- 4a96f71: `Machine.transition` now returns `Update.Return<State, Message, R>` instead of a two-element tuple containing the next state and Commands. The Machine state is the return's `model`, and an ignored Message omits `commands`.

  Before:

  ```typescript
  const [nextState, commands] = machine.transition(state, message)
  ```

  After:

  ```typescript
  const stateTransition = machine.transition(state, message)

  stateTransition.model
  stateTransition.commands
  ```

  The record can also serve directly as the child update in `Update.foldChild`. Use `Machine.step` instead when code needs to distinguish a `Transitioned` result from an `Ignored` result or inspect Edge metadata.

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

### Patch Changes

- a477ac8: Speed up callable tagged constructors whose type-side fields can be copied directly, such as primitives, literals, and unions of those identity types. Structs, Arrays, child Messages, checked fields, contextual fields, opaque schemas, oneOf unions, schemas that redefine `_tag`, and other composite fields continue through Schema validation. In a warmed Node 22.22.3 benchmark on Effect 4.0.0-rc.109, `ClickedReset()` fell from 177.8 ns to 30.5 ns per call and `ClickedItem({ id })` fell from 257.5 ns to 73.7 ns per call.

  The Vite plugin now includes SchemaAST in its forced Effect prebundle for this runtime dependency.

  The fast path assumes typed object inputs whose provided payload fields are own data properties. Primitive inputs, payload accessors, and inherited payload fields fall back to Schema validation. Both paths ignore an inherited `_tag`. Calls that bypass TypeScript can now construct eligible variants with wrong primitive field types or missing required fields. Stateful accessor Proxy traps are outside the fast-path equivalence boundary. Decode untrusted input through the Schema as before.

- aa10342: Let a consumer export a program whose type comes from `makeElement` or `makeApplication`.

  `MakeRuntimeReturn` has a hidden field that carries Flags, Resources and Kind. Its key was a `unique symbol` that Foldkit did not export. TypeScript had to write that key into the `.d.ts` file, but it had no name for it, so it failed with `TS4023: ... has or is using name 'RuntimeBootTypeId' ... but cannot be named`. This hit any package that builds a program in one module and exports it, as soon as that package turned on declaration emit.

  The key is now a normal property, `'~foldkit/RuntimeBoot'`. Consumers need to do nothing. The field is still internal and still has no runtime representation.

## 0.148.2

### Patch Changes

- f9f2b22: Align the published READMEs with Foldkit's current positioning, terminology, and documentation links. Clarify the Vite plugin's Model-preserving hot reload and hydration build-id guidance.
- 50fd51f: Compare controlled select hydration against the effective selection owned by the select value, and synchronize duplicate-valued option defaults after that value takes effect.
- b927ff7: Refuse server rendering a native `select` controlled through a client-only `CustomElement.define` property named `value`. Foldkit applies the property at different points in a fresh render and hydration, so it cannot describe one portable selection. Use `h.Value` for a server-rendered controlled select.
- 62813c9: Contain and refuse a server handoff unless it is the document's single nonempty stamped root in the body light DOM. `injectIntoTemplate` now rejects a second hydratable application even when it uses a distinct runtime id. Static body output can still coexist because it carries no handoff stamp. Each insertion still applies its `Document` head fields, so insertion order determines the initial metadata.

## 0.148.1

### Patch Changes

- 1ecb97e: Block keyboard input from reaching same-document stale handlers when WebKit lets an older modal reclaim focus during hydration refusal.
- febdb54: Validate deployment build ids at the JavaScript boundary so missing or non-string client and server values refuse the handoff instead of throwing natively or adopting unstamped HTML.
- 3d8d80b: Preserve raw style attributes when an element moves from typed style ownership to `h.Attribute('style', ...)`, including hydration updates, CSS shorthands, and custom properties.
- 21347b7: Preserve tokens from `h.Class` when a raw `class` attribute changes, and keep raw class tokens when typed ownership changes.
- 3657b1b: Reject `NaN` element keys in hydratable server output because they cannot identify the same element across renders. Hydration key and view-identity markers are now documented as public, non-cryptographic fingerprints rather than one-way digests.

## 0.148.0

### Minor Changes

- 7dc94b6: Harden experimental server rendering and hydration, and raise the supported Node version.

  Security: the server serializer treated any property named `innerHTML` as trusted raw HTML, so a `CustomElement.define` property (or an internal `Prop({ key: 'innerHTML', value })`) named `innerHTML` could inject markup into a server-rendered page. Provenance is now recorded per property write, so only the value `h.InnerHTML` wrote reaches the raw-HTML sink, and a generic property written after it takes the name over rather than inheriting its trust.

  A custom element's declared properties are client-only in the server HTML, including properties named after a global attribute such as `id`, `title`, `lang`, `dir`, `tabIndex`, `hidden`, `inert`, and `draggable`. They no longer reflect through the native property maps, so component state the view never rendered cannot reach the markup. `h.Id`, `h.Title`, and the other attribute builders set the reflected attribute every element has, and still serialize.

  A plain-text `<noscript>` carrying markup is rejected. With scripting disabled, the state noscript exists for, a browser parses `<noscript>` content as HTML, so a `<` that opens a tag or comment would become live markup for exactly the users noscript targets. Plain text still round-trips; author intended fallback markup with `h.InnerHTML`.

  A rendered root that would not close cleanly is rejected, for renders that are not hydratable as well. An unterminated element inside the root (an unclosed `<textarea>`, `<script>`, comment, or `<plaintext>`, typically from an incomplete `InnerHTML` fragment) would otherwise swallow the Flags payload, the client entry, and the rest of the served document.

  A `<noscript>` that changes the rest of the page when a browser parses it with scripting disabled is rejected. Its content is raw text while scripting is enabled and ordinary HTML when it is not, so fallback markup that leaves a `<form>` or `<table>` open pulls the markup that follows the `<noscript>` inside itself, erasing it for exactly the visitors the fallback was written for. The render is parsed both ways and the trees compared, so this holds for a `<noscript>` that arrives inside an `h.InnerHTML` fragment too.

  A static render is checked against the tree the view wrote, not only a hydratable one. Hydration is what would otherwise rebuild a subtree the parser reshaped, so without it a `<div>` inside a `<p>`, a bare `<tr>` in a `<table>`, or text foster-parented out of one is simply lost with nothing left to notice. The hydration-marker check stays conditional, since only a hydratable render emits a stamp.

  `injectIntoTemplate` parses the finished page, with scripting enabled and disabled, and requires the placeholder's parent to hold exactly what the template and the rendered markup say it should. The rendered root is checked in a neutral context before it reaches a template, which cannot see what happens once it is spliced somewhere with a restrictive content model: a `<form>` root placed inside another `<form>` is dropped outright, a `<table>` foster-parents what it cannot hold, and a subtree can be reshaped below a root that itself survives. The check covers static output too, where a dropped subtree is lost with no hydration to rebuild it, and it identifies the injection by the position its placeholder held, so a second application's root elsewhere in the document is not counted against it.

  The `html` field of a public `RenderedApplication` is validated as protocol data rather than trusted because its TypeScript shape is structurally constructible. Hydratable HTML must parse as exactly one top-level element carrying one nonempty root stamp and build stamp, optionally followed by one matching top-level JSON Flags script. Static HTML may contain one element, text, or comment root, or no body output. Additional top-level text or elements, missing build ownership, ambiguous handoff markers, and source that the parser drops, splits, moves, or reconstructs are refused before insertion. Only the HTML parser's five ASCII whitespace characters are ignorable between top-level nodes; a non-breaking space and other visible Unicode whitespace remain application content and cannot sit outside the owned root.

  Where the placeholder may sit is now stated rather than inferred, and everything outside that set is refused by name. The placeholder must reach `<body>` through flow containers only (`div`, `main`, `section`, `article`, `aside`, `header`, `footer`); a `<form>`, `<table>`, `<select>`, foreign content, or a `<template>`'s content is rejected. Rendered markup that declares a shadow root, through `<template shadowrootmode>` or the older `shadowroot`, is rejected too: a browser turns it into a shadow root while parsing, moving the content out of the light DOM, so the served page and the tree hydration reconciles stop describing the same thing. Attach shadow roots from a custom element instead.

  A view rooted at `<html>`, `<head>`, `<body>`, or `<frameset>` is rejected, for static output as well as hydratable output. A browser builds those elements from the document it parses, so the start tag is dropped, merged, or replaces the body once the rendered markup is spliced into a template, and the served root is never the element the view wrote.

  A rendered `<template>` that declares a shadow root is refused by `renderToString` itself rather than only by `injectIntoTemplate`, so a page that never passes through the injector is covered too. The scan descends into template content and parses with scripting enabled and disabled, so a declaration nested inside an ordinary template, or inside a `<noscript>` where the content is live markup only when scripting is off, is refused as well.

  An `h.InnerHTML` fragment cannot reach outside the application root. An `<html>`, `<head>`, `<body>`, or `<frameset>` tag inside one is not rendered where it is written: a browser merges its attributes onto the page's own elements and hoists its content, so the result is neither the markup the view wrote nor anything the application owns. A fragment parse drops those tags, which is why the check runs against a whole page.

  An `h.InnerHTML` fragment containing any `<script>` is refused during server rendering. A script parsed with the served page and one created by assigning `innerHTML` have different execution and type-specific processing rules, so the two paths cannot be made equivalent by serialization alone. The conservative refusal includes classic and module scripts, import maps, speculation rules, and inert data blocks such as JSON-LD. Build the script as an ordinary view element or place it in the HTML template.

  A live HTML `<base>` element is refused anywhere in rendered application markup, whether declared as a view element or supplied through `h.InnerHTML`, and `injectIntoTemplate` applies the same check to a structurally constructed `RenderedApplication`. A browser applies `<base>` before hydration, including one parsed in body or in a scripting-disabled `<noscript>`, so it can redirect the relative client entry written after the root to another origin. Put `<base>` in the template head under host control. An ordinary inert template may still contain one.

  `xmp`, `noembed`, and `noframes` are treated as raw-text elements, and trusted `h.InnerHTML` inside a `textarea` or `title` is refused when it carries that element's closing sequence, which would end the element and put the rest of the fragment in the document. A carriage return in raw-text or comment content is refused, since neither position has an escape and HTML input preprocessing rewrites it before the tokenizer runs, and an unpaired surrogate is refused anywhere a value is serialized, since encoding the page as UTF-8 replaces it with U+FFFD.

  A view that names two owners for one element's content is refused. `h.InnerHTML` and a client-only custom-element property named `innerHTML` each take the whole of an element's content, so either one conflicts with declared children, a controlled value on a `textarea`, `output`, or `select`, and an element that holds no content at all. Trusted raw HTML disagrees with the server serializer in those combinations, while a client-only property replaces the DOM nodes the differ still expects to patch and leaves their vnodes detached.

  A controlled `h.Value` on a `textarea` or `output` also conflicts with declared children because assigning the value replaces the content those child vnodes describe. These are compatibility changes to the HTML builder itself, not only to server rendering: every refusal happens where the element is built, so a client-only application rendering one of these views now fails there rather than producing markup its next render contradicts.

  A raw `h.Attribute` and a typed builder naming the same attribute are refused. The two are owners of one piece of state and their served form has no source spelling: `h.Attribute('checked', '')` beside `h.Checked(false)` served a checked box the client immediately cleared, and dropping the attribute instead left the served element with `defaultChecked` false where a fresh render parses the attribute and has it true, so `form.reset()`, `:default`, and an attribute selector read the two pages differently. The same held for `disabled`, `open`, `selected`, `muted`, and for a controlled `value` beside a raw one. HTML attribute names are matched ASCII-case-insensitively, so `h.Attribute('MULTIPLE', '')` is the same attribute as `h.Attribute('multiple', '')`.

  A typed reflected builder on an HTML element whose native interface does not own that property remains client-only. For example: `h.Type('button')` in a reusable attribute bundle creates an expando when the consumer spreads it onto a `div`, just as it did before server rendering existed, and the server omits it rather than turning it into live attribute state. Use the typed builder on an element that owns the property when the value must appear in markup, or use `h.Attribute` when a raw attribute is intentional.

  A raw attribute standing on its own still counts. A controlled `<select>` reads a raw `value`, `multiple`, or `size` when deciding which option matches and whether nothing may be selected, with `size` parsed the way a browser parses it: leading whitespace skipped, the leading digit run taken, and a value past the unsigned long range leaving the element on its own default. A select with no options at all may carry a value that matches nothing, since a served empty select and a fresh one both hold no selection.

  The numeric attribute builders refuse values a browser reads differently depending on whether they arrive as parsed markup or as a property assignment. A negative `maxLength` throws on assignment while the attribute parses; `size = 0` throws and falls back to 20 only on an input, while the same value remains valid on a select or horizontal rule; `NaN` and `Infinity` become 0 through the property and the attribute's own default through the parser; and past 2^31 the property conversions wrap while the attribute clamps. This covers `h.Maxlength`, `h.Minlength`, `h.Size`, `h.Cols`, `h.Rows`, `h.Colspan`, `h.Rowspan`, `h.Span`, `h.Start`, and `h.Tabindex`, which takes any integer in the signed long range, and `h.High`, `h.Low`, and `h.Optimum`, which take any finite number.

  A string builder that lands on a numeric property is refused the same way, decided by the element rather than by the builder. `h.Value` is a string on an input and a number on a `<meter>`, a `<progress>`, or an `<li>`, where `0x10` is 16 to a property assignment and invalid to the parser, and a leading `+`, surrounding whitespace, `Infinity`, and an empty string each part the two. `h.Max` and `h.Min` on a meter or progress read the same way.

  A nonempty controlled value on `<input type="file">` is refused. The served attribute is ignored while assigning the property throws `InvalidStateError`, so the view crashed on a fresh render and on hydration. The type is read from `h.Type` or from a raw `type` attribute.

  A typed attribute builder inside SVG or MathML is refused, `h.Attribute` being the mechanism foreign content uses. A foreign element has none of the HTML interface members those builders write except `id`, `tabIndex`, and `autofocus`, which were measured in Chromium to reflect there: `h.Href` on an SVG `<a>` throws on assignment because `SVGAElement.href` is readonly, `h.Title` sets a value no attribute reflects, and server rendering wrote an attribute for both. The serializer no longer emits them for foreign content either.

  Dynamic HTML tag names are normalized to lowercase before element-specific serialization. An uppercase `SELECT` now receives the same controlled-value handling as the `HTMLSelectElement` a fresh client render creates. SVG and MathML tag names remain case-sensitive and must use their canonical spelling. Server rendering refuses a spelling the HTML parser would adjust because `createElementNS` preserves the authored name, and hydration compares foreign tag names exactly.

  The accepted values were measured in Chromium, and `check:dom-state-parity` re-measures them: it serializes each view, applies the same view's attributes and properties to a fresh element the way the client does, and requires the two to agree.

  `h.Style` now has one server and client representation per effective CSS declaration. The builder normalizes camel-case properties, declaration names, `cssFloat`, WebKit-prefixed properties, and custom properties beginning `--`; rejects duplicate aliases, `cssText`, Snabbdom lifecycle controls, non-string values, `!important`, and syntax that can escape into another declaration; and refuses a raw `style` attribute beside it. The client writes and removes only properties the view owns, preserving declarations a Mount or custom element added. Hydration seeds equivalent server declarations so an unchanged page causes no style mutations, while a strict CSP that blocked the parsed style attribute is repaired through property-level CSSOM writes. The server and client promise the same effective declarations, not identical `style` attribute bytes or mutation history.

  Trusted `h.InnerHTML` in a `pre`, `listing`, or `textarea` is always prefixed with one newline, which the document parser then consumes. Checking whether the fragment began with a literal newline missed the ones tokenization produces from a character reference (`&#10;`, `&#xA;`, `&NewLine;`) and from input preprocessing turning CR or CRLF into LF.

  `OPTIONS` reaches the server entry in the Vite dev host and the generated production host alike for application resources. Vite answered every preflight itself, with `Access-Control-Allow-Origin` and `Vary: Origin` headers a deployed host has no counterpart for, so a cross-origin request worked all through development and failed once deployed. A preflight is a question about a resource, so the application answers it: an entry can allow one origin for one route and refuse it for another, which no host-level setting could express. Ownership follows `Access-Control-Request-Method`, so a preflight for an application `POST` reaches the entry even when its path looks like a static asset. An `OPTIONS` request without both `Origin` and `Access-Control-Request-Method` is not a CORS preflight and reaches the entry regardless of its path. The generated entries answer one with 204 and an `Allow` header, and that is where an application's CORS policy goes. Preflights for Vite-owned source modules, assets, the client, and HMR stay under Vite's CORS policy.

  The dev host wraps Vite's installed CORS middleware in place. It observes the response headers that middleware changes, retains them for Vite-owned and proxy-owned responses, and restores application responses to their pre-CORS state before applying the entry's own headers. The application render middleware remains after Vite's source, asset, proxy, and fallback ownership, so Vite keeps the resources it can serve while an application request that falls through reaches the entry with the same CORS boundary as production.

  The methods a host still refuses itself are the ones the WHATWG `Request` constructor rejects: `CONNECT`, `TRACE`, and `TRACK`, answered 405 with `Allow`. Forwarding one turns a malformed request into a 500. On Node only `TRACE` reaches that rule, since the HTTP parser rejects `TRACK` with a 400 before any handler runs and `CONNECT` arrives on its own event. `Server.HOST_METHOD_ANSWERS` is now `{ refusedStatus, allow }`, and `Server.isHostSettledMethod` names those three.

  Two roots stamped with one `runtimeId` are refused, by `injectIntoTemplate` when a page is assembled and by the runtime when one boots. The id pairs a root with its Flags payload and keys the Model and scroll position hot reloading preserves, so a page holding two would have them take each other's state. Hydrating more than one page-owning application is not supported: each rewrites the document's metadata and installs its own navigation listeners.

  Attribute values now escape carriage returns (as `&#13;`, matching text) so a `\r` or `\r\n` round-trips through the HTML parser instead of collapsing to `\n`, and a NUL character in any serialized text or attribute is rejected as unrepresentable rather than silently corrupted.

  A hydration whose root is not in the document rebuilds rather than reusing it. A caller that resolves the stamped root itself can hand over a detached element, and patching one directly let the differ match it by tag and keep it, so a page the build id had just rejected survived with its DOM state intact and the replacement root's Mount never ran.

  A controlled property is reasserted once the element's children exist, not only on a later patch. The props module runs while an element is being created, and a `<select>`'s `value` setter has nothing to match until its `<option>`s are there, so a fresh render left the select on the browser's default while the server, which marks the matching option, served the right one. Both now settle on the Model's value at the same point.

  Controlled `value`, `checked`, `selected`, and `muted` properties synchronize both current and parsed default DOM state. Hydration, a fresh render, `form.reset()`, attribute selectors, and a later transition to uncontrolled children or a raw attribute therefore agree. Removing a reflected typed property restores the browser's native default or the remaining raw attribute instead of leaving the old property value behind. A same-valued client-only property still writes when it takes ownership, after the typed builder's default state is cleared.

  Hydration seeds unchanged reflected typed properties before the props module patches them. It does not rewrite an equivalent parsed attribute, so an unchanged resource URL does not reload an iframe and an unchanged `h.Id` does not invoke an upgraded custom element's `attributeChangedCallback` a second time merely because the element was adopted. Stale live state is still rewritten to the Model. On an autonomous custom element, typed global builders use the native attribute path rather than a component-defined property setter, while properties declared through `CustomElement.define` remain client-only.

  Hydration replaces a Custom Element host when the view declares light DOM as text, children, or trusted `h.InnerHTML`. The new host and its content are built while detached, then connected in the same state as a fresh render. The old host disconnects, and the new host has a new DOM identity. A browser can connect the old element before parsing its server content, and `connectedCallback` can insert and retain a matching node ahead of it. A positional or markup comparison cannot distinguish the component node from the view node. Clearing children in place can also run a child's `disconnectedCallback` while the adopted host is live, allowing it to mutate state hydration already sampled. Hydration takes its final attribute and text snapshot after these planned lifecycle effects. A view that declares no content still adopts the host and preserves component-built light DOM. Component callbacks must keep structural DOM writes within their own host or shadow root; hydration does not reconcile arbitrary structural changes they make to ancestors or siblings.

  Hydration compares trusted `h.InnerHTML` in an inert document and marks an equivalent parsed subtree as already owned before patching. The probe therefore does not upgrade custom elements or run their constructors, and adoption preserves the existing child identities. Fresh creation and a changed value use the native `Element.innerHTML` setter for `h.InnerHTML`; a client-only custom property named `innerHTML` still uses the component's own setter.

  Hydration runs the initial `insert` hooks in the order a fresh render does. The differ fires the hooks of nodes it creates when the patch ends, and hydration fired the adopted ones after that, so a parent that adopted one child and created its sibling ran the sibling's Mount first. A Mount that depends on a sibling being initialized worked on a fresh boot and broke on a hydrated one; now both run children-first in tree order.

  Hydration verifies logical identity, not just position, for the root as well as for every adopted child. A hydratable render stamps a keyed or identity-bearing element with a digest of its key and view identity, which hydration compares and then strips, so a reordered or stale keyed list rebuilds instead of adopting the wrong DOM node and transferring one row's user-typed state to another. The digest keeps raw keys (a row id, an account identifier, an email address) and the build's source paths out of the served markup, distinguishes key types so the number `1` and the string `'1'` never collide, and is emitted only for a hydratable render. An element keyed by a symbol cannot be compared across the server and the client, so a hydratable render refuses it: key hydratable elements by a string or a number.

  Build skew is detectable. Hydration could adopt a stale page's `<input name="email">` for a new build's `<input name="ssn">`, carrying what the visitor typed into a field that means something else. A hydratable render now stamps a build id on the rendered root, and hydration compares it against the client's own before it accesses the Flags payload text or adopts DOM. A page from another deployment is refused: startup stops, and the page is contained so its links, forms, and controls stop responding rather than acting on a deployment whose code is not running.

  This is a breaking change to both entry points. `renderToString` takes a `buildId` and fails with the new `MissingBuildId` when a hydratable render is given none; its options are now a union, so `isHydratable: false` takes no id and every other render requires one. `Runtime.hydrate` requires a non-empty `buildId` and no longer accepts a bare `hydrate(application)`: an absent id would equal the absent marker on a page served before build ids existed, which reads a page from an unknown deployment as one of this build's own. `@foldkit/vite-plugin` compiles the value into application code as `import.meta.env.FOLDKIT_BUILD_ID`, from its new `buildId` option or from the `FOLDKIT_BUILD_ID` environment variable, and the entries pass it along. The standalone `foldkitSsr` export compiles the same value itself, including the fixed development id, rather than relying on the aggregate `foldkit` plugin to have installed a separate define.

  ```ts
  // src/entry.server.ts
  Server.renderToString(config, {
    flags,
    buildId: import.meta.env.FOLDKIT_BUILD_ID,
  })

  // src/entry.ts
  Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })
  ```

  The id comes from the deployment and nothing is derived from the project. Foldkit cannot see what decides a view's output (the constants it imports, the configuration it reads, the arguments its caller passes), and a digest of whatever files sit in the project would both miss inputs and turn a value published in the page into an oracle for the secrets among them. Use a value the deployment already has, such as a commit, a release tag, or a container digest, and give the client build and the server build the same one. The id is published in the HTML every visitor receives, so it must never contain a secret, and two deployments must never share one. A render that nothing will hydrate (`isHydratable: false`) needs no id. Only a build takes the id from the deployment. The dev server compiles a fixed one because one live source session supplies both transforms and has no deployment identity to derive.

  The comparison settles before the Flags payload text is accessed, parsed, or decoded, before `init` runs, and so before any Command, Subscription, or ManagedResource this boot would start. A page from another deployment carries that deployment's Flags, which the current Schema may well accept while every value in them means something else, so startup stops rather than reading them. Every hydration refusal contains the page: build skew, a missing, duplicated, malformed, or Schema-incompatible Flags payload, a root stamped more than once, more than one root with no container to choose between them, and a served root that lost its stamp, which is where a generated client lands when neither the stamp nor its `#root` placeholder survives. Containment marks the document's body `inert` and opens a nondismissable modal shield above existing top-layer content, including dialogs in closed shadow roots. The shield takes focus after opening so physical keyboard input cannot target stale body handlers. Author-owned dialogs remain open behind it, and containment itself does not call `close` or dispatch `cancel`. Nothing moves, so no upgraded custom element reconnects and no embedded browsing context reloads. This blocks native page interaction without claiming a script or global-event sandbox: existing capture handlers, browser-generated top-layer events, timers, and stale scripts can still run. A page a server never rendered is left alone, since a missing container there is an application whose element does not exist rather than a handoff to refuse. `MissingBuildId`, `HydratableRenderOptions`, and `StaticRenderOptions` are exported from `foldkit/experimental/server`, and `HydrateOptions` from `foldkit/runtime`. The last two were documented as shipping from there while the packed declarations omitted them; `check:packed-ssr-consumer` now typechecks a consumer that imports every documented type against the packed declarations, which a source path resolves whether or not the barrel re-exports them.

  A view identity carries the module path and function name alone, and a release gate now holds it to that. Mixing a digest of the module's source into one would make a changed view rebuild its own subtree, but the identity is emitted into the client bundle every visitor downloads, so a truncated hash of a whole source file would ship a check against that file's contents: a build that correctly tree-shook a low-entropy server-only value out of the client would still publish a digest of the source that held it, and the value could be recovered by hashing candidates until one matched. `check:packed-ssr-consumer` asserts against a real built bundle that no identity carries one. The deployment's build id is what catches a page from a build whose views mean something else, and it reveals nothing about the source.

  The SSR hosts take the origin they serve from configuration rather than from the request: the generated production host from `ORIGIN` (defaulting to the configured port on localhost), and the Vite dev host from the new `origin` plugin option, defaulting to the origin the dev server itself resolved. An HTTP request target may be an absolute URL or a network-path reference such as `//elsewhere.example/page`, and resolving one of those against the `Host` header hands the server entry an origin the client chose, which an entry that derives redirects, canonical URLs, or tenant selection from `Request.url` would then take from the request. A target that resolves anywhere but the configured origin is refused with 400. The Vite dev host applies the same rule and preserves its configured `base` prefix and the browser's query string when Vite middleware rewrites the internal request path.

  A request target carrying credentials (`http://user:pass@host/page`) is refused with 400. `URL.origin` ignores userinfo, so such a target read as same-origin and then made `new Request(url)` throw, turning a malformed request into a 500.

  A missing static asset returns 404 rather than the application shell. Browsers fetch scripts and stylesheets with `Accept: */*`, which accepts HTML, so a hashed asset from a previous deployment was answered with the shell at 200 and a stale deployment read as a blank page instead of the 404 it is. `Server.classifyRequest` reads the path first and the request's `Sec-Fetch-Dest` second, and a refusal that turned on the header declares it in `Vary` so a cross-site script request cannot seed a shared-cache 404 for a real page. `Server.classifyRequest` reads the path a static file server would resolve, so `/assets/app%2Ejs` is classified as the asset it names rather than as a page. `Server.varyWith` merges a field name into an existing `Vary`. The Vite dev host keeps application responses under application CORS ownership, preserving `Vary` fields contributed by other non-CORS middleware, while Vite's `Vary: Origin` applies only to Vite-owned responses. The generated production host uses the same response helpers.

  `foldkit` now requires Node >= 20.19, the floor its HTML parser dependencies need. This is an intentional breaking change: Node 18 reached end of life in April 2025.

  `@foldkit/vite-plugin` sets its `foldkit` peer floor to `>=0.148.0`, the first release whose server rendering carries these fixes, in place of `^0`, which accepted versions without the server export at all and failed at import. It imports the server API from the explicit `foldkit/experimental/server` subpath, and its own Node engine floor rises to `>=20.19.0` to match the `foldkit` it requires. The plugin receives a minor release so an existing `^0.15.0` consumer stays on the compatible `0.15` line instead of resolving a patch whose Foldkit peer it cannot satisfy. The release workflow no longer broadens the peer floor back to `^0` while versioning, and release gates assert the packed floor and exercise the old and new ranges through a normal npm install.

## 0.147.0

### Minor Changes

- 664a8bd: Add `injectIntoTemplate` to `foldkit/experimental/server`. It places a rendered page into an HTML template: the rendered markup replaces exactly one empty container placeholder (`<div id="root"></div>` by default, configurable via `containerId`), and the `Document` head fields are stamped into the shell, `title` into the template's single required `<title>`, `lang` and `dir` onto `<html>`, and `canonical` and `ogUrl` into a matching `<link rel="canonical">` and `<meta property="og:url">` when the template carries them. The exact placeholder and title contracts prevent an injection helper from silently discarding container attributes or matching ambiguous markup. The helper is pure string work with no module state, so a host process may import it directly even when the render itself must stay inside the server entry's module graph.

  Also add a delivery-neutral server entry contract. `renderPage` takes a Web `Request` and returns a `Promise<EntryResult>`. `Rendered` carries an application plus optional HTTP status and headers for template injection; `Responded` carries a complete Web `Response` for redirects, APIs, and other bypasses. `toResponse` turns either result into the response a host sends. The Promise boundary keeps entries callable from build scripts, serverless functions, Vite, and Effect HTTP servers without making the host provide the application's Effect requirements.

- 664a8bd: Add server rendering as an experimental capability. The new `foldkit/experimental/server` entry ships `renderToString`, which resolves `init` for a request, runs the pure view under a no-op dispatch frame, and serializes the resulting Document to an HTML string. The root element is stamped with `data-foldkit-app` and, when the application declares Flags, the Schema-encoded Flags ride along in a JSON script tag so a hydrating client reconstructs the same Model from the same inputs. Commands returned by `init` are not run on the server; the rendered HTML is the post-init state.

  On the client, a new `Runtime.hydrate(application)` boots by adopting a server-rendered DOM, as the counterpart to `Runtime.run`, which always renders fresh. The choice is explicit: `run` builds the DOM, `hydrate` adopts it, and reading the entry file tells you which mode a page uses, with no hidden detection. Under `hydrate` the first render adopts the server DOM in place instead of replacing it: existing elements keep their identity, focus, and scroll while module hooks attach listeners and re-assert attributes, props, and controlled values, and Mounts fire for adopted nodes in the same children-first order the differ uses for created ones. A mismatching subtree is rebuilt at the nearest parent, and an HMR-restored Model wins over DOM adoption.

  Hydration now treats the server handoff as required input. A missing stamped root, missing Flags payload, or undecodable Flags payload terminates startup and leaves the server HTML visible but inert instead of silently constructing different client state. Applications declare only their Flags Schema in `makeApplication`. Fresh client boot moves the Flags Effect to `Runtime.run(application, { flags })`, while `Runtime.hydrate(application)` accepts no client Flags producer and decodes the value embedded by `renderToString`. Migrate a client-only Flags application by removing `flags` from its `makeApplication` config and passing it to `Runtime.run`; use a separate `run` entry when a page must support a fresh SPA boot.

  `renderToString` returns the `Document`'s head state alongside the markup (`title`, `lang`, `dir`, `canonical`, `ogUrl`) so the host can stamp it into the shell and the served HTML is correct before the runtime boots, including the `<html>` language and direction for a localized page on first paint.

  Hydratable output now requires a non-empty runtime id and an element root, with typed `InvalidRuntimeId` and `InvalidHydrationRoot` failures when the handoff cannot be represented. Unsafe markup produces a typed `SerializationError`, and serialized tag and attribute names are validated before output.

  Raw-text serialization is namespaced: `<script>`, `<style>`, `<iframe>`, and `<noscript>` are raw text only in the HTML namespace, emitting their text content verbatim (an escaped `&lt;` would be read back as literal characters, not `<`) and refusing content that would escape the element. `<script>` alone also refuses the `<!--` sequence that opens its double-escaped state, which the other three raw-text elements do not have. `<noscript>` is raw text only while scripting is enabled, which is the hydrating client's state, so its text (including `&`, `<`, and `>`) round-trips verbatim and element children inside it are rejected by the structure check. Foreign-content (SVG, MathML) children serialize through escaping. Void-element handling is likewise gated on the HTML namespace (as are the raw-text, textarea, and select rules) so a foreign sibling is not absorbed as a child, and SVG's HTML integration points (`foreignObject`, `desc`, `title`) keep their content in the HTML namespace, so foreign markup serializes and hydrates the way the browser parses it.

  A hydratable render then verifies its serialized root by parsing it with the same HTML tokenizer the browser uses (parse5), requiring exactly one top-level element that carries the hydration stamp with the view's tag and namespace, and walking the parsed tree to confirm its child structure (elements, text, and comments) matches the view. A shape that HTML parsing rearranges reparses into a DOM the client would rebuild rather than adopt, so it is rejected as a `SerializationError`: a block element inside a `<p>`, an HTML element inside an `<svg>`, or foreign `InnerHTML` that escapes the SVG namespace splits content outside the application root (wrap HTML inside SVG in a `<foreignObject>`), and a `<tbody>` the browser inserts around a bare `<tr>`, or text a `<table>` foster-parents out of its rows, changes the structure inside the root (use explicit table sections). A zero-length text run is dropped from the comparison, since the serializer emits no node for it. `InnerHTML` is treated as a parser-owned subtree and left unwalked, while a controlled `<textarea>` or `<output>` is checked against the text content its `value` serializes to, and an uncontrolled `<textarea>` or `<output>` against its children. For `<textarea>`, whose content is RCDATA, that check rejects the element children the parser would fold into text.

  `injectIntoTemplate` parses the template with an HTML tokenizer and mutates real element positions, so a stamped metadata value never lands inside an inline script, comment, or other unintended context, and it rejects a template with no explicit `<html>` start tag when a language or direction is requested rather than dropping them.

  Hydration reconciles stale server DOM by seeding each value into the channel the client view owns it through, including when a view sets `class` or `style` through both a raw attribute and the typed module, so a deterministic render converges instead of one module removing what another set. It adopts by namespace as well as tag name, at the root and at every child, so a namespace mismatch is rebuilt rather than adopted, and in development it reports an attribute, property, class, or style the server and client disagree on by comparing structured per-vnode signatures of the adopted DOM before and after the client patch, reading each value through the channel the vnode owns it through (a DOM property for a non-reflecting form property such as `value` or `muted`, the attribute otherwise), without surfacing any value.

  An adopted custom element keeps the attributes its `connectedCallback` adds that the view does not declare, and keeps component-added class tokens and style properties too when the view drives class and style through `h.Class` and `h.Style`; a raw `h.Attribute('class', ...)` or `h.Attribute('style', ...)` owns the whole attribute and replaces it, component additions included. Component-built light DOM is preserved when the view declares no children for the element; a view that declares children owns the element's light DOM and reconciles it.

  Navigation and resource URL attributes (`href`, `src`, `action`, `formaction`) neutralize `javascript:` and `vbscript:` URLs. This is a safety net for navigation, not a guarantee that any URL is safe: an element that loads and runs its source, such as a `<script>` or `<iframe>`, still runs an `http(s)` or `data:` source, so those remain trusted-content sinks alongside `InnerHTML` and `Srcdoc`.

  `acceptsHtml`, `resolvesToIndexHtml`, and `varyWithAccept` are exported so the dev host, the reference server, and the scaffold classify requests and merge cache headers through one contract: `Accept` is parsed with quality values (`text/html;q=0` is refused), a path is resolved the way a static file server resolves it, `varyWithAccept` merges `Accept` as a comma-separated field-name token so an existing `Accept-Language` is never mistaken for it, and development matches production, including `Vary: Accept` on both the rendered and the refused (404) representation of an Accept-negotiated route.

  Hydration is the default for both request-time rendering and build-time static generation; visitor-specific browser facts should arrive through Commands or Subscriptions after hydration rather than being baked into SSG Flags.

  The server API lives under `foldkit/experimental/server` while it settles and may change in any release. `Runtime.hydrate` ships in the stable runtime as a sibling to `run` and only adopts a DOM stamped by the experimental server entry. Apps that do not use server rendering continue to use `Runtime.run`.

### Patch Changes

- 664a8bd: `CustomElement.define` now validates a tag beyond the hyphen requirement. A name carrying characters outside a conservative custom-element name grammar, such as `My-Element` or one with markup characters, throws at define time, as do the specification's reserved names such as `annotation-xml` and `font-face`. The accepted set is a conservative subset of the full custom-element grammar rather than an exact match for every name the browser allows.

## 0.146.0

### Minor Changes

- da05bfc: Bump Effect to `4.0.0-rc.109` (from `4.0.0-rc.108`). Foldkit's `effect` peer dependency now requires `4.0.0-rc.109`, and `@foldkit/devtools` pins its `@effect/platform-browser` peer dependency to the same version.

  Pin your Effect packages to `4.0.0-rc.109` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.109 @effect/platform-browser@4.0.0-rc.109
  pnpm add -D @effect/vitest@4.0.0-rc.109
  ```

## 0.145.0

### Minor Changes

- ac3a34f: Stop treating page-lifecycle events as a commitment. A page-owning app no longer tears itself down, or reloads itself, on an event the document can survive.

  Fixes an app going permanently blank when the user clicks a download link. `Runtime.run` started the program with `BrowserRuntime.runMain`, which interrupts the runtime on `beforeunload`. Chrome fires `beforeunload` for a click on a download link: it starts a navigation and converts it to a download once it sees the response, so the navigation is abandoned and the document lives on. By then the interrupt had already run the render finalizer, which puts the container element back empty. The file downloaded, the URL never changed, nothing was logged, and the app was gone until a manual reload.

  None of this is specific to Chrome, or to downloads. Browsers fire `beforeunload` when a navigation starts rather than when it commits, so any navigation that does not replace the document leaves the same result. A response that comes back `204 No Content` has the same shape, as does a navigation the user cancels. The download link is the case that was reported.

  `run` now starts the program with a `Runtime.makeRunMain` runner that registers no page-lifecycle interrupt. Error reporting is unchanged. A real navigation still ends the runtime, because the document goes with it.

  **Behavior change:** a page-owning app restored from the browser's back/forward cache no longer reloads the page. The runtime survives the freeze with its Model, its DOM, and its listeners intact, so a back-navigation now returns the app as the user left it, which is what the cache is for. The reload was there to rescue a page the `beforeunload` interrupt had already emptied, and that interrupt is gone. Two things do come back changed: an app that wants fresh data on restore has to ask for it, with a `pageshow` Subscription that dispatches a Message when `persisted` is set, and an app holding its own WebSocket gets it back closed, since the browser closes sockets on the way into the cache.

  One thing goes with the interrupt: a runtime's finalizers, meaning ManagedResource releases and Subscription and Mount teardowns, no longer get a best-effort run when the tab closes or the page navigates away. Nothing promised they would, and upstream calls that interrupt best-effort. An app that flushed state from a release should flush it as the state changes, or from a `pagehide` Subscription.

  The DevTools bridge no longer announces a disconnect on `beforeunload` either. It reported a live app as gone after a download-link click, and the MCP relay ignored that app until the next reload. A page that really goes away closes its Vite HMR socket, and the plugin already prunes the runtime on that close. Because the freeze into the back/forward cache closes that socket too, the bridge now re-announces the connection on a restore, so a resumed app comes back visible to the DevTools MCP tools instead of staying pruned.

  `foldkit` no longer imports `@effect/platform-browser`, so it is dropped from the package's dependencies and from its peer dependencies. Installing `foldkit` no longer asks for it. Apps still need it at the pinned version wherever they use it directly: `@foldkit/devtools` declares it as a peer dependency, and Effect's browser services such as `BrowserKeyValueStore` and `BrowserCrypto` come from it. `@foldkit/vite-plugin` adds `effect/Runtime` to the namespaces it force-includes in Vite's dependency optimizer, so a dev server prebundles what the compiled runtime now references.

- 71556de: Add `Scene.expectHandled()` and `Scene.expectIgnored()`, which assert whether the preceding interaction's event handler produced a Message.

  Scene had no way to express this and silently tolerated the negative case. `captureFromElement` resolved a handler that produced nothing back to the unchanged simulation, so an interaction whose handler ran and chose to return `Option.none()` left no trace. An element with no handler at all has always thrown; this is the narrower case of a handler that ran and let the event fall through.

  That made a whole class of test vacuous. Any test of the shape "pressing this does nothing" passed whether the interaction was correctly inert or the handler had been deleted outright. In `@foldkit/ui` this was not hypothetical: replacing a read-only Listbox's commit branch with `Option.none()` left every listbox test passing, because the read-only tests asserted only the absence of an OutMessage and of Commands, and both hold when nothing is dispatched at all.

  `expectHandled()` is the assertion behind "the key is consumed here". A handler that returns a Message is what makes `h.OnKeyDownPreventDefault` call `preventDefault()`, so a handled keydown is one whose browser default is suppressed: `Space` does not scroll the page and `Enter` does not submit a surrounding form. Reach for it rather than asserting the Message's tag, which couples the test to a name that is only the mechanism.

  `expectIgnored()` is its complement, for where falling through is the intended behavior, so the intent is stated rather than left as the absence of any assertion.

- bf60461: Fail a Scene test on an interaction that fell through and was never acknowledged.

  An event handler that runs and returns `Option.none()` lets the event fall through. Scene records that outcome, which `expectHandled()` and `expectIgnored()` assert on, and now fails when nothing acknowledges it. Acknowledge with `expectIgnored()` where falling through is the intended behavior. Where the event should have been consumed, the handler is the bug, and `expectHandled()` states that expectation and fails until it is fixed.

  Without this, a test asserting "pressing this does nothing" passed whether the interaction was correctly inert or its handler had regressed into producing an inert Message, since neither case changes the Model, emits an OutMessage, or alters the DOM.

  This is a breaking change for test suites. An existing Scene test that fires an interaction whose handler produces nothing, and asserts nothing about it, will now fail and needs `expectIgnored()` added. One acknowledgement covers one fall-through, so two in a row need one each, and each must come before the next interaction. An interaction on an element with no handler for that event has always thrown, so that case is unaffected, as are handled interactions, which need no acknowledgement.

  The failure names the event and the target it was dispatched on, because it is raised at the next interaction or at the end of the scene rather than at the step itself. It is deferred rather than raised inside the interaction step, because a later `expectIgnored()` cannot opt out of an error already thrown.

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

### Minor Changes

- 0262c9b: `Update.foldChild`'s `foldOutMessage` now receives an optional second parameter, an `Update.FoldContext` carrying `liftCommand` and `liftCommands` bound to the config's `toParentMessage`. The fold already lifts the Commands the child's update returns. The context covers the other case: a Command the parent returns on the child's behalf from the OutMessage Step, built with context only the parent holds, whose result Message is still the child's. The lifters apply the same lift the fold gives the child's own Commands, so there is no `Command.mapMessage` call to write and no second copy of the wrapper to keep in sync.

  Existing one-parameter `foldOutMessage` functions keep working unchanged.

  In the example below, the magic link carries a redirect destination, and only the parent knows the current Route. The Login child cannot build `Login.SendMagicLink` itself, so it emits `RequestedMagicLink` as a fact and the parent returns the Command with the Route filled in.

  Before:

  ```ts
  const foldLoginOutMessage = M.type<Login.OutMessage>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      RequestedMagicLink:
        ({ email }) =>
        model => [
          model,
          [
            Command.mapMessage(
              Login.SendMagicLink({ email, redirectRoute: model.route }),
              message => GotLoginMessage({ message }),
            ),
          ],
        ],
    }),
  )
  ```

  After:

  ```ts
  const foldLoginOutMessage: (
    outMessage: Login.OutMessage,
    context: Update.FoldContext<Login.Message, Message>,
  ) => Update.Step<Model, Message> = (outMessage, { liftCommand }) =>
    M.value(outMessage).pipe(
      M.withReturnType<Update.Step<Model, Message>>(),
      M.tagsExhaustive({
        RequestedMagicLink:
          ({ email }) =>
          model => [
            model,
            [
              liftCommand(
                Login.SendMagicLink({ email, redirectRoute: model.route }),
              ),
            ],
          ],
      }),
    )
  ```

- dbacfa5: Add an optional `when` gate to `Subscription.lift`. It is a parent-side field on the parent's `lift` call and it receives the parent Model, so the parent holds the half of a condition the child cannot see, such as the route a page Submodel sits behind. The child neither declares nor sees the gate; it keeps holding its own half in `modelToDependencies`. Pass one predicate to gate every entry in the record, or a `Subscription.EntryGates` map keyed by entry name to gate entries individually, which leaves entries the map omits lifted ungated. A closed gate is a real teardown: the entry's Stream stops, and the child's `modelToDependencies` does not run again until the parent reopens the gate, so child state that changes behind a closed gate causes no restarts. Gating rewrites a gated entry's dependencies to `Subscription.GatedDependencies`, whose `maybeDependencies` is `None` while the gate is closed; a gated entry's `readDependencies` returns the last dependencies seen through an open gate. Ungated entries and lifts without `when` are unchanged. Lifts chain, so a record can pass through intermediate levels and pick up a gate at whichever level knows the condition.

  One predicate gates the whole record. The Settings page keeps declaring its own Subscriptions, and the parent adds the route condition the page cannot answer:

  ```ts
  const settingsSubscriptions = Subscription.lift(Settings.subscriptions)<
    Model,
    Message
  >({
    toChildModel: model => model.settings,
    toParentMessage: message => GotSettingsMessage({ message }),
    when: ({ route }) => route._tag === 'Settings',
  })
  ```

  A gate map names the entries to gate. The Room page holds a WebSocket stream that should outlive navigation and a keyboard listener that should not, so naming one entry gates it and leaves the other lifted ungated:

  ```ts
  const roomSubscriptions = Subscription.lift(Room.subscriptions)({
    toChildModel: (model: Model) => model.room,
    toParentMessage: (message: Room.Message): Message =>
      GotRoomMessage({ message }),
    when: { roomKeyboard: ({ route }) => route._tag === 'Room' },
  })
  ```

- dbacfa5: Add `Update.foldChildStep`, the `Update.foldChild` variant for a child entry point that takes nothing but the child Model, such as `Dialog.close` or a Submodel's `informRouteChanged` that derives everything from its own state. It returns the `Update.Step` itself rather than a dual `Update.Fold`, so the call site composes with `Update.combine` without inventing an input the child does not take. Reading, writing, Command lifting, the no-op on a `None` from `read`, and `foldOutMessage` all behave exactly as they do in `foldChild`, down to the optional second parameter `foldOutMessage` receives, an `Update.FoldContext` carrying `liftCommand` and `liftCommands` bound to the config's `toParentMessage`.

## 0.141.2

### Patch Changes

- 84050fc: Bump Effect to `4.0.0-beta.106` (from `4.0.0-beta.105`). Foldkit's peer dependencies now require `effect@4.0.0-beta.106` and `@effect/platform-browser@4.0.0-beta.106`.

  Pin your Effect packages to `4.0.0-beta.106` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.106 @effect/platform-browser@4.0.0-beta.106
  pnpm add -D @effect/vitest@4.0.0-beta.106
  ```

## 0.141.1

### Patch Changes

- 8d139ff: Document `createKeyedLazy`'s key contract. The TSDoc now states that a key should be the identifier that already gives the rendered thing its DOM identity, so the memo and the DOM invalidate together, and that entries are never evicted, so keys are expected to be bounded. For example: an entity registry, a route table, a fixed set of call sites. It also names the upgrade path for an unbounded key space, which is a variant that drops keys absent from the latest render pass rather than a cap on this one.
- dc6682f: Rename the `Update.foldChild` TSDoc example's step from `joinRoom` to `enterJoinedRoom` and the child helper it calls from `Room.join` to `Room.informJoined`. The step runs after the join has already succeeded, so the old names read as initiating a join the example is actually reporting.

## 0.141.0

### Minor Changes

- ea9c4f3: Add `Update.foldChild`, the update half of embedding a child Submodel. It takes the facts that vary per child (the child `update`, an `Option`-returning `read`, `write`, `toParentMessage`, and `foldOutMessage` for children that emit OutMessages) and returns a dual `Update.Fold`: call it data-first in a handler (`foldSearch(model, message)`) or data-last to build an `Update.Step` that composes with `Update.combine` (`foldSearch(message)`). When `read` returns `None` the fold is a no-op, so a Message for an unmounted child does nothing. A parent that is itself a Submodel adds `toParentOutMessage` to lift the child's OutMessage into its own; that fold returns `Update.ReturnWithOutMessage`, carrying the parent's OutMessage channel.

  Existing hand-rolled `Got*` handlers keep working unchanged. To adopt, a handler like this:

  ```ts
  GotSettingsMessage: ({ message }) => {
    const [nextSettings, commands] = Settings.update(model.settings, message)
    return [
      evo(model, { settings: () => nextSettings }),
      Command.mapMessages(commands, message => GotSettingsMessage({ message })),
    ]
  },
  ```

  becomes a module-scope fold and a one-line handler:

  ```ts
  const foldSettings = Update.foldChild({
    update: Settings.update,
    read: (model: Model) => Option.some(model.settings),
    write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
    toParentMessage: message => GotSettingsMessage({ message }),
  })

  GotSettingsMessage: ({ message }) => foldSettings(model, message),
  ```

  See the [Submodel docs](https://foldkit.dev/core/submodel#fold-child) for OutMessage folding and the call-site conventions.

### Patch Changes

- 35621da: Type `Command.mapEffect`, `Command.mapMessage`, and `Command.mapMessages` against `Command` in argument and result positions instead of structural command shapes. Inside a generic combinator the Message is an open type parameter, so `Command<Message>` stayed a deferred conditional that never unified with the structural shapes. A parent lifting a child Submodel's Commands, generic over the Message types, can now annotate arguments and returns as `Command.Command<Message>` directly:

  ```ts
  const liftCommands = <ChildMessage, ParentMessage>(
    commands: ReadonlyArray<Command.Command<ChildMessage>>,
    toParent: (message: ChildMessage) => ParentMessage,
  ): ReadonlyArray<Command.Command<ParentMessage>> =>
    Command.mapMessages(commands, toParent)
  ```

  Concrete call sites infer exactly as before.

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

- 23d9329: Add `Story.Command.resolveAllExact` and `Scene.Command.resolveAllExact` for asserting that every expected Command was dispatched while preserving the carry-forward behavior of `resolveAll`. Both batch resolver APIs now type-check each result Message against its Command, so previously accepted mismatched pairs must be corrected. Resolve `Dom.inertOthers` selectors after the pending render commits so portaled modal content remains interactive, and invalidate pending inert work when an overlay closes before that commit.
- 166c7ba: Add `Scene.contextMenu` so Scene tests can exercise `h.OnContextMenu` behavior with normal event bubbling.
- 7f7cd45: Make negated Scene property, state, accessible-name, and accessible-description assertions require their target element to exist. Use `toBeAbsent()` or `not.toExist()` when absence is the intended assertion.

  Accessible-name and accessible-description queries now exclude descendants hidden with `aria-hidden`, the `hidden` attribute, `display: none`, or `visibility: hidden`. Hidden elements directly referenced by `aria-labelledby` or `aria-describedby` continue to contribute their full subtree text.

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

- f314f3f: Update the counter example in the README to use `evo` instead of building the next Model by hand, matching the counter in `examples/counter` and every other counter across the docs.
- c947f47: Bump Effect to `4.0.0-beta.103` (from `4.0.0-beta.102`). Foldkit's peer dependencies now require `effect@4.0.0-beta.103` and `@effect/platform-browser@4.0.0-beta.103`.

  Pin your Effect packages to `4.0.0-beta.103` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.103 @effect/platform-browser@4.0.0-beta.103
  pnpm add -D @effect/vitest@4.0.0-beta.103
  ```

  `SchemaIssue.InvalidValue` dropped its `actual` argument in this Effect release and now takes annotations as its only argument. Decode failures for `CalendarDateFromIsoString` and `Url` are migrated to the new signature and carry their detail on the `message` annotation, which is the key the default formatter reads. Those two failures previously passed their detail as `description`, which the formatter ignored, so the messages now read as intended instead of falling back to a generic one. If you construct `SchemaIssue.InvalidValue` in your own schemas, drop the leading `Option` argument and move any detail to `message`.

## 0.138.0

### Minor Changes

- 72e8ea0: Let the `flags` Effect require services from the `resources` Layer.

  `flags` was typed `Effect<Flags>`, so an app whose flags and its Commands or Subscriptions needed the same service had to discharge the requirement inside `flags` with `Effect.provide(flags, AppLayer)` and pass the same `AppLayer` again as `resources`. Effect memoizes a Layer per build, and those are two builds, so the app silently got two instances of whatever the Layer holds. For a stateless Layer that is invisible. For one holding a socket, a connection, a cache, or a `Ref`, half the app talked to one instance and half to the other.

  `flags` now accepts `Effect<Flags, never, Resources>`, where `Resources` is what the `resources` Layer provides. The runtime resolves flags through the same cached build it gives Commands and Subscriptions, so the Layer is constructed once and shared. A requirement that `resources` does not provide is a compile error at the `makeApplication` and `makeElement` boundaries rather than a missing-service failure at runtime, whenever `Resources` is inferred from `resources` rather than named explicitly in the type arguments.

  The error channel stays `never`. Every other effectful boundary in the runtime pins it there too, including `resources` itself, Commands, and Subscription streams, and `flags` resolve before there is a Model or a Message channel to carry a failure. Handling errors inside `flags` with `Effect.catch` remains the contract.

  Existing call sites keep compiling unchanged: an `Effect<Flags>` requires nothing, and providing a Layer inside `flags` is still the right placement for a service used only at startup, such as `KeyValueStore` reading persisted state. Moving a shared Layer out of `flags` and into `resources` is what stops the second build, which is the point.

  Flags resolve before `init`, so an app that declares them builds the `resources` Layer at startup rather than on its first Command, whether or not the flags Effect touches it. A Layer that fails to build still reaches the crash view unless the flags Effect itself needs the broken service, in which case startup fails before the first render, where there is no Model to render a crash view against. Neither cause is swallowed, so a flags Effect that fails for its own unrelated reason stays visible alongside the build error.

- 23423bd: Element builders now take their children argument optionally. `h.div([h.Class('divider')])` and `h.div([h.Class('divider')], [])` build the same vnode, so an element with no children no longer needs a trailing empty array. Attributes stay required, so `h.div([])` remains the spelling for an element with neither. Void elements such as `img`, `input`, and `br` are unchanged and still accept attributes only. The scaffolded app's `AGENTS.md` teaches the shorter form.
- 08560ba: `Render.afterCommit` and `Render.afterPaint` now wait on a commit signal the runtime publishes, instead of counting animation frames. Frame counting only lined up with the patch while the runtime committed inside its own `requestAnimationFrame` callback, so a render that the runtime hands to `document.startViewTransition` resumed waiters against the pre-patch DOM. Every `Dom` helper gates on `afterCommit` internally, so this affects `focus`, `clickElement`, `scrollIntoView`, and the rest inside a transitioning frame. Signatures are unchanged: the signal is read through `Effect.serviceOption`, so neither primitive gains a requirement and Effects built outside a runtime keep the previous frame-counting behavior.
- 08560ba: Add a `viewTransition` option to `makeApplication` and `makeElement`. When the predicate matches a render, the runtime performs that render inside `document.startViewTransition`, so route changes and other Model-driven updates can animate with the View Transitions API, including shared-element morphs via `viewTransitionName` styles. A transition is between two states, so the predicate receives both: `previousModel` is the Model behind the DOM the browser is about to snapshot, `model` is the one the pending render will paint, and `message` is the Message that dirtied it. Comparing the two Models is how a predicate derives direction without keeping route history in the Model. It returns `false`, `true`, or `{ types }` to tag the transition for `:active-view-transition-type(...)` CSS scoping. Renders fall back to the plain synchronous path when the browser lacks the API, when `prefers-reduced-motion: reduce` is set, and for DevTools replay, crash, and initial renders. Defaults to `undefined`, so an application that does not pass a predicate animates nothing and the runtime resolves nothing about browser support.

### Patch Changes

- 399bddd: Document what `Dom.focus`'s commit gate does not cover.

  Waiting for the commit puts the element in the DOM. It does not make the element focusable, and `.focus()` is a no-op on an element that is not rendered. A target that something asynchronous reveals after the render commits, such as a panel held at `visibility: hidden` until a positioning library resolves its first layout, is still hidden when the Command runs, however long the Command waits. Focus a target like that from whatever performs the reveal.

- ea4161c: Stop an HMR reload from running the `flags` Effect when it restores a Model.

  Flags resolve before `init`, and the runtime resolved them ahead of the HMR restore decision. A reload that successfully restores a preserved Model skips `init` entirely, so the flags value was computed and then discarded. The resolution now sits behind that decision, so a restored Model never runs `flags` at all. A reload that cannot read the preserved Model still falls back to `init` and resolves them exactly as before.

  This shows up two ways on a restore, both development-only, because a production build has no HMR path. A `flags` Effect that performs a side effect of its own, seeding a store or writing a session id, no longer performs it on every reload. A `flags` Effect that requires services no longer forces the `resources` Layer to build, so a Layer holding a connection stops reconnecting on every save. Subscriptions whose pipelines run for the application's lifetime still build the Layer at startup either way.

## 0.137.0

### Patch Changes

- 1e3dcbe: Defer a Command's `execute` body until the runtime executes it.

  `Command.define` invoked the `execute` body as soon as update constructed the Command. Only the resulting Effect was deferred, so every expression the body evaluated on the way to returning that Effect ran immediately, inside a pure reducer.

  A body that reaches for a browser API therefore threw from update itself. `Popover.update` raised `ReferenceError: CSS is not defined` outside a browser, because `InertOthers` builds its selectors with `CSS.escape` and update constructs that Command unconditionally. It threw for a non-modal popover too, where the Command is built and then discarded. That made `@foldkit/ui` popovers, and the picker, combobox, menu, and date picker built on them, unusable in a headless Story even though no Effect ever ran.

  The body is now suspended, so constructing a Command runs none of it. No side effect the body performs and no exception it raises can reach update, a Command that update builds and discards runs nothing at all, and a throwing body surfaces as a contained Effect failure the runtime reports with the Message that caused it, rather than an exception escaping the reducer.

  This applies to Commands that declare `args`, on both the plain and the interruptible paths. A Command with no `args` already received `execute` as an Effect value and never had the problem. Interrupt keys are still derived at construction, so nothing about interrupt addressing changes.

  Thanks @artile for the report and the diagnosis.

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

### Minor Changes

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

- 2162bf2: Add `CustomElement.emit` for dispatching declared CustomEvents in a scene.

  A CustomElement converts declared CustomEvents into Messages through its `On*` event attributes, and those events had no entry point into a scene: interactions only cover the standard DOM event set. `CustomElement.emit(spec, target, eventName, detail)` dispatches a declared event on a rendered element, running the same event-to-Message mapping the browser event would. The event name and detail are typed by the spec's event Schemas, and a missing element or missing handler throws.

  ```ts
  scene(
    { update, view },
    given(initialModel),
    CustomElement.emit(
      hexColorPicker,
      selector('hex-color-picker'),
      'color-changed',
      { value: '#ff0000' },
    ),
    expect(role('status')).toHaveText('#ff0000'),
  )
  ```

- 2162bf2: Add `ManagedResource.acquire`, `ManagedResource.failAcquire`, and `ManagedResource.release`.

  A ManagedResource dispatches lifecycle Messages through its declared hooks (`onAcquired`, `onAcquireError`, `onReleased`), and those Messages had no entry point into a scene. The new steps declare the lifecycle outcome the way `Command.resolve` declares a Command result, feeding the hook's Message through update and re-rendering.

  Each step checks the current Model against the entry's `modelToMaybeRequirements` gate first, mirroring the runtime's `None` to `Some` and `Some` to `None` transitions: `acquire` and `failAcquire` throw unless the Model requests the resource, and `release` throws while it still does, so a scene must drive the Model transition through real steps before declaring the outcome. The runtime's `Some` to `Some` re-acquire transition (structurally changed requirements, which dispatches `onReleased` and then `onAcquired` while the Model still requests the resource) has no step yet.

  Unlike Commands and Mounts, these steps leave nothing pending: each dispatches its Message through update immediately, so there is nothing to resolve or acknowledge at the end of the scene. `acquire` takes exactly the arguments the entry's `onAcquired` declares: a handler that consumes the acquired value (what the entry's `acquire` Effect would have produced) requires it here, and a handler like `() => Connected()` that ignores the value takes none, so a test never fabricates a resource value nobody reads. Entries preserve the handler's type to make this work, so `ManagedResource.Entry` gained an `OnAcquired` type parameter (defaulted, so existing type annotations are unaffected).

  ```ts
  scene(
    { update, view },
    given(initialModel),
    click(role('button', { name: 'Open feed' })),
    ManagedResource.acquire(resources.feedSocket, { socketId: 'sock-1' }),
    expect(role('status')).toHaveText('Connected'),
    click(role('button', { name: 'Close feed' })),
    ManagedResource.release(resources.feedSocket),
    expect(role('status')).toHaveText('Disconnected'),
  )
  ```

- 2162bf2: Add `expectOutMessage` and `expectNoOutMessage`.

  `scene` already accepted a Submodel's three-tuple update and tracked its `Option<OutMessage>`, but asserting on it required `tap`. The new steps mirror `expectOutMessage` and `expectNoOutMessage`, failure messages included.

  ```ts
  scene(
    { update, view },
    given(initialModel),
    click(role('button', { name: 'Log out' })),
    expectOutMessage(RequestedLogout()),
    Subscription.emit(CompletedAction()),
    expectNoOutMessage(),
  )
  ```

  The tracked value is the third element of the most recent update result that had one. An update branch that returns a two-tuple leaves the previous value in place, so keep every branch of an OutMessage-returning update on the three-tuple shape, returning `Option.none()` when there is nothing to report.

- 2162bf2: Add `Subscription.emit` for driving a Message into a running scene.

  Messages whose real cause is a Subscription (a timer tick, a WebSocket frame, a global listener) had no entry point into a scene; every Message had to originate from a DOM event, a Command resolution, or a Mount result. `Subscription.emit(message)` feeds such a Message through update mid-chain and re-renders like any other step. It follows the existing cause-named step namespaces (`Command.*`, `Mount.*`). Do not reach for it when the Message has a DOM affordance; click the actual button instead.

  ```ts
  scene(
    { update, view },
    given(initialModel),
    expect(role('status')).toHaveText('count: 0'),
    Subscription.emit(Ticked()),
    expect(role('status')).toHaveText('count: 1'),
  )
  ```

  Like interactions, `emit` throws if unresolved Commands, unresolved Mounts, or unacknowledged unmounts are pending.

- 2162bf2: Add `withViewInputs` for testing Submodels that declare `ViewInputs`.

  A Submodel view that declares `ViewInputs` has a `(model, viewInputs, h)` signature, which does not match the `(model, h)` shape `scene` takes, so every such test hand-rolled the same wrapper. `withViewInputs(view, defaults)` captures it: `defaults` supplies the full `ViewInputs` once, and the returned factory takes per-test overrides for everything except `toView`, so tests vary value inputs while the renderer stays pinned.

  ```ts
  const sceneView = withViewInputs(Slider.view, {
    value: 5,
    toView: testToView,
  })

  scene(
    { update, view: sceneView() },
    given(model),
    expect(role('slider')).toHaveAttr('aria-valuenow', '5'),
  )

  scene(
    { update, view: sceneView({ isDisabled: true }) },
    given(model),
    expect(role('slider')).toHaveAttr('aria-disabled', 'true'),
  )
  ```

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

### Minor Changes

- 057981a: Add a batch form of Message dispatch to the DevTools MCP surface. The new `foldkit_dispatch_messages` tool dispatches an ordered list of 1 to 100 Messages in one call, removing the one-round-trip-per-Message cost of staging multi-Message fixtures. The runtime bridge validates the whole batch against the configured `Message` Schema before dispatching any of it, so one invalid entry rejects the batch with an error naming its zero-based position and nothing is dispatched. The response reports the predicted history index for each Message, mirroring `acceptedAtIndex` on single dispatch.
- 4090eb5: Add `lang` and `dir` to the view's `Document`, so an app that switches language at runtime can drive the `<html>` attributes from its Model. `Document` already carried `title`, `canonical`, and `ogUrl`, but the root element was the one piece of document state a view could not reach, because `<html>` sits outside the application container. Getting at it meant a Mount or a Command poking `document.documentElement`, the imperative escape hatch that `title` exists to avoid.

  `dir` is typed by a new `TextDirection` Schema exported from `foldkit/html`, covering `'Ltr' | 'Rtl' | 'Auto'`, which the runtime writes as the lowercase attribute values. It is a Schema rather than a bare type union so a Model that stores the direction can use it directly in an `S.Struct`, the same way `Canvas.LineCap` and `Canvas.TextAlign` already work.

  Both fields are optional and have no default: when a view omits one, the runtime does not touch that attribute, leaving whatever value it currently holds, so a view that never sets it leaves the served HTML in place and existing apps are unaffected. `makeElement` writes neither, matching how it already leaves the `<head>` alone. Note that the runtime can only sync after the first render, so the served HTML still decides what a crawler sees on first paint.

- af4ba0b: Breaking: give the short names in `Route.Transition` to the tag-taking helpers. `entered` and `exited` now take a route tag and return that route narrowed to it, the behavior previously spelled `enteredRoute` and `exitedRoute`. The forms that answer for whichever route a transition entered or left are now `enteredAny` and `exitedAny`.

  The tag-taking forms carry the common case: a transition helper is almost always asked about one named route, and the union-dispatch forms only come out when several routes have entry Commands. Every tag-taking helper is now the bare verb, so `entered`, `exited`, and `stayed` read the same and take the same arguments. `stayed` is unchanged and gains no `stayedAny` counterpart: without a tag its two sides could not narrow to the same route variant together, so matching on one would leave the other typed as the whole union.

  Migration is a rename at each call site:

  ```ts
  // Before
  Transition.enteredRoute(transition, 'Person')
  Transition.exitedRoute(transition, 'Person')
  Transition.entered(transition)
  Transition.exited(transition)

  // After
  Transition.entered(transition, 'Person')
  Transition.exited(transition, 'Person')
  Transition.enteredAny(transition)
  Transition.exitedAny(transition)
  ```

  The names `Transition.entered` and `Transition.exited` survive the rename with new meanings, but an unmigrated call cannot pass silently: the tag-taking forms require a second argument, so an old one-argument call fails to compile. `stayed`, `isEntering`, `make`, `coldLoad`, and the `Transition` type are unchanged.

### Patch Changes

- c79a935: Explain why a Message could not cross a Submodel boundary.

  A wrapper Message is normally a Schema constructor, so handing it a Message outside the child's union throws a Schema error naming the two shapes and nothing else. That error fires inside a DOM listener, the app keeps rendering, and reading it requires already knowing that a boundary sits between the handler and `update`, which makes a real bug look like noise.

  The boundary now catches that rejection and reframes it, naming the boundary, the Message, and the cause that accounts for almost every occurrence: a shared view helper building an app-level Message inside a Submodel's view, where a handler's dispatcher is chosen by the frame it is built in rather than by the Message it carries. The original rejection is preserved as `cause`.

- d16d7f7: Bump Effect to `4.0.0-beta.102` (from `4.0.0-beta.101`). Foldkit's peer dependencies now require `effect@4.0.0-beta.102` and `@effect/platform-browser@4.0.0-beta.102`.

  Pin your Effect packages to `4.0.0-beta.102` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.102 @effect/platform-browser@4.0.0-beta.102
  pnpm add -D @effect/vitest@4.0.0-beta.102
  ```

- 477db0e: Bring the `foldkit` package README in line with the repository README. The npm-facing copy had drifted: it still named ESLint instead of Oxlint in the `create-foldkit-app` description, kept the superseded intro sections, carried a stale Counter snippet, listed feature and example entries that no longer match what ships, and omitted Embedding and the Discord link. The feature and example lists are now the pared-down versions, the Counter snippet matches `examples/counter`, and the prose drops the em dashes. Documentation only, no API changes.

## 0.132.0

### Minor Changes

- 2a3a331: `Story.Command.resolve` and `Scene.Command.resolve` now accept a bare name-keyed interruptible Command definition, the with-args `Command.Interruptible.define` shape that omits `toKey`. The definition overload already accepted the no-args and keyed with-args shapes, but the name-keyed shape was missing from its union, so resolving one by its definition failed to typecheck and forced a resolve-by-instance workaround. Runtime matching was name-only all along, so this closes a type-level gap.

### Patch Changes

- 95118d8: Bump Effect to `4.0.0-beta.101` (from `4.0.0-beta.97`). Foldkit's peer dependencies now require `effect@4.0.0-beta.101` and `@effect/platform-browser@4.0.0-beta.101`.

  Pin your Effect packages to `4.0.0-beta.101` to match. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.101 @effect/platform-browser@4.0.0-beta.101
  pnpm add -D @effect/vitest@4.0.0-beta.101
  ```

## 0.131.0

### Minor Changes

- 79be223: `Command.Interruptible.define` now accepts an optional `toKey` on the with-args form. Omit it when at most one invocation is meaningfully in flight, and the key is the Command name, exactly like the no-args form, with `Interrupt` taking only `toMessage`. This drops the empty `{}` key args a single-instance submit flow was forced to pass. Provide `toKey`, derived from the owning Model identity, when invocations run concurrently and must be interrupted independently.
- d5fc8b8: `Machine` in `foldkit/experimental/machine` now threads a requirements type parameter `R` through `define`, `to`, `when`, and the transition result types, so an edge Command whose Effect needs a service (an RPC client or anything Layer-provided) typechecks instead of being rejected against a `never` requirements channel. `R` defaults to `never` and is inferred from the table when every edge Command shares one service. When edges need distinct services, supply the union on the second call: `define(schemas)<UploadsClient | SaveClient>({ ... })`.
- 09ce86c: `Story.Command.resolve` and `Scene.Command.resolve` now accept a bare interruptible Command definition (from `Command.Interruptible.define`), matching it by name the way their `expectHas` and `expectExact` counterparts already do. Previously the definition overload only accepted plain `Command.define` definitions, so resolving an interruptible Command by its definition failed to typecheck and forced a resolve-by-instance workaround.

## 0.130.0

### Minor Changes

- 36ae509: Automatic branch identity through an owned differ and view-function branding.

  Foldkit now ships its own differ, forked from snabbdom 3.6.3, with two independent identity axes on every vnode. `key` keeps its one job, matching siblings in dynamic lists. A new framework-managed `identity` field joins the differ's compatibility check exactly where the selector is consulted: when the identity differs, the node is replaced instead of patched, so DOM state (focus, scroll, uncontrolled input values, an open `details` element) no longer bleeds across a logical identity change. Identity never enters the keyed index, and duplicate identities among siblings are harmless because the compatibility check only ever matches compatible vnodes. An explicit key does not override identity: two different view functions sharing a key replace, matching React, where a keyed element of a different component type remounts.

  The Vite plugin brands every function return in application modules with that function's id (module path plus function name) when the returned value is a vnode with no identity yet. Identity therefore attaches at view-function boundaries, where provenance exists at runtime, and never depends on branch syntax: if/else, switch, Effect Match, and ts-pattern all behave identically. Match arms written as inline handlers are covered too, because each handler is its own function. The remaining manual rules are the ones only your data can provide: key dynamic list items by a stable Model identifier, and extract a same-tag inline ternary into named view functions when you want an identity boundary, exactly as in React.

  Builds without the plugin keep the previous positional-plus-key semantics. `create-foldkit-app` ships the plugin by default. The `snabbdom` dependency is gone; the vendored fork lives inside foldkit with its functional changes documented, and a new dependency-free `foldkit/brand` entry hosts the branding helper the plugin injects.

  `@foldkit/ui` and `@foldkit/devtools` now brand their own compiled output at package build time, so their internals carry view-function identity even in consumer apps, where prebuilt dist loads from node_modules beyond the Vite transform's reach. The transform skips already-branded modules. With identity in place everywhere the plugin or the build step reaches, redundant manual branch keys are removed across ui, devtools, the examples, the website, typing-game, and the starter template; the keys that remain are data-borne list and instance keys, which stay yours to write.

  Upgrading an existing app: build with `@foldkit/vite-plugin` (every `create-foldkit-app` project already does; without the plugin everything keeps the previous positional-plus-key behavior, so upgrading is safe either way). Existing manual branch keys and the wrapper elements that exist only to carry them are now redundant and can be deleted whenever convenient. One behavior change to check: a shared key no longer makes two different view functions patch into each other at the same position; they replace, matching React's remount on a changed component type, so if you relied on that continuity, render both states through one view function. `foldkit()` now returns an array of plugins, which `plugins: [foldkit()]` already handles because Vite flattens nested plugin arrays.

  Two kinds of keys stay, and both carry a fact only your data knows. Mapped list items: rows built by one view function are identical to the differ, so key each by its id, `entries.map(entry => h.keyed('li')(entry.id, [], [...]))`, and reordering moves DOM instead of rewriting row contents. And the same situation stretched over time: a detail page renders every article through one `articlePageView(article)` call at the same position, so without a key navigating from one article to the next patches the old page's DOM, scroll position included, into the new one; key the root by what it is showing, `h.keyed('article')(article.slug, ...)`. The keying guide on the website shows both.

- 2b788f2: The dispatch and render hot path now runs as plain JavaScript. A dispatched Message is processed synchronously on the dispatching stack, and render frames are scheduled directly with requestAnimationFrame instead of through a fiber-driven render loop, so the per-Message fiber hops and their scheduler overhead are gone. Commands, Subscriptions, DevTools, HMR, and crash handling still run through Effect. The html factory also allocates less per element: attribute handlers write single props, attrs, and event listeners directly into vnode data, class strings parse once into a cached class object shared across renders, and keyed elements set their key directly instead of routing through an intermediate Key attribute.

  The owned differ now skips reference-identical VNodes and empty child lists, trims reference-identical prefixes and suffixes before entering the keyed diff, and uses VNode data masks to run only the snabbdom modules relevant to the old or new node. Its keyed index handles every PropertyKey safely, including names inherited from Object.prototype. Generic VNodes without a mask retain the previous all-module behavior. Page-level renders retain their canonical and og:url elements across frames and update metadata attributes only when their values change, avoiding repeated head queries and writes.

  Message processing semantics are now explicit and pinned by tests: Messages are processed in arrival order, update runs before dispatch returns, Command results always arrive asynchronously, Messages dispatched while a render frame's patch is on the stack (an OnUnmount destroy hook, a Mount emission) are buffered and processed when the frame commits, and Messages dispatched after a crash or after runtime disposal are dropped. Arrival order is absolute where the old queue's was not: it reordered user input ahead of Command results when both landed in one batch, so input dispatched behind an over-budget deferred backlog now waits for that backlog instead of jumping it. dispatchAsync completes after its Message is processed in the common case; while boot is still buffering, a render frame is patching, or an over-budget burst has deferred the drain, it completes after enqueueing, which is what the old queue always did. Renders still coalesce to one per animation frame. A synchronous burst that holds the stack past a 5ms budget defers its remaining Messages to a new task so the page keeps painting.

- e093f9b: `h.keyed` and `createKeyedLazy` now accept any `PropertyKey`, so numeric and symbol Model identifiers no longer need conversion to strings before keyed rendering.

### Patch Changes

- 41057af: Fix two crash-handling gaps in the runtime. A Command forked by a Message processed on the same synchronous stack just before a crash no longer runs its effect behind the crash view: the deferred fork now checks the crash flag as well as the disposal flag, so a side effect never executes once the crash view is shown. A defect in a ManagedResource's `modelToMaybeRequirements` or its equivalence now surfaces as the crash view instead of dying silently in a detached fiber, matching how Subscriptions already handle the same failure.

## 0.129.0

### Minor Changes

- 15241c8: Add interruptible Commands. `Command.Interruptible.define` declares a Command whose invocations register under a key in the runtime's interrupt registry for the duration of their Effect. The key function is stated once at the definition and maps the args to whatever distinguishes invocations; Foldkit prefixes the Command name automatically, so keys never collide across definitions, and a Command with no declared args uses the Command name as its key. A key is an address, not a lock: any number of invocations may run under one key, and dispatching never interrupts anything. The returned Definition carries an `Interrupt` constructor that builds an ordinary Command to stop every current holder of the key, producing a Message from an `Interruptible.Outcome`: `Interrupted` when at least one holder was stopped (the stopped holders' result Messages are guaranteed never to dispatch) or `NotFound` when nothing held the key. To dispatch a replacement after cancelling, sequence through the Interrupt's result Message; Commands in one batch have no execution-order guarantee. Story and Scene understand the semantics: keyed Commands may stay pending across Messages, and resolving an Interrupt drops every pending Command under its key.

### Patch Changes

- 0027bb0: Allow Interrupt Commands to stay pending across Messages in Story and Scene, matching the existing exemption for keyed Commands. A story can now keep sending Messages (for example further keystrokes) while a cancellation is in flight, resolving the Interrupt when the test is ready. Interrupt Commands must still be resolved by the end of the test.

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

- a25f769: `Command.mapMessage` / `Command.mapMessages` now record their message mapping on the Command as recoverable metadata, in addition to fusing it into the Effect as before. Production dispatch is unchanged, but the Story and Scene test layers can now replay a Command's own wrapping when you resolve it. Scene mounts get the parallel treatment: a mount rendered inside an `h.submodel` boundary snapshots that boundary's `toParentMessage` lift at render time, so `Scene.Mount.resolve` can replay it too.

  BREAKING: the third `toParentMessage` argument to `Story.Command.resolve` / `Story.Command.resolveAll`, their `Scene` equivalents, and `Scene.Mount.resolve` / `Scene.Mount.resolveAll` is removed. Resolve a Command or mount with the child's raw result Message and the parent's own wrapping (a Command's `Command.mapMessages`, or a mount's Submodel-boundary lift) is replayed for you, so a test no longer restates the wrapping by hand. Migrate `resolve(Def, result, message => GotChildMessage({ message }))` to `resolve(Def, result)`, and the analogous `resolveAll` tuples from `[Def, result, mapper]` to `[Def, result]`.

- 8dd1906: Add the `OnKeyDownFocus` HTML attribute. On a handled key it synchronously focuses the element matching a computed `focusSelector` and dispatches a Message, both inside the originating event handler; unhandled keys return `Option.none()` and keep default behavior. It is the keyboard companion to `OnClickFocus`, letting roving-tabindex widgets (radio groups, toolbars) move DOM focus onto the newly-active option from their own view handlers, so focus never has to travel through the parent's `update` as a command.
- 426b4a3: Add an experimental state machine module at `foldkit/experimental/machine`. The declarative transition table compiles to a plain transition function. Edge `build` and `commands` callbacks receive a single `{ state, message, guardValue }` input, so call sites destructure only what they use. A `when` guard either resolves the state and Message to an `Option` value that flows to its Edge as `guardValue`, or returns a plain boolean when there is nothing to extract. A new Checkout Machine example demonstrates guarded branches and edge Commands.
- 95ff403: Rename `AsyncData.matchDataSplit` to `AsyncData.matchDataSplitEmpty`. This is a breaking rename. The new name says what the variant splits: the `onEmpty` channel that `matchData` collapses is broken back into `onIdle` and `onLoading`. Behavior and handler shape are unchanged; update call sites from `AsyncData.matchDataSplit(...)` to `AsyncData.matchDataSplitEmpty(...)`.
- 1785aa3: Add `restString`, a terminal catch-all route param that captures the raw remaining URL path, slashes and dots included, as a single `string` and round-trips bidirectionally: `/vault/a/b/c.md` parses into `{ path: 'a/b/c.md' }` and builds back from it. Where `rest` yields a `NonEmptyArray` of segments, `restString` rejoins the tail into one path string, so file-tree and docs routes can carry a repository-relative path as `{ path: S.String }` route data. Printing requires a normalized path, non-empty with no leading, trailing, or repeated slashes; any other value would build a URL that parses back differently, so printing fails with a `ParseError` instead. Exported from `foldkit/route`.
- 9b6d47a: Move route transitions into a `Transition` namespace on `foldkit/route` and add constructors.

  `Transition.make(previousRoute, nextRoute)` builds the transition for an in-app navigation, and `Transition.coldLoad(nextRoute)` builds the cold load case, so applications no longer construct the record and its `Option` by hand.

  `Transition.entered` returns the route a transition entered as an `Option`: `Some(nextRoute)` on a tag change or a cold load, `None` for navigation within one route. Applications with entry Commands on several routes match on it once instead of stacking predicates, and `isEntering` is now defined in terms of it.

  Breaking: `Route.isEntering` is now `Transition.isEntering` and takes the transition data-first, and the `RouteTransition` type is now `Transition.Transition`. Before:

  ```ts
  import { Route } from 'foldkit'

  const isEntering = Route.isEntering<AppRoute>
  isEntering('Gallery')(transition)
  type AppTransition = Route.RouteTransition<AppRoute>
  ```

  After:

  ```ts
  import { Transition } from 'foldkit/route'

  Transition.isEntering(transition, 'Gallery')
  type AppTransition = Transition.Transition<AppRoute>
  ```

  The namespace also hangs off the `Route` export, so `Route.Transition.isEntering` works without the subpath import.

- 0029a3d: Complete the `Transition` vocabulary with `enteredRoute`, `exited`, `exitedRoute`, and `stayed`.

  `Transition.enteredRoute(transition, tag)` and `Transition.exitedRoute(transition, tag)` are the single-route, payload-carrying forms of `entered` and `exited`: they return the entered or exited route narrowed to the given tag, so an entry Command for a detail route gets its payload typed without a full match.

  `Transition.exited(transition)` mirrors `entered`: `Some(previousRoute)` when the transition left a route, `None` on a cold load or within-route navigation. It is for one-shot Commands on the way out, like saving a draft. Things that live while a route is active still belong to a Subscription or ManagedResource condition on the Model.

  `Transition.stayed(transition, tag)` returns both sides of a within-route navigation, narrowed to the tag: `Some({ previousRoute, nextRoute })` when the transition stayed on that route, `None` when it entered it, left it, or never touched it. For reacting to payload changes within one route when the previous value matters.

  `Transition.isEntering(transition, tag)` is the boolean view of `enteredRoute`. Every tag-taking helper infers the route union from the transition argument, so the tag is checked against the union's tags with no pinned alias anywhere. The migration from the released curried `Route.isEntering` is covered by the Transition namespace changeset.

### Patch Changes

- f7c4f17: Update the `Reflect2` TSDoc example and the README description of `@foldkit/ui` for parent-owned component values: stateful components own their interaction state while the parent Model owns the value, which flows in through view inputs and out through OutMessages. Docs only, no behavior change. Part of #676.
- 9d09804: Update the `Submodel.Reflect` TSDoc example to use `Slider.reflectRange`. The previous example referenced the Listbox's `reflectSelectedItem`, which `@foldkit/ui` removed when the Listbox selection moved to the parent Model. Docs only, no runtime change.

  Part of #676.

- 9fe90d6: Refresh the Submodel child-attribute example to use a neutral CommandMenu child and pass child-published slot data to the parent slot instead of reading inside the child Model.

## 0.127.0

### Minor Changes

- 3baed16: Add `AsyncData.loadIfMissing`, the load-only sibling of `revalidateOrLoad` and `revalidate`. The cold no-data states (`Idle`, `Failure`) start a fresh `Loading`; every other state yields `None`, so loaded data is kept without revalidation and a request in flight is not restarted. It is the state-machine form of TanStack Query's `staleTime: Infinity`: fetch on first visit, keep the cache afterwards.

## 0.126.0

### Minor Changes

- b5cbaec: Add `foldkit/http`, a Fetch-backed `HttpClient` Layer with trace header propagation disabled by default.

  Effect's `HttpClient` records an `http.client` span for every request and, by default, writes that span's context onto the request as `traceparent` and `b3` headers. That default is tuned for servers, where propagating trace context to your own downstream services is desirable. In a browser the same headers make otherwise CORS-simple requests trigger preflights against plain APIs and dev proxies, so providing `FetchHttpClient.layer` directly meant every HTTP Command hit this footgun. Foldkit apps are browser apps, and `Http.layer` ships the browser-correct default:

  ```ts
  import { Http } from 'foldkit'

  const FetchCount = Command.define(
    'FetchCount',
    SucceededFetchCount,
    FailedFetchCount,
  )(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const response = yield* client.get('/api/count')
      const { count } = yield* S.decodeUnknownEffect(CountResponse)(
        yield* response.json,
      )
      return SucceededFetchCount({ count })
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(FailedFetchCount({ error: 'Request failed' })),
      ),
      Effect.provide(Http.layer),
    ),
  )
  ```

  Local observability is unaffected: the `http.client` span with method, URL, and status attributes is still recorded, nesting under the runtime's Command span. Apps doing distributed tracing can re-enable propagation per Command with `Effect.provideService(HttpClient.TracerPropagationEnabled, true)`, or keep using `FetchHttpClient.layer` from Effect directly.

- 746d80c: Remove `Update.noOp`.

  It only wrapped `[model, []]`, the update return with an empty Command batch. The tuple is already the clearest form and stays edit-stable when a branch later gains a Command (you just fill the empty slot), so the wrapper did not earn its keep. Return `[model, []]` directly.

## 0.125.0

### Minor Changes

- 7ccca96: Add a `preserveScroll` option to `makeApplication` that retains the window scroll position across Vite HMR reloads. Every edit triggers a full page reload, which resets scroll to the top; Foldkit now captures `window.scrollX`/`scrollY` just before the reload and reapplies it once the restored view has rendered, so editing a page you have scrolled deep into no longer bounces you back to the top on every save.

  Defaults to `true` and, like `freezeModel`, activates only under Vite HMR, so production builds pay nothing. It applies to document-owning apps built with `makeApplication`; embedded `makeElement` apps never touch the host page's scroll. Pass `preserveScroll: false` to opt out. Only the window scroll offset is preserved; nested `overflow` container positions are not. The offset is reapplied as soon as the restored view renders, so a page whose full height settles only after asynchronous layout, such as images without set dimensions or media that loads in below the fold, can land short of a deep offset.

- 7b2850d: Add the `Update` module and supporting cache helpers.

  `foldkit/update` provides `combine`, which folds a list of update steps into one and concatenates their Commands in order, and `refresh`, which revalidates a single AsyncData cache field and emits its load Command only when the entry should transition. It also exports `noOp` and the `Commands`, `Return`, `ReturnWithOutMessage`, `Step`, and `Refreshable` type aliases. `combine` is dual: call it data-first as `combine(model, steps)` to run the steps now, or data-last as `combine(steps)` for a composable `Step`.

  `AsyncData.fromOptionOrIdle` collapses an `Option<AsyncData>` to an `AsyncData`, mapping `None` to `Idle`, for reading a keyed cache where an absent key means nothing was requested yet.

  `Route.isEntering` and the `RouteTransition` type describe a route change and test whether it entered a given route, so navigation and `init` can share one load-on-entry policy.

## 0.124.0

## 0.123.0

## 0.122.1

### Patch Changes

- ca64832: Typecheck test files. Each package's `typecheck` script now checks the project that includes tests instead of the build project that excludes them. No runtime changes.

## 0.122.0

### Minor Changes

- 71f5be7: Add `foldkit/asyncData`, a first-class six-state value type for
  asynchronously loaded data, in the spirit of Effect's `Option` and
  `Result`. It is the RemoteData pattern from Elm, generalized with
  refresh-aware states.

  The union is `Idle | Loading | Refreshing({ data }) | Failure({ error }) |
Stale({ error, data }) | Success({ data })`: `Refreshing` carries the
  previous good data through a reload and `Stale` carries it through a failed
  reload, so stale-while-revalidate and keep-stale-on-failure are both
  type-level states. `AsyncData.Schema(dataSchema, errorSchema)` builds the
  Union codec to embed in a Model (including inside `S.HashMap` caches), and
  the namespace ships free, pipe-friendly dual combinators: `match`, the
  `matchData` and `matchDataSplit` view collapses, `map`, `mapError`,
  `mapBoth`, `flatMap`, getters and predicates, `orElse`, the
  `revalidateOrLoad` and `revalidate` revalidation transitions, the
  `zipWith` and `all` combinators for combining several values under one
  precedence rule, and the previous-state-aware `settle` that folds a
  fetch's settled `Result` back into the Model, keeping last-good data as
  `Stale` on failure.

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

- 8dc4584: Add `Subscription.fromEventFilterMap`, a filtered variant of `fromEvent` whose mapper returns `Option<Message>` so a listener can ignore events while still calling `preventDefault()` synchronously.
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

- 3359556: Add `Subscription.fromEvent` to `foldkit`. It builds a Stream around a DOM
  event source, registering the listener with `addEventListener` when the
  Stream's scope opens and removing it when the scope closes. The
  `addEventListener` call happens inside the acquire Effect and the matching
  `removeEventListener` is registered only after acquire completes, so the
  listener never leaks on interruption. Pass the `target` directly for
  always-present globals like `window` or `document`, or as a thunk when it may
  not exist until the scope opens. The `toMessage` mapper runs synchronously in
  the browser's event dispatch, so `event.preventDefault()` works. Wrap the
  result in `Stream.when` inside a `Subscription.make` entry to gate it on a
  Model condition, or pass it to `Subscription.persistent` for a record-lifetime
  listener.
- b4e0475: Add named attribute builders for a broad set of SVG attributes that previously
  worked only through `h.Attribute('text-anchor', 'middle')`. You can now write
  `h.TextAnchor('middle')` and reach for the same named builders across text
  positioning (`Dx`, `Dy`, `Rotate`, `TextAnchor`, `DominantBaseline`,
  `AlignmentBaseline`, `BaselineShift`), text metrics and style (`TextLength`,
  `LengthAdjust`, `FontFamily`, `FontSize`, `FontWeight`, `FontStyle`,
  `LetterSpacing`, `WordSpacing`, `TextDecoration`, `WritingMode`), geometry
  (`Rx`, `Ry`, `PathLength`), paint (`FillOpacity`, `StrokeOpacity`,
  `StrokeMiterlimit`, `PaintOrder`, `VectorEffect`, `Color`), visibility
  (`Visibility`, `Display`, `Overflow`, `PointerEvents`, `Cursor`), rendering
  hints (`ShapeRendering`, `TextRendering`, `ImageRendering`), clip, mask, and
  filter (`ClipPath`, `Mask`, `Filter`, `ClipPathUnits`, `MaskUnits`,
  `MaskContentUnits`, `FilterUnits`, `PrimitiveUnits`), gradients (`Offset`,
  `StopColor`, `StopOpacity`, `GradientUnits`, `GradientTransform`,
  `SpreadMethod`, `Fx`, `Fy`, `Fr`), patterns (`PatternUnits`,
  `PatternContentUnits`, `PatternTransform`), markers (`MarkerStart`,
  `MarkerMid`, `MarkerEnd`, `MarkerWidth`, `MarkerHeight`, `MarkerUnits`,
  `RefX`, `RefY`, `Orient`), and `PreserveAspectRatio`. Any attribute not in this
  set stays available through `h.Attribute`.

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

### Patch Changes

- 1f92bb7: Add a v8 coverage provider and wire coverage into the `test` script with baseline thresholds. Coverage now runs in CI and the pre-push hook through the existing `pnpm test` path, so a drop below the baseline fails the build. Thresholds sit a few points under the current numbers to leave headroom for normal run-to-run variance, and ratchet up as coverage improves.

## 0.118.0

### Minor Changes

- 723f686: Add `schemaSegment` to `foldkit/route`. It captures a URL segment and decodes it
  through an Effect `Schema`, so the route value carries the schema's decoded type
  rather than a bare `string` or `number`. Branded ids, refined strings, and
  string-literal unions round-trip: `schemaSegment` decodes when parsing a URL and
  encodes when building one. The schema's encoded form must be a single segment
  string. Use `rest` for values that span multiple segments and `query` for values
  in the query string.
- 0924912: Add a `when` option to `Dom.scrollIntoViewIfNotVisible`. It selects the timing
  gate: `'Paint'` (the default) waits for `Render.afterPaint` and keeps the
  existing behavior, while `'Commit'` waits for `Render.afterCommit` so the
  scroll lands in the same frame the DOM patch applies, before the browser
  paints. Use `'Commit'` when the target is brought into view and scrolled by
  the same Message, such as a menu opening, so it appears already scrolled
  rather than visibly jumping.

## 0.117.0

### Minor Changes

- 1795e0e: Bump Effect to `4.0.0-beta.88` (from `4.0.0-beta.83`). Foldkit's peer dependencies now require `effect@4.0.0-beta.88` and `@effect/platform-browser@4.0.0-beta.88`.

  Consumers should align their Effect packages to `4.0.0-beta.88` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.88 @effect/platform-browser@4.0.0-beta.88
  pnpm add -D @effect/vitest@4.0.0-beta.88
  ```

## 0.116.0

### Minor Changes

- f4e5826: Add `Dom.scrollIntoViewIfNotVisible`: scroll an element into view only when it
  is not already fully visible within its nearest scroll container. Defaults to
  `block: 'center'` when a scroll is needed.

## 0.115.0

### Minor Changes

- 656f814: Thread the resource value type through `ManagedResource.make`. The value a resource holds is now inferred from the `resource` tag and used to type `acquire`'s result, `release`, and `onAcquired`, so a mismatch between what `acquire` produces and what the tag's `.get` yields is caught at compile time instead of passing as `any`.
- b02a58d: Replace `slowView` with a unified `slow` runtime config that measures four synchronous phases of the update cycle: `Update`, `View`, `Patch`, and `SubscriptionDependencies`. **Breaking change:** the `slowView` config field and `SlowViewConfig` type are removed. Use `slow.measuredPhases`, `slow.thresholdOverrides`, and `slow.onSlow` to configure slow warnings.

  The new Slow Warnings example app intentionally pushes each phase past its default threshold and displays the resulting slow-context payloads in the UI.

  ```ts
  import { Runtime } from 'foldkit'

  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container: document.getElementById('root'),
    slow: {
      show: 'Always',
      onSlow: context => {
        console.warn(
          `[foldkit slow] ${context._tag} ${context.durationMs.toFixed(1)}ms`,
          context,
        )
      },
      thresholdOverrides: {
        Update: 4,
        View: 12,
        Patch: 8,
        SubscriptionDependencies: 1,
      },
    },
  })
  ```

  If you omit `slow`, Foldkit enables all four phases in development with their default thresholds. Pass `slow: false` to disable every phase at once.

  If you pass a `slow` object, Foldkit still measures all phases by default. Use `measuredPhases` to choose which phases are measured and `thresholdOverrides` to replace specific default budgets. Omitted threshold override fields keep Foldkit defaults, so `slow: { onSlow }` measures every phase with default thresholds and a custom callback. `slow: { measuredPhases: ['View'] }` measures only view construction. `thresholdOverrides` entries for unmeasured phases are ignored.

  The four phases:

  - **`View`** measures the time to build the next VNode tree. Default budget `16ms`. The remediation hint points at keeping render-only work in the view path and memoizing expensive subtrees with `createLazy` / `createKeyedLazy`.
  - **`Update`** measures the synchronous reducer call. Default budget `4ms`. The remediation hint points at the triggering Message branch, moving render-only derivations to memoized views, and keeping update focused on state transitions.
  - **`Patch`** measures the VNode diff and DOM mutation. Default budget `8ms`. The remediation hint points at keying mapped lists by stable domain identity, never by array position, splitting large views, and `createLazy`.
  - **`SubscriptionDependencies`** measures `modelToDependencies` per subscription on every Model change. Default budget `2ms` per subscription. The context carries a `subscriptionKey` for attribution, and the remediation hint points at keeping `modelToDependencies` a cheap projection from modeled fields.

  The single top-level `onSlow` callback receives a tagged `SlowContext<Model, Message>` union (`_tag: 'View' | 'Update' | 'Patch' | 'SubscriptionDependencies'`). Discriminate on `_tag` to route per phase. TypeScript narrows the rest of the context automatically. Passing `onSlow` replaces Foldkit's default `console.warn` sink for every measured phase; Foldkit will not also warn for tags your callback ignores.

  `Runtime.defaultSlowCallback` is now exported. Call it inside a custom `onSlow` to keep the default console output while adding your own behavior:

  ```ts
  slow: {
    onSlow: context => {
      Runtime.defaultSlowCallback(context)
      myTelemetrySink(context)
    },
  }
  ```

  Slow view and patch warnings are silenced during DevTools time-travel replays so the parked-thread time during inspection doesn't trigger spurious warnings attributed to "init". Update and subscription dependency extraction are unaffected by replay by construction.

  Default thresholds are intentionally generous. Treat warnings as signals to investigate, not problems to silence: confirm with a profiler before optimizing, prefer clear code, and don't add a `createLazy` without a measurable improvement.

  Migration from the old `slowView`:

  ```ts
  // Before
  slowView: {
    thresholdMs: 50,
  }

  // After
  slow: {
    thresholdOverrides: { View: 50 },
  }
  ```

  That migration keeps the new default Update, Patch, and SubscriptionDependencies warnings enabled while overriding the View threshold.

  If the old `slowView` config also routed warnings to a custom sink, pass an `onSlow` callback that handles every measured phase you care about:

  ```ts
  // Before
  slowView: {
    thresholdMs: 50,
    onSlowView: context => log(context),
  }

  // After
  slow: {
    thresholdOverrides: { View: 50 },
    onSlow: context => {
      if (context._tag === 'View') {
        log(context)
      } else {
        console.warn('[foldkit slow]', context)
      }
    },
  }
  ```

  If you intentionally want the old view-only diagnostic surface, select that phase explicitly:

  ```ts
  slow: {
    measuredPhases: ['View'],
    thresholdOverrides: { View: 50 },
    onSlow: context => {
      if (context._tag === 'View') {
        log(context)
      }
    },
  }
  ```

  If you previously disabled the warning entirely with `slowView: false`, the equivalent kill switch is `slow: false`:

  ```ts
  // Before
  slowView: false

  // After
  slow: false
  ```

- 51c7406: Provide the resource-lifetime `Scope` to a Managed Resource's `acquire`. The `acquire` callback now runs with `Scope.Scope` in its context, the same scope the runtime closes on release or re-acquire. This lets `acquire` build an Effect `Layer` with `Layer.build` or register finalizers with `Effect.addFinalizer` whose teardown is tied to the resource lifecycle, so the tag can hold the bare service value with no wrapper and `release` can be `() => Effect.void`. The explicit `release` callback still runs before the scope finalizers, matching the last-in-first-out order Effect uses for any scope. Existing resources that do not use the scope are unaffected.

### Patch Changes

- 942a0f6: Remove the unused `clsx` dependency from the published package.

## 0.114.1

### Patch Changes

- 4f637ea: Clone any reused `VNode` object the runtime encounters before patching, so a
  view fragment held as a shared `const` no longer corrupts diffing. Snabbdom
  records each element's live DOM node by mutating `vnode.elm` in place and
  assumes one `VNode` object per tree position. A module- or closure-level
  constant (`const icon = h.span(...)`) re-enters the next render still carrying
  the `.elm` snabbdom set last time; when its position shifts toward an earlier
  sibling, the new slot is patched before the old one is removed, so the removal
  deletes the freshly placed node and the element appears stuck on its previous
  row. `dedupeSharedVNodes` now freshens any `VNode` arriving with an `.elm`
  already set, in addition to the within-render duplicates it already handled.
  `createLazy` and `createKeyedLazy` results are exempt, since they return the
  same object by reference on purpose and rely on snabbdom's same-vnode
  short-circuit, as do `createLazy`/`createKeyedLazy` views embedded through
  `h.submodel`, so memoization still composes across a Submodel boundary. Reusing
  a plain `VNode` value across positions is now safe; factories are no longer
  required to avoid this.
- d2bed68: Dedupe shared `VNode` constants reused inside memoized views. `createLazy` and
  `createKeyedLazy` now dedupe their freshly built subtree on a cache miss, against
  a per-render set shared with the top-level pass, so a const reused inside a
  memoized view, or across memoized siblings, is cloned just like one reused in a
  plain view. A cache hit still returns the identical object, preserving the
  same-vnode short-circuit. Reusing a plain `VNode` value is now safe everywhere,
  with no exception for memoized views.

## 0.114.0

### Minor Changes

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

## 0.113.0

### Minor Changes

- fcc7a94: Bump Effect to `4.0.0-beta.83` (from `4.0.0-beta.78`). Foldkit's peer dependencies now require `effect@4.0.0-beta.83` and `@effect/platform-browser@4.0.0-beta.83`.

  Consumers should align their Effect packages to `4.0.0-beta.83` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.83 @effect/platform-browser@4.0.0-beta.83
  pnpm add -D @effect/vitest@4.0.0-beta.83
  ```

### Patch Changes

- 757e22d: Reword the slow view warning to lead with `createLazy` memoization. Caching derived data on the model in `update` is now framed as the fallback for when memoization cannot cover the cost, rather than the first suggestion.

## 0.112.5

## 0.112.4

### Patch Changes

- 61757b3: The render dispatch stack is a plain module-level singleton again, not keyed on a
  `globalThis` symbol. Keying it globally let two foldkit instances (a bundler
  loading `foldkit` and `@foldkit/ui` as separate copies) share one stack, hiding a
  duplication that still broke Schema and tag identity. That duplication now
  surfaces as a clear "runtime-driven render" or "dispatchAcrossBoundary missing
  wrap" error naming the cause, instead of being silently absorbed. Prevent it with
  `@foldkit/vite-plugin` (dev) and inlined foldkit packages in Vitest.
- ddc2b0d: Fix a Submodel whose root vnode changes identity across renders (most
  commonly a keyed element used as the Submodel's root, whose key changes)
  crashing on a later interaction with `dispatchAcrossBoundary missing wrap
for ancestor`. The root's destroy hook ran after the next render had
  already re-registered the boundary, evicting the live wrap. The destroy
  hook now skips deregistration when the boundary was re-registered in the
  same render cycle, so a keyed Submodel root works without wrapping it in a
  stable element. The `missing wrap` error no longer asserts a single
  most-likely cause.

## 0.112.3

## 0.112.2

### Patch Changes

- 544a1c6: Key the render dispatch stack on a `globalThis` symbol so foldkit survives being instantiated more than once in a page. When a bundler split `foldkit` and `@foldkit/ui` into separate instances (Vite dev optimizing them in separate passes, or `@foldkit/ui` externalized while `foldkit` is inlined under Vitest), each copy got its own empty dispatch stack. The runtime pushed a render frame onto one instance's stack while a `@foldkit/ui` component's element constructors read another instance's empty stack, crashing with "must be called inside a runtime-driven render" or "dispatchAcrossBoundary missing wrap for ancestor". The stack now resolves to a single shared array regardless of how a bundler splits the module graph.

## 0.112.1

### Patch Changes

- 1c224ef: Fix a page-owning app coming back blank from the browser's back/forward cache.
  `BrowserRuntime.runMain` interrupts the runtime on `beforeunload`, which is also
  when the page is frozen into the cache, and that interrupt used to remove the
  bfcache-restore listener along with the rest of the runtime. On restore there
  was nothing left to reload the page, so it came back blank. The listener now
  lives for the page's lifetime, so leaving a page with a full document
  navigation and returning to it reloads cleanly instead of showing a blank page.

## 0.112.0

### Minor Changes

- 34c4025: Add a `closeButton` bundle to the `Ui.Dialog` render info. Spread it onto an in-panel
  dismiss control such as a Cancel or close button to close the dialog without
  wiring up a parent message. It carries the same `OnClick` close handler as the
  backdrop, including the suppression that keeps a click from interrupting a leave
  animation.
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

### Patch Changes

- 34c4025: Dialog now returns focus when it closes. Opening a dialog records the element
  that had focus, and closing it restores focus there, so dismissing a dialog
  returns to its trigger and closing a stacked dialog returns to the one beneath
  it. The component opens with `show()` rather than `showModal()`, so it does this
  restoration itself rather than relying on the browser.
- 34c4025: Fix Escape and Tab handling when more than one Dialog is open at once. Only
  the topmost dialog now responds, so Escape closes stacked dialogs from the top
  down and focus stays trapped in the frontmost dialog.

## 0.111.1

### Patch Changes

- 3a9edc7: Rename colocated test files to name them after their test style: `story.test.ts` for Story tests (which drive `update`) and `scene.test.ts` for Scene tests (which drive the rendered view). The previous `*.story.test.ts` / `*.scene.test.ts` scheme prefixed the file with `main` or `index`, which in split-file apps named neither the update nor the view it tested. `create-foldkit-app`'s scaffolded AGENTS.md now documents the convention. No runtime or public API changes.

## 0.111.0

### Minor Changes

- b4c1b5c: Add clipboard event attributes with synchronous clipboardData access. `OnPastePreventDefault` hands the handler the clipboard's text/plain payload; returning `Some` suppresses the browser's default insertion and dispatches the Message, returning `None` lets the browser paste normally. `OnCopyText` and `OnCutText` write Model-derived text to the clipboard inside the gesture and suppress the default payload; the cut variant also dispatches a Message so update can remove the cut content from the Model.
- 88a3b8b: Add Model-anchored history queries to the DevTools MCP server. `foldkit_list_messages` gains `changed_paths_match` (server-side filtering by changed Model paths, where patterns compare segment by segment for the length of the shorter side and `*` matches one segment) and `from_end` (read the latest entries without discovering the total count first). New `foldkit_count_messages_by_tag` returns a tag histogram with no payloads for cheap reconnaissance before paging detail. New `foldkit_diff_models` returns a path-level Model diff between two history indices, each side reported as `Present` with a summarized value or `Absent` when the path does not exist there. `foldkit_get_model_at`, `foldkit_diff_models`, and `foldkit_replay_to_keyframe` now reject indices the runtime cannot answer for, returning the readable bounds, instead of silently resolving the wrong Model from a fallback keyframe. Patterns not anchored at `root` are rejected with a clear error rather than silently matching nothing. The history diff now records removed record keys and truncated array elements as changed paths.

## 0.110.0

### Minor Changes

- 52dabd6: **Breaking:** `Route.oneOf` now requires a route to consume the entire path before it matches, instead of checking completion once after the first successful parse. A route no longer shadows a longer route that shares its prefix, so order only matters when several routes fully match the same URL.

  Correctly ordered route sets behave identically. The only observable change: a URL that previously reached the fallback route even though a longer route fully matched it now resolves to that longer route. If you relied on listing a shorter route first to keep a longer sibling unreachable, remove the longer route instead.

- e172f9c: Add `rest` route parser for capturing all remaining path segments (catch-all routes) as a non-empty array. Rest parsers are terminal: `slash` cannot extend them, and `slash` now preserves terminality when its second parser is terminal. `query` can still follow `rest`.

  **Breaking (type-level):** because terminality now survives `slash` composition, chaining more path segments after a parser that embeds `query` no longer compiles. Declare `query` at the end of the route instead.

## 0.109.0

### Minor Changes

- da0bf02: `Ui.Listbox`, `Ui.Menu`, and `Ui.Combobox` now always portal their items panel to the document body, positioned relative to the trigger with Floating UI. Previously this only happened when an `anchor` config was supplied; without one the panel rendered inline, at the mercy of the parent stacking context. Any sibling with an explicit z-index (a sticky section header, a toast, another overlay's wrapper) could occlude the open panel, forcing consumers into an app-wide z-index ladder.

  `anchor` remains optional and defaults to `bottom-start` placement with no gap.

  ### Migration
  - If you already pass `anchor`, nothing changes.
  - If you rendered without `anchor` and positioned the panel with your own CSS (for example `absolute top-full mt-1`), remove those rules. Floating UI now writes `left` and `top` inline. Express spacing through `anchor: { gap }` and `placement` instead, and size the panel with `width: var(--button-width)` (Tailwind `w-(--button-width)`) rather than `w-full`. Give the panel a z-index above your elevated content; the docs demos use `z-10`.
  - To keep the panel inside the wrapper, pass `anchor: { portal: false }`. The panel is still positioned by Floating UI.
  - Scene tests that open one of these components now have a pending anchor Mount to acknowledge: add `Scene.Mount.resolve(AnchorListbox, CompletedAnchorListbox())`, `Scene.Mount.resolve(AnchorMenu, CompletedAnchorMenu())`, or `Scene.Mount.resolve(AnchorCombobox, CompletedAnchorCombobox())`.
  - Combobox only: the items panel no longer renders the `AttachComboboxPreventBlur` Mount, because `AnchorCombobox` installs the blur-prevention listener itself. Scene tests that resolved `AttachComboboxPreventBlur` on the items panel should resolve `AnchorCombobox` instead. The Mount still renders on the toggle button.

### Patch Changes

- 33e9844: Standardize terminology in the README and TSDoc: Foldkit UI ships "UI components", not "UI primitives". No runtime changes.

## 0.108.0

### Minor Changes

- 58e0895: Build the `resources` Layer once per runtime and surface its construction failures in the crash view.

  **Fixed:** the `resources` Layer is now built once, the first time it is needed: at startup in an app that declares Subscriptions (their pipelines run for the application's lifetime), otherwise when the first Command runs. The built services are shared from then on and released at runtime teardown. This was always the documented contract, but the runtime previously rebuilt the Layer on every Command invocation and tore it down when the Command finished, so an RPC client in `resources` was reconstructed per call and an `AudioContext` was never actually shared between Commands.

  **Changed:** a `resources` Layer that fails to build now renders the crash view. Previously the failure killed each Command fiber silently: every Command in the app stopped working with nothing in the console or on screen. A failure escaping a Command or Subscription fiber is unrecoverable by construction (a Command's Effect and a Subscription's Stream are typed with a `never` error channel), so the runtime treats it as fatal: it renders the crash view with the underlying error, reports through `crash.report` once, and stops rendering model updates so the crash view stays visible.

## 0.107.0

### Minor Changes

- 1e4a4e6: Add `Runtime.embed` and the `Port` module: a typed, lifecycle-managed handle for running a Foldkit app inside a host application, modeled on Elm's ports.

  **New:** `Runtime.embed(program)` starts a runtime under host control and returns an `EmbedHandle`. The host drives the app only through the handle: `ports.<name>.send(value)` pushes data in, `ports.<name>.subscribe(listener)` receives values out (returning an unsubscribe function), and `dispose()` shuts the runtime down. `dispose` is idempotent and runs full cleanup: Subscriptions, Mounts, ManagedResources, and in-flight Commands stop, the rendered DOM is removed, and the container element is restored empty, ready to be embedded again. Works with programs from both `makeApplication` and `makeElement`. New types: `EmbedHandle`, `PortHandles`, `InboundPortHandle`, `OutboundPortHandle`; `MakeRuntimeReturn` gains a type parameter (defaulted, existing annotations unaffected) carrying the program's Ports.

  **New:** the `Port` module (`foldkit/port`) declares the boundary. `Port.inbound(schema)` and `Port.outbound(schema)` create typed Ports, grouped in a record and registered through the new `ports` config field on `makeApplication` and `makeElement`. Each direction maps onto an existing primitive: the app consumes an inbound Port as a Subscription source (`Port.subscription(port, toMessage)`, or `Port.stream(port)` for Model-gated entries) and writes an outbound Port from a Command (`Port.emit(port, value)`). Values are validated at the boundary: `send` decodes against the Port's Schema and returns an `Exit`, so an invalid value never reaches the app; `emit` encodes, so host listeners receive the Schema's Encoded form.

  ```ts
  const ports = {
    inbound: { stepChanged: Port.inbound(S.Number) },
    outbound: { countChanged: Port.outbound(S.Number) },
  }

  const element = Runtime.makeElement({
    Model,
    init,
    update,
    view,
    ports,
    container,
  })

  const handle = Runtime.embed(element)
  handle.ports.stepChanged.send(5)
  const unsubscribe = handle.ports.countChanged.subscribe(count =>
    console.log(count),
  )
  handle.dispose()
  ```

  **Changed:** interrupting a runtime's `start()` fiber now tears the whole runtime down. The render loop, Subscription streams, ManagedResource lifecycles, and Command fibers fork into the runtime scope instead of detaching, navigation and bfcache listeners are removed on shutdown, and the DevTools overlay is cleaned up with its runtime. `makeElement` apps no longer install the page-reloading bfcache listener; reloading on bfcache restore is a page-level decision, so only page-owning `makeApplication` apps register it.

- 127e9f5: Split the runtime into `makeApplication` and `makeElement`, following Elm's `Browser.application` / `Browser.element` convention.

  **Breaking:** `Runtime.makeProgram` is renamed to `Runtime.makeApplication`. The behavior is identical (its `view` returns a `Document`; the runtime owns `document.title` and the canonical / og:url tags). The associated exported types are renamed to match: `ProgramConfig` → `ApplicationConfig`, `ProgramConfigWithFlags` → `ApplicationConfigWithFlags`, `RoutingProgramConfig` → `RoutingApplicationConfig`, `RoutingProgramConfigWithFlags` → `RoutingApplicationConfigWithFlags`, `ProgramInit` → `ApplicationInit`, `RoutingProgramInit` → `RoutingApplicationInit`. To migrate, replace `makeProgram` with `makeApplication` (and the `*Program*` type names with their `*Application*` equivalents).

  **New:** `Runtime.makeElement` mounts a Foldkit app scoped to a DOM node. Its `view` returns `Html` directly (no title to discard) and the runtime never touches the document `<head>`, so an app can be embedded on a page it does not own without clobbering the host page's `title`, `canonical`, or `og:url`. Everything else (Model, `init`, `update`, Commands, Subscriptions, flags, crash handling) works exactly as it does with `makeApplication`. Embedded apps do not own the URL bar, so `makeElement` has no `routing` config. New types: `ElementConfig`, `ElementConfigWithFlags`, `ElementCrashConfig`, `ElementInit`.

  ```ts
  import { Runtime } from 'foldkit'

  import { Model, init, update, view } from './main'

  // view: (model) => Html

  const element = Runtime.makeElement({
    Model,
    init,
    update,
    view,
    container: document.getElementById('widget'),
  })

  Runtime.run(element)
  ```

## 0.106.0

### Minor Changes

- 575b2ff: Bump Effect to `4.0.0-beta.78` (from `4.0.0-beta.66`). Foldkit's peer dependencies now require `effect@4.0.0-beta.78` and `@effect/platform-browser@4.0.0-beta.78`.

  beta.68 removed `Random.nextUUIDv4`, so the browser examples that generate UUIDs now use the platform-backed `Crypto` service's `randomUUIDv4`. Behavior is unchanged apart from UUIDs now coming from cryptographic platform randomness.

  Consumers should align their Effect packages to `4.0.0-beta.78` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.78 @effect/platform-browser@4.0.0-beta.78
  pnpm add -D @effect/vitest@4.0.0-beta.78
  ```

## 0.105.0

### Minor Changes

- f80c1c8: Generalize `FieldValidation` over the field's value type, group the rule constructors under a `Rule` namespace, and add `Rule.fromSchema`.

  `Field` is now a function that takes the value Schema for the field's editing buffer, so fields can hold values other than strings. `Field(S.String)` replaces the old bare `Field` for text inputs, and non-string fields are now supported, like `Field(S.Array(S.String))` for a multi-select. A scalar like a checkbox's boolean usually stays plain `S.Boolean`; wrap it in `Field` only when it needs the validation lifecycle. Validation rules stay separate in `makeRules`.

  The rule constructors and the `Rule`/`RuleMessage` types now live under a `Rule` namespace: `import { Rule } from 'foldkit/fieldValidation'`, then `Rule.minLength(2)`, `Rule.email()`, and the type `Rule.Rule<string>`. New `Rule.fromSchema(schema, message)` builds a rule that passes when a value decodes through an Effect Schema, for reusing a domain codec or refined type you already maintain rather than duplicating its checks as a predicate.

  Adds array rules `Rule.minItems` and `Rule.maxItems`. The default empty check now treats an empty array as empty (alongside the empty string), so a required multi-select rejects an empty selection.

  Breaking changes:
  - `Field` is a function. Replace `Field` in a Model or message with `Field(S.String)`, and `Field` type annotations with `Field<string>`.
  - Rule constructors and the rule types moved under the `Rule` namespace. Replace `minLength(2)` with `Rule.minLength(2)`, `Rule<string>` with `Rule.Rule<string>`, and `RuleMessage` with `Rule.RuleMessage`.
  - `Rule.Rule`, `Rule.RuleMessage`, `Rules`, and `MakeRulesOptions` are generic over the value type. `makeRules` defaults the value type to `string`; annotate other fields, e.g. `makeRules<ReadonlyArray<Tag>>({ ... })`.

- df078ee: `File.select` now returns `Effect<Option<File>>` instead of `Effect<ReadonlyArray<File>>`. The browser only ever produces zero or one file from a single-select picker, so `Option` makes the impossible "two or more files from a singular picker" state unrepresentable and matches Foldkit's preference for `Option` over array sentinels.

  `File.selectMultiple` is unchanged. It legitimately resolves with zero-to-many files and keeps `Effect<ReadonlyArray<File>>`.

  Migration: replace `Array.match`/`Array.head` over the result with `Option.match`. The cancel branch maps to `Option.none()`, the picked-a-file branch to `Option.some(file)`.

  ```ts
  // Before
  File.select(['application/pdf']).pipe(
    Effect.map(
      Array.match({
        onEmpty: () => CancelledSelectResume(),
        onNonEmpty: files => SelectedResume({ files }),
      }),
    ),
  )

  // After
  File.select(['application/pdf']).pipe(
    Effect.map(
      Option.match({
        onNone: () => CancelledSelectResume(),
        onSome: file => SelectedResume({ file }),
      }),
    ),
  )
  ```

### Patch Changes

- 18afeb0: Mark the `foldkit` package as side-effect-free (`"sideEffects": false`) so bundlers can tree-shake unused modules from production builds.

  Foldkit has no module-level side effects (no CSS imports, no top-level `customElements.define`, no global mutations), but without this field bundlers conservatively retain every module they touch. In practice that meant the dev-only DevTools overlay, HMR Model-preservation, and WebSocket bridge code, all gated behind `import.meta.hot` and dead-code-eliminated in production, could not be dropped from the module graph and shipped in every app.

  A minimal counter app drops from 314.9 KB to 268.4 KB raw (102.8 KB to 87.9 KB gzip), roughly a 15% reduction, with no source changes required by consumers.

## 0.104.1

### Patch Changes

- 7b1286a: Update README documentation links to the new section-prefixed docs URLs.

## 0.104.0

### Minor Changes

- 949f491: Add `h.OnClickFocus(focusSelector, message)` attribute for click handlers that need to synchronously focus another element before dispatching their Message.

  The attribute's framework handler runs `document.querySelector(focusSelector)?.focus()` inside the originating click event, then dispatches the Message. Because the focus call lives inside the user-gesture handler, iOS Safari opens the on-screen keyboard, which `Dom.focus` cannot achieve (Commands fork through `Effect.forkDetach` + `requestAnimationFrame` and resolve after the gesture context has expired).

  When the real input only mounts later, such as a search field inside a dialog, focus it in two steps. The element you focus has to exist when the tap fires, and you cannot open the dialog first because that happens a frame later, after the gesture ends. So point `OnClickFocus` at an always-present, visually hidden text input (the "keyboard warmup"); the tap focuses the input (which opens the keyboard) and dispatches a Message. update's branch for that Message opens the dialog and returns a `Dom.focus` Command pointed at the real input. By the time the Command runs the dialog has mounted, so focus moves there. iOS keeps the keyboard up when focus moves between two text inputs, so it stays open and now targets the real input.

  ```ts
  h.button(
    [
      h.AriaLabel('Search documentation'),
      h.OnClickFocus('#search-keyboard-warmup', ClickedSearch()),
    ],
    [Icon.magnifyingGlass()],
  )
  ```

  Like `OnKeyDownPreventDefault`, the side effect lives inside the framework's snabbdom handler so view code stays declarative.

## 0.103.0

### Minor Changes

- 57012f9: Surface render failures as the crash view instead of silently freezing the DOM.

  A view that throws (for example a Schema constructor rejecting its input while building a VNode) ran inside the render loop fiber, which had no error path. The fiber died and the DOM stayed at the last successful render, so the failure was swallowed: no crash screen, and the app appeared stuck on its last good frame. Update failures already routed to the crash view. Render failures now do too, as do failures during the initial render.

  **Breaking:** `CrashContext.message` is now `Option<Message>` instead of `Message`, because a crash during the initial render has no triggering Message. Update `crash.view` / `crash.report` handlers that read `message` to unwrap the `Option` (for example `Option.getOrUndefined(message)`).

- 3e41f2b: Rebuild the ManagedResource API around `make` / `lift` / `aggregate`, mirroring the Subscription primitives so lifecycle composition looks the same across every Foldkit primitive.

  `ManagedResource.make<Model, Message>()(entry => ({ ... }))` declares a Managed Resources record. Each `entry(requirementsSchema, config)` inlines the requirements schema (usually `S.Option(...)`) next to its config, replacing the parallel `ManagedResourceDeps` struct that `makeManagedResources` required. The schema is positional for the same inference reason as `Subscription.make`. The service union is inferred from the `resource` tags; read it with `ManagedResource.ServicesOf<typeof managedResources>` instead of hand-maintaining it in parallel.

  `ManagedResource.lift(childRecord)<Parent, Parent>({ toChildModel, toParentMessage })` lifts a child Submodel's Managed Resources into a parent through a single Model lens and a single Message wrap, the same shape as update delegation and `Subscription.lift`. Unlike `Subscription.lift`, `toChildModel` returns `Option<ChildModel>`: a Managed Resource already speaks in `Option` (`modelToMaybeRequirements` returns `Option.none()` to release), so a Submodel that is not mounted is just another `none` and releases the resource through the same channel. Lifted child requirements must therefore be `S.Option`-wrapped.

  `ManagedResource.aggregate<Model, Message>()(...records)` combines records and throws at startup on duplicate keys, so a collision fails loudly rather than silently overriding.

  There is deliberately no `persistent`: app-lifetime handles are the static `resources` Layer, which a "persistent Managed Resource" would only duplicate.

  **Breaking:** `makeManagedResources(Deps)<Model, Message>(configs)` is removed. Migrate each record to `make`, lift child Submodels with `lift`, and combine multiple records with `aggregate`. The `ManagedResourceServicesOf` type is also gone; read the service union with `ManagedResource.ServicesOf<typeof managedResources>`.

## 0.102.1

### Patch Changes

- cbab2fe: Fix DOM corruption when the same vnode value is rendered in more than one position within a single render.

  Reusing a view value across positions, for example a `const checkmark = h.span(...)` placed into several slots, previously left those positions sharing a single DOM reference. Removals and text updates then landed on the wrong node, so repeated toggles accumulated stale elements and a moved selection indicator could stick to its old position. The runtime now gives each position its own DOM node before patching. Trees that never reuse a vnode are unaffected, and `createLazy` / `createKeyedLazy` memoized subtrees keep their fast path.

## 0.102.0

### Minor Changes

- f1d8c31: Add `Command.mapMessage` and `Command.mapMessages` for lifting Commands through a Message-mapping function. Collapses the `Command.mapEffect` composed with `Effect.map` boilerplate that Submodel embeddings used to write at every delegate site.

  ### `Command.mapMessages`

  Lifts every Command in a list through a Message mapper.

  ```ts
  const mapMessages: <FromMessage, ToMessage, E = never, R = never>(
    commands: ReadonlyArray<Command.Command<FromMessage, E, R>>,
    f: (message: FromMessage) => ToMessage,
  ) => ReadonlyArray<Command.Command<ToMessage, E, R>>
  ```

  ### `Command.mapMessage`

  The singular complement. Lifts a single Command's result Message through a mapper. Reach for it when a child returns one Command (e.g. an animation leave Command); reach for `mapMessages` when it returns a list.

  ```ts
  const mapMessage: <FromMessage, ToMessage, E = never, R = never>(
    command: Command.Command<FromMessage, E, R>,
    f: (message: FromMessage) => ToMessage,
  ) => Command.Command<ToMessage, E, R>
  ```

  ### Migration

  Before:

  ```ts
  const mappedCommands = commands.map(
    Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
  )
  ```

  After:

  ```ts
  const mappedCommands = Command.mapMessages(commands, message =>
    GotChildMessage({ message }),
  )
  ```

  Both helpers preserve each Command's `name` and `args`, so DevTools traces still attribute the Command to the originating Submodel. `Command.mapEffect` stays exposed for the rare case where the Effect itself (not just its result Message) needs transformation.

- f1d8c31: Submodels become first-class. A new `h.submodel` primitive (also exposed as `submodel` from `foldkit/html`) embeds a child view as a pure function of its own model. A new top-level `Submodel` namespace exports `defineView`, `View`, and `Config`.

  ### `h.submodel`

  ```ts
  // Parent view:
  h.submodel({
    slotId: row.id,
    model: row.counter,
    view: Counter.view,
    toParentMessage: message => GotCounterMessage({ id: row.id, message }),
  })

  // Child view, no parent-awareness:
  export const view = Submodel.defineView<Model, Message>(model => {
    const h = html<Message>()
    return h.button([h.OnClick(ClickedIncrement())], ['+'])
  })
  ```

  The parent-Message wrap is declared as data at the embed site via `toParentMessage` and resolved through a runtime scope registry at event-fire time. The cached child VNode carries stable values; the per-render-fresh wrap closure does not enter the VNode. This is what enables memoization across Submodel boundaries.

  `viewInputs` (optional second view argument) carries slot content built in the parent's boundary. Top-level function values in `viewInputs` are auto-wrapped to execute in the parent's boundary so user-provided handlers inside slots dispatch through the user's chain, not the embedded Submodel's. Function values nested below the top level (inside object fields or array elements) throw at view-build time with a path-based error like `viewInputs.config.onSubmit`. The check is runtime-only because TypeScript cannot structurally distinguish a user-declared nested callback from a data value whose prototype carries methods, so a misuse compiles cleanly and surfaces the first time the boundary renders.

  Nested Submodels compose automatically: a deeper `h.submodel` extends the boundary chain, and wrapping at event-fire time walks the full chain from innermost to outermost.

  ### `Submodel.defineView`

  `Submodel.defineView` is REQUIRED for views passed to `h.submodel`. Plain view functions fail to type-check at the embed site rather than silently inferring `Message = never`. Build views with `Submodel.defineView<Model, Message, ViewInputs>(fn)`:

  ```ts
  export const view = Submodel.defineView<Model, Message, ViewInputs>(
    (model, viewInputs) => h.div([...], [...])
  )
  ```

  `Submodel.View` and `Submodel.Config` are accessible as types under the namespace for cases where consumers annotate them directly. Most consumers never do; the view itself carries the inference, so `h.submodel`'s `model` and `viewInputs` config fields are fully inferred.

  ### `childAttributes`

  A new `childAttributes` helper (and companion `ChildAttribute` type) is exported from `foldkit/html`. Use it in `toView` slot callbacks to mark attribute lists that originate inside the child Submodel and should keep their handlers bound to the child's dispatch, even though the call site lives in the parent's boundary.

  ```ts
  import { type ChildAttribute, childAttributes } from 'foldkit/html'

  return viewInputs.toView({
    button: childAttributes([h.OnClick(Toggled())]),
    panel: childAttributes([h.Id(panelId(model.id))]),
  })
  ```

  `childAttributes` is "what the child publishes to the parent" in the same role-named vocabulary as `viewInputs` (parent → child view), `context` (parent → child update), and `OutMessage` (child → parent update). Every interactive Foldkit UI primitive uses it internally.

  ### Boundary semantics
  - **Duplicate slotId detection.** Two `h.submodel` calls inside the same parent boundary with the same `slotId` throw at view-build time, naming both call sites and the convention: `slotId` is DOM-slot identity, not model identity. If the same model is rendered in two locations (desktop + mobile, master + detail), each slot needs its own id. Detection works across `createLazy` / `createKeyedLazy` cache hits: the lazy helpers capture the boundary ids registered during their first run and replay them on cache hit, so a sibling collision against a memoized entry throws instead of silently overwriting its wrap.
  - **Wrap lifecycle tied to VNode lifecycle.** `h.submodel` attaches a snabbdom `destroy` hook that deregisters the scope's wrap when the DOM node is removed. Wraps persist as long as their VNode is in the tree, evict cleanly on removal, survive cache hits, and survive reorder.
  - **Resilient wrap deregistration on view failure.** If the child view throws, the wrap is deregistered before propagating. If it returns `null`, the wrap is deregistered eagerly.
  - **Lazy dispatch capture in element constructors.** `h.div(...)`, `h.code(...)`, etc. no longer require an active runtime frame when their attribute list contains no event-bearing attributes. Static Html fragments constructed at module top level (`const fragment = h.code([h.Class('x')], ['text'])`) now succeed. Event-bearing Html constructed outside a render still fails at event-fire time with a clear message, rather than at import time with an opaque trace.

  ### `examples/counters`

  Ships as a new example demonstrating the pattern: a parent that hosts a dynamic list of `Counter` Submodels, each embedded via `h.submodel`. `Counter.view` is `(model: Counter.Model) => Html` with no parent-awareness; the same Counter would work unchanged under any host.

  ### Ui.\* implications

  Every Ui.\* component's `view` is now a pure `(model, viewInputs?) => Html` typed via `Submodel.defineView` rather than `<ParentMessage>(config: ViewConfig)`. Embed via `h.submodel({ view: Ui.X.view, ... })` instead of calling `Ui.X.view({ ... })` directly. See `ui-out-messages.md` and `ui-selection-factory.md` for per-component migration details.

- f1d8c31: Rename `Ui.Popover` and `Ui.Dialog` internal `Opened`/`Closed` Messages to `RequestedOpen`/`RequestedClose`. The new names are more honest. They're requests to open or close, not the events themselves. The actual events the parent observes are the `Opened` and `Closed` OutMessage variants described in the broader OutMessage migration.

  ### Migration

  #### `Ui.Popover`

  ```ts
  // Before
  h.OnClick(toPopoverMessage(Ui.Popover.Opened()))
  h.OnClick(toPopoverMessage(Ui.Popover.Closed()))

  const [next, commands] = Ui.Popover.update(model.popover, Ui.Popover.Closed())

  // After
  h.OnClick(toPopoverMessage(Ui.Popover.RequestedOpen()))
  h.OnClick(toPopoverMessage(Ui.Popover.RequestedClose()))

  const [next, commands] = Ui.Popover.update(
    model.popover,
    Ui.Popover.RequestedClose(),
  )
  ```

  #### `Ui.Dialog`

  ```ts
  // Before
  h.OnClick(toDialogMessage(Ui.Dialog.Opened()))
  h.OnClick(toDialogMessage(Ui.Dialog.Closed()))

  const [next, commands] = Ui.Dialog.update(model.dialog, Ui.Dialog.Closed())

  // After
  h.OnClick(toDialogMessage(Ui.Dialog.RequestedOpen()))
  h.OnClick(toDialogMessage(Ui.Dialog.RequestedClose()))

  const [next, commands] = Ui.Dialog.update(
    model.dialog,
    Ui.Dialog.RequestedClose(),
  )
  ```

- f1d8c31: Render views synchronously. The `Html` type changes from `Effect<VNode | null, never, Dispatch>` to `VNode | null`. Element constructors read dispatch from a runtime-managed singleton set up around each render rather than pulling it from Effect context. The fiber-loop wrapper around every `h.div(...)`, `h.input(...)`, etc. is gone.

  `html()` now memoizes its factory result across calls. The ~320 element and attribute constructors carry no per-program state, so the same cached object serves every render. This makes the recommended pattern of binding `const h = html<Message>()` inside view (recommended in 5338579) zero-cost.

  `buildVNodeData` hoists its `Match.tagsExhaustive` dispatch object once per `buildVNodeData` call instead of once per attribute, and accumulates into `VNodeData` fields with `Object.assign` instead of spreading.

  `createLazy` and `createKeyedLazy` keep dispatch identity in their cache key so DevTools `jumpTo` renders (which set up the runtime with `noOpDispatch`) do not return live-dispatch-bound VNodes to subsequent live renders. The per-(outerDispatch, boundaryId) Submodel dispatcher cache makes the dispatch reference stable across renders within a single outerDispatch, so lazy hits are common in steady state.

  The synchronous render path is the largest single contributor to this release's perf overhaul; see the release notes for the bundled before/after numbers.

  Migration: code that built `Html` values via `Effect.gen` or `Effect.succeed` should now return `VNode | null` directly. View functions written with the `html()` factory require no changes.

- f1d8c31: `Story` testing helper signatures decoupled from the simulation's `Message` / `OutMessage` to fix type inference when an update returns the 3-tuple `[Model, Commands, Option<OutMessage>]`. The previous generic signatures inferred the simulation type from the helper argument, which broke variance for narrow argument values (e.g. `expectOutMessage(SpecificVariant({...}))` against a wider OutMessage union) and collapsed `Model` and `Message` to `unknown` across every step.

  ### What changed
  - `Story.expectOutMessage` no longer infers its narrowing from the expected argument. The runtime equality check still surfaces wrong-payload mismatches.
  - `Story.message` no longer narrows the simulation's `Message` parameter from the argument.
  - `Story.model` is now a function returning a branded `ModelStep<Model>` tagged object instead of a generic curried function. The story loop interprets `ModelStep` alongside the other step variants. `Model` flows contextually from the story's update function, so test files no longer need per-call annotations like `Story.model((model: Model) => ...)`.
  - `StoryStep<Model, Message, OutMessage>` collapsed to `StoryStep<Model>`. The narrower generics aren't load-bearing on the step union since each step variant either uses `any` for its sim type or carries its own generic.

  ### Migration

  For most consumers this is source-compatible. The annotation-on-`Story.model` pattern can be dropped:

  ```ts
  // Before
  Story.story(
    update,
    Story.with(initialModel),
    Story.message(ClickedIncrement()),
    Story.model((model: Model) => {
      expect(model.count).toBe(1)
    }),
  )

  // After
  Story.story(
    update,
    Story.with(initialModel),
    Story.message(ClickedIncrement()),
    Story.model(model => {
      expect(model.count).toBe(1)
    }),
  )
  ```

  Direct uses of `StoryStep<A, B, C>` need to be rewritten as `StoryStep<A>`. The other two type parameters had no remaining call sites that benefited from the narrower signature.

- f1d8c31: `Ui.Checkbox.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds a new `ToggledChecked({ isChecked: boolean })` OutMessage variant, emitted on every toggle. Closes a gap that pushed consumers to shortcut the Submodel boundary: wrapping `Ui.Checkbox.Message` as a domain Message directly in `toParentMessage` instead of the conventional `GotCheckboxMessage` wrapper, which bypassed `Ui.Checkbox.update` and left `model.checkbox.isChecked` stale.

  Existing 2-tuple destructures (`const [next, commands] = Ui.Checkbox.update(...)`) keep compiling; TypeScript accepts binding the head of a longer tuple. Consumers wanting to react to the toggle as a domain event now pattern-match the third element:

  ```ts
  GotAdminCheckboxMessage: ({ message }) => {
    const [next, commands, maybeOutMessage] = Ui.Checkbox.update(
      model.admin,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotAdminCheckboxMessage({ message }),
    )
    return Option.match(maybeOutMessage, {
      onNone: () => [evo(model, { admin: () => next }), mappedCommands],
      onSome: M.type<Ui.Checkbox.OutMessage>().pipe(
        M.tagsExhaustive({
          ToggledChecked: ({ isChecked }) => [
            evo(model, { admin: () => next }),
            [...mappedCommands, PersistAdminFlag({ value: isChecked })],
          ],
        }),
      ),
    })
  }
  ```

- f1d8c31: `Ui.Checkbox` gains a `SetChecked({ isChecked: boolean })` Message and a
  matching `setChecked(model, isChecked)` programmatic helper. `SetChecked`
  forces the checked state to a specific value (unlike `Toggled`, which
  flips) and emits the same `ToggledChecked({ isChecked })` OutMessage so
  consumers react to programmatic state assignment the same way they react
  to user toggles. Use this in domain-event handlers that need to assign a
  specific state, such as a "select all" handler that forces every child
  checkbox to the same value:

  ```ts
  GotSelectAllMessage: () => {
    const isAllChecked = Array.every(
      [model.optionA, model.optionB],
      ({ isChecked }) => isChecked,
    )
    const nextChecked = !isAllChecked

    const [nextOptionA] = Ui.Checkbox.setChecked(model.optionA, nextChecked)
    const [nextOptionB] = Ui.Checkbox.setChecked(model.optionB, nextChecked)

    return [
      evo(model, {
        optionA: () => nextOptionA,
        optionB: () => nextOptionB,
      }),
      [],
    ]
  }
  ```

  Previously the only update path was `Toggled`, whose flip semantics could
  not reliably reach a target state when child checkboxes started in mixed
  states. The convention pushed consumers to assign `isChecked` directly on
  the submodel field, bypassing `Ui.Checkbox.update`. `setChecked` is the
  idiomatic route.

- f1d8c31: Small consumer-facing changes that fall out of the Ui.\* shape migration.

  ### `Ui.X.lazy` removed across the board

  `Ui.X.lazy` is removed from every component that exposed it: `Animation`, `Calendar`, `Checkbox`, `Combobox`, `DatePicker`, `Dialog`, `Disclosure`, `FileDrop`, `Listbox`, `Menu`, `Popover`, `RadioGroup`, `Slider`, `Switch`, `Tabs`, `Tooltip`, and `VirtualList`. An `import { lazy }` or a `Ui.X.lazy(...)` call from any of them no longer compiles.

  Each `Ui.X.lazy` was a no-op in practice: its cache key included a per-render-fresh `toParentMessage` closure, so the comparison missed every render. The new `h.submodel` boundary design keeps per-render closures out of the cached VNode, so a parent-side `createLazy` / `createKeyedLazy` around `h.submodel` now actually hits.

  Migration: switch to plain `Ui.X.view` embedded via `h.submodel`. Wrap with `createLazy` / `createKeyedLazy` at the parent's call site if you want memoization (the wrapping is per-instance, not per-component, so it lives where the component is rendered).

  ```ts
  // Before:
  Ui.Checkbox.lazy(
    {
      // ... static config
    },
    toParentMessage,
  )(model)

  // After (without memoization):
  h.submodel({
    slotId: 'agree-to-terms',
    model: model.agreeToTerms,
    view: Ui.Checkbox.view,
    viewInputs: {/* ... slot content if needed */},
    toParentMessage: message => GotCheckboxMessage({ message }),
  })

  // After (with memoization, parent-side):
  const lazyCheckbox = createLazy()
  // ... inside view:
  lazyCheckbox(
    () =>
      h.submodel({
        slotId: 'agree-to-terms',
        model: model.agreeToTerms,
        view: Ui.Checkbox.view,
        toParentMessage: message => GotCheckboxMessage({ message }),
      }),
    [model.agreeToTerms],
  )
  ```

  ### `Ui.Tooltip` exposes `RenderInfo` for slot content

  Tooltip's `view` now takes a `toView` slot via `viewInputs`, consistent with the slot-based pattern used across Ui.\*. The slot receives a `RenderInfo`:

  ```ts
  export type RenderInfo = Readonly<{
    trigger: ReadonlyArray<ChildAttribute>
    panel: ReadonlyArray<ChildAttribute>
    isVisible: boolean
  }>
  ```

  The consumer spreads `trigger` onto the trigger element and `panel` onto the panel element, and decides whether and how to render the panel content based on `isVisible`. Replaces main's `ViewConfig` shape (where `triggerContent` / `content` were fixed fields on the config) with the consistent `viewInputs.toView(renderInfo)` shape that lets the consumer assemble both elements directly.

  ### Removed type exports

  `Ui.RadioGroup` no longer exports `OptionConfig`, `OptionAttributes`, or `NarrowedSelectedOption`, and `Ui.Tabs` no longer exports `TabConfig`. These named fields of the old `ViewConfig` shape; the slot-based `ViewInputs` shape replaces them.

- f1d8c31: Rename `Ui.DatePicker` internal `SelectedDate` Message to `RequestedSelectDate`. The new name is more honest. It's a request to select a date, not the event of one being selected. The actual event the parent observes is the `SelectedDate` OutMessage described in the broader OutMessage migration. The new name also frees `SelectedDate` for the OutMessage so the public-facing name lines up with `Ui.Calendar.SelectedDate`, which propagates the same fact from one layer down.

  ### Migration

  ```ts
  // Before
  update(model, Ui.DatePicker.SelectedDate({ date }))

  // After
  update(model, Ui.DatePicker.RequestedSelectDate({ date }))
  ```

- f1d8c31: `Ui.Dialog.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds two OutMessage variants mirroring `Ui.Popover`:
  - `Opened()`: emitted once the dialog has transitioned to open (after `update` has processed the `RequestedOpen` request and `isOpen` reflects the new state).
  - `Closed()`: emitted once the dialog has transitioned to closed. Programmatic `Dialog.close` on an already-closed model is a no-op that does not re-emit; calling close while a leave animation is already in progress is also a no-op.

  `Ui.Dialog.open` and `Ui.Dialog.close` return the full 3-tuple as well. Existing 2-tuple destructures keep compiling.

  Consumers reacting to dialog lifecycle as a domain event (focus restoration, analytics, scroll position) now have the canonical OutMessage path instead of pattern-matching internal `RequestedOpen`/`RequestedClose` Messages:

  ```ts
  GotSettingsDialogMessage: ({ message }) => {
    const [next, commands, maybeOutMessage] = Ui.Dialog.update(
      model.settingsDialog,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotSettingsDialogMessage({ message }),
    )
    return Option.match(maybeOutMessage, {
      onNone: () => [
        evo(model, { settingsDialog: () => next }),
        mappedCommands,
      ],
      onSome: M.type<Ui.Dialog.OutMessage>().pipe(
        M.tagsExhaustive({
          Opened: () => [
            evo(model, { settingsDialog: () => next }),
            mappedCommands,
          ],
          Closed: () => [
            evo(model, { settingsDialog: () => next }),
            [...mappedCommands, RestoreTriggerFocus()],
          ],
        }),
      ),
    })
  }
  ```

- f1d8c31: Rename several `Ui.*` Messages to follow the verb-first past-tense convention, remove two dead Messages, and align one public helper with the `reflect*` convention. Most of the Message renames are internal lifecycle Messages each component's own `update` handles, so consumers who embed components through `h.submodel` and delegate via a `Got*Message` are unaffected. The `Ui.FileDrop` and `Ui.Tooltip` changes below are consumer-facing: a renamed OutMessage variant and a renamed public helper, respectively. Only code that imports or references these specific Message constructors, OutMessage variants, helpers, or types needs updating.
  - `Ui.Tabs`: `TabSelected` becomes `SelectedTab`, `TabFocused` becomes `FocusedTab`.
  - `Ui.Combobox`, `Ui.Listbox`, `Ui.Menu`, `Ui.Popover`: `CompletedSetupInert` becomes `CompletedInertOthers` and `CompletedTeardownInert` becomes `CompletedRestoreInert`, so each acknowledgement mirrors its `InertOthers` / `RestoreInert` Command.
  - `Ui.DragAndDrop`: `CompletedAutoScroll` becomes `AdvancedAutoScrollFrame`, since it is a recurring animation-frame tick rather than a Command acknowledgement.
  - `Ui.Menu`: the unused `CompletedAdvanceFocus` Message is removed.
  - `Ui.FileDrop`: the `DroppedWithoutFiles` Message becomes `DroppedNonFiles`, and the OutMessage it previously reused is now a distinct `RejectedNonFiles`. This is consumer-facing: a parent that pattern-matches the `DroppedWithoutFiles` arm of the FileDrop OutMessage renames that arm to `RejectedNonFiles`.
  - `Ui.Tooltip`: the `setShowDelay` helper becomes `reflectShowDelay`, a silent `reflect*` setter returning `Model` (it conforms the tooltip to an externally-sourced config value and emits nothing). Its internal `ChangedShowDelay` Message is removed.

  ### Migration

  ```ts
  // Before
  Ui.Tabs.TabSelected({ index, value })
  Ui.Tabs.TabFocused({ index })

  // After
  Ui.Tabs.SelectedTab({ index, value })
  Ui.Tabs.FocusedTab({ index })
  ```

  For `Ui.FileDrop`, rename the OutMessage match arm in your `Got*Message` handler:

  ```ts
  // Before                  // After
  ReceivedFiles: ...         ReceivedFiles: ...
  DroppedWithoutFiles: ...   RejectedNonFiles: ...
  ```

  For `Ui.Tooltip`, `setShowDelay(model, delay)` becomes `reflectShowDelay(model, delay)` and returns `Model` directly (no command tuple).

- f1d8c31: Ui.\* components that previously routed child events through ViewConfig callback props (`onSelectedItem`, `onSelected`, `onSelectedDate`, `onToggled`, `onOpened`, `onClosed`) now expose `OutMessage`. Each migrated component's `update` returns `[Model, Commands, Option<OutMessage>]`; the parent pattern-matches the third tuple element to lift child events to domain Messages.

  The shift is paired with the new `h.submodel` embedding primitive: Ui.\* components are no longer called as `Ui.X.view({ ... })` with config callbacks. Consumers embed them via `h.submodel({ view: Ui.X.view, ... })` and handle OutMessages in the parent's update.

  ### Migration

  Before:

  ```ts
  // In view:
  Ui.Menu.view<ExampleSlug>({
    model: model.menu,
    toParentMessage: message => GotMenuMessage({ message }),
    onSelectedItem: index => SelectedExample({ slug: slugs[index] }),
    // ... other ViewConfig fields
  })

  // In update:
  GotMenuMessage: ({ message }) => {
    const [nextMenu, commands] = Ui.Menu.update(model.menu, message)
    return [
      evo(model, { menu: () => nextMenu }),
      commands.map(
        Command.mapEffect(Effect.map(message => GotMenuMessage({ message }))),
      ),
    ]
  }
  ```

  After:

  ```ts
  // At module scope:
  const ExampleMenu = Ui.Menu.create<ExampleSlug>()

  // In view:
  h.submodel({
    slotId: 'menu',
    model: model.menu,
    view: ExampleMenu.view,
    toParentMessage: message => GotMenuMessage({ message }),
  })

  // In update:
  GotMenuMessage: ({ message }) => {
    const [nextMenu, commands, maybeOutMessage] = ExampleMenu.update(
      model.menu,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotMenuMessage({ message }),
    )
    return Option.match(maybeOutMessage, {
      onNone: () => [
        evo(model, { menu: () => nextMenu }),
        mappedCommands,
        Option.none(),
      ],
      onSome: M.type<Ui.Menu.OutMessage<ExampleSlug>>().pipe(
        M.tagsExhaustive({
          Selected: ({ value }) => [
            evo(model, { menu: () => nextMenu }),
            [...mappedCommands, Navigation.go(ExampleRoute(value))],
            Option.none(),
          ],
        }),
      ),
    })
  }
  ```

  ### OutMessage variants per component
  - **`Ui.Menu.Selected({ value: Item, index: number })`**: replaces `onSelectedItem(index)`. Carries both the picked value (typed as `Item` via `Ui.Menu.create<Item>()`) and its index. The menu closes itself; consumers do not need to dispatch `Ui.Menu.close`.
  - **`Ui.Disclosure.ToggledOpenState({ isOpen: boolean })`**: replaces `onToggled()`. Fires on each toggle.
  - **`Ui.Listbox.Selected({ value: string, wasAdded: boolean })`**: replaces `onSelectedItem(value)`. Single-select always emits `wasAdded: true`; multi-select emits `wasAdded: false` when toggling off.
  - **`Ui.Combobox.Selected({ value: string, wasAdded: boolean })`**: replaces `onSelectedItem(value)`. Same semantics as Listbox.
  - **`Ui.RadioGroup.Selected({ value: string, index: number })`**: replaces `onSelected(value, index)`. Programmatic `RadioGroup.select` carries the same signal.
  - **`Ui.Tabs.Selected({ value: Value, index: number })`**: new. Carries both the tab's value (typed via `Ui.Tabs.create<Value>()`) and its index. `Tabs.update` now returns a 3-tuple to match the rest of the family. The internal `TabSelected` Message also carries `value` so the OutMessage is populated from every dispatch site; `Tabs.selectTab` becomes `(model, value, index)`.
  - **`Ui.Calendar.SelectedDate({ date })`**: replaces `onSelectedDate(date)`. `Calendar.commitSelection` always emits `SelectedDate`. The pre-existing `Ui.Calendar.ChangedViewMonth` OutMessage remains.
  - **`Ui.DatePicker.SelectedDate({ date })`**: replaces `onSelectedDate(date)`. The pre-existing `Ui.DatePicker.ChangedViewMonth` OutMessage remains. DatePicker's internal `delegateToCalendar`/`delegateToPopover` helpers now handle Calendar and Popover OutMessages directly: on `Calendar.SelectedDate` it closes the popover and propagates `SelectedDate`; on `Popover.Opened`/`Closed` it drops the calendar back to the Days view. The programmatic helpers `DatePicker.open`, `close`, `selectDate`, and `clear` now return the full `[Model, Commands, Option<OutMessage>]` tuple (previously they discarded the third element), so a programmatic `selectDate` emits the same `SelectedDate` a user-initiated selection would.
  - **`Ui.Popover.Opened()` / `Ui.Popover.Closed()`**: replace `onOpened()` and `onClosed()`. The OutMessage fires once `update` has processed the corresponding `RequestedOpen`/`RequestedClose` Message and `isOpen` reflects the new state. Programmatic `Popover.close` on an already-closed model is a no-op that does not re-emit.

  ### When the parent has no reaction

  If the parent has no reaction to the child's OutMessage, drop the `Option.match` entirely. Destructure only the first two tuple elements and return `Option.none()` for your own OutMessage:

  ```ts
  GotProficiencyMessage: ({ message }) => {
    const [next, commands] = Ui.RadioGroup.update(model.proficiency, message)
    return [
      evo(model, { proficiency: () => next }),
      Command.mapMessages(commands, message =>
        GotProficiencyMessage({ message }),
      ),
      Option.none(),
    ]
  }
  ```

  The `Option.match` only earns its weight when `onSome` does work `onNone` doesn't, for example lifting to a richer parent type, dispatching additional commands, or mutating sibling state.

  ### Public exports

  `OutMessage` types and their variant tag constructors are exposed from each migrated primitive's public module:
  - `Ui.Menu.OutMessage`, `Ui.Menu.Selected`
  - `Ui.Disclosure.OutMessage`, `Ui.Disclosure.ToggledOpenState`
  - `Ui.Listbox.OutMessage`, `Ui.Listbox.Selected`
  - `Ui.Combobox.OutMessage`, `Ui.Combobox.Selected`
  - `Ui.RadioGroup.OutMessage`, `Ui.RadioGroup.Selected`
  - `Ui.Tabs.OutMessage`, `Ui.Tabs.Selected`
  - `Ui.Calendar.OutMessage`, `Ui.Calendar.SelectedDate`, `Ui.Calendar.ChangedViewMonth`
  - `Ui.DatePicker.OutMessage`, `Ui.DatePicker.SelectedDate`, `Ui.DatePicker.ChangedViewMonth`
  - `Ui.Popover.OutMessage`, `Ui.Popover.Opened`, `Ui.Popover.Closed`

- f1d8c31: Establish `reflect*` as the convention for conforming a Submodel to
  externally-sourced state. A `reflect*` helper sets a Submodel's value to mirror
  something that originated outside it (a URL, a server push, restored storage,
  parent state, or a sibling Submodel), without emitting an OutMessage. It is the
  inbound complement to OutMessage's outbound direction: OutMessage announces a
  change the Submodel made itself, so the parent reacts; `reflect*` conforms the
  Submodel to a change the world made, silently, because the external thing is
  already the source of truth. The silence is what lets a parent reflect external
  state without echoing it back out and looping (for example a `ChangedUrl`
  handler syncing a listbox to the URL).

  Each `reflect*` returns `Model` directly, not the `[Model, Commands,
Option<OutMessage>]` tuple the choice-based setters (`selectItem`, `select`,
  `selectTab`, `selectDate`, `setChecked`, `toggle`) return. The different return
  type makes "this cannot emit" visible at the call site. Each is also
  `Function.dual`, so it reads point-free in an `evo` callback:

  ```ts
  ChangedUrl: () => [
    evo(model, {
      dietListbox: DietListbox.reflectSelectedItem(fromUrl),
    }),
    [],
  ]
  ```

  ### Added
  - `Listbox.create().reflectSelectedItem(model, Option<Value>)` and
    `Listbox.Multi.create().reflectSelectedItems(model, ReadonlyArray<Value>)`
  - `Combobox.create().reflectSelectedItem(model, Option<{ item, displayText }>)`
    (sets the input text alongside the selection) and
    `Combobox.Multi.create().reflectSelectedItems(model, ReadonlyArray<Value>)`
  - `RadioGroup.create().reflectSelectedValue(model, Option<Value>)`
  - `Tabs.create().reflectSelectedTab(model, value, options)` (resolves the value
    to an index, mirroring `select`; a value not in `options` is a no-op)
  - `Calendar.reflectSelectedDate(model, Option<CalendarDate>)` and
    `DatePicker.reflectSelectedDate(model, Option<CalendarDate>)` (the picker also
    reflects onto its embedded calendar); both move the view to the date so the
    selection stays visible
  - `Checkbox.reflectChecked(model, boolean)`,
    `Switch.reflectChecked(model, boolean)`, and
    `Disclosure.reflectOpenState(model, boolean)`

  ### Renamed (breaking)

  The silent setters that already existed are renamed to the `reflect*` convention
  and are now dual. Behavior is unchanged; only the names change, plus the added
  data-last form.
  - `Calendar` and `DatePicker`: `setMinDate` → `reflectMinDate`, `setMaxDate` →
    `reflectMaxDate`, `setDisabledDates` → `reflectDisabledDates`,
    `setDisabledDaysOfWeek` → `reflectDisabledDaysOfWeek`
  - `Slider`: `setValue` → `reflectValue`, `setRange` → `reflectRange`

  The choice-based setters that emit (`setChecked`, `selectItem`, `selectDate`,
  and the rest) keep their names.

- f1d8c31: Replace `Ui.Listbox.view<Item>()` / `Ui.Combobox.view<Item>()` / `Ui.RadioGroup.view` / `Ui.Tabs.view` with `create<Item>()` factories that pair `view`, `update`, and the imperative helpers (`selectItem`, `open`, `close`, `select`, `selectTab`) behind a single type-parameterized entry point. Closes the soundness hole where the previous separate `view<Item>` and `update<Item>` generics could drift independently and TypeScript would accept the mismatch.

  ### Migration

  Before:

  ```ts
  // In view:
  Ui.Listbox.view<Color>({
    model: model.colorListbox,
    toParentMessage: message => GotColorListboxMessage({ message }),
    onSelectedItem: value => SelectedColor({ color: value as Color }), // cast required
    // ... other ViewConfig
  })

  // In update:
  const [next, commands] = Ui.Listbox.update(model.colorListbox, message)
  ```

  After:

  ```ts
  // At module scope:
  const ColorListbox = Ui.Listbox.create<Color>()

  // In view:
  h.submodel({
    slotId: 'colors',
    model: model.colorListbox,
    view: ColorListbox.view,
    toParentMessage: message => GotColorListboxMessage({ message }),
  })

  // In update:
  const [next, commands, maybeOutMessage] = ColorListbox.update(
    model.colorListbox,
    message,
  )
  // maybeOutMessage: Option<Ui.Listbox.OutMessage<Color>>
  // Selected branch carries `item: Color` directly; no cast needed.
  ```

  Declare the factory once at module scope. The returned object pairs everything Item-typed (view, update, selectItem, open, close) so Item drift becomes impossible: there's only one type parameter to set.

  ### Components in scope
  - **`Ui.Listbox.create<Item, Value?>()`**: two type params support object-typed items via `itemToValue`. `Value` defaults to `Item` when `Item extends string`, else `string`. The `itemToValue` extractor on `ViewInputs` is now typed `(item: Item) => Value` (was `=> string`), and is required when items are objects (optional when `Item extends string`, where the default is identity). Closes a soundness gap where `create<Person, 'red' | 'blue'>()` would accept an extractor returning any `string`.
  - **`Ui.Listbox.Multi.create<Item, Value?>()`**: same shape.
  - **`Ui.Combobox.create<Item>()`**: `Item extends string`. `itemToValue` codomain is now `Item` (was `string`).
  - **`Ui.Combobox.Multi.create<Item>()`**: same.
  - **`Ui.RadioGroup.create<Value>()`**: single type param, `Value extends string`. The view's ViewInputs stays string-typed (consumers pass a `ReadonlyArray<MyUnion>` which is assignable to `ReadonlyArray<string>`); the fenced cast inside `update` types the OutMessage's `value` as `Value`. The same propagation flows into `toView`: `option.value` is now typed as the consumer's `Value`, removing casts in the slot callback.
  - **`Ui.Tabs.create<Value>()`**: single type param, `Value extends string`. `TabInfo.value` in `toView` is typed as the consumer's tab union; removes the `tab.value as MyTab` cast at every Tabs consumer.
  - **`Ui.Menu.create<Item>()`**: single type param, `Item extends string`. `Selected` now carries `{ value: Item, index: number }` (was `{ index: number }`); consumers receive the picked value directly and no longer have to look it up via `items[index]`. `selectItem` becomes `(model, item, index)` to match.

  ### Bare runtime exports removed

  The factory is the only public path to `view`, `update`, and the imperative helpers (`selectItem`, `open`, `close`, `select`, `selectTab`) for the six components above. `Ui.Listbox.view`, `Ui.Listbox.update`, `Ui.Listbox.open`, `Ui.Listbox.close`, `Ui.Listbox.selectItem`, and the `Multi` counterparts are no longer exported, and the same applies to `Ui.Combobox.*`, `Ui.RadioGroup.update` / `select`, `Ui.Tabs.view` / `update` / `selectTab`, and `Ui.Menu.view` / `update` / `open` / `close` / `selectItem`. Forcing every call through `create<Item>()` makes Item-drift impossible: there's only one binding site for the type parameter.

  Migration: declare the factory at module scope and use the returned methods.

  ```ts
  // Before
  const [next, commands] = Ui.RadioGroup.update<Tool>(model.tool, message)

  // After
  const ToolRadioGroup = Ui.RadioGroup.create<Tool>()
  const [next, commands] = ToolRadioGroup.update(model.tool, message)
  ```

  ### Soundness

  The Item generic flows from `create<Item>()` to the OutMessage's `value` / `item` field through a fenced cast at `update`'s return. The cast is sound iff the value emitted in the OutMessage was originally drawn from the consumer-supplied items array, which holds for click and typeahead-search paths (both index into the items array).

  The realistic violation is a stale model surviving an items-list change: selecting `'Red'` when items are `[Red, Green, Blue]`, then later passing `[Yellow, Purple]` keeps the stored selection at `'Red'`, which the type system would now claim is in the new union but is not. The cast itself never throws; downstream code that assumes exhaustiveness (`Match.exhaustive`, `Record<Union, X>` lookups) might. Consumers using long-lived selections across dynamic-items renders should validate at the boundary if they are concerned.

- f1d8c31: `Ui.Switch.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds a new `ToggledChecked({ isChecked: boolean })` OutMessage variant, emitted on every toggle. Same shape as `Ui.Checkbox.ToggledChecked`. Closes the same gap where consumers shortcut around the Submodel wrapper to dispatch a domain Message directly.

  Existing 2-tuple destructures keep compiling; TypeScript accepts binding the head of a longer tuple. Consumers wanting to react to the toggle as a domain event pattern-match the third element:

  ```ts
  GotNotificationSwitchMessage: ({ message }) => {
    const [next, commands, maybeOutMessage] = Ui.Switch.update(
      model.notifications,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotNotificationSwitchMessage({ message }),
    )
    return Option.match(maybeOutMessage, {
      onNone: () => [evo(model, { notifications: () => next }), mappedCommands],
      onSome: M.type<Ui.Switch.OutMessage>().pipe(
        M.tagsExhaustive({
          ToggledChecked: ({ isChecked }) => [
            evo(model, { notifications: () => next }),
            [
              ...mappedCommands,
              PersistNotificationsEnabled({ value: isChecked }),
            ],
          ],
        }),
      ),
    })
  }
  ```

- f1d8c31: `Ui.Switch` gains a `SetChecked({ isChecked: boolean })` Message and a
  matching `setChecked(model, isChecked)` programmatic helper, mirroring
  `Ui.Checkbox.setChecked`. `SetChecked` forces the checked state to a
  specific value (unlike `Toggled`, which flips) and emits the same
  `ToggledChecked({ isChecked })` OutMessage so consumers react to
  programmatic state assignment the same way they react to user toggles.
  Use this in domain-event handlers that need to assign a specific state
  rather than flip the current one:

  ```ts
  const [nextSwitch] = Ui.Switch.setChecked(model.notifications, true)
  return [evo(model, { notifications: () => nextSwitch }), []]
  ```

  Previously the only update path was `Toggled`, whose flip semantics could
  not reliably reach a target state. The convention pushed consumers to
  assign `isChecked` directly on the submodel field, bypassing
  `Ui.Switch.update`. `setChecked` is the idiomatic route.

- f1d8c31: Rename the Toast view-config `renderEntry` field to `entryToView` so it lines up with the `toView` / `toConfig` slot-callback family used across the rest of `Ui.*`.

  ### Migration

  ```ts
  // Before
  viewInputs: {
    renderEntry: (entry, handlers) => h.div(...),
  }

  // After
  viewInputs: {
    entryToView: (entry, handlers) => h.div(...),
  }
  ```

- f1d8c31: `Ui.Toast.make(payloadSchema)` now returns a runtime whose `update` produces `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds a new `DismissedToast({ payload })` OutMessage variant, emitted once an entry finishes its leave animation and is being removed from the model. The payload is typed as your `Payload` schema, so consumers can lift the dismissal directly into a domain Message.

  Why the emit moment is `TransitionedOut`, not `Dismissed`: the internal `Dismissed` Message only requests the start of the leave animation. Firing `DismissedToast` at request time would emit too early. The entry is still visible and the parent might want to react when the dismissal actually completes (cleanup, analytics, resolving a pending Action). The OutMessage fires from `delegateToEntryAnimation`'s `TransitionedOut` arm, which is also where the entry is removed from `model.entries`.

  The factory now also returns `OutMessage` (the Schema union) and `DismissedToast` (the constructor) alongside the existing `Message`, `Added`, etc.:

  ```ts
  const Toast = Ui.Toast.make(ToastPayload)
  // Toast.OutMessage, Toast.DismissedToast: new
  // Toast.Message, Toast.Added: unchanged
  ```

  Existing 2-tuple destructures keep compiling; TypeScript accepts binding the head of a longer tuple. Consumers wanting to react to the dismissal as a domain event pattern-match the third element:

  ```ts
  const Toast = Ui.Toast.make(ToastPayload)

  GotToastMessage: ({ message }) => {
    const [next, commands, maybeOutMessage] = Toast.update(model.toast, message)
    const mappedCommands = Command.mapMessages(commands, message =>
      GotToastMessage({ message }),
    )
    return Option.match(maybeOutMessage, {
      onNone: () => [evo(model, { toast: () => next }), mappedCommands],
      onSome: M.type<Toast.OutMessage>().pipe(
        M.tagsExhaustive({
          DismissedToast: ({ payload }) => [
            evo(model, { toast: () => next }),
            [...mappedCommands, ResolveToastAction({ payload })],
          ],
        }),
      ),
    })
  }
  ```

- f1d8c31: `Ui.Tooltip.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds two OutMessage variants:
  - `Shown()`: emitted once the tooltip transitions to visible (`isOpen` becomes true).
  - `Hidden()`: emitted once the tooltip transitions to hidden (`isOpen` becomes false).

  Only fires on actual visibility transitions, not on internal state changes (hover, focus, delay updates), so consumers don't get spurious events. Useful for analytics, instrumentation, or coordinating with other transient UI.

  `Ui.Tooltip.setShowDelay` returns the same 3-tuple. Existing 2-tuple destructures keep compiling; TypeScript accepts binding the head of a longer tuple. Consumers wanting to react to visibility transitions as a domain event pattern-match the third element:

  ```ts
  GotHelpTooltipMessage: ({ message }) => {
    const [next, commands, maybeOutMessage] = Ui.Tooltip.update(
      model.helpTooltip,
      message,
    )
    const mappedCommands = Command.mapMessages(commands, message =>
      GotHelpTooltipMessage({ message }),
    )
    return Option.match(maybeOutMessage, {
      onNone: () => [evo(model, { helpTooltip: () => next }), mappedCommands],
      onSome: M.type<Ui.Tooltip.OutMessage>().pipe(
        M.tagsExhaustive({
          Shown: () => [
            evo(model, { helpTooltip: () => next }),
            [...mappedCommands, TrackTooltipShown({ id: 'help' })],
          ],
          Hidden: () => [
            evo(model, { helpTooltip: () => next }),
            mappedCommands,
          ],
        }),
      ),
    })
  }
  ```

### Patch Changes

- f1d8c31: Fix `Ui.DatePicker.clear` (and the underlying `Cleared` Message) leaving the
  embedded calendar's selection highlighted. `clear` cleared the picker's
  `maybeSelectedDate` but not the embedded calendar's, and the popover grid
  renders from the calendar's own state, so reopening showed the old date still
  highlighted even though the trigger and hidden input read empty. `clear` now
  clears the calendar's selection too.
- f1d8c31: Faster view rendering. The HTML attribute matcher used to be built once per VNode inside `buildVNodeData`; it is now built once at module load and shared across every VNode. Both naive and optimised paths benefit; naive constructs the matcher per VNode, so the gain is largest there, while optimised still does matcher work on items that change between renders (cache misses).
- f1d8c31: Trim runtime dispatch overhead on the queue-drain hot path.
  - `orderByPriority` now partitions a batch in a single forward pass with two small array allocations, instead of two `Array.filter` calls plus `Array.appendAll` plus `Array.map`. Per-call cost in the runtime microbenchmark drops from ~1.9µs to ~1.2µs (-40%).
  - `yieldToBrowser` reuses one `MessageChannel` for the runtime's lifetime, scoped via `Effect.acquireRelease`. Previously every burst-budget yield allocated a fresh channel and closed it on cancel.
  - `burstStartedAt` and `currentMessage` are now plain closure variables in the queue-drain fiber. They were `Ref`s but were never touched by another fiber, so the per-message `Ref.get`/`Ref.set` pair was pure overhead.
  - The DevTools store, installed at most once during boot, is cached in a closure variable instead of stored in a `Ref` that was read on every message and every render-loop tick.
  - `processMessage` guards its `Effect.forEach` over `commands` with an `Array.isReadonlyArrayEmpty` check. Most Messages produce zero Commands.

  Internal microbenchmark (`RUN_RUNTIME_BENCH=1 pnpm vitest run src/runtime/dispatchBench.test.ts`) on a happy-dom shell, 5000 external Messages per run, 8 measured runs per trial, 4 trials:
  - External burst total wall-clock: ~168.8 ms -> ~135.8 ms median (-19.5%)
  - Dispatch throughput: ~29.6k msg/s -> ~36.8k msg/s (+24%)
  - `orderByPriority` (batch=100): ~1.92µs -> ~1.17µs per call (-40%)

  No public API change. View functions, Commands, Mounts, Subscriptions, and DevTools all behave identically.

## 0.101.0

### Minor Changes

- 3efea04: Rebuild the Subscription API around four primitives: `Subscription.make`, `Subscription.lift`, `Subscription.aggregate`, and `Subscription.persistent`.

  The previous `Subscription.makeSubscriptions(Deps)<Model, Message>(configs)` shape required maintaining a `SubscriptionDependencies` struct in parallel with the field configs. Embedding a child Submodel that exposed its own Subscriptions meant reaching into the child's `SubscriptionDependencies.fields`, re-keying at the parent, and wrapping each stream individually with `Stream.map(message => GotChildMessage({ message }))`. One embedded child produced many lines of wrapping ceremony, and the structure did not mirror how `update` and `view` compose across Submodels. The new shape composes via one `lift` per child Submodel.

  ## Migration

  ### Renamed `equivalence` to `keepAliveEquivalence`

  The optional `equivalence` field on a Subscription entry is renamed to `keepAliveEquivalence`. The new name spells out what the field actually gates: when the equivalence accepts two snapshots as equal, the Stream stays alive across that change; otherwise the Stream tears down and restarts.

  Pure rename, behavior unchanged. Mechanical migration: replace `equivalence:` with `keepAliveEquivalence:` inside any `entry(...)` callbacks object. Other uses of the word `equivalence` in your code (Effect's `Equivalence` module imports, domain-level equivalence functions) are unaffected.

  ### Single-level Subscriptions

  Before:

  ```ts
  const SubscriptionDependencies = S.Struct({
    tick: S.Struct({ isRunning: S.Boolean }),
  })

  const subscriptions = Subscription.makeSubscriptions(
    SubscriptionDependencies,
  )<Model, Message>({
    tick: {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        Stream.when(
          Stream.tick(Duration.millis(100)).pipe(Stream.map(Ticked)),
          Effect.sync(() => isRunning),
        ),
    },
  })
  ```

  After:

  ```ts
  const subscriptions = Subscription.make<Model, Message>()(entry => ({
    tick: entry(
      { isRunning: S.Boolean },
      {
        modelToDependencies: model => ({ isRunning: model.isRunning }),
        dependenciesToStream: ({ isRunning }) =>
          Stream.when(
            Stream.tick(Duration.millis(100)).pipe(Stream.map(Ticked)),
            Effect.sync(() => isRunning),
          ),
      },
    ),
  }))
  ```

  The first argument to `entry` is the inline field map (the same shape you would pass to `S.Struct`). The dependency type is inferred from that map.

  ### Always-active Streams

  Use `Subscription.persistent` for Streams whose lifecycle should match the program (no Model dependency):

  ```ts
  const subscriptions = Subscription.make<Model, Message>()(_entry => ({
    keyboard: Subscription.persistent(
      Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
        Stream.map(event => PressedKey({ key: event.key })),
      ),
    ),
  }))
  ```

  This replaces the previous `S.Null` + `modelToDependencies: () => null` idiom.

  ### Embedding a child Submodel's Subscriptions

  Before:

  ```ts
  const dragAndDropFields = Ui.DragAndDrop.SubscriptionDependencies.fields

  const SubscriptionDependencies = S.Struct({
    dragPointer: dragAndDropFields['documentPointer'],
    dragEscape: dragAndDropFields['documentEscape'],
    // ...
  })

  const subscriptions = Subscription.makeSubscriptions(
    SubscriptionDependencies,
  )<Model, Message>({
    dragPointer: {
      modelToDependencies: model =>
        Ui.DragAndDrop.subscriptions.documentPointer.modelToDependencies(
          model.dragAndDrop,
        ),
      dependenciesToStream: (deps, readDeps) =>
        Ui.DragAndDrop.subscriptions.documentPointer
          .dependenciesToStream(deps, readDeps)
          .pipe(Stream.map(message => GotDragAndDropMessage({ message }))),
    },
    // ...one entry per child Subscription...
  })
  ```

  After:

  ```ts
  const subscriptions = Subscription.lift({
    dragPointer: Ui.DragAndDrop.subscriptions.documentPointer,
    dragEscape: Ui.DragAndDrop.subscriptions.documentEscape,
    dragKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
    autoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
  })<Model, Message>({
    toChildModel: model => model.dragAndDrop,
    toParentMessage: message => GotDragAndDropMessage({ message }),
  })
  ```

  One `lift` covers an entire child Submodel's Subscriptions. Per-entry dependency schemas, `keepAliveEquivalence` settings, and the `readDependencies` thunk for keep-alive entries are preserved automatically.

  ### Combining multiple records

  Use `Subscription.aggregate` when a level holds Subscriptions from more than one source (lifted children, inline entries, or both):

  ```ts
  export const subscriptions = Subscription.aggregate<Model, Message>()(
    localSubscriptions,
    childASubscriptions,
    childBSubscriptions,
  )
  ```

  Duplicate keys across records throw at startup.

  ### Removed exports
  - `Subscription.makeSubscriptions` — use `Subscription.make`.
  - `Ui.DragAndDrop.SubscriptionDependencies`, `Ui.Slider.SubscriptionDependencies`, `Ui.VirtualList.SubscriptionDependencies` — compose those Subscriptions through `Subscription.lift` directly. The `subscriptions` records still ship from each module.
  - `AnimationFrameSubscription` type — `Subscription.animationFrame` still returns an entry value and slots into `Subscription.make` unchanged at the call site.

  See the new Patterns / Subscription Organization page for the canonical leaf, composing, and root layouts.

### Patch Changes

- e9d4f06: Tighten the Built on Effect paragraph in the README: name Commands explicitly in the side-effects sentence and drop the redundant trailing sentence.

## 0.100.1

### Patch Changes

- e38c5e8: Disable clearing history while time-travel is paused. The devtools overlay hides the "Clear history" button until you resume, and the underlying store treats clear as a no-op when paused. Previously, clearing while paused wiped the message entries the paused snapshot was being replayed from, leaving the runtime stuck on a historical state with no path back to live.
- 5338579: Update README and template docs to recommend binding `const h = html<Message>()` inside view functions instead of at module level. The function-level binding accepts the function's actual Message type parameter (including `<ParentMessage>` for child views), keeps view functions portable across files, and removes the need to decide where the binding lives. Behavior unchanged.

## 0.100.0

### Minor Changes

- 8cfa966: Add `foldkit_get_message_schema`, a new DevTools MCP tool that lets agents discover the exact shape of every Message variant the runtime accepts without reading the application source.

  The tool exposes the runtime's Message Schema as a JSON Schema document derived from `DevToolsConfig.Message` via `Schema.toJsonSchemaDocument`. Two call modes keep responses small even for production-scale Message unions:
  - **No argument** returns a flat variant index. Each entry carries the variant's `_tag`, its payload field names, and which payload fields are themselves tagged-union shapes the agent will need to pick a variant for.
  - **`variant_tag` as a dot-separated path** (e.g. `"GotMobileMenuDialogMessage.GotAnimationMessage"`) walks the path through each variant's single tagged-union payload field and returns the JSON Schema narrowed along the chain. Discriminated unions deeper than the path collapse to `{ "_summary": "union", "variants": [...] }` placeholders so the response stays compact at every depth. Agents extend the path to drill further.

  Submodel Messages recurse correctly. `S.Option` fields render as `anyOf` of the `Some` and `None` tag shapes; apps using the JSON-boundary codec `S.OptionFromNullishOr(T)` instead see the field as nullable `anyOf: [T, null]` and should dispatch the bare value or `null` rather than a tagged envelope. The `definitions` block is kept across narrowing so `$ref` targets still resolve, and any discriminated unions it carries (e.g. a shared union annotated with an `identifier`) are collapsed to the same `_summary` placeholder shape. The path walker does not resolve `$ref` indirection itself; agents that need to step through a shared union look it up in `definitions` by name and use the placeholder's variant list. Fields with no JSON representation, like `S.instanceOf(File)`, render as `{ type: 'null' }`; those variants can't be dispatched via MCP because their values live in browser memory. When the app hasn't configured a Message Schema, the response is `maybeResult: None`. The same fallback applies when the schema contains exotic AST nodes that `Schema.toJsonSchemaDocument` rejects at derivation time (symbol-keyed structs, symbol-indexed records, tuples with post-rest elements); the bridge guards the call so a failing schema logs a warning rather than crashing the bridge.

  No application changes required.

- e975f60: The router now leaves link clicks alone when the user is asking the browser to handle them. Cmd/Ctrl/Shift/Alt-click, middle and right-click, links with a `target` other than `_self`, and links with a `download` attribute all behave the way the platform does outside an SPA. Clicks whose default has already been prevented by an app-level handler are also left intact.

  Previously, every primary-button click on an `<a>` with a non-empty href was captured and dispatched as a `UrlRequest`, so opening a link in a new tab or downloading a file silently did nothing.

## 0.99.0

### Minor Changes

- f10dffc: Bump Effect to `4.0.0-beta.66` (from `4.0.0-beta.64`). Foldkit's peer dependencies now require `effect@4.0.0-beta.66` and `@effect/platform-browser@4.0.0-beta.66`.

  beta.66 tightened `Effect.gen`'s `Yieldable` constraint, so an internal call site in `ManagedResource.tag` that yielded a raw `Option` now bridges through `Effect.fromOption`. Behavior is unchanged.

  Consumers should align their Effect packages to `4.0.0-beta.66` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.66 @effect/platform-browser@4.0.0-beta.66
  pnpm add -D @effect/vitest@4.0.0-beta.66
  ```

- b19c234: `Mount.define` and `Mount.defineStream` both require at least one declared result Message. The `Results` generic on every overload is now constrained to a non-empty tuple, so calling either constructor with no result schemas no longer typechecks.

  This closes a loophole where a Mount factory could produce no Messages at all — `Effect.never` for `Mount.define`, `Stream<never>` or `Stream.empty` for `Mount.defineStream`. A Mount that runs DOM work for an element's lifetime without dispatching anything is invisible to DevTools history, can't be acknowledged by Scene tests, and can't be reasoned about during time-travel replay.

  Fire-and-forget Mounts follow the same convention as fire-and-forget Commands: declare a `Completed*` result Message that `update` no-ops on. The side effect stays observable; `update` simply has nothing meaningful to do with the acknowledgment.

  Existing in-repo call sites all declare result Messages, so no migration is needed. Downstream consumers who depended on the looser constraint will see a type error and can add a `Completed*` acknowledgment Message and dispatch it.

## 0.98.1

### Patch Changes

- 9cb7422: DevTools' Commands and Mounts inspector tabs now reflect the latest entry in TimeTravel mode while Live. Previously they fell back to init state when no row was explicitly selected, even though the Model and Message tabs already showed the latest entry.

## 0.98.0

### Minor Changes

- e81110d: **Breaking:** Mount has two constructors picked by emission cardinality. `Mount.define` is for one-shot Mounts that produce exactly one Message at acquire (the common case). `Mount.defineStream` is for Mounts that emit a continuum of events from observers or listeners attached to the element.

  `Mount.define` now takes `(element: Element) => Effect<Message>`. The Effect produces exactly one of the declared result Messages at acquire; the type system enforces this contract the same way it does for `Command.define`. Cleanup composes via `Effect.acquireRelease` inside the Effect, and the runtime keeps the scope open across the element's full lifetime so finalizers run when the element unmounts, not when the Effect completes.

  `Mount.defineStream` takes `(element: Element) => Stream<Message>`. Use it when the Mount's job is to emit a stream of Messages from event listeners or observers (scroll events, IntersectionObserver entries, MutationObserver records). The `MountResult` type is removed from `foldkit/html`.

  ## Migrating one-shot Mounts

  The `{ message, cleanup }` record becomes an `Effect` whose success value is the Message, with cleanup registered via `Effect.acquireRelease`.

  Before:

  ```ts
  const PortalToBody = Mount.define(
    'PortalToBody',
    CompletedPortalToBody,
  )(element =>
    Effect.sync(() => {
      document.body.appendChild(element)
      return {
        message: CompletedPortalToBody(),
        cleanup: () => element.remove(),
      }
    }),
  )
  ```

  After:

  ```ts
  const PortalToBody = Mount.define(
    'PortalToBody',
    CompletedPortalToBody,
  )(element =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => document.body.appendChild(element)),
        () => Effect.sync(() => element.remove()),
      )
      return CompletedPortalToBody()
    }),
  )
  ```

  If the Mount has no cleanup (the Effect just reads from the element and emits its Message), drop the `acquireRelease` entirely and return the Message directly:

  ```ts
  const MeasurePanelWidth = Mount.define(
    'MeasurePanelWidth',
    MeasuredPanelWidth,
  )(element =>
    Effect.sync(() =>
      MeasuredPanelWidth({ width: element.getBoundingClientRect().width }),
    ),
  )
  ```

  ## Migrating continuous-event Mounts

  Move to `Mount.defineStream`. Attach the listener inside `Effect.acquireRelease`'s acquire body, offer each event's Message to the queue, and let the release detach the listener when the element unmounts.

  ```ts
  const ListenSidebarScroll = Mount.defineStream(
    'ListenSidebarScroll',
    ScrolledSidebar,
  )(element =>
    Stream.callback<typeof ScrolledSidebar.Type>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const handler = () =>
              Queue.offerUnsafe(
                queue,
                ScrolledSidebar({ scroll: element.scrollTop }),
              )
            element.addEventListener('scroll', handler, { passive: true })
            return handler
          }),
          handler =>
            Effect.sync(() => element.removeEventListener('scroll', handler)),
        )
        return yield* Effect.never
      }),
    ),
  )
  ```

  ## Third-party libraries: construct INSIDE the acquire body

  For Mounts that instantiate a third-party library (chart, map renderer, audio context, anything with a stateful handle), construct the handle as the success value of `Effect.acquireRelease`'s acquire Effect, not before it. `acquireRelease` only guarantees atomicity of "acquire body completes → release is registered"; anything constructed outside the acquire body is unprotected against interruption.

  ```ts
  // ❌ Wrong: chart is constructed before acquireRelease registers its release.
  // Interruption between the two yield*s leaks the chart.
  Effect.gen(function* () {
    const { Chart } = yield* Effect.tryPromise(() => import('chart-lib'))
    const chart = new Chart(element, { data })
    yield* Effect.acquireRelease(
      Effect.sync(() => chart),
      chart => Effect.sync(() => chart.destroy()),
    )
    return SucceededMountChart()
  })

  // ✅ Right: construction lives in the acquire Effect, so registration is atomic.
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.tryPromise(() => import('chart-lib')).pipe(
        Effect.map(({ Chart }) => new Chart(element, { data })),
      ),
      chart => Effect.sync(() => chart.destroy()),
    )
    return SucceededMountChart()
  })
  ```

  The discipline: whatever the release function needs as input must be the success value of the acquire Effect. This applies anywhere `acquireRelease` is used, not just in Mounts.

  ## Picking between the two

  Use `Mount.define` when the Mount produces a single Message at acquire and holds lifecycle-scoped resources for the rest of the element's lifetime (anchor positioning, portaling, third-party library instantiation). Use `Mount.defineStream` only when the Mount's job is to emit a continuous stream of Messages from listeners or observers attached to the element.

  If a Mount has no cleanup and dispatches its Message once on appearance, the cause is often a Message that just dispatched (a route landing, a dialog opening, a form submitting), not the element's existence. That's a Command, not a Mount. Re-check the cause before adding the Mount.

## 0.97.2

### Patch Changes

- 670e4d7: Fix DevTools MCP dispatch failing on Messages whose payloads contain Effect self-codec types like `Schema.Option`, `Schema.Date`, `Schema.Map`, and `Schema.Set`. The bridge now derives a JSON-canonical codec from your Message Schema via `Schema.toCodecJson` at boot and decodes incoming dispatch payloads against that, so the JSON-tagged shapes agents naturally produce (`{ _tag: "Some", value }`, ISO date strings, etc.) reconstruct into the correct runtime values. No application changes required. Your domain Schema stays unchanged.

## 0.97.1

### Patch Changes

- 855e3ba: Document the single-position constraint in the `createLazy` and `createKeyedLazy` TSDoc. A cached VNode can only be rendered at one position in the tree; rendering the same cached VNode at two positions causes snabbdom's patches to collide and can duplicate or misplace DOM nodes. If the same content needs to appear in multiple positions, create a separate lazy slot for each position.

## 0.97.0

### Minor Changes

- 83e4204: DevTools no longer auto-scrolls the message list back to the top when the user has manually scrolled away. A "Jump to top" pill appears at the top of the list when scrolled, and clicking it (or scrolling back to within 8px of the top) re-engages auto-scroll. Selection-follow ("Follow Latest") and scroll-follow are now independent: clicking a row stops selection-follow without affecting scroll, and the new pill controls scroll without affecting selection. Clicking Resume or Clear re-engages both follows and jumps the list to the top.

  **Breaking:** `h.OnScroll` now takes `(scrollTop: number) => Message` instead of a fixed `Message`, matching the `h.OnInput` / `h.OnChange` extractor pattern. Migration: `h.OnScroll(MyMessage())` becomes `h.OnScroll(() => MyMessage())`, or use the `scrollTop` argument to build a richer Message.

- 360e062: `Story.Command.resolve` and `Scene.Command.resolve` now throw when more than one pending Command matches the matcher, surfacing what was previously a silent first-match-wins behavior. Ambiguous resolves are almost always a test bug: the test author intended one specific Command but happened to hit the first of several identical pending matches, often coincidentally.

  **Breaking:** Tests that relied on issuing N successive `resolve` calls for N same-named pending Commands now throw. Switch those call sites to `Story.Command.resolveAll` (or `Scene.Command.resolveAll`), which consumes ordered resolver pairings in declaration order. Where the colliding Commands have distinguishing args, pass a Command instance (e.g. `FetchById({ id: 5 })`) for type-checked disambiguation.

### Patch Changes

- f4611f9: Tidy the `resources` TSDoc on `Runtime.makeProgram`'s config into two sentences. Behavior is unchanged. The guidance still steers stateless utilities like `HttpClient` and JSON encoding away from `resources` and toward per-command `Effect.provide`.

## 0.96.0

### Minor Changes

- b76e3b2: Add `Dom.scrollIntoViewAfterPaint`, a sibling of `Dom.scrollIntoView` that waits for `Render.afterPaint` instead of `Render.afterCommit` before resolving the selector. Reach for it when the scroll target was just brought into the DOM by the same Message that dispatches the scroll, such as a routing flow landing at a URL fragment.

  Extend `Dom.scrollIntoView` and `Dom.scrollIntoViewAfterPaint` with a `{ block?: ScrollLogicalPosition }` option, defaulting to `'nearest'`.

  Extend `Dom.focus` with `{ preventScroll?: boolean; makeFocusable?: boolean }` options. `makeFocusable` injects `tabindex="-1"` on the target when it has no `tabindex`. `preventScroll` suppresses the browser's default scroll-on-focus.

  The three helpers compose for URL-fragment-navigation accessibility:

  ```ts
  const ScrollToAnchor = Command.define(
    'ScrollToAnchor',
    { hash: S.String },
    CompletedScrollToAnchor,
  )(({ hash }) =>
    Effect.gen(function* () {
      const target = `#${hash}`
      yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
      yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
      return CompletedScrollToAnchor()
    }),
  )
  ```

  `scrollIntoViewAfterPaint` waits for the new Model to commit and the browser to lay it out. `focus` with `makeFocusable: true` makes non-natively-focusable targets (like `<h2>` section headings) receive keyboard focus. `preventScroll: true` keeps the focus call from undoing the scroll.

- 7e2726e: **Breaking:** Rename the exported `SubscriptionDeps` struct on UI components to `SubscriptionDependencies`. Affects `Ui.Slider`, `Ui.VirtualList`, and `Ui.DragAndDrop`. Update every callsite that references the old name:

  ```ts
  // before
  Ui.Slider.SubscriptionDeps.fields['dragPointer']
  Ui.VirtualList.SubscriptionDeps.fields['containerEvents']
  Ui.DragAndDrop.SubscriptionDeps.fields['documentPointer']

  // after
  Ui.Slider.SubscriptionDependencies.fields['dragPointer']
  Ui.VirtualList.SubscriptionDependencies.fields['containerEvents']
  Ui.DragAndDrop.SubscriptionDependencies.fields['documentPointer']
  ```

  By convention application code that names a local subscription dependency schema should also rename it from `SubscriptionDeps` to `SubscriptionDependencies` to match. The runtime API (`Subscription.makeSubscriptions`) accepts any schema name, so this convention change is not enforced by the types.

### Patch Changes

- 2547569: Fix `document.title`, `<link rel="canonical">`, and `<meta property="og:url">` not updating across renders.

  The runtime cached the container element passed to it at startup and used `document.body.contains(container)` to guard document metadata updates. Snabbdom replaces the container element on the first patch whenever the root VNode's selector doesn't match the container's. A common case: mounting on `<div id="root">` with a top-level view of `<div class="...">`. That detached the cached reference, the guard short-circuited every subsequent render, and document metadata stayed pinned to whatever the static HTML provided.

  The runtime now checks the patched VNode's live element instead, so metadata updates work regardless of selector mismatches between the container and the root view.

## 0.95.1

### Patch Changes

- b784821: Internal: replace a ternary that wrapped the optional `resources` Layer in `Option.some`/`Option.none` with `Option.fromNullishOr`, the idiomatic primitive for `T | undefined` → `Option<T>`.

## 0.95.0

### Minor Changes

- 209e074: Widen `makeProgram`'s `container` input to `HTMLElement | null`.

  ```ts
  // Before
  container: document.getElementById('root')!,

  // After (the `!` is no longer required)
  container: document.getElementById('root'),
  ```

  If the element is missing, the runtime throws a clear error at the `makeProgram` call site.

- 94e940c: Move `UrlRequest`, `Internal`, and `External` from the `Runtime` namespace to `Navigation`.

  ```ts
  // Before
  import { Runtime } from 'foldkit'
  const ClickedLink = m('ClickedLink', { request: Runtime.UrlRequest })

  // After
  import { UrlRequest } from 'foldkit/navigation'
  const ClickedLink = m('ClickedLink', { request: UrlRequest })
  ```

  The namespaced form is also available via the main barrel:

  ```ts
  import { Navigation } from 'foldkit'

  const ClickedLink = m('ClickedLink', { request: Navigation.UrlRequest })
  ```

  A `UrlRequest` is a navigation primitive that pairs with the Commands (`pushUrl`, `load`) that consume it, so it now lives in the same namespace.

  `Internal` and `External` are now exported as callable Schema constructors in addition to types, so you can build a `UrlRequest` directly (useful for tests):

  ```ts
  import { External, Internal } from 'foldkit/navigation'

  const request = Internal({ url: someUrl })
  ```

### Patch Changes

- 209e074: Update README to document the `main.ts` / `entry.ts` split and `Document` view return type.

  The counter example now shows `src/main.ts` exporting Model, Message, init, update, and view, and `src/entry.ts` importing them to boot the runtime with `Runtime.makeProgram` + `Runtime.run`. The view returns a `Document` (`{ title, body }`) so the program can set the document title declaratively.

## 0.94.0

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

## 0.93.0

### Minor Changes

- ba61bf6: Add a session scrubber to the DevTools panel. In TimeTravel mode, a horizontal slider sits at the bottom of the panel and lets you drag through the message history. Each step replays the host app to that point, so you can watch the UI evolve over the session instead of clicking message rows one at a time. Keyboard navigation works the same as any Foldkit slider (arrows, Page Up/Down, Home, End). The scrubber is hidden in Inspect mode.

  The DevTools `mode` config now accepts `{ development, production }` to select different modes per environment. Useful when `show: 'Always'` keeps DevTools available in production but you want `'TimeTravel'` only in local development. `'TimeTravel'` in production pauses the user's actual app when a history row is clicked, so the per-environment form makes shipping the safer `'Inspect'` mode to users opt-in by design.

  The Slider component now accepts an optional `getTrackRoot: () => Document | ShadowRoot` in `ViewConfig`, plus a `subscriptionsForRoot(getTrackRoot)` factory next to the existing `subscriptions` value. Both default to `document`. Pass a `ShadowRoot` when rendering the slider inside a shadow tree so pointer events on the track can find their bounding rect.

  The Slider's `SubscriptionDeps` fields are renamed from `documentPointer` / `documentEscape` to `dragPointer` / `dragEscape`. The names now describe the activity (drag) rather than the listener attachment point, since the track lookup is configurable per the change above. Update every callsite that references the old names:

  ```ts
  // Before
  Slider.SubscriptionDeps.fields['documentPointer']
  Slider.SubscriptionDeps.fields['documentEscape']
  sliderSubscriptions.documentPointer.modelToDependencies(model)
  sliderSubscriptions.documentEscape.dependenciesToStream(...)

  // After
  Slider.SubscriptionDeps.fields['dragPointer']
  Slider.SubscriptionDeps.fields['dragEscape']
  sliderSubscriptions.dragPointer.modelToDependencies(model)
  sliderSubscriptions.dragEscape.dependenciesToStream(...)
  ```

  Slider also adds `setRange(model, { min, max })` and `setValue(model, value)` helpers for parents that need to sync slider state from external state. Both snap and clamp the resulting value to the new range. `setValue` is a no-op while the user is actively dragging, so external updates don't fight pointer input.

### Patch Changes

- dbfb1ec: Bump Effect to `4.0.0-beta.64` (from `4.0.0-beta.59`) across the workspace, and replace the hand-rolled fallback cascade in `route/parser.ts:oneOf` with `Effect.firstSuccessOf`, which was reintroduced in beta.61 ([effect-smol#2120](https://github.com/Effect-TS/effect-smol/pull/2120)).

  Consumers should align their `effect`, `@effect/platform-browser`, `@effect/platform-node`, and `@effect/vitest` pins to `4.0.0-beta.64`.

  ```bash
  pnpm add effect@4.0.0-beta.64
  pnpm add -D @effect/platform-browser@4.0.0-beta.64 @effect/platform-node@4.0.0-beta.64 @effect/vitest@4.0.0-beta.64
  ```

  Behavior is unchanged. The `oneOf` route parser still tries each parser in order and returns the first success (or the last failure if all fail).

## 0.92.0

### Minor Changes

- fb02feb: Add `devTools.excludeFromHistory` and `devTools.maxEntries` to control DevTools history behavior.

  ```ts
  const program = Runtime.makeProgram({
    // ...
    devTools: {
      Message,
      excludeFromHistory: ['TickedFrame', 'MovedPointer'],
      maxEntries: 500,
    },
  })
  ```

  `excludeFromHistory` skips recording the listed Message tags. The Messages still drive `update` and the runtime as usual; they just don't appear in the history panel and don't pay the per-Message diff cost. Reach for this when an animation-frame Subscription, pointer-move handler, scroll listener, or other high-frequency dispatcher would otherwise flood history with entries that all look the same. The history panel becomes useful again, and DevTools recording stops dominating frame time on dev builds.

  When `excludeFromHistory` is set, DevTools also switches to a per-entry snapshot strategy: every recorded entry stores the live model at the moment it was recorded, so time-travel jumps to that entry are exact and never need to replay through Messages that were excluded. Without this, jumping to a recorded entry would replay only the kept Messages and miss any cumulative state the excluded ones would have produced. The DevTools "Live" model view stays in sync as well: excluded Messages still update the latest-model snapshot, they just don't append a history entry or compute a diff.

  `maxEntries` caps how many recorded Messages are retained before the oldest is evicted. The default drops from 500 to **100**: at modest message rates a deeper history is rarely useful for debugging, and the smaller cap keeps the panel snappy under heavy traffic. Clamped to the range 20-500. Each retained entry is one append + diff in the regular case, or one append + full Model snapshot when `excludeFromHistory` is active, so memory cost scales with both `maxEntries` and your Model size.

## 0.91.0

### Minor Changes

- ef45ed5: Add `foldkit/canvas` subpath export for declarative 2D canvas rendering.

  `Canvas.view` produces a `<canvas>` VNode whose pixel state is a pure function of a `shapes` prop. The canvas re-paints on every patch with the latest shapes, so time-travel through DevTools reproduces past frames exactly.

  ```ts
  import { Canvas } from 'foldkit'

  // In view:
  Canvas.view<Message>({
    width: 600,
    height: 400,
    shapes: [
      Canvas.Rect({ x: 0, y: 0, width: 600, height: 400, fill: '#0a0a0f' }),
      Canvas.Circle({ x: 100, y: 100, radius: 25, fill: '#ff2d55' }),
      Canvas.Group({
        translate: { x: 300, y: 200 },
        rotate: model.angle,
        shapes: [
          Canvas.Path({
            instructions: [
              Canvas.MoveTo({ x: 0, y: 0 }),
              Canvas.LineTo({ x: 50, y: 0 }),
              Canvas.LineTo({ x: 25, y: 43 }),
              Canvas.Close(),
            ],
            fill: '#ffcc00',
          }),
        ],
      }),
      Canvas.Text({
        x: 10,
        y: 30,
        content: `Score: ${model.score}`,
        font: '24px sans-serif',
        fill: 'white',
      }),
    ],
    onPointerDown: ({ x, y }) => ClickedCanvas({ x, y }),
  })
  ```

  ## Shapes
  - `Canvas.Rect`: axis-aligned rectangle with `fill` / `stroke` / `lineWidth`.
  - `Canvas.Circle`: filled or stroked circle.
  - `Canvas.Path`: sequence of `MoveTo` / `LineTo` / `QuadTo` / `BezierTo` / `Close` instructions, with `lineCap` / `lineJoin`.
  - `Canvas.Text`: single line of text with `font` / `align` / `baseline`.
  - `Canvas.Group`: wraps children in a 2D transform (`translate`, `rotate`, `scale`, `opacity`); composes recursively.

  `Canvas.Shape` is a discriminated union over the variants. Pattern-match with `Match.tagsExhaustive` if you need to inspect or transform shapes.

  ## Pointer events

  `onPointerDown` / `onPointerMove` / `onPointerUp` are config args on `Canvas.view`. They receive a `Point` already translated to the canvas's internal coordinate space (independent of CSS sizing).

  For continuous animation (physics simulations, generative scenes, time-based motion), pair `Canvas.view` with `Subscription.animationFrame`.

  ## Out of scope for this release

  No imperative escape hatch (`DrawFrame((ctx) => ...)`-style Commands), no images / textures, no gradients, no patterns, no WebGL. The declarative path covers pixel art, board games, card games, 2D puzzlers, generative art, charts, and dataviz. The escape hatch is intentionally deferred until a real use case demands it; opting into imperative drawing breaks pixel-level time travel and that tradeoff should be made explicitly.

- f004d31: Add `Subscription.animationFrame`, a Subscription helper that emits a Message every `requestAnimationFrame` tick with the inter-frame delta in milliseconds.

  ```ts
  import { Subscription } from 'foldkit'

  const SubscriptionDeps = S.Struct({ frame: S.Boolean })

  const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
    Model,
    Message
  >({
    frame: Subscription.animationFrame({
      isActive: model => model.isPlaying,
      toMessage: deltaTime => TickedFrame({ deltaTime }),
    }),
  })
  ```

  `isActive` returning `false` tears the rAF loop down entirely (game paused, scene static, animation finished); the loop restarts when the gate flips back. Pair with `S.Boolean` in your `SubscriptionDeps` schema.

  Reach for `Subscription.animationFrame` whenever you want smooth, time-based motion driven by Model updates: physics simulations, generative art, parallax scrolling, custom interpolations. The `deltaTime` payload makes simulation speed independent of frame rate. For discrete game ticks (one step every N ms regardless of refresh rate), `Stream.tick` is still the right primitive.

### Patch Changes

- 0d4a522: Fix beveled appearance of DevTools inspector tabs, the resume button, and the filter button. A find-and-replace during a recent refactor accidentally inlined `h.` into three CSS class strings (`dt-tab-h.button`, `dt-resume-h.button`, `dt-filter-h.button`), so each button fell back to UA-default styling (white background, system bevel). The class names are restored to `dt-tab-button`, `dt-resume-button`, and `dt-filter-button`.
- 827bbf2: Fix DevTools resume leaving DOM event handlers bound to a no-op dispatch. After time-traveling and resuming, every event handler on the rebuilt DOM (any `On*` attribute produced by the html factory, plus pointer handlers attached via `Canvas.view` and any other listener built on the runtime's `Dispatch` service) silently dropped Messages until a Subscription emission happened to trigger an internal re-render.

  The jumpTo render path intentionally uses `noOpDispatch` so mount Effects fired during inspection don't pollute history. Resume was reusing the same render path, so the rebuilt DOM had every listener bound to the no-op even after the user returned to live state. Resume now flips `isPaused` to false and asks the render loop to tick once with the live dispatch, which rebinds listeners on the next animation frame.

## 0.90.1

### Patch Changes

- 1e6cb6c: Adopt a single canonical convention for the html factory inside view code: bind `html<...>()` to a local `h` in the scope where the relevant Message type is available, then access elements, attributes, and event handlers as `h.div`, `h.OnClick`, etc.

  Previously, view code destructured individual elements and attribute builders out of `html<...>()`. Generic Submodel views (like `Ui.Disclosure.view`) destructured inside the function body, where the `<ParentMessage>` generic was in scope. Views bound to a fixed Message type at module level destructured once at the top of the module, sometimes re-exported from a per-app `html.ts` file. The new convention collapses both onto the same dotted shape.

  Pure style change inside foldkit's UI components, devtools overlay, crash view, and the README counter example. The `html` function and the record it returns are unchanged; existing apps continue to run.

  The same convention applied to consumer code is documented under the new "Wiring the View" section in the website's Submodels docs, which describes how to keep child views truly generic over a parent's Message type by taking `<ParentMessage>` as a function generic rather than an imported alias.

## 0.90.0

### Minor Changes

- 5eff785: Take Mount args as data in `Mount.define`.

  `Mount.define` is now a curried call. The first call binds the name and result Message schemas (and optionally an args Schema record); the second binds the factory, or a factory builder when args are declared. The returned Definition is callable to produce a `MountAction`: pass the declared args, or call with no args for argless Mounts.

  Each Mount instance carries its args as a field, and the runtime surfaces that field through:
  - **The DevTools Mounts tab**: each Mount renders as a tag at the top of its row with the declared args as a data tree below (chevrons for nested fields). Argless Mounts show only the name.
  - **The MCP wire protocol** consumed by `@foldkit/devtools-mcp`: `SerializedEntry.mountStartNames` / `mountEndNames` and `ResponseInit.mountStartNames` are replaced by `mountStarts` / `mountEnds: Array<{ name: string; args: Option<Record<string, unknown>> }>`.
  - **`Scene.Mount` matchers** (`expectHas`, `expectExact`, `expectEnded`, `resolve`, `resolveAll`): each now accepts either a Mount Definition (matches by name; existing lax behavior) or a Mount instance (matches by name AND structural-equal args; new strict behavior). Pass a Definition when the test only cares that some Mount with this identity is rendered; pass an instance when the test should verify the args the runtime captured.

  ```ts
  // Lax: matches any AnchorPopover, regardless of args
  Scene.Mount.expectHas(AnchorPopover)

  // Strict: only matches AnchorPopover({ buttonId: 'cart-button', anchor })
  Scene.Mount.expectHas(AnchorPopover({ buttonId: 'cart-button', anchor }))
  ```

  Failure messages now show the args the runtime captured alongside the args expected, so a wrong-args mismatch reads `AnchorPopover {"buttonId":"settings-button","anchor":{...}}` vs `AnchorPopover {"buttonId":"cart-button","anchor":{...}}` rather than just `AnchorPopover`.

  ## Migration

  ### Argless Mounts

  ```ts
  // Before
  const FocusInput = Mount.define('FocusInput', CompletedFocusInput)
  const focusInput = FocusInput(element =>
    Effect.sync(() => {
      if (element instanceof HTMLInputElement) element.focus()
      return { message: CompletedFocusInput(), cleanup: Function.constVoid }
    }),
  )

  // At the call site:
  OnMount(focusInput)
  ```

  ```ts
  // After
  const FocusInput = Mount.define(
    'FocusInput',
    CompletedFocusInput,
  )(element =>
    Effect.sync(() => {
      if (element instanceof HTMLInputElement) element.focus()
      return { message: CompletedFocusInput(), cleanup: Function.constVoid }
    }),
  )

  // At the call site:
  OnMount(FocusInput())
  ```

  The camelCase factory (`focusInput`) goes away. The PascalCase Definition (`FocusInput`) is now the thing you call directly with `()`.

  ### Mounts that previously closed over values

  If your old Mount captured values via closure:

  ```ts
  // Before
  const AnchorPopover = Mount.define('AnchorPopover', CompletedAnchorPopover)
  const anchorPopover = (buttonId: string, anchor: AnchorConfig) =>
    AnchorPopover(element =>
      Effect.sync(() => {
        const cleanup = anchorSetup({ buttonId, anchor })(element)
        return { message: CompletedAnchorPopover(), cleanup }
      }),
    )

  // At the call site:
  OnMount(anchorPopover(buttonId, anchor))
  ```

  declare those values as Schema-typed args:

  ```ts
  // After
  const AnchorPopover = Mount.define(
    'AnchorPopover',
    { buttonId: S.String, anchor: AnchorConfig },
    CompletedAnchorPopover,
  )(
    ({ buttonId, anchor }) =>
      element =>
        Effect.sync(() => {
          const cleanup = anchorSetup({ buttonId, anchor })(element)
          return { message: CompletedAnchorPopover(), cleanup }
        }),
  )

  // At the call site:
  OnMount(AnchorPopover({ buttonId, anchor }))
  ```

  Only values that vary per render should become args. Module-level constants stay in lexical scope. The factory is two-stage when args are declared: the first stage receives the args record, the second receives the live `Element` handle.

  ### Submodel patterns

  `Mount.mapMessage` still preserves both name and args through wrapping, so threading a child module's Mount up to the parent Message continues to work unchanged at sites like:

  ```ts
  OnMount(Mount.mapMessage(FocusUsernameInput(), toParentMessage))
  ```

  ### `@foldkit/devtools-mcp` consumers

  The wire shape changed:

  ```diff
  - SerializedEntry.mountStartNames: Array<string>
  - SerializedEntry.mountEndNames: Array<string>
  + SerializedEntry.mountStarts: Array<{ name: string; args: Option<Record<string, unknown>> }>
  + SerializedEntry.mountEnds: Array<{ name: string; args: Option<Record<string, unknown>> }>
  - ResponseInit.mountStartNames: Array<string>
  + ResponseInit.mountStarts: Array<{ name: string; args: Option<Record<string, unknown>> }>
  ```

  Reading the previous string: pull `mount.name`. Reading the new args data: read `mount.args` as `Option<Record<string, unknown>>` (`None` for argless Mounts, `Some(record)` when args were declared).

  ### Tests

  Existing `Scene.Mount` calls keep working, since passing a Definition still matches by name (lax). To strengthen a test, pass a Mount instance instead of the Definition:

  ```ts
  // Lax (old, still works)
  Scene.Mount.expectHas(AnchorPopover)

  // Strict (new, locks in the args)
  Scene.Mount.expectHas(AnchorPopover({ buttonId: 'cart-button', anchor }))
  ```

  Use the strict form when the args carry meaning for the test's claim.

### Patch Changes

- 584f7ee: Fix DevTools clicks triggering app focus/blur Messages. Clicking inside the DevTools panel previously caused the app's currently-focused element to blur, which would dispatch any blur-driven Messages the app had wired up (e.g. inputs that re-focus themselves on blur). In a typing-game-style app this made the message list unselectable: every click on a row immediately triggered a new blur Message, which was appended to history and auto-selected.

  The fix is two-part. First, a capture-phase `pointerdown` listener on the DevTools shadow host calls `preventDefault()` whenever focus lives outside the shadow, suppressing the implicit "click-shifts-focus-to-the-clicked-element" browser default for the common case (clicking message rows, buttons, etc.). Second, the `OnBlur` event handler in `html` filters out blur events whose `relatedTarget` is the DevTools shadow host, which closes the remaining leak when DevTools widgets (e.g. the submodel-filter Listbox) move focus into the panel programmatically via `Dom.focus` Commands. With both in place, DevTools interactions never dispatch app Messages.

- 2abe5e1: `Story.expectOutMessage` now compares OutMessages with `Equal.equals` (structural deep-equal) instead of `JSON.stringify`. OutMessages whose values include `undefined` fields, key-order differences, circular references, or values implementing the `Equal` symbol are now compared correctly.

## 0.89.0

### Minor Changes

- 37039fb: `Story.Command.resolveAll` and `Scene.Command.resolveAll` are now queue-only: every entry resolves exactly one matching dispatch in declaration order. Single entries no longer "stick" and resolve every matching dispatch with the same Message. To declare N identical responses, compose with `Array.makeBy(n, () => [Def, message])`.

  This makes cardinality explicit at the call site and surfaces dispatch-count bugs as `assertAllCommandsResolved` failures instead of silent reuse.

  Resolvers carry across `resolveAll` calls: unused entries can match later dispatches, and a new entry replaces any leftover resolvers sharing its Definition or Instance fingerprint (latest wins).

## 0.88.1

### Patch Changes

- 61dc3fb: Bump `@floating-ui/dom` to `^1.7.6`.

## 0.88.0

### Minor Changes

- 24b09e2: Take Command args as data in `Command.define`.

  `Command.define` is now a curried call. The first call binds the name and result Message schemas (and optionally an args Schema record); the second binds the Effect, or an effect builder when args are declared. The returned Definition is callable to produce a Command instance: pass the declared args, or call with no args for argless Commands.

  Each Command instance carries its args as a field, and the runtime surfaces that field through:
  - **OpenTelemetry span attributes**: the args record is attached to the span wrapping the Command's Effect.
  - **The DevTools Commands tab**: each Command renders as a tag at the top of its row with the declared args as a data tree below (chevrons for nested fields). Argless Commands show only the name.
  - **The MCP wire protocol** consumed by `@foldkit/devtools-mcp`: `SerializedEntry.commandNames` and `ResponseInit.commandNames` are replaced by `commands: Array<{ name: string; args: Option<Record<string, unknown>> }>`.
  - **`Story.Command` / `Scene.Command` matchers** (`expectHas`, `expectExact`, `resolve`, `resolveAll`): each now accepts either a Command Definition (matches by name; existing lax behavior) or a Command instance (matches by name AND structural-equal args; new strict behavior). Pass a Definition when the test only cares that the Command was dispatched; pass an instance when the test should verify the args the runtime captured.

  ```ts
  // Lax: matches any FetchWeather, regardless of args
  Scene.Command.expectExact(FetchWeather)

  // Strict: only matches FetchWeather({ zipCode: '90210' })
  Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))
  ```

  Failure messages now show the args dispatched alongside the args expected, so a wrong-args mismatch reads `FetchWeather {"zipCode":"99999"}` vs `FetchWeather {"zipCode":"90210"}` rather than just `FetchWeather`.

  ## Migration

  ### Argless Commands

  ```ts
  // Before
  const LockScroll = Command.define('LockScroll', CompletedLockScroll)
  const lockScroll = LockScroll(
    Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
  )

  // At the call site:
  return [model, [lockScroll]]
  ```

  ```ts
  // After
  const LockScroll = Command.define(
    'LockScroll',
    CompletedLockScroll,
  )(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())))

  // At the call site:
  return [model, [LockScroll()]]
  ```

  The camelCase factory (`lockScroll`) goes away. The PascalCase Definition (`LockScroll`) is now the thing you call directly with `()`.

  ### Commands that previously closed over values

  If your old Command captured values via closure:

  ```ts
  // Before
  const FetchWeather = Command.define(
    'FetchWeather',
    SucceededFetchWeather,
    FailedFetchWeather,
  )
  const fetchWeather = (zipCode: string) =>
    FetchWeather(
      Effect.gen(function* () {
        // ...uses zipCode via closure...
      }),
    )

  // At the call site:
  return [model, [fetchWeather('90210')]]
  ```

  declare those values as Schema-typed args:

  ```ts
  // After
  const FetchWeather = Command.define(
    'FetchWeather',
    { zipCode: S.String },
    SucceededFetchWeather,
    FailedFetchWeather,
  )(({ zipCode }) =>
    Effect.gen(function* () {
      // ...uses zipCode from the destructured args...
    }),
  )

  // At the call site:
  return [model, [FetchWeather({ zipCode: '90210' })]]
  ```

  Only values that vary per dispatch should become args. Module-level constants stay in lexical scope. Runtime dependencies stay where they live: app-wide ones in `Resources`, model-driven ones in `ManagedResources`, anything else as a service tag on the Effect's context channel. The Effect pulls them all with `yield*`.

  ### Submodel patterns

  `Command.mapEffect` still preserves both name and args through wrapping, so Submodel chains via `Got*Message` continue to work unchanged. No edits needed at sites like:

  ```ts
  childCommands.map(
    Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
  )
  ```

  ### `@foldkit/devtools-mcp` consumers

  The wire shape changed:

  ```diff
  - SerializedEntry.commandNames: Array<string>
  + SerializedEntry.commands: Array<{ name: string; args: Option<Record<string, unknown>> }>
  - ResponseInit.commandNames: Array<string>
  + ResponseInit.commands: Array<{ name: string; args: Option<Record<string, unknown>> }>
  ```

  Reading the previous string: pull `command.name`. Reading the new args data: read `command.args` as `Option<Record<string, unknown>>` (`None` for argless Commands, `Some(record)` when args were declared).

  ### Tests

  Existing `Story.Command` / `Scene.Command` calls keep working, since passing a Definition still matches by name (lax). To strengthen a test, pass a Command instance instead of the Definition:

  ```ts
  // Lax (old, still works)
  Scene.Command.expectExact(FetchWeather)

  // Strict (new, locks in the args)
  Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))
  ```

  Use the strict form when the args carry meaning for the test's claim.

## 0.87.0

### Minor Changes

- e0ad2e5: Replace `Task` with `Dom` and `Render`.

  The `Task` namespace mixed DOM operations, render-timing primitives, time helpers, and trivial Effect wrappers under one umbrella. It now splits into two narrower namespaces, with the trivial wrappers dropped.

  `Dom` covers element-targeted side effects: `focus`, `showModal`, `closeModal`, `clickElement`, `scrollIntoView`, `advanceFocus`, `lockScroll`, `unlockScroll`, `inertOthers`, `restoreInert`, `detectElementMovement`, `waitForAnimationSettled`. Each helper still gates itself on the next render commit, so call sites do not change shape. Import from `foldkit/dom` or pull `Dom` from the root barrel: `import { Dom } from 'foldkit'`.

  `Render` covers render-cycle synchronization: `Render.afterCommit` (one `requestAnimationFrame`, resumes once the latest model has been patched into the DOM) and `Render.afterPaint` (two `requestAnimationFrame`s, resumes once the prior state has been displayed). Use `afterCommit` before any DOM read or write whose target was just brought into existence by a Message. Use `afterPaint` for CSS transition orchestration. Import from `foldkit/render` or pull `Render` from the root barrel: `import { Render } from 'foldkit'`.

  Dropped: `Task.delay`, `Task.getTime`, `Task.getTimeZone`, `Task.getZonedTime`, `Task.getZonedTimeIn`, `Task.uuid`, `Task.randomInt`, and `TimeZoneError`. The dropped helpers were thin wrappers around APIs Effect already exposes; reach for those APIs directly.

  Migration:
  - `Task.focus(...)` → `Dom.focus(...)` (and similarly for every other DOM helper).
  - `Task.afterRender` → `Render.afterCommit`.
  - `Task.nextFrame` → `Render.afterPaint`.
  - `Task.delay(duration)` → `Effect.sleep(duration)`. Same `Duration.Input` shape (string like `'1 second'`, milliseconds number, or `Duration` value).
  - `Task.getTime` → `DateTime.now`. It's an `Effect<DateTime.Utc>`, so yield it or compose it the same way you used `Task.getTime`.
  - `Task.getZonedTime` → `DateTime.now.pipe(Effect.map(utc => DateTime.setZone(utc, DateTime.zoneMakeLocal())))`.
  - `Task.getZonedTimeIn(zoneId)` → use `DateTime.zoneMakeNamed(zoneId)` (returns `Option<TimeZone>`) and convert the `None` case into a domain error in your app if you need the typed-error story.
  - `Task.uuid` → `Random.nextUUIDv4`. An `Effect<string>` that pulls from Effect's `Random` service (seedable in tests, runtime-agnostic).
  - `Task.randomInt(min, max)` → `Random.nextIntBetween(min, max, { halfOpen: true })`. The `halfOpen` option is required under Effect v4 to keep `max` exclusive; without it, `max` is inclusive.

## 0.86.0

### Minor Changes

- 19f27e2: Expose `Task.afterRender`, an Effect that completes after the runtime's next render commits. The Task DOM helpers (`focus`, `clickElement`, `scrollIntoView`, etc.) already gate themselves with this internally; reach for it directly when building custom Commands or DOM-observing Subscriptions whose targets were just brought into existence (or moved, or had their attributes changed) by the same Message.

## 0.85.0

### Minor Changes

- 588e37c: Menu and Listbox now focus their items container via the `FocusItems` Command on `Opened`, not via an `OnMount` hook on the items container. The Mount path was a misclassification: the cause of the focus side effect is the `Opened` Message, not the existence of the items element. Returning a Command from `update` makes the cause explicit, lines up with how the rest of Foldkit handles "do X when Y happens" effects, and keeps mounts reserved for cases where the author needs the live `Element` handle.

  The following exports are removed:
  - `Menu.MenuFocusItemsOnMount`, `Menu.CompletedFocusItemsOnMount`
  - `Listbox.ListboxFocusItemsOnMount`, `Listbox.CompletedFocusItemsOnMount`

  Scene and Story tests that previously acknowledged the focus mount via `Scene.Mount.resolve(MenuFocusItemsOnMount, ...)` should drop the line. The items container no longer renders that Mount. Tests that dispatch `Opened` (or trigger it indirectly via `PressedPointerOnButton`) now receive a `FocusItems` Command and need `Story.Command.resolve(FocusItems, CompletedFocusItems())` to acknowledge it.

- 588e37c: Rename Mount Definitions and their result Messages to verb-first imperatives, mirroring how Commands are named. Mount Definitions are imperative instructions to the runtime ("when this element mounts, do X"), so the verb leads. Result Messages mirror the new Definition name in past tense.

  Mount renames per component:
  - Tooltip: `TooltipAnchor` → `AnchorTooltip`
  - Popover: `PopoverAnchor` → `AnchorPopover`; `PopoverBackdropPortal` → `PortalPopoverBackdrop`
  - Menu: `MenuAnchor` → `AnchorMenu`; `MenuBackdropPortal` → `PortalMenuBackdrop`
  - Listbox: `ListboxAnchor` → `AnchorListbox`; `ListboxBackdropPortal` → `PortalListboxBackdrop`
  - Combobox: `ComboboxAnchor` → `AnchorCombobox`; `ComboboxAttachPreventBlur` → `AttachComboboxPreventBlur`; `ComboboxAttachSelectOnFocus` → `AttachComboboxSelectOnFocus`; `ComboboxBackdropPortal` → `PortalComboboxBackdrop`

  Result Messages now disambiguate per component instead of sharing a generic name. For example, `CompletedAnchorMount` becomes `CompletedAnchorPopover`, `CompletedAnchorMenu`, `CompletedAnchorListbox`, etc., depending on the component. The same pattern applies to `CompletedBackdropPortal` (now `CompletedPortalPopoverBackdrop`, `CompletedPortalMenuBackdrop`, etc.) and the Combobox attach completions.

  Scene tests that called `Scene.Mount.resolve(PopoverAnchor, CompletedAnchorMount())` should update to `Scene.Mount.resolve(AnchorPopover, CompletedAnchorPopover())`. The acknowledgement helper pattern is unchanged; only the names move.

- 588e37c: Add `Scene.Mount.expectEnded` for declaring that a Mount disappeared from the rendered tree. Every Mount that fires and then unmounts during a scene must be acknowledged with `expectEnded`, regardless of whether it was previously resolved. The scene throws at the end of the test for any unacknowledged unmount.

  ```ts
  Scene.scene(
    { update, view },
    Scene.with(closedModel),
    Scene.click(Scene.role('button', { name: 'Open' })),
    Scene.Mount.resolve(AnchorPopover, CompletedAnchorPopover()),
    Scene.Mount.resolve(
      PortalPopoverBackdrop,
      CompletedPortalPopoverBackdrop(),
    ),
    Scene.click(Scene.role('button', { name: 'Done' })),
    Scene.Mount.expectEnded(AnchorPopover, PortalPopoverBackdrop),
  )
  ```

  Mount lifecycle now surfaces as deliberate test steps so the test reads as a precise account of what happened during the simulation. `resolve` handles a Mount's result Message; `expectEnded` handles its unmount. The two are independent test steps.

  The throw fires at two points: at the end of the scene for any unacknowledged unmount, and at the next interaction that dispatches a Message (so the error points to the offending step rather than waiting for scene end).

  Existing tests that previously relied on the silent-drop behavior for unmounted Mounts will now throw and need an `expectEnded` step for each Mount that fired and disappeared during the scene.

### Patch Changes

- 588e37c: Fix DevTools time-travel polluting history with mount-derived Messages.

  When DevTools renders a historical Model (e.g. via `jumpTo` or the timeline scrubber), Snabbdom inserts elements that may carry `OnMount` attributes. Until now, those mount Effects fired and their result Messages were dispatched into the live runtime, which recorded them as new history entries. The result: clicking through history caused new entries like `CompletedAnchorPopover` and `CompletedPortalPopoverBackdrop` to appear at the live end of history, polluting the timeline with replay-induced activity.

  The fix routes the DevTools render through a no-op dispatch. Mount Effects still execute (so the rendered DOM looks correct: positioning, observer attachment, library setup are preserved), but their result Messages are silenced and no new history entries are produced. Cleanup behaviour is unchanged.

  This is defense-in-depth alongside the convention that Mount Effects should only do replay-safe DOM measurement and manipulation. Convention is the primary mechanism; this fix is the safety net for misjudged Mounts.

## 0.84.0

### Minor Changes

- 7525227: Mount lifecycle is now surfaced in DevTools and Scene tests, and the Scene + Story test APIs are reorganised into per-kind namespaces.

  **Tests.** `Scene` tracks pending mounts walked from the rendered VNode tree and requires explicit acknowledgement before the scene finishes, mirroring how Commands are resolved. The Command and Mount steps are now grouped into `Scene.Command` and `Scene.Mount` namespaces (and `Story.Command` for Story tests):

  ```ts
  // Commands (was Scene.resolve / Story.resolve)
  Scene.Command.resolve(definition, resultMessage)
  Scene.Command.resolveAll(...resolvers)
  Scene.Command.expectHas(...definitions)
  Scene.Command.expectExact(...definitions)
  Scene.Command.expectNone()

  // Mounts (new)
  Scene.Mount.resolve(definition, resultMessage)
  Scene.Mount.resolveAll(...resolvers)
  Scene.Mount.expectHas(...definitions)
  Scene.Mount.expectExact(...definitions)
  Scene.Mount.expectNone()
  ```

  The previous flat API (`Scene.resolve`, `Scene.resolveAll`, `Scene.expectHasCommands`, `Scene.expectExactCommands`, `Scene.expectNoCommands`, and the parallel `Story.*` set) is removed. Two new subpath exports let test code import the namespaces directly:

  ```ts
  import { Command, Mount } from 'foldkit/scene'
  import { Command } from 'foldkit/story'
  ```

  (Story has no `Mount` namespace because Story tests do not render the view.)

  Mount tracking semantics: pending mounts persist across re-renders so resolving does not re-pend them. A mount that disappears from the tree is silently dropped to mirror real unmount semantics. Same-named mounts coexisting in the tree are disambiguated by an occurrence index, so two open instances of the same component don't collide.

  **DevTools.** A new `MountTracker` Context.Service is provided during render so the snabbdom `OnMount` insert/destroy hooks emit lifecycle events to the runtime synchronously. The runtime drains the buffer after each render and attaches the names to the history entry that caused the render. The DevTools overlay grows a new **Mounts** inspector tab listing the Mounts that fired and unmounted for the selected entry. Init-time mount activity attaches to the synthetic init entry.

  **Protocol** (breaking for any external DevTools wire-format consumer): `SerializedEntry` gains `mountStartNames` and `mountEndNames`; `ResponseInit` gains `mountStartNames`. The in-tree `@foldkit/devtools-mcp` is updated.

  **Component Mount exports.** UI components now export their Mount definitions so consumer Scene tests can acknowledge them: `PopoverAnchor`, `PopoverBackdropPortal`, `TooltipAnchor`, `MenuAnchor`, `MenuFocusItemsOnMount`, `MenuBackdropPortal`, `ListboxAnchor`, `ListboxFocusItemsOnMount`, `ListboxBackdropPortal`, `ComboboxAnchor`, `ComboboxAttachPreventBlur`, `ComboboxAttachSelectOnFocus`, `ComboboxBackdropPortal`. Existing Scene tests that render any of these components now need a corresponding `Scene.Mount.resolve` step.

## 0.83.0

### Minor Changes

- 8c8113a: Fix click interception when multiple overlay components appear on the same page. With one of `Ui.Listbox`, `Ui.Combobox`, `Ui.Menu`, or `Ui.Popover` open, clicking another overlay's button required two clicks: one to dismiss the open overlay's backdrop, then another to register on the target button. The bug was asymmetric, depending on which component appeared later in the DOM.

  The fix portals each component's backdrop into a shared `foldkit-portal-root` div prepended to `document.body`. The prepend matters: appending to body would keep the backdrop later in tree order than the page's overlay wrappers (which are `position: relative; z-index: auto`), and the wrappers' buttons would still paint underneath. Prepending puts the backdrop earlier in tree order so wrappers paint above it in normal interaction, while the backdrop still catches clicks on empty space for click-outside dismissal.

  `Ui.DatePicker` inherits the fix via its delegation to `Ui.Popover`. `Ui.Dialog` is unaffected (uses near-max z-index, not portals). `Ui.Tooltip` is unaffected (no backdrop).

  Each affected component's `Message` union gains a `CompletedBackdropPortal` tag. This is only a breaking change for consumers who exhaustively match the component's `Message` variants in a parent update. Add a no-op branch for `CompletedBackdropPortal` if you hit this.

### Patch Changes

- b3e9aaf: Internal: renames the generic type parameter on UI component `ViewConfig` and `view`/`lazy` helpers from `Message` to `ParentMessage`. The new name reflects that consumers pass their own parent message type into the component. No behavior or call-site changes. Generic parameter names are not part of the type contract, so existing `Ui.X.view<MyMessage>(...)` calls continue to work unchanged.

## 0.82.9

### Patch Changes

- 32952ea: Fix `Task.focus`, `Task.scrollIntoView`, `Task.clickElement`, `Task.advanceFocus`, and `Task.showModal` running against a stale DOM. The runtime now defers renders to `requestAnimationFrame`, but Commands still ran on the microtask queue, so a Task dispatched alongside a model change would query the tree before the matching VDOM patch had committed and silently no-op. Each of these Tasks now waits one frame so its query observes the committed DOM. Existing call sites that focus an element brought into existence by the same Message will start working again without changes; for that pattern, prefer `OnMount` with a `Mount.define`'d action so focus is bound to the element's lifecycle rather than the dispatch order.

## 0.82.8

### Patch Changes

- 283f7ac: Fix a per-dispatch latency regression on apps with large Models. The runtime previously called `Schema.toEquivalence(Model)` and `Schema.encodeUnknownSync(Model)` synchronously inside `processMessage` on every dispatch where the model reference changed. Both walk the entire model graph (the structural-equivalence walk has no reference-equality short-circuit at field or element boundaries), so on a model carrying a 10k-item array they cost ~50ms and ~95ms respectively. With both gated only on `currentModel !== nextModel`, every keystroke in a search field whose route lived on the model paid ~140ms of HMR-preservation overhead even with `devTools: false` and `freezeModel: false`.

  The fix drops the structural-equivalence guard (subscribers already dedupe via `Stream.changesWith` on their dependency projections, which is the correct place) and defers the model encoding through a 200ms debounce. A burst of dispatches coalesces into a single encode that runs after the user pauses; a `vite:beforeFullReload` listener flushes the latest pending model synchronously so the plugin still has fresh state before the page reloads. The `PreserveModelMessage` schema gains an optional `isHmrReload` flag the runtime sets to `true` on the flush path, so a fresh entry created during an HMR boundary is correctly marked as eligible for restoration.

  Also fixes a separate latency bug in the message drain loop: `burstStartedAtRef` was reset on every `Effect.forever` iteration, so Command-chained dispatches (each iteration handling a single message) never accumulated enough wall-clock time to exceed `FRAME_BUDGET_MS`, and the runtime never yielded to the browser between batches. A long Command chain would process all messages in one microtask burst with a single render at the end. The drain loop now polls first and only resets the burst timer when `Queue.take` actually blocked (the queue was idle), so the budget accumulates across consecutive batches and the runtime yields once it crosses the 5ms threshold. Cumulative dispatches now visibly stream through the renderer at ~60fps instead of appearing all at once.

## 0.82.7

### Patch Changes

- c4c2b26: Fix a regression where the first dispatch after an idle period could sit unprocessed until a second dispatch arrived. The drain loop's batch-gathering step relied on `Queue.takeAll`, which in Effect 4 blocks until at least one message arrives rather than returning a non-blocking snapshot. Replaces both batch-gathering sites with a `Queue.poll` loop that returns whatever is currently queued, possibly nothing.

## 0.82.6

### Patch Changes

- 3d915aa: Suspend the runtime's render loop when nothing is dirty so idle apps schedule zero rAF callbacks. Previously the loop fired ~60 no-op rAF callbacks per second when the app had no Messages to process. The loop now subscribes to the dirty-bit's changes Stream and suspends entirely until the next dispatch.

## 0.82.5

### Patch Changes

- 6b285bc: Prioritize input-derived Messages over chain-derived Messages so user input lands ahead of streamed work. Within each Message-processing batch, the runtime now drains all input-derived Messages (view dispatch, navigation, subscription events, managed-resource events, external dispatchers) before any Command result. Keeps tab clicks, key presses, and other interactions feeling native even when a high-rate stream is running. FIFO order is preserved within each priority class.

## 0.82.4

### Patch Changes

- db20a61: Batch view renders to once per animation frame and yield to the browser between long Message bursts. The runtime now coalesces multiple Messages dispatched between frames into a single render and yields to the browser when message processing exceeds a frame budget. Keeps the UI responsive under high-rate inputs (drag, websocket bursts, recursive Commands).

  DevTools: lazy-cache the message list view so re-renders skip work when its inputs are unchanged.

## 0.82.3

### Patch Changes

- 4de27cf: Fix dispatch latency in apps using `devTools: { Message }` as history accumulates.

  `getModelAtIndex(latest)` runs on every dispatch while the inspector follows the latest entry. That call used to replay up to `KEYFRAME_INTERVAL` user updates from the most recent keyframe, calling the consumer's update function plus `deepFreeze` on every step. The cost scaled with both history depth and model size, so every dispatch got progressively slower.

  The store now stamps the post-update model into `StoreState.maybeLatestModel` on every `recordMessage`, and `resolveModel` returns it directly when the requested index is the latest entry. Time-travel still routes through `replayToIndex`.

- 76561ae: Sharpen README intro: lead with confidence over architecture friction instead of bug prevention.

## 0.82.2

### Patch Changes

- da300fb: Fix two DevTools regressions introduced by the Effect 4 migration.

  **1. Hang on every dispatch when Messages carry large payloads.**
  Effect 4 changed `Equal.equals` for plain objects from reference equality to
  structural equality (hash + record compare). `Schema.toEquivalence` falls back
  to `Equal.equals` for `S.Unknown`, so the DevTools overlay's
  `maybeInspectedModel` and `maybeInspectedMessage` fields (typed as
  `S.Option(S.Unknown)`) caused the runtime's per-dispatch `modelEquivalence`
  check to walk the entire user-app Message payload three times per dispatch
  (two hashes plus a record compare). With large payloads the cost manifested
  as a roughly one-second hang on every user interaction.

  The overlay now annotates those fields with reference-equality
  `toEquivalence`, which is the correct semantics for through-traffic snapshots,
  and disables `freezeModel` on the overlay's runtime so `deepFreeze` no longer
  walks the inspected payload either. Both changes are scoped to the overlay;
  user app runtimes are unaffected.

  **2. Arrays in the inspector tree rendered as `[object Object],[object Object],...`**
  Effect 4 narrowed `Predicate.isObject` to exclude arrays (v3 returned `true`
  for arrays; v4 returns `false`). The DevTools tree renderer's `isExpandable`
  check used `Predicate.isObject`, so array values were treated as leaves and
  fell through to `String(value)`. The renderer now uses
  `Predicate.isObjectOrArray`, which is Effect 4's spelling of v3's `isObject`
  behavior.

  **3. Slow tab switching in the inspector when the inspected Model is large.**
  Two compounding issues. First, the inspector's tab group did not pass
  `persistPanels`, so switching tabs unmounted the previous panel's DOM and
  re-mounted the next one from scratch — for a large Model with expanded array
  branches, this meant tearing down and rebuilding thousands of DOM rows per
  tab switch. Second, even with persisted panels, every overlay re-render
  re-invoked each tab's panel-content function, which for the Model tab meant
  a fresh `flattenTree` walk over the full inspected snapshot. The inspector
  now passes `persistPanels: true` (avoiding DOM thrash) and wraps each tab's
  content in `createKeyedLazy` keyed on its actual dependencies (avoiding
  recomputation when those dependencies are reference-equal across renders).

  **4. Slow tree expansion when many sibling rows are visible.**
  `toInspectableValue` (the transform that converts DOM-class instances like
  File / Blob / Date / URL into plain objects for tree rendering) recursed
  through arrays and records via `Array_.map` / `Record.map`, which allocate
  fresh wrappers even when the contents are identical. Every render of the
  inspector tree therefore produced a brand-new tree of references, defeating
  the row-level `lazyTreeNode` cache: each row's `node.value` was a fresh
  reference per render, so `argsEqual` failed on every row and every visible
  row's vnode was rebuilt on every expansion. `toInspectableValue` is now
  memoized by input reference via `WeakMap`, so identical snapshot references
  return identical transformed references and the row lazy actually hits.

- da300fb: Fix `Ui.Disclosure` `persistPanel: true` panel rendering when closed if consumer styles set `display:` on the panel.

  The Disclosure component marked the closed persisted panel with the HTML
  `hidden` attribute, relying on the user-agent stylesheet's `[hidden] {
display: none }` rule. Author CSS like Tailwind's `flex` utility class beats
  the user-agent rule on specificity, so the closed panel could render
  visibly. The Disclosure component now applies inline `display: none` to the
  closed persisted panel in addition to the `hidden` attribute, matching the
  treatment that `Ui.Tabs` received.

- da300fb: Fix `Ui.Tabs` `persistPanels: true` rendering all panels simultaneously when consumer styles set `display:` on the panel.

  The Tabs component marked inactive persisted panels with the HTML `hidden`
  attribute, relying on the user-agent stylesheet's `[hidden] { display: none }`
  rule. Author CSS like Tailwind's `flex` utility class beats the user-agent
  rule on specificity, so all persisted panels rendered at once and stacked
  vertically. The Tabs component now applies inline `display: none` to inactive
  persisted panels in addition to the `hidden` attribute, which beats any
  class-based `display` declaration regardless of consumer CSS.

## 0.82.1

### Patch Changes

- e385643: Bump `happy-dom` devDependency to `^20.0.0` to clear CVE-2025-61927 (VM context escape). Internal test setup only; no impact on installed runtime or types.
- 7b8078a: Fix HMR cold-start spurious "no plugin response" warning. On a fresh page load, `@foldkit/vite-plugin` sends `foldkit:restore-model { id, model: undefined }` to mean "no preserved model." Vite serializes the WS payload via `JSON.stringify`, which drops keys whose value is `undefined`, so the wire became `{"id":"app"}`. The runtime's `RestoreModelMessage` schema declared `model` as a required `Schema.Unknown`, the decode failed, the failure was swallowed, and the runtime hit the 500ms timeout, printing a misleading warning that the plugin wasn't installed. `RestoreModelMessage.model` is now `Schema.optional(Schema.Unknown)`, so the absent key round-trips cleanly.

  Also corrects the warning text itself. When the plugin really is missing, it now references the correct package (`@foldkit/vite-plugin`) and named import (`import { foldkit } from '@foldkit/vite-plugin'`).

## 0.82.0

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

- 60283c8: Refresh package tagline and README intro.
- 98519e1: Fix the install command in the READMEs. `create-foldkit-app` doesn't accept a `--wizard` flag — running with no flags drops into the interactive prompts. `--name`, `--example`, and `--package-manager` remain available as escape hatches that skip the matching prompts.

## 0.81.1

### Patch Changes

- 21a6d30: README: mention Mount alongside Commands, Subscriptions, and ManagedResources, and link the new Map example.

## 0.81.0

### Minor Changes

- 23eb474: Rename misleading Messages in `Ui.Combobox`, `Ui.Listbox`, `Ui.Menu`, and `Ui.Popover` so each name describes what its dispatch site actually observes. All four components emitted `ClosedByTab` from an `OnBlur` handler, which fires for any blur cause (Tab key, outside click, programmatic blur, focus shift). The "ByTab" suffix invented a trigger the handler cannot verify.

  **Breaking.**
  - `Combobox.ClosedByTab` → `Combobox.BlurredInput`
  - `Listbox.ClosedByTab` → `Listbox.BlurredItems`
  - `Menu.ClosedByTab` → `Menu.BlurredItems`
  - `Popover.ClosedByTab` → `Popover.BlurredPanel`

  Update any code that constructed or pattern-matched on the old names. Behavior is unchanged.

- 572baa0: Simplify the `freezeModel` runtime config to `boolean`. The wrapper object and `'Always'` mode have been removed.

  Migration:
  - `freezeModel: { show: 'Development' }` → omit, or `freezeModel: true`
  - `freezeModel: { show: 'Always' }` → no direct replacement; freezing now only runs when Vite HMR is active.
  - `freezeModel: false` → unchanged.

- 1ae56a5: Replace `OnInsert`, `OnInsertEffect`, and `OnDestroy` with a single `OnMount` attribute backed by the new `Mount` module. The `Mount.define` constructor names a mount-time action and constrains the Messages it can dispatch; the wrapped Effect resolves to `{ message, cleanup }`, and the runtime invokes the cleanup automatically when the element unmounts. Cleanup runs immediately if the Effect resolves after the element has already been removed.

  Migration:

  ```ts
  // Before
  import { Function } from 'effect'
  const { OnInsertEffect, OnDestroy } = html<Message>()

  const view = div(
    [
      OnInsertEffect(element => attachWidget(element)),
      OnDestroy(element => detachWidget(element)),
    ],
    [],
  )

  // After
  import { Mount } from 'foldkit'
  import type { MountResult } from 'foldkit/html'

  const MountWidget = Mount.define('MountWidget', CompletedMountWidget)
  const mountWidget = MountWidget(
    (element): Effect.Effect<MountResult<Message>> =>
      Effect.sync(() => ({
        message: CompletedMountWidget(),
        cleanup: () => detachWidget(element),
      })),
  )

  const { OnMount } = html<Message>()
  const view = div([OnMount(mountWidget)], [])
  ```

  For setup that has no cleanup, pass `Function.constVoid`. `Mount.mapMessage` lifts a `MountAction` into a parent's Message universe, mirroring `Command.mapEffect` for the Submodel pattern.

  `Ui.Popover`, `Ui.Listbox`, `Ui.Menu`, `Ui.Tooltip`, and `Ui.Combobox` now expose new lifecycle Messages (`CompletedAnchorMount`, plus `CompletedFocusItemsOnMount` for Listbox and Menu, and `CompletedAttachPreventBlur` / `CompletedAttachSelectOnFocus` for Combobox) that widen the `onAction` callback's Message union. Consumers that pattern-match `onAction` exhaustively need to handle the new variants; consumers that route through `Foo.update(model, message)` are unaffected. The internal `anchorHooks` helper is now `anchorSetup`, which returns its cleanup directly.

## 0.80.0

### Minor Changes

- 5dff4f7: `Ui.Calendar` gains fast navigation for distant dates. The heading is now a button — clicking it switches the calendar to a 3×4 months grid, and clicking the year heading from there switches to a paged 3×4 years grid. Selecting a year drills back to the months grid for that year; selecting a month drills back to the days grid for that month. Prev/next arrows in the years grid page through 12-year windows. Reaching a target year/month now takes 2-3 clicks instead of 60-200 prev-month presses.

  The calendar's `Model` gains a `viewMode: 'Days' | 'Months' | 'Years'` field. New messages: `ClickedHeading`, `SelectedMonth`, `SelectedYear`, `PagedYears`. Keyboard navigation works in all three modes — arrows move within the grid, Enter/Space commits, PageUp/PageDown pages the years window. Escape passes through to outer handlers (in popovered DatePicker contexts, the popover closes on Escape, matching Apple Calendar / Material / shadcn behavior). Selecting a month or year is the way to drill back to the day grid. Standalone consumers that need their own back-out gesture can call the new `Calendar.dropToDays(model)` helper to return any picker mode to Days programmatically.

  **Breaking.** `CalendarAttributes` is now a discriminated union — pattern-match on `_tag` (`'Days' | 'Months' | 'Years'`) with `M.tagsExhaustive` to render each grid. We chose this shape over a "Calendar self-renders months/years grids" approach because each grid has different ARIA semantics, cell shapes, and button handlers; modeling that as a single optional-fields shape would be messy, and the discriminated union matches conventions used elsewhere in foldkit (routes, models, messages). The Days variant keeps the existing fields (`previousMonthButton`, `nextMonthButton`, `headerRow`, `columnHeaders`, `weeks`) plus a new `headingButton` for the click-to-drill heading. The Months variant exposes `cells: ReadonlyArray<MonthCell>` — each cell carries both `label` (full month name) and `shortLabel` (locale-aware abbreviation). The Years variant exposes `cells: ReadonlyArray<YearCell>` plus `previousPageButton` / `nextPageButton`.

  **Removed.** `monthSelect`, `monthOptions`, `yearSelect`, `yearOptions` from `CalendarAttributes`; `SelectedMonthFromDropdown` and `SelectedYearFromDropdown` messages; `monthSelectLabel` and `yearSelectLabel` from `ViewConfig`. These attribute groups were exposed for consumers who wanted a `<select>`-based month/year jumper alongside the prev/next-month buttons, but no consumer in this repo rendered them. The heading-drill flow is the canonical way to jump months and years now, matching Apple Calendar, Material Design, and shadcn DatePicker.

  `Ui.DatePicker` requires no API changes — it composes `Calendar.view` and forwards the new `toCalendarView` shape. Existing DatePicker consumers must update their `toCalendarView` callback to pattern-match on `_tag`. DatePicker also now resets the embedded calendar to Days mode on every open and close, so users always see the day grid when reopening the picker (matching Apple Calendar / Material / shadcn behavior).

## 0.79.0

### Minor Changes

- 7db20d8: `Ui.VirtualList` now supports variable row heights. Pass an optional `itemToRowHeightPx: (item, index) => number` callback on `ViewConfig` and the component sizes each row from the callback and walks cumulative heights to compute the visible slice and spacers. The uniform path is unchanged: omit `itemToRowHeightPx` to keep using `model.rowHeightPx` everywhere.

  Two new exports support programmatic scrolling and slice queries on a variable-height list: `scrollToIndexVariable(model, items, itemToRowHeightPx, index)` mirrors `scrollToIndex` for the variable case, and `visibleWindowVariable(model, items, itemToRowHeightPx, overscan)` mirrors `visibleWindow`. Use the variable functions when rendering with `itemToRowHeightPx`; the uniform functions still apply when rows share a height.

  Variable-height math is O(N) per render, walking `items` once to build a prefix sum. Lists in the 10k-row range fit comfortably inside a 60Hz scroll budget. Prefer the uniform path when row heights are stable.

  Note: restoring `initialScrollTop` on the first measurement of a variable-height list falls back to uniform-height math (using `model.rowHeightPx`) because items aren't reachable from `update`. Call `scrollToIndexVariable` after the first `MeasuredContainer` arrives for an accurate initial scroll on a variable-height list.

## 0.78.0

### Minor Changes

- e8f9c69: Make DevTools state inspection agent-friendly. `foldkit_get_model` now accepts an optional `path` to narrow the response to a subtree (dot-string anchored at `root`, matching `SerializedEntry.changedPaths`) and `expand` to control summarization. By default the response is summarized: arrays collapse to `{ _summary, length, sample: [head, last] }`, deeply nested records collapse to `{ _summary, keys }`, and long strings collapse to `{ _summary, length, head }` so a full Model snapshot fits inside an agent's context window. A path miss returns an error listing the keys available at the deepest segment that resolved, so an agent can refine in one follow-up call.

  A new `foldkit_get_model_at` tool snapshots historical Model state at an absolute history index. Pass `index: N - 1` to read the Model just before message `N`. For the initial Model, use `foldkit_get_init` (which also returns the names of Commands returned from `init`).

  `foldkit_get_message` no longer carries `modelBefore` / `modelAfter` snapshots. Each entry's `changedPaths` already answers the common "what did this message change?" question. To inspect the literal Model values around an entry, call `foldkit_get_model_at` with `index - 1` and `index`. This is a wire-format change to `ResponseMessage`; bumping `@foldkit/devtools-mcp` in lockstep.

- 937661e: Expose everything Foldkit DevTools shows to AI agents through MCP. The DevTools panel surfaces three pieces of context the wire protocol previously omitted: the synthetic init row (initial Model and Commands returned from `init`), the submodel chain extracted from `Got*Message` wrappers (so a parent can identify which child Message originated a dispatch), and runtime-level state like pause status and history bounds. Each is now first-class on the wire and bound to a dedicated MCP tool.

  What's new on `@foldkit/devtools-mcp`:
  - `foldkit_get_init` snapshots the recorded initial Model and the names of Commands returned from the application's `init` function. Equivalent to clicking the "init" row in the DevTools panel.
  - `foldkit_get_runtime_state` returns a snapshot of the runtime's DevTools state: `currentIndex`, `startIndex`, `totalEntries`, `isPaused`, `maybePausedAtIndex`, and `hasInitModel`. Useful for understanding what `foldkit_list_messages` and `foldkit_get_message` will see and detecting whether the runtime is paused at a replayed snapshot.

  What's new on the wire protocol (`foldkit/devtools-protocol`):
  - `SerializedEntry` carries two additional fields: `submodelPath` (wrapper tags from outer to inner when the entry came up through a Submodel chain, otherwise an empty array) and `maybeLeafTag` (`Some` with the innermost child Message tag when one exists, `None` otherwise).
  - New `RequestGetInit` / `ResponseInit` carrying `maybeModel` and the init `commandNames`.
  - New `RequestGetRuntimeState` / `ResponseRuntimeState` carrying the fields described above.

  The submodel path extraction logic is now shared between the in-browser DevTools overlay and the wire serializer, so both surfaces always agree on what counts as a Submodel chain.

## 0.77.0

### Minor Changes

- 9c59ada: `view` now returns a `Document` instead of `Html`, and the `title` callback on `makeProgram` is gone.

  A `Document` is `{ title, body, canonical?, ogUrl? }`. The runtime applies all four on every render: `document.title` is set from `title`, `<link rel="canonical">` and `<meta property="og:url">` are upserted from `canonical` and `ogUrl` (creating the tags if they're not already in the document head), and `body` is patched into the application container as before. When `canonical` is omitted it defaults to the current URL (origin + pathname + search); when `ogUrl` is omitted it falls back to `canonical`.

  This fixes a bug where Safari's system Share menu would copy the URL the page was originally loaded from rather than the page the user navigated to. `<link rel="canonical">` was static, and Safari reads canonical first when copying a link.

  Migrating an existing app:

  ```ts
  // Before
  import { Html } from 'foldkit/html'

  const view = (model: Model): Html => div([], [...])

  Runtime.makeProgram({
    view,
    title: (model) => `Page ${model.page}`,
    // ...
  })

  // After
  import { Document } from 'foldkit/html'

  const view = (model: Model): Document => ({
    title: `Page ${model.page}`,
    body: div([], [...]),
  })

  Runtime.makeProgram({
    view,
    // title field removed
  })
  ```

  `crash.view` follows the same shape and now returns a `Document` too.

- bbe2a03: Stop publishing the runtime's Message Schema as JSON Schema in the DevTools wire protocol. `RuntimeInfo.maybeMessageSchema` is removed; agents discover Message shape by reading the application's source instead. Dispatch still works the same: the runtime decodes the payload against the live `Message` Schema and returns a clean error on mismatch. Only the upfront introspection hint is gone.

  This avoids a class of `JSONSchema.make` failures triggered by schema constructs like `OptionFromSelf`, `instanceOf`, and other shapes without a default JSON Schema. Foldkit's UI components and `Url` use those constructs internally, so any app wrapping them via the Submodel pattern was either crashing or losing dispatch validation. The simpler protocol sidesteps the whole annotation grind.

  The `Url` and `File.File` JSON Schema annotations added in the unreleased work, and the bridge's `Either.try` safety net around `JSONSchema.make`, are removed in the same change since their only purpose was to make the JSON Schema generation succeed.

## 0.76.1

### Patch Changes

- c5d56cb: Clarify the "DevTools MCP" README bullet to say agents rewind the UI to any past Model, instead of the vaguer "replay to any past state."

## 0.76.0

### Minor Changes

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

## 0.75.1

### Patch Changes

- ae4fa75: Inject `aria-setsize` (total item count) and `aria-posinset` (1-based logical position) on every rendered `Ui.VirtualList` row, so screen readers announce "row N of total" for the full logical list size, not the smaller count of currently mounted rows.

  Closes the screen-reader gap inherent to virtualization: with only ~10-30 rows in the DOM at any time, the implicit set size from `<li>` children of `<ul>` would otherwise tell assistive tech the list has 12 items even when the real list has 10,000. No consumer wiring required.

  Each row also carries `role="listitem"` explicitly so the list-item semantics survive a `rowElement` override (e.g. consumer passing `rowElement: 'div'`).

## 0.75.0

### Minor Changes

- dddd920: Add `Ui.VirtualList` component. A virtualization primitive for large lists (10k+ rows). Only items inside the viewport plus an overscan buffer are mounted; spacer divs above and below the visible slice keep the scrollbar's apparent total height correct.

  The component owns scroll position, container measurement, and any in-flight programmatic scroll. Items live in the consumer's Model and pass through `ViewConfig.items` on each render, so consumers can swap, filter, sort, or paginate the underlying array freely without sending Messages to the list.

  ```ts
  import * as Ui from 'foldkit/ui'

  const Model = S.Struct({
    list: Ui.VirtualList.Model,
    todos: S.Array(Todo),
  })

  // init: { ..., list: Ui.VirtualList.init({ id: 'todos', rowHeightPx: 40 }) }

  // update GotListMessage: dispatch to Ui.VirtualList.update

  // view:
  Ui.VirtualList.view({
    model: model.list,
    items: model.todos,
    itemToKey: todo => todo.id,
    itemToView: todo => Todo.view(todo),
    className: 'h-96 border rounded',
  })
  ```

  The container element needs a constrained height (via `className` or `attributes`) for virtualization to work. Without it, the container grows to fit children and never scrolls. The component sets only `overflow: auto` inline; pass `overscroll-behavior` (or any other styling) through your `className` or `attributes` if the default browser behavior isn't what you want.

  `Ui.VirtualList.scrollToIndex(model, 500)` returns `[Model, Commands]` for programmatic scrolling. Stale completions are version-cancelled, so rapid successive calls don't fight each other. If `initialScrollTop` is non-zero on `init`, the same Command path applies it the first time the container is measured, so consumers don't need a separate kick.

## 0.74.1

### Patch Changes

- 4b0a552: Adopt TypeScript 6.0 for internal tooling and migrate to Node-native ESM emit. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. Foldkit's internal tsconfigs moved from the deprecated `node10` resolution to `NodeNext`, and every relative import inside `packages/foldkit/src` now carries an explicit `.js` suffix. The emitted `dist/` is unchanged in shape but is now directly loadable by Node's ESM resolver — a prerequisite for future terminal/Node runtime support. Published type surfaces are unchanged; downstream projects on TypeScript 5.9+ continue to work.

## 0.74.0

### Minor Changes

- e8df674: Add `freezeModel` runtime config. Foldkit now deep-freezes the Model in development by default, so accidental mutations (e.g. `model.items.push(...)`) throw a `TypeError` at the exact write site with a clear stack trace, instead of silently corrupting state or breaking reference-equality change detection.

  Freezing is scoped to plain objects and arrays. Effect-tagged values (`Option`, `Either`, `DateTime`, `HashSet`, `HashMap`, etc.), `Date`, `Map`, `Set`, and class instances are left untouched because they rely on lazy instance writes for hash memoization. Nested payloads inside an `Option.some` are still frozen.

  Config shape mirrors `devtools` and `slowView`:

  ```ts
  makeProgram({
    // ...
    freezeModel: { show: 'Development' }, // default
    // freezeModel: { show: 'Always' },   // enforce in production too
    // freezeModel: false,                // disable entirely
  })
  ```

  Production builds pay nothing for this feature unless `show: 'Always'` is set.

## 0.73.0

### Minor Changes

- df6a718: Add `Ui.Slider` — a headless numeric range slider for values on a continuous or stepped scale. Follows the WAI-ARIA slider pattern with `role="slider"` on the thumb and keyboard navigation by step (ArrowUp/ArrowDown/ArrowLeft/ArrowRight), larger jumps (PageUp/PageDown), and boundary jumps (Home/End). Pointer drag uses document-level `pointermove` / `pointerup` tracking so the cursor can leave the slider element during a drag; Escape cancels an in-progress drag and restores the pre-drag value.

  ```ts
  Ui.Slider.view({
    model: model.ratingSlider,
    toParentMessage: message => GotSliderMessage({ message }),
    formatValue: value => `${String(value)} of 10`,
    toView: attributes =>
      div(
        [],
        [
          label([...attributes.label], ['Rating']),
          div(
            [...attributes.root],
            [
              div(
                [...attributes.track],
                [div([...attributes.filledTrack], [])],
              ),
              div([...attributes.thumb], []),
            ],
          ),
        ],
      ),
  })
  ```

  Notable design choices:
  - **Min, max, and step live in the Model.** Stored at init time, the update function can compute the next value on every keyboard / pointer event without accessing config. This also lets the drag subscription translate cursor position into a snapped value in a single place.
  - **State is a discriminated union, not a boolean.** `Idle` and `Dragging({ originValue })` replace `isDragging: Boolean` so the pre-drag value is always available for Escape-to-cancel, and impossible states like "not dragging but with an originValue" are unrepresentable.
  - **Thumb and track press are separate Messages.** `PressedThumb` starts a drag without changing the value; `PressedPointer` snaps the value to the cursor and starts a drag, but is a no-op while already `Dragging`. This absorbs the pointerdown bubble from thumb → track so fine-grained sliders (e.g. `step: 0.05`) don't visibly shift when the user clicks the thumb off-center.
  - **Fractional steps snap to the step's decimal precision.** A slider with `step: 0.1` produces clean values (0.1, 0.2, 0.3) instead of floating-point drift (0.30000000000000004). Precision is derived from the step literal via `toString()`.
  - **Subscriptions are exposed, not hidden.** The consumer wires `Ui.Slider.subscriptions.documentPointer` and `documentEscape` through their own `subscriptions`, mirroring the approach used by `Ui.DragAndDrop`. This keeps all document-level listeners visible at the top of the program.
  - **Accessibility.** Thumb is `role="slider"` with `aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-orientation`. When `formatValue` is provided, the formatted string is announced via `aria-valuetext`. By default the thumb is labeled via `aria-labelledby` pointing at the id carried on the `label` attribute group; consumers can override with explicit `ariaLabel` or `ariaLabelledBy`.
  - **OutMessage `ChangedValue`.** Emitted whenever the value actually changes — not on no-op keyboard events at the min/max boundary, and not on `ReleasedDragPointer` (the value was already committed during the drag).

  Also extends `OnPointerDown` with `clientX` / `clientY` so click-to-jump on the track can compute a value from the cursor position without re-reading the pointer event from the DOM. The two new parameters are appended after `timeStamp`, so existing 5-argument callers (Menu, Listbox, DragAndDrop, etc.) continue to work unchanged.

  Horizontal orientation only in v1; range (two-thumb) sliders and tick marks are planned follow-ups.

## 0.72.0

### Minor Changes

- 4b07852: **Breaking**: Renamed `Ui.Transition` to `Ui.Animation` and expanded the contract to cover both CSS transitions and CSS keyframe animations.

  The lifecycle coordinator previously filtered `element.getAnimations()` down to `CSSTransition` instances, so consumers styling enter/leave with `@keyframes` got no completion signal and the state machine hung in `LeaveAnimating` forever. `Task.waitForAnimationSettled` now resolves once every animation on the element has settled (CSS transitions and CSS keyframe animations alike).

  Migration:
  - `Ui.Transition` → `Ui.Animation`
  - `Task.waitForTransitions` → `Task.waitForAnimationSettled`
  - `EndedTransition` Message → `EndedAnimation`
  - `WaitForTransitions` Command → `WaitForAnimationSettled`
  - `AdvancedTransitionFrame` Message → `AdvancedAnimationFrame`
  - Consumer submodel field `transition: Transition.Model` → `animation: Animation.Model`
  - Consumer wrapper Message `GotTransitionMessage` → `GotAnimationMessage`
  - Consumer racing Command `DetectMovementOrTransitionEnd` → `DetectMovementOrAnimationEnd`
  - `./ui/transition` package export path → `./ui/animation`

  State-machine names stay (they describe lifecycle phases, not CSS mechanisms): `TransitionState`, `transitionState`, `TransitionedOut`, and the `data-enter` / `data-leave` / `data-transition` / `data-closed` attributes.

  Leave animations must be finite. `animation-iteration-count: infinite` never fires `animationend` and will hang the state machine in `LeaveAnimating`.

  This also surfaces as a migration concern for existing consumers. A consumer whose animated element carried an unrelated infinite CSS keyframe animation (a spinner, a pulse, etc.) previously worked because only `CSSTransition` instances were awaited on leave. With the broadened contract, the infinite animation is now included in the settlement check. Either make the animation finite or move it to a descendant element so it isn't the animated target itself.

## 0.71.0

### Minor Changes

- 6a4e4a2: Add `Ui.Toast` — a headless stack of transient notifications anchored to a corner of the viewport, parameterized on a user-provided payload schema. Each entry runs its own enter/leave animation via a `Transition.Model` submodel and its own auto-dismiss timer, with pause-on-hover. One container lives at the app root; entries are added dynamically via `Toast.show(model, input)`.

  The component owns only lifecycle and a11y fields — id, variant (drives ARIA role), transition, dismiss timer, hover state. **Content is entirely the consumer's concern:** bind a Toast module to your own payload schema via `Ui.Toast.make(PayloadSchema)`, and the resulting Model, Message, `show`, `view`, and `renderEntry` callback are all typed to your shape.

  ```ts
  const ToastPayload = S.Struct({
    bodyText: S.String,
    maybeLink: S.OptionFromSelf(S.Struct({ href: S.String, text: S.String })),
  })
  export const Toast = Ui.Toast.make(ToastPayload)

  // ...

  Toast.show(model.toast, {
    variant: 'Success',
    payload: {
      bodyText: 'Order shipped',
      maybeLink: Option.some({ href: '/order/abc', text: 'Track' }),
    },
  })
  ```

  Notable design choices:
  - **Parameterized on payload, opinionated only on a11y.** The component reads `variant` (to pick `role="status"` vs `role="alert"`) and the lifecycle fields it owns. It never reads payload. Anything text-level, link-level, interactive, or visual is in the consumer's payload schema and rendered by their `renderEntry`.
  - **Dynamic children.** Toast's Model holds a runtime-varying list of submodel-like entries. Entry IDs come from a monotonic `nextEntryKey` counter in Model, keeping the system fully reproducible without a side-effecting Command.
  - **Headless `renderEntry(entry, handlers)`.** Each entry is wrapped in an `<li>` by the component (with role, hover lifecycle, and transition data attributes); consumers render the inner content and wire `handlers.dismiss` to their close button.
  - **Cancellable auto-dismiss.** Each entry carries `pendingDismissVersion`; hover and manual dismiss bump the version so stale `ElapsedDuration` messages are discarded when they fire. `LeftEntry` reschedules with the fresh version.
  - **Six positions** (TopLeft, TopCenter, TopRight, BottomLeft, BottomCenter, BottomRight) stack toward the anchored edge via CSS flex direction — newest closest to the edge, no manual ordering required. `position` is a `view` prop rather than a Model field, so it can vary per render.
  - **Accessibility.** Container is `role="region"` with `aria-live="polite"`, always mounted so screen readers observe the live region from page load. Entries get `role="status"` for Info/Success and `role="alert"` for Warning/Error.
  - **Focus-based pause deferred.** Foldkit's OnFocus/OnBlur use non-bubbling events, so pausing while a focusable child has focus is not yet supported. Toasts pause on pointer hover only; keyboard users can dismiss manually. Tracked in FOL-202 / FOL-203.

## 0.70.0

### Minor Changes

- 5d8c2db: Add `Ui.Tooltip` — a headless tooltip primitive that opens on hover (after a configurable delay) or keyboard focus, and closes on pointer-leave, blur, Escape, or left-click of the trigger. Reuses the anchor positioning engine shared with `Popover` and `Menu`. Non-interactive panel with `role="tooltip"` and `aria-describedby` on the trigger.

  Notable design choices:
  - `showDelay` accepts any `Duration.DurationInput` (e.g. `300`, `Duration.millis(400)`, `Duration.seconds(1)`). Default is `Duration.millis(500)`.
  - Mouse-click-induced focus does not auto-open; focus from keyboard, touch, or pen does. Mouse-click focus is disambiguated via a recorded pointer type that gets consumed on the next focus event.
  - Left-click on an open tooltip dismisses it — the user is clicking the button for its action, not to keep the tooltip visible. The dismissal sets `isDismissed`, blocking re-opening until the user disengages (leaves or blurs). Same flag handles Escape dismissal.
  - Hover and focus state are preserved truthfully during the dismissed window; the tooltip doesn't lie about its model.
  - `Tooltip.setShowDelay(model, duration)` lets parents adjust the delay at runtime (e.g. for user preferences or reduced-motion settings). Also available as the `ChangedShowDelay` message for direct Submodel delegation.

## 0.69.0

### Minor Changes

- 51f00a1: Add `OnInsertEffect` attribute for Effect-based DOM lifecycle hooks. The callback runs when the element is inserted and returns an `Effect<Message>` that the runtime executes, dispatching the resulting message. This lets consumers integrate third-party DOM libraries (editors, embeds, charts) declaratively — failure handling stays in the Model via Messages instead of imperative DOM mutation. Pairs with the existing `OnInsert` for cases that don't need to produce a Message.

## 0.68.0

### Minor Changes

- 069609e: Add `openUrl(href)` to `foldkit/navigation` — opens a URL in a new browsing context (tab or window, at the browser's discretion) without leaving the current page. Parallels `load(href)` for cases where you want to dispatch an external URL as a Command without navigating away.

## 0.67.0

### Minor Changes

- 6715dc5: Add `isInvalid` and `anyInvalid` tag-only predicates to `FieldValidation`.

  `isInvalid(state)` returns `true` when the state's tag is `Invalid`. Unlike
  `!isValid(rules)(state)`, it does not treat `NotValidated` or `Validating` as
  errors — it's a tag-only predicate that answers "has the user seen a rule
  failure on this field?"

  `anyInvalid(states)` returns `true` when any state in the input has tag
  `Invalid`. Use for "this step/section has errors" affordances, independent
  of rules.

  Together these fill out the state-only quadrant alongside the existing
  rules-aware `isValid(rules)(state)` and `allValid(pairs)`:

  ```ts
  // Rules-aware (needs rules): "is this state acceptable?"
  isValid(rules)(state)
  allValid([[state, rules], ...])

  // Tag-only (no rules): "has the state hit Invalid?"
  isInvalid(state)
  anyInvalid([state, ...])
  ```

  Useful for view-side affordances like red-dot step indicators or border
  colors, where the question is about the state's tag rather than whether
  the rules are currently satisfied.

## 0.66.0

### Minor Changes

- 44cafe3: Redesign `FieldValidation` around a single string-typed field abstraction.

  The module is scoped to form-field edit state: the lifecycle of a value as a
  user types into an input. For validating static data, use Effect Schema
  directly.
  - `makeField(schema, options)` → `makeRules(options)`. The descriptor no longer
    takes a schema; every field has `value: string`. Required-ness is a
    `makeRules` option (`required: message`), not a rule in the list.
  - The four-state union is now exported as `Field` at module level, shared
    across every field. Use `Field` as the type in your Model.
  - State constructors (`NotValidated`, `Validating`, `Valid`, `Invalid`) are
    exported at module level too. Use them to construct states directly
    (e.g. in async validation Commands and initial Model values).
  - Validations (`[predicate, errorMessage]` tuples) are now called `Rule`.
    The array field on `makeRules` options is `rules`, not `validations`.
  - Two new helpers: `isRequired(rules)` for view affordances like rendering a
    `*` on required field labels, and `allValid(pairs)` for form-level submit
    gates that fold across a list of `(state, rules)` pairs.
  - Number validators (`min`, `max`, `between`, `positive`, `nonNegative`,
    `integer`) have been removed. They couldn't be used with the string-only
    `Field`. If you need to validate a number parsed from input, write a custom
    `Rule` that does the parse and the check together.

  ```ts
  import {
    Field,
    Invalid,
    NotValidated,
    Valid,
    allValid,
    email,
    makeRules,
    minLength,
    validate,
  } from 'foldkit/fieldValidation'

  const emailRules = makeRules({
    required: 'Email is required',
    rules: [email('Please enter a valid email')],
  })

  const passwordRules = makeRules({
    required: 'Password is required',
    rules: [minLength(8, 'Must be at least 8 characters')],
  })

  const Model = S.Struct({
    email: Field,
    password: Field,
  })

  // In update (input → state):
  const nextEmail = validate(emailRules)(value)

  // Initial state in Model:
  const initialEmail = NotValidated({ value: '' })

  // Form-level submit gate:
  const canSubmit = allValid([
    [model.email, emailRules],
    [model.password, passwordRules],
  ])

  // Direct construction in async Commands:
  Valid({ value: email })
  Invalid({ value: email, errors: ['Already taken'] })
  ```

  ### Migration
  - **`makeField(S.String, options)`** → `makeRules(options)`.
  - **`type StringField = typeof StringField.Union.Type`**: delete. Import `Field` from `foldkit/fieldValidation` where you need the type.
  - **`StringField.Union` as the Model field type**: replace with `Field`.
  - **`StringField.Valid({ value })` / `.Invalid(...)` / `.Validating(...)` / `.NotValidated(...)`**: use the module-level constructors `Valid({ value })`, `Invalid({...})`, etc.
  - **`FieldValidation.required(message)` as a list item**: remove it from the list, pass `required: message` to `makeRules`.
  - **`FieldValidation.optional(rule)` wrapper**: delete; absence of `required` makes the field optional, and `validate` returns `NotValidated` for empty values automatically.
  - **`StringField.validate(list)(value)` / `.validateAll(list)(value)`**: replace with `validate(rules)(value)` / `validateAll(rules)(value)` (free functions, rules-scoped).
  - **`FieldValidation.init(field)(value)`**: removed. Use `NotValidated({ value })` directly.
  - **Hand-rolled `field._tag === 'Valid'` submit checks**: replace with `allValid(pairs)` for form-level gates or `isValid(rules)(state)` for single fields. Both are rules-aware (required demands `Valid`; optional also accepts `NotValidated`).
  - **`validations` options field**: renamed to `rules`.
  - **`Validation<T>` / `ValidationMessage<T>` types**: renamed to `Rule` / `RuleMessage` (no generic; both fixed to `string`).

### Patch Changes

- 95bd4c5: Fix devtools model-changed indicator inconsistency. The blue circle next to messages was based on referential inequality, while field-level diff dots used structural comparison. Now both indicators are derived from the same diff result, so a message only shows the blue circle when there are actual value changes to display in the model tree.

## 0.65.0

### Minor Changes

- c53dd67: Add `FieldValidation.optional`, a combinator that wraps a string `Validation` so empty strings pass without being checked. Useful for fields that are optional but must be valid when filled in (e.g. an optional email).

  ```ts
  FieldValidation.validate([
    FieldValidation.optional(FieldValidation.email()),
    FieldValidation.optional(FieldValidation.maxLength(100)),
  ])(model.websiteInput)
  ```

- 9b5bcd9: `FileDrop.ReceivedFiles` now carries `NonEmptyArray<File>` instead of `Array<File>`, and a new `FileDrop.DroppedWithoutFiles` Message and OutMessage covers the case where a drop or input-change event fires without files (typically a drag of non-file data like text, URLs, or images from another page).

  Migration: if your parent update handled `ReceivedFiles({ files })` and branched on `Array.isEmptyArray(files)`, move that branch to a new handler for `DroppedWithoutFiles`. The files list in `ReceivedFiles` is now guaranteed non-empty, so you can drop the empty check on the happy path.

- 3f1a877: Add `Task.uuid`, a primitive that generates an RFC 4122 version 4 UUID via `crypto.randomUUID()`. Use it in Commands that need stable identifiers without threading `crypto` calls through consumer code.

### Patch Changes

- e4b67a0: Fix a runtime race that could corrupt the DOM when a synchronous event fired during a patch caused a nested `dispatchSync` to run against a stale VNode reference. Most visible in Chrome when a focused element was removed from the DOM during a render (Chrome fires `blur` synchronously), and specifically reproduced with `Ui.Listbox`: selecting an item closed the list, removing the items container, firing `blur`, which dispatched another message while the outer render was still mid-patch. Symptom was duplicate DOM elements that the outer render did not clean up.

  The render path now sets an internal `isRendering` flag before patching and clears it after. Any `dispatchSync` that lands while the flag is set offers the message to a pending queue (`Queue.unbounded`) instead of kicking off a nested render. The queue is drained at the end of each render, so the nested messages still process in order, just serially rather than re-entrantly.

- 43f84b7: Internal refactor: call `Effect.runSync` directly in the runtime instead of `.pipe(Effect.runSync)`. Purely stylistic; no runtime behavior change.

## 0.64.0

### Minor Changes

- 6d022a9: Add `Ui.FileDrop`, a headless component for file upload zones that accept both drag-and-drop and click-to-browse. Encapsulates the `<label>` + hidden `<input type="file">` composition plus the drag-state machine that every file-upload UI otherwise reimplements.

  FileDrop exposes a `ReceivedFiles` OutMessage carrying `ReadonlyArray<File>` that fires via both paths (drop and input change), so consumers handle one event regardless of how the user brought the files in. The component Model tracks `isDragOver` and exposes it via `data-drag-over` on the root for styling.

  ```ts
  Ui.FileDrop.view({
    model: model.uploader,
    toParentMessage: message => GotFileDropMessage({ message }),
    multiple: true,
    accept: ['application/pdf', '.doc', '.docx'],
    toView: attributes =>
      label(
        [...attributes.root, Class('...')],
        [p([], ['Drop files or click to browse']), input(attributes.input)],
      ),
  })
  ```

  Also in this release:
  - `AllowDrop()`: new html primitive that calls `preventDefault` on `dragover` without dispatching a Message. Use it on drop zones that just need to be valid drop targets (the HTML5 requirement for `drop` to fire) without flooding the update function with per-tick Messages.
  - `OnDragEnter` and `OnDragLeave` now dedupe via an internal per-element target set with a microtask-deferred empty-check, matching the target-tracking pattern used by react-dropzone and @react-aria/dnd. Pruning stale targets on each event self-heals cases where `dragleave` failed to fire; the microtask deferral prevents a transient false "left" when the pointer crosses from the zone's padding onto a child in synchronous-dispatch rendering.

### Patch Changes

- 6d022a9: DevTools state inspector now displays `File`, `Blob`, `Date`, and `URL` instance contents instead of rendering them as empty objects. The useful data on these browser classes lives on prototype getters, which the previous key-enumeration walk couldn't see. The inspector now unwraps them into plain-object views (e.g. `{ name, size, type, lastModified }` for `File`) before flattening the tree, so consumers can see at a glance which file was dropped or which date was selected.

  Scope is intentionally narrow: only the four classes above are handled. `FileList`, `FormData`, `Map`, `Set`, and other collection-shaped builtins still render as empty objects. Extending coverage is one branch per type in `toInspectableValue`.

## 0.63.0

### Minor Changes

- 25e3f32: Add programmatic `open` and `close` helper functions to all UI components
  with open/close semantics. Each returns `[Model, Commands]` directly,
  mirroring the existing `Dialog.close` pattern.
  - Dialog: add `open`
  - Disclosure: add `close`
  - Menu: add `open`, `close`
  - Combobox: add `open`, `close` (single and multi)
  - Listbox: add `open`, `close` (single and multi)

- 88c2c75: Add programmatic setters for `Calendar` and `DatePicker` constraint props — `setMinDate`, `setMaxDate`, `setDisabledDates`, `setDisabledDaysOfWeek`. These allow consumers to update the `minDate`, `maxDate`, `disabledDates`, and `disabledDaysOfWeek` fields after `init()`, which is how cross-field date validation works (e.g. an end date picker whose minimum tracks a start date picker's selection).

  Constraints remain set at init time via `InitConfig` and live in the Model — the new setters update those fields. They do not reconcile the current selection if it falls outside the new constraint range; callers should `clear` or reassign the selection explicitly if their domain requires it.

  ```ts
  GotStartDateMessage: ({ message }) => {
    const [nextStartDate, commands] = Ui.DatePicker.update(model.startDate, message)
    const nextEndDate = Ui.DatePicker.setMinDate(
      model.endDate,
      nextStartDate.maybeSelectedDate,
    )
    return [evo(model, { startDate: () => nextStartDate, endDate: () => nextEndDate }), ...]
  },
  ```

## 0.62.0

### Minor Changes

- 8e0b0ce: Add DatePicker UI component and Popover contentFocus mode.

  DatePicker wraps Calendar in a Popover with focus choreography (opening
  focuses the grid, closing returns focus to the trigger), click-outside
  dismissal, and an optional hidden form input for native form submission.
  Consumers provide the trigger face and calendar grid layout.

  Popover gains a `contentFocus` option that hands focus ownership to the
  consumer — the panel is not focusable and does not close on blur, so the
  consumer must focus a descendant on open. DatePicker uses this to focus
  the calendar grid instead of the panel.

- 6c6da0c: Simplify Calendar and DatePicker init config — replace Option-wrapped
  parameters with plain optional values.
  - `maybeInitialSelectedDate: Option<CalendarDate>` → `initialSelectedDate?: CalendarDate`
  - `maybeMinDate: Option<CalendarDate>` → `minDate?: CalendarDate`
  - `maybeMaxDate: Option<CalendarDate>` → `maxDate?: CalendarDate`

  Remove `ChangedSelectedDate` from DatePicker OutMessage. Date selection
  now goes through the `onSelectedDate` ViewConfig callback instead.
  OutMessage is just `ChangedViewMonth`.

### Patch Changes

- dfdd933: Fix Popover panel never receiving focus on open.

  FocusPanel/FocusItems commands raced the anchor module's async positioning
  pipeline — they called element.focus() while the panel was still
  visibility:hidden, which is a no-op. Focus is now owned entirely by the
  anchor module: after the first computePosition resolves and clears
  visibility, a requestAnimationFrame defers the focus call so the element
  is painted before focus fires. A new focusSelector option lets consumers
  target a descendant (e.g. DatePicker focuses the calendar grid instead of
  the panel).

  Affects Popover, Menu, and DatePicker. Consumers using FocusPanel or
  FocusItems in story test setups should remove the resolve step — these
  commands are no longer dispatched on open.

## 0.61.0

### Minor Changes

- 79a9ce7: Add `Calendar` module for immutable calendar-date math.

  New `foldkit/calendar` module — an immutable `CalendarDate` type modeling the same concept as Java's `LocalDate` and TC39's `Temporal.PlainDate`. No time, no timezone; useful for birthdays, deadlines, form date inputs, and event calendars. The module depends only on `effect` and can be extracted as a standalone library in the future.

  Construction and interop:
  - `make` / `unsafeMake` / `isCalendarDate` type guard
  - `fromDateLocal` / `fromDateInZone` / `toDateLocal` for JavaScript `Date`
  - `CalendarDateFromIsoString` schema transform for JSON and form serialization

  Arithmetic (all binary functions are dual via `Function.dual`, so data-first and pipe-style calls both work):
  - `addDays` / `addMonths` / `addYears` with day-clamping on month overflow (Jan 31 + 1 month → Feb 28/29)
  - `subtractDays` / `subtractMonths` / `subtractYears`
  - `daysUntil` / `daysSince` matching `Temporal.PlainDate.until` / `since`

  Comparison and ordering:
  - `Order` and `Equivalence` exported as named instances for ecosystem interop
  - `isEqual`, `isBefore`, `isAfter`, `isBeforeOrEqual`, `isAfterOrEqual`
  - `min`, `max`, `between({ minimum, maximum })`, `clamp({ minimum, maximum })`

  Calendar info:
  - `dayOfWeek` via Sakamoto's algorithm, returning a `DayOfWeek` tagged literal
  - `isLeapYear`, `daysInMonth`, `firstOfMonth`, `lastOfMonth`
  - `startOfWeek` / `endOfWeek` with configurable first day of week

  Today:
  - `today.local` and `today.inZone(timeZone)` — Effect-based accessors backed by `Clock.currentTimeMillis`, so tests can freeze time via `TestClock`. This is the only impurity boundary in the module; every other function is referentially transparent.

  Locale and formatting:
  - `LocaleConfig` schema and `defaultEnglishLocale` constant
  - `formatLong`, `formatShort`, `formatAriaLabel` pure formatters

- 79a9ce7: Add `Ui.Calendar` component for rendering accessible inline calendar grids.

  New `foldkit/ui/calendar` module — a calendar UI primitive that manages the 2D keyboard navigation state machine and renders an ARIA grid. Designed for standalone inline-calendar use (scheduling UIs, event calendars) and as the foundation for the upcoming DatePicker component.

  Model:
  - Tracks `viewYear`/`viewMonth` (what the grid is showing), `maybeFocusedDate` (keyboard cursor), `maybeSelectedDate` (chosen value), `isGridFocused` (DOM focus state), plus `locale`, `maybeMinDate`, `maybeMaxDate`, `disabledDaysOfWeek`, and `disabledDates` configuration
  - Two distinct "current date" concepts: navigating with arrows never touches selection; commit gestures (click, Enter, Space) move both
  - `init` takes `today`, optional `maybeInitialSelectedDate`, and configuration; view defaults to the month of the selected date or today

  Messages: `ClickedDay`, `PressedKeyOnGrid`, `ClickedPreviousMonthButton`, `ClickedNextMonthButton`, `SelectedMonthFromDropdown`, `SelectedYearFromDropdown`, `FocusedGrid` / `BlurredGrid`, `RefreshedToday`, `CompletedFocusGrid`.

  Selection events use the controlled / uncontrolled callback pattern from Listbox / Combobox / Popover: provide an `onSelectedDate?: (date: CalendarDate) => ParentMessage` callback in the ViewConfig to take control of the event, then call `Calendar.selectDate(model, date)` from your handler to write the selection back to internal state. Omit the callback for uncontrolled mode where Calendar manages `maybeSelectedDate` automatically.

  OutMessage: `ChangedViewMonth({ year, month })` when navigation changes the visible month — useful for inline-calendar consumers loading month-scoped data like holidays or availability. Date selection does NOT go through OutMessage; subscribe via the `onSelectedDate` callback above.

  Keyboard navigation (WAI-ARIA grid pattern):
  - Arrow keys move focus by day (±1) or week (±7)
  - `Home` / `End` jump to start / end of week (based on `locale.firstDayOfWeek`)
  - `PageUp` / `PageDown` move by month
  - `Shift+PageUp` / `Shift+PageDown` move by year
  - `Enter` / `Space` commits the focused date
  - Navigation skips disabled dates with a bounded cap, so fully-disabled ranges don't cause infinite loops

  Configuration:
  - `maybeMinDate` / `maybeMaxDate` — inclusive range constraints
  - `disabledDaysOfWeek` — e.g. `['Saturday', 'Sunday']` to disable weekends
  - `disabledDates` — explicit array of disabled dates (holidays, blackout days)
  - `locale` — `LocaleConfig` from `foldkit/calendar`, defaults to `defaultEnglishLocale`

  View:
  - `view` builds ARIA attribute groups (`grid`, `row`, `gridcell`, `columnheader`) plus derived data (6×7 grid of dates, rotated column headers, month/year dropdown options, formatted heading text) and delegates layout to a `toView` callback
  - `lazy` memoizes the view for stable renders
  - `focusGrid(id)` builds a command that focuses the grid container — intended for parent components like DatePicker that hand off focus after opening

  Also extracted named constants for Gregorian cycle arithmetic in `foldkit/calendar/arithmetic.ts` (`MONTHS_PER_YEAR`, `DAYS_PER_YEAR`, `YEARS_PER_ERA`, `DAYS_PER_ERA`, `EPOCH_DAY_OFFSET`). No behavior change, clearer Howard Hinnant algorithm references.

## 0.60.0

### Minor Changes

- c7191f0: Add `Ui.Combobox.selectItem` and `Ui.Combobox.Multi.selectItem` helpers, mirroring the equivalents on `Ui.Listbox`. Use these in domain-event handlers when a combobox uses `onSelectedItem` to intercept selection. Single-select takes `(model, item, displayText)` because Combobox tracks the selected item and its display text separately. Multi-select takes `(model, item)` since it only tracks the toggled items.
- c7191f0: Add `Ui.Listbox.Multi.selectItem` helper, mirroring `Ui.Listbox.selectItem` for single-select. Use this in domain-event handlers when a multi-select listbox uses `onSelectedItem` to intercept selection — it returns the next listbox state with the item toggled in or out of the selection.
- c7191f0: **Breaking**: renamed `Ui.Transition.Hidden` to `Ui.Transition.Hid`. The Message convention is verb-first past-tense events describing what happened (`Showed`, `Clicked`, `Submitted`), and `Hidden` is the past participle of hide — grammatically mismatched with its sibling `Showed`. `Hid` is the correct past simple form.

  Migration: replace `Ui.Transition.Hidden()` with `Ui.Transition.Hid()` at every call site. TypeScript will surface any remaining references as errors.

## 0.59.0

### Minor Changes

- a486514: Complete Scene's AccName 1.2 "text alternative from native host language" coverage and expand the implicit role map.

  `Scene.role(tag, { name })` now resolves accessible names from every native-host source in the W3C AccName 1.2 spec:
  - `img.alt` and `area.alt`
  - `input[type="image"].alt`
  - `input[type="submit|button|reset"].value`
  - `<fieldset>` → text of its `<legend>` child
  - `<figure>` → text of its `<figcaption>` child
  - `<table>` → text of its `<caption>` child

  The implicit role map was extended with common elements that previously matched nothing: `p` (paragraph), `hr` (separator), `dialog`, `main`, `aside` (complementary), `fieldset`/`details` (group), `figure`, `output` (status), `progress` (progressbar), `meter`, `summary` (button), `tr` (row), `td` (cell). `input[type="image|button"]` now correctly map to role `button`.

  Edge cases from the ARIA-in-HTML spec are now handled:
  - `<img alt="">` has role `presentation`, not `img`.
  - `<a>` and `<area>` without an `href` have role `generic`, not `link`.
  - `<th scope="row">` has role `rowheader`; otherwise `columnheader`.

  Context-sensitive landmark roles are now resolved by walking the ancestor chain:
  - `<header>` has role `banner` unless it descends from `<article>`, `<aside>`, `<main>`, `<nav>`, or `<section>`, in which case it's `generic`.
  - `<footer>` has role `contentinfo` under the same conditions.
  - `<section>` has role `region` when it has an accessible name (via `aria-label`, `aria-labelledby`, or `title`); otherwise `generic`.

### Patch Changes

- 314f132: Fix `label(For(id), ...)` so the `for` attribute actually reaches the DOM.

  The `For` attribute handler was routing through snabbdom's `props` module with the key `for`, which told snabbdom to run `element.for = value`. `HTMLLabelElement` has no `for` property — the reflected DOM property is `htmlFor` — so the assignment silently created a JS expando and no `for=""` attribute was ever emitted on the rendered label. Every Foldkit form using `label([For(id)], ...)` was missing its label↔control association, so assistive tech and axe-core could not resolve accessible names from the label.

  The handler now routes through `htmlFor`, which snabbdom assigns as a real DOM property and which reflects to the `for` HTML attribute.

## 0.58.0

### Minor Changes

- 438005c: Add File module for file upload support.

  New `foldkit/file` module exports an opaque `File` type, metadata accessors (`name`, `size`, `mimeType`), and Effects for file selection and reading — all mirroring Elm's `elm/file` package design:
  - `File.select(accept)` and `File.selectMultiple(accept)` open the native file picker and resolve with the selected files.
  - `File.readAsText(file)`, `File.readAsDataUrl(file)`, and `File.readAsArrayBuffer(file)` wrap the browser `FileReader` API.
  - `FileReadError` tagged error for reader failures.

  Two new event attributes in the `foldkit/html` module for use with form file inputs and drag-and-drop zones:
  - `OnFileChange` decodes `event.target.files` for `<input type="file">` elements.
  - `OnDropFiles` decodes `event.dataTransfer.files` on drop events and calls `preventDefault`.

  Two new scene test helpers in `foldkit` (`Scene.changeFiles` and `Scene.dropFiles`) for asserting file upload flows in scene tests. Both helpers throw a clear error when applied to an element whose change or drop handler was registered via `OnChange`/`OnDrop` instead of the file-aware variant, preventing silent misuse that would otherwise dispatch the wrong message with an empty value.

  `Scene.role('img', { name })` now resolves `alt` attributes as the accessible name, matching the W3C AccName 1.2 "text alternative from native host language" step. Previously Scene only resolved `aria-labelledby`, `aria-label`, `<label for>`, text content, and `title`, so images required `Scene.altText` as a workaround.

## 0.57.0

### Minor Changes

- 2019063: Add deep submodel filtering to DevTools. The message filter now recursively unwraps nested `Got*Message` wrappers, so submodels at any depth appear in the filter dropdown. Each filter level displays the tag one level deeper than the selected submodel, giving distinct views at each nesting depth. Also fixes the filter button hover state when the listbox is open, and fixes a listbox bug where closing via pointer down would reset state needed by the subsequent click handler.
- 23a1e3e: Refactor all animated UI components to use Transition Submodel

  Dialog, Popover, Menu, Listbox, and Combobox now hold a `Transition.Model` submodel and delegate animation lifecycle to `Transition.update`. Transition emits `StartedLeaveAnimating` OutMessage so parents provide the leave-phase command — Dialog uses `defaultLeaveCommand`, while Popover/Menu/Listbox/Combobox race button/input movement detection against transition end via `DetectMovementOrTransitionEnd`.

  **Breaking changes across all animated components:**
  - Model field `transitionState` replaced with `transition: Transition.Model`
  - Messages removed: `AdvancedTransitionFrame`, `EndedTransition`
  - Message added: `GotTransitionMessage`
  - Commands removed: `RequestFrame`, `WaitForTransitions`
  - `TransitionState` re-exports removed

  Additional per-component removals:
  - Popover: `DetectedButtonMovement` message removed
  - Menu: `DetectedButtonMovement` message removed
  - Listbox: `DetectedButtonMovement` message removed
  - Combobox: `DetectedInputMovement` message removed

  Transition module changes:
  - OutMessage added: `StartedLeaveAnimating` — emitted when leave advances to `LeaveAnimating`; parent must provide the leave wait command
  - New export: `defaultLeaveCommand` — creates the standard `WaitForTransitions` command for parents that don't need custom leave behavior
  - New export: `TransitionState` — the state schema, previously only re-exported through individual components
  - `ViewConfig.toParentMessage` removed — the Transition view is purely presentational and never dispatched Messages
  - `lazy` signature simplified from `(model, toParentMessage, content) => Html` to `(model, content) => Html`

  **Migration:** Replace any direct references to removed exports with their Transition module equivalents. Handle `GotTransitionMessage` instead of `AdvancedTransitionFrame`/`EndedTransition`/`DetectedButtonMovement`/`DetectedInputMovement`. Access transition state via `model.transition.transitionState` instead of `model.transitionState`. Remove `toParentMessage` from Transition `view`/`lazy` call sites.

### Patch Changes

- 43a08bb: Fix lazy memoization to invalidate when dispatch context changes. Previously, lazy and keyedLazy could return stale cached VNodes when the dispatch context differed between calls, causing event handlers to reference an outdated dispatch function.

## 0.56.0

### Minor Changes

- 057df1c: Add click/doubleClick event bubbling, Scene.pointerDown/pointerUp steps, and RegExp support for role name matching in Scene tests.
  - `Scene.click` and `Scene.doubleClick` now bubble to the nearest ancestor with a handler when the target element has none, mirroring browser event propagation.
  - `Scene.pointerDown(target, options?)` and `Scene.pointerUp(target, options?)` simulate pointer events with configurable `pointerType`, `button`, `screenX`, and `screenY`.
  - `Scene.role('option', { name: /PM/ })` now accepts `RegExp` for flexible accessible name matching.

## 0.55.0

### Minor Changes

- cbdf4b9: Add missing HTML attributes, events, and ARIA properties

  Global attributes: Contenteditable, Draggable, Accesskey, Translate, Inert, Popover, Popovertarget, Popovertargetaction

  Element-specific attributes: Colspan, Rowspan, Scope, Headers, Span, Start, Reversed, CiteAttr, Datetime, Wrap, List, FormAttr, LabelAttr, ContentAttr, Charset, HttpEquiv, Srcset, Sizes, Loading, Decoding, Fetchpriority, Crossorigin, Referrerpolicy, Integrity, Hreflang, Ping, Sandbox, Allow, Srcdoc, Autoplay, Controls, Loop, Muted, Poster, Preload, Playsinline, Formaction, Formmethod, Formnovalidate, Formtarget, Formenctype, High, Low, Optimum, Usemap, Ismap

  Events: OnContextMenu, OnDragStart, OnDrag, OnDragEnd, OnDragEnter, OnDragLeave, OnDragOver, OnDrop, OnTouchStart, OnTouchEnd, OnTouchMove, OnTouchCancel, OnAnimationStart, OnAnimationEnd, OnAnimationIteration, OnTransitionEnd, OnLoad, OnError, OnPlay, OnPause, OnEnded, OnTimeUpdate, OnVolumeChange, OnSelect

  ARIA: AriaAtomic, AriaAutocomplete, AriaColcount, AriaColindex, AriaColspan, AriaDescription, AriaDetails, AriaFlowto, AriaKeyshortcuts, AriaLevel, AriaOwns, AriaPlaceholder, AriaPosinset, AriaReadonly, AriaRelevant, AriaRowcount, AriaRowindex, AriaRowspan, AriaSetsize, AriaValuemax, AriaValuemin, AriaValuenow, AriaValuetext

## 0.54.0

### Minor Changes

- f572dc0: Fix `resolveAll` mapper parameter typed as `unknown` instead of inferring from the Command definition's result Message type. Uses a mapped tuple type to infer `ResultMessage` per resolver, matching `resolve`'s behavior. Rename `ResolverPair` to `Resolver` and extract shared cascading resolution logic to `internal.ts`.

  Migration: replace `Story.ResolverPair` / `Scene.ResolverPair` with `Story.Resolver` / `Scene.Resolver`.

### Patch Changes

- 25a8582: Fix `Scene.text` exact match failing on text nodes with sibling elements. When a text node is a direct child of an element alongside other element children, exact matching now checks individual text nodes instead of only the parent's combined textContent.

## 0.53.0

### Minor Changes

- a22c43d: Add submodel drill-in filter to DevTools. When an app uses Submodels, a dropdown filter appears above the message list letting you scope the view to a single submodel's messages. Filtered messages show the inner message tag and the inspector unwraps the outer `Got*Message` envelope automatically.

## 0.52.0

### Minor Changes

- 95c5451: Change `Story.resolveAll` and `Scene.resolveAll` from a single array argument to variadic rest params.

  Before: `resolveAll([[Definition, Message], [Definition, Message]])`
  After: `resolveAll([Definition, Message], [Definition, Message])`

## 0.51.0

### Minor Changes

- 6c4c657: Add `Transition` UI component for coordinating CSS enter/leave animations. Manages the animation lifecycle via a state machine and data attributes (`data-closed`, `data-enter`, `data-leave`, `data-transition`), with double-rAF timing and Web Animations API completion detection. Sends a `TransitionedOut` OutMessage when the leave animation completes. Supports `animateSize` for smooth height animation via CSS grid (`grid-template-rows: 0fr → 1fr`).
- ce90e6e: Add `expectHasCommands`, `expectExactCommands`, and `expectNoCommands` to Scene, aligning its API with Story. Extract shared command assertion logic to internal helpers to eliminate duplication between Scene and Story.

## 0.50.0

### Minor Changes

- 8b84dbf: Add per-pair message mapper support to `Story.resolveAll` and `Scene.resolveAll`. Each pair in the array can now include an optional third element — a mapper function — matching the same signature as `resolve`'s third argument. This lets tests resolve multiple child Commands in a batch without expanding into individual `resolve` calls.

## 0.49.1

### Patch Changes

- 9eb28ce: Fix `Story.expectExactCommands` always failing due to reference equality on arrays

## 0.49.0

### Minor Changes

- c584588: Rename Story Command assertion helpers for clarity:
  - `Story.expectHasCommand(definition)` → `Story.expectHasCommands(...definitions)` — now accepts one or more Command definitions and asserts all are present among pending Commands
  - `Story.expectCommands(...definitions)` → `Story.expectExactCommands(...definitions)` — same behavior, clearer name

  Migration:

  ```ts
  // Before
  Story.expectHasCommand(FetchWeather)
  Story.expectCommands(FetchWeather, SaveBoard)

  // After
  Story.expectHasCommands(FetchWeather)
  Story.expectExactCommands(FetchWeather, SaveBoard)
  ```

## 0.48.0

### Minor Changes

- 3d9cac6: Rename `OnDblClick` to `OnDoubleClick` to follow the never-abbreviate convention. Remove `Scene.childView` — test submodel views through the root update/view instead of in isolation.
- 42a3af1: Replace `Story.tap` with focused assertion helpers: `Story.model` for Model assertions, `Story.expectHasCommand` / `Story.expectCommands` / `Story.expectNoCommands` for Command assertions, and `Story.expectOutMessage` / `Story.expectNoOutMessage` for OutMessage assertions. Remove `message` from the public `StorySimulation` type.

  Migrate from `Story.tap`:
  - `Story.tap(({ model }) => { ... })` → `Story.model(model => { ... })`
  - `Story.tap(({ commands }) => { expect(commands[0]?.name).toBe(Foo.name) })` → `Story.expectHasCommand(Foo)`
  - `Story.tap(({ commands }) => { expect(commands).toHaveLength(0) })` → `Story.expectNoCommands()`
  - `Story.tap(({ outMessage }) => { expect(outMessage).toEqual(Option.some(Foo())) })` → `Story.expectOutMessage(Foo())`
  - `Story.tap(({ outMessage }) => { expect(outMessage).toEqual(Option.none()) })` → `Story.expectNoOutMessage()`

### Patch Changes

- 1f2ffc7: Fix Dialog visibility during devtools time travel. The view now sets the native `.open` property and positioning styles directly, so the dialog renders correctly from the model alone without depending on Commands having run.

## 0.47.1

### Patch Changes

- 2d10076: Restore the custom propsModule that resets removed DOM properties. Snabbdom's built-in propsModule only sets new properties — it never cleans up old ones that disappeared between renders, so `disabled` persists on the DOM element even after `Disabled(true)` is removed from the attribute array. This was incorrectly reverted in 0.47.0.

## 0.47.0

### Minor Changes

- ff6d14f: `Dialog.lazy` now takes `panelContent` as a dynamic third argument instead of capturing it in the static closure. This fixes a bug where `panelContent` was frozen at creation time, causing stale VNode data (e.g. `Disabled(true)` persisting after model changes).

  Also reverts the custom `propsModule` introduced in 0.46.0 — the root cause was `Dialog.lazy` caching stale content, not snabbdom's property cleanup.

  **Migration:** Move `panelContent` from the config object to the call site:

  ```ts
  // Before
  const dialogView = Dialog.lazy({ panelContent: myContent, panelClassName: '...' })
  dialogView(model.dialog, toParentMessage)

  // After
  const dialogView = Dialog.lazy({ panelClassName: '...' })
  dialogView(model.dialog, toParentMessage, myContent)
  ```

## 0.46.1

### Patch Changes

- 97654fd: Track managed DOM properties per-element via WeakMap instead of relying on the old vnode's data for cleanup. This makes property reset (e.g. `disabled → false`) work regardless of whether snabbdom patches or recreates the element.

## 0.46.0

### Minor Changes

- e72bd7f: Scene testing parity fixes:
  - Add `Scene.all.label(text)` — the multi-match counterpart to `Scene.label`. Finds every element whose accessible label matches via the same four resolution strategies (`aria-label`, `<label for="id">`, nested `<label>`, `aria-labelledby`) and deduplicates. Closes a gap where the docs referenced `Scene.all.label` but it was never implemented.
  - Backfill three Vitest matchers that previously only worked in the `Scene.expect(...).to*()` chain form: `toBeEmpty`, `toBeVisible`, `toHaveId`.
  - `expect(element).toHaveText(/regex/)` and `toContainText(/regex/)` now accept `RegExp`, matching the chain form.

  `toHaveAccessibleName` and `toHaveAccessibleDescription` remain chain-only because they need the root VNode tree to resolve `aria-labelledby` / `aria-describedby` id references — a tree the bare Vitest matchers don't receive.

- e72bd7f: Add three new assertions to `Scene.expect(...)`: `toBeEmpty()` (element has no text or child nodes) and `toHaveId(id)`. Also introduce `Scene.expectAll(locatorAll)` for multi-match assertions, with `toHaveCount(n)` and `toBeEmpty()` (count is 0). `expectAll` respects `Scene.inside` scopes — matches are resolved relative to the active scope.
- e72bd7f: `Scene.click` now mirrors browser semantics more closely:
  - Clicking a submit button (`<button>` with no type or `type="submit"`, `<input type="submit">`, `<input type="image">`) with no click handler of its own falls through to the `submit` handler of the nearest ancestor `<form>`. Tests can now click the submit button directly instead of reaching past it to the form.
  - Clicking an element marked as disabled (`disabled` prop/attribute, or `aria-disabled="true"`) throws a clear error instead of silently invoking its click handler. Disabled elements don't dispatch click events in the browser, so tests shouldn't either.

- e72bd7f: Add more Scene interactions and assertions for RTL/Playwright parity. New interactions: `Scene.doubleClick`, `Scene.hover`, `Scene.focus`, `Scene.blur`, and `Scene.change` (dispatches `OnChange`, useful for `<select>`). `Scene.toHaveText` and `Scene.toContainText` now accept a `RegExp` in addition to a string. New assertions: `.toBeVisible()` (element is not hidden via `hidden`, `aria-hidden`, or `display: none`), `.toHaveAccessibleName(name)`, and `.toHaveAccessibleDescription(description)` — both resolve `aria-labelledby`/`aria-describedby` references against the full render tree.
- e72bd7f: Add `Scene.inside(parent, ...steps)` — a step-scoping primitive for Scene tests. Every Locator referenced by the nested steps resolves within the parent's subtree, so a block of assertions or interactions can share a scope without repeating `Scene.within(parent, …)` on every line. Composes with nested `Scene.inside` via `Scene.within`. Existing `Scene.within` is unchanged — use it for one-off scoped locators; use `Scene.inside` when two or more steps share a scope.
- e72bd7f: Add multi-match Locators and filter combinators to the Scene testing API. `Scene.all` exposes `role`, `text`, `placeholder`, `altText`, `title`, `testId`, `displayValue`, and `selector` factories — each returns a `LocatorAll` that resolves to every matching VNode. Convert to a single `Locator` via `Scene.first`, `Scene.last`, or `Scene.nth(n)`. Narrow a `LocatorAll` via `Scene.filter({ has, hasNot, hasText, hasNotText })`, which keeps entries that do (or don't) contain a matching descendant or substring. Matches Playwright's filter/nth semantics — use it for list rows, repeated buttons, or anywhere you need to pick the Nth of many.
- e72bd7f: Expand `Scene.role(...)` / `getByRole(...)` options to match RTL semantics. In addition to `name`, the options object now accepts `level` (heading level, from `aria-level` or `h1`–`h6`), `checked` (`boolean | 'mixed'`), `selected`, `pressed` (`boolean | 'mixed'`), `expanded`, and `disabled`. State filters read from the corresponding ARIA attributes (`aria-checked`, `aria-selected`, `aria-pressed`, `aria-expanded`, `aria-disabled`) with fallback to the native props (`checked`, `selected`, `disabled`) where appropriate.
- e72bd7f: Add RTL-parity locators to the Scene testing API: `Scene.altText`, `Scene.title`, `Scene.testId`, and `Scene.displayValue` (plus their underlying `getByAltText`, `getByTitle`, `getByTestId`, `getByDisplayValue` query functions). These match the React Testing Library queries of the same names — useful for finding images by `alt` text, elements by `title` tooltip, elements by `data-testid`, and form controls by their current value.
- e72bd7f: Add `foldkit/test/vitest` subpath export with a `setup()` helper that registers Foldkit's Scene matchers with Vitest and augments `Assertion<T>` with their types. Replaces the ~24 lines of `expect.extend` + `declare module 'vitest'` boilerplate every consumer had to copy into their `vitest-setup.ts`:

  ```ts
  // vitest-setup.ts
  import { setup } from 'foldkit/test/vitest'

  setup()
  ```

### Patch Changes

- feefe33: Replace snabbdom's built-in propsModule with a custom one that resets removed DOM properties. Snabbdom's propsModule only sets new properties and never cleans up old ones, so properties like `disabled` persist on the DOM element even after being removed from the attribute array. This caused event listeners (e.g. `OnClick`) that replaced a property (e.g. `Disabled`) at the same index to silently fail.

## 0.45.0

### Minor Changes

- 4ed2508: Switch Ui.Input, Ui.Textarea, and Ui.Select label association from aria-labelledby to the standard label[for] → input[id] pattern. Remove the now-unused labelId export from all three components. Add aria-labelledby reverse lookup to getByLabel so it resolves elements whose aria-labelledby points to a label with matching text.

## 0.44.0

### Minor Changes

- 7618151: Add Scene for feature-level testing through the view. Scene complements Story — where Story tests the update function by sending Messages directly, Scene tests features by clicking buttons, typing into inputs, and pressing keys. Includes a CSS selector query engine (find, findAll, text, attr), accessible locators (getByRole, getByText, getByPlaceholder, getByLabel), a callable Locator type for interaction targeting (role, placeholder, label, selector), inline assertion steps (Scene.expect(locator).toExist(), .toHaveText(), .toContainText(), .toHaveAttr(), etc.), interaction steps (click, submit, type, keydown), and custom Vitest matchers (toHaveText, toContainText, toHaveClass, toHaveAttr, toHaveStyle, toHaveValue, toBeDisabled, toBeEnabled, toBeChecked, toHaveHook, toHaveHandler, toExist, toBeAbsent).

### Patch Changes

- f44cc49: Make Scene.type and Scene.keydown dual for data-last piping. Both interactions now accept a single-argument form that returns a function waiting for the target, enabling pipe composition with locators: `pipe(Scene.label('Email'), Scene.type('alice@example.com'))`.

## 0.43.2

### Patch Changes

- ea6be4e: Improve DevTools performance with large models by replacing Schema.equivalence with reference equality for the isModelChanged flag, computing model diffs eagerly at record time instead of on-demand during inspection, and gating the store subscription on panel visibility to skip work when DevTools is closed.

## 0.43.1

### Patch Changes

- 91fbde2: Fix arrow key navigation requiring two presses and tab-close not working in Listbox, Menu, and Popover. Arrow keys now delegate to the items keydown handler when the component is already open. Focus moves to the items container via the anchor `focusAfterPosition` option, which fires after the first position computation clears `visibility: hidden` — necessary because browsers ignore `.focus()` on hidden elements.
- e8002e7: Preserve activationTrigger on close instead of resetting to Keyboard. Refactor query-sync example to use onSelectedItem callbacks instead of matching on internal SelectedItem messages.

## 0.43.0

### Minor Changes

- 9ce1b33: Add Ui.DragAndDrop component with four-state drag state machine (Idle, Pending, Dragging, KeyboardDragging), document-level pointer and keyboard subscriptions, collision detection, ghost element positioning, and draggable/droppable attribute helpers.

  Add subscription equivalence and readDependencies support: subscriptions can now provide a custom `equivalence` to control when dependency changes restart the stream, and `dependenciesToStream` receives a `readDependencies` callback for reading the latest dependencies without retriggering.

### Patch Changes

- 1c9e18d: Fix DevTools model tree expansion and diff highlighting bugs. Add Snabbdom keys to tree nodes so the virtual DOM correctly reuses elements when expanding/collapsing, and replace reference-identity array diffing with positional comparison that recurses into items to find specific changed fields.

## 0.42.0

### Minor Changes

- e061e16: Add optional `title` config to `makeProgram` for declarative `document.title` management. The function receives the current Model and is called after every render, keeping the browser tab title in sync with application state.
- 321dac6: Rename `toMessage` to `toParentMessage` across all UI component `ViewConfig` types and the test module. The new name makes the semantics unambiguous — it always maps a child module's Message to the immediate parent's Message type, regardless of nesting depth.
- 13afdac: Add optional domain-event callbacks to all UI components, separating user-meaningful events from internal plumbing in `toParentMessage`. Backwards compatible — when omitted, existing behavior is unchanged.

  **RadioGroup:** `onSelected(value, index)` with narrowed generic type, `select()` helper, `SelectedOption` value export
  **Tabs:** `onTabSelected(index)`, `selectTab()` helper
  **Dialog:** `onClosed()`, `close()` helper
  **Menu:** `onSelectedItem(index)`, `selectItem()` helper
  **Listbox:** `onSelectedItem(value)` (single + multi), `selectItem()` helper
  **Popover:** `onOpened()`, `onClosed()`, `open()` and `close()` helpers
  **Disclosure:** `onToggled()`, `toggle()` helper
  **Combobox:** `onSelectedItem(value)` (single + multi), `SelectedItem` value export

  Previously type-only message constructors (`SelectedOption`, `TabSelected`, `SelectedItem`, `Opened`, `Closed`, `Toggled`) are now exported as values for programmatic use with `update()` and helper functions.

### Patch Changes

- 79b5198: Export Command definitions and their result Message constructors from all UI components, enabling consumers to resolve Commands in `Test.story`. Affects Dialog, Menu, Popover, Combobox, Listbox, Disclosure, Tabs, and RadioGroup.

## 0.41.0

### Minor Changes

- d3844f2: Add Commands tab to DevTools inspector. The third tab shows Command definition names returned by update for the selected Message. Init Command names are now recorded and displayed when inspecting the init entry.
- 5331993: Consolidate `makeElement` and `makeApplication` into a single `makeProgram` function. The presence of a `routing` config determines whether the program has URL routing. Rename `BrowserConfig` to `RoutingConfig` and the `browser` config key to `routing`.

  **Migration:**
  - `Runtime.makeElement(config)` → `Runtime.makeProgram(config)`
  - `Runtime.makeApplication(config)` → `Runtime.makeProgram(config)`
  - `browser: { onUrlRequest, onUrlChange }` → `routing: { onUrlRequest, onUrlChange }`
  - `Runtime.BrowserConfig` → `Runtime.RoutingConfig`
  - `Runtime.ElementInit` → `Runtime.ProgramInit`
  - `Runtime.ApplicationInit` → `Runtime.RoutingProgramInit`
  - `Runtime.ElementConfigWithFlags` → `Runtime.ProgramConfigWithFlags`
  - `Runtime.ElementConfigWithoutFlags` → `Runtime.ProgramConfig`
  - `Runtime.ApplicationConfigWithFlags` → `Runtime.RoutingProgramConfigWithFlags`
  - `Runtime.ApplicationConfigWithoutFlags` → `Runtime.RoutingProgramConfig`

### Patch Changes

- 7f57617: Update README example links to point to foldkit.dev website pages and add Testing to the "What Ships With Foldkit" section.

## 0.40.0

### Minor Changes

- a53c46d: Add `foldkit/test` — a testing module for Foldkit programs. Six functions:
  - `Test.story` — run a test story for an update function, throw on unresolved Commands
  - `Test.with` — set the initial Model for a story
  - `Test.message` — send a Message (throws if Commands from a previous step are unresolved)
  - `Test.resolve` — resolve one Command inline with its result (throws if the Command isn't pending; accepts an optional `toParentMessage` mapper for Submodel testing)
  - `Test.resolveAll` — resolve many Commands inline with cascading support
  - `Test.tap` — assert on model, message, commands, outMessage

  Also requires result Message schemas on `Command.define`:

  ```ts
  Command.define('FetchWeather', SucceededFetchWeather, FailedFetchWeather)
  ```

### Patch Changes

- e2b52fe: Export `Field` interface as named return type for `makeField`, improving IDE hover tooltips

## 0.39.0

### Minor Changes

- 9f89bfa: Replace `Command.make` with `Command.define` — a branded `CommandDefinition` that is the only way to create Commands. Definitions are PascalCase constants that carry type-level identity (literal name, `CommandDefinitionTypeId` brand). Access the name via `.name` on the definition.

  **Breaking:** `Command.make` is removed. Replace all usages:

  ```ts
  // Before
  const fetchWeather = (city: string) =>
    Effect.gen(function* () { ... }).pipe(
      Effect.catchAll(() => Effect.succeed(FailedFetchWeather())),
      Command.make('FetchWeather'),
    )

  // After
  const FetchWeather = Command.define('FetchWeather')

  const fetchWeather = (city: string) =>
    FetchWeather(
      Effect.gen(function* () { ... }).pipe(
        Effect.catchAll(() => Effect.succeed(FailedFetchWeather())),
      ),
    )
  ```

- a0fed13: Renamed `depsToStream` to `dependenciesToStream` in the Subscription type and `makeSubscriptions` API to follow the project convention of using full, unabbreviated names.

  **Migration:**

  ```diff
  - depsToStream: (dependencies) => ...
  + dependenciesToStream: (dependencies) => ...
  ```

- 88f7b7a: Rename all Completed/Succeeded/Failed Messages to verb-first order

  All Message prefixes now use verb-first naming that mirrors the corresponding Command name. This makes Command-to-Message pairs instantly recognizable: Command `LockScroll` → Message `CompletedLockScroll`.

  **Breaking changes — UI component Messages:**
  - `CompletedDialogShow` → `CompletedShowDialog`
  - `CompletedDialogClose` → `CompletedCloseDialog`
  - `CompletedItemsFocus` → `CompletedFocusItems`
  - `CompletedButtonFocus` → `CompletedFocusButton`
  - `CompletedScrollLock` → `CompletedLockScroll`
  - `CompletedScrollUnlock` → `CompletedUnlockScroll`
  - `CompletedInertSetup` → `CompletedSetupInert`
  - `CompletedInertTeardown` → `CompletedTeardownInert`
  - `CompletedItemClick` → `CompletedClickItem`
  - `CompletedFocusAdvance` → `CompletedAdvanceFocus`
  - `CompletedPanelFocus` → `CompletedFocusPanel`
  - `CompletedInputFocus` → `CompletedFocusInput`
  - `CompletedTabFocus` → `CompletedFocusTab`
  - `CompletedOptionFocus` → `CompletedFocusOption`

  **Migration:** Update all references to the old names.

### Patch Changes

- 2f72c9a: Remove unused `Class` import in tabs test file.

## 0.38.0

### Minor Changes

- f07aea6: Subscriptions emit Stream<Message> instead of Stream<Command<Message>>

  Subscription streams now emit Messages directly. For subscription callbacks with side effects (like `event.preventDefault`), use `Stream.mapEffect`.

  **Breaking changes:**
  - `dependenciesToStream` returns `Stream<Message>` instead of `Stream<Command<Message>>`
  - Remove Effect wrappers from subscription stream emissions

  **Migration:**

  ```ts
  // Before:
  Stream.map(() => Effect.succeed(Ticked()))

  // After:
  Stream.map(Ticked)
  ```

## 0.37.0

### Minor Changes

- 9a682d8: Add names to Commands

  Command is now a struct with `name` and `effect` fields. Create Commands with `Command.make` (dual — data-first or data-last). Transform Commands with `Command.mapEffect` (also dual). Both `make` and `mapEffect` are re-exported from `foldkit` via the `Command` namespace.

  **Breaking changes:**
  - `Command<T>` is a struct `{ readonly name: string; readonly effect: Effect<T> }`, not `Effect<T>`
  - Commands must be created with `Command.make`, not bare Effects

  **New features:**
  - `Command.make(name, effect)` — creates a named Command
  - `Command.mapEffect(command, f)` — transforms the Effect, preserving the name
  - Runtime traces Command execution via `Effect.withSpan`

  **Migration:**
  1. Import: `import { Command } from 'foldkit'`
  2. Wrap every bare Effect returned as a Command in `Command.make`:

     ```ts
     // Before:
     Task.focus(selector).pipe(Effect.as(CompletedButtonFocus()))
     // After:
     Task.focus(selector).pipe(
       Effect.as(CompletedButtonFocus()),
       Command.make('FocusButton'),
     )
     ```

  3. Replace `Effect.map` on Commands with `Command.mapEffect` for Submodel Command mapping:

     ```ts
     // Before:
     commands.map(command =>
       Effect.map(command, message => GotChildMessage({ message })),
     )
     // After:
     commands.map(
       Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
     )
     ```

## 0.36.3

### Patch Changes

- c6e7349: Replace `requestAnimationFrame` with `Effect.suspend` in all DOM tasks (`focus`, `showModal`, `closeModal`, `clickElement`, `scrollIntoView`, `advanceFocus`) so they execute within the same browser task as the user gesture, fixing mobile input focus. Fix dialog backdrop not covering full viewport on iOS Safari during toolbar animations by adding `min-height: 100vh` and removing unnecessary `overflow: hidden`.

## 0.36.2

### Patch Changes

- 99320f2: Add `focusSelector` option to `Task.showModal` and thread it through `Ui.Dialog` so dialogs can focus an element in the same animation frame as `show()`, fixing focus on mobile browsers that ignore `focus()` outside the user-gesture call stack.

## 0.36.1

### Patch Changes

- a589a5f: Fix DevTools staying interactive above showModal() dialogs by switching Task.showModal to use show() with focus trapping and Escape key handling
- 214854a: Fix DevTools rendering behind search dialog backdrop by adding a z-index to the shadow DOM host element
- 758f1a5: Skip dialog Escape handler when event is already handled by a child element
- 6d41dca: Fix spurious input events triggered by unconditional value/checked/selected/open property patching during re-render
- 5a56fa5: Fix focus trap selector to respect tabindex="-1" on natively-focusable elements

## 0.36.0

### Minor Changes

- ea72be3: Replace `errorView` with grouped `crash` config containing `view` and `report`

  **Breaking changes:**
  - `errorView` config field removed — use `crash: { view }` instead
  - `crash.view` receives `CrashContext<Model, Message>` (with `error`, `model`, and `message` fields) instead of a bare `Error`

  **New features:**
  - `crash.report` callback for side effects (e.g. Sentry) — runs before `crash.view` renders, receives the same `CrashContext`
  - `CrashContext` and `CrashConfig` types exported from `foldkit`

  **Migration:**

  ```ts
  // Before
  makeElement({
    errorView: error => myErrorView(error),
  })

  // After
  makeElement({
    crash: {
      view: ({ error }) => myErrorView(error),
      report: ({ error, model, message }) => {
        Sentry.captureException(error, { extra: { model, message } })
      },
    },
  })
  ```

- 7795644: Replace `slowViewThresholdMs` with `slowView` config object supporting `show`, `thresholdMs`, and `onSlowView`. The `onSlowView` callback receives a `SlowViewContext` with the current model, triggering message, duration, and threshold — replacing the previous `SlowViewInfo` which only had timing data. Rename `VisibilityShow` to `Visibility`. Refactor `DevtoolsConfig` to use `false` instead of `show: 'Never'`, eliminating impossible states.

### Patch Changes

- c3efb50: Make vite-plugin-foldkit optional for local development. The runtime now falls back to a cold start with a helpful console warning if the plugin is missing, instead of silently showing a blank screen.

## 0.35.2

### Patch Changes

- 85303cc: Improve declaration file readability by adding explicit type annotations to component Message unions. `go to definition` now shows clean `typeof` references instead of expanded `CallableTaggedStruct` generics.

## 0.35.1

### Patch Changes

- d6bf6c9: Remove unused Flags schema destructuring and rename internal flags binding for clarity in makeRuntime.

## 0.35.0

### Minor Changes

- 9220d0c: Narrow generic type parameters in RadioGroup `view` signatures so typed values flow through `toMessage` callbacks without requiring consumer-side decoding. `OptionConfig.value` and the `SelectedOption` message in `toMessage` now carry the `RadioOption` generic instead of widening to `string`.

### Patch Changes

- d06075e: Remove vestigial transparent left border from DevTools message rows that caused a visible gap at the left edge of row dividers.

## 0.34.1

### Patch Changes

- 190a475: Add `buttonAttributes` and `panelAttributes` to `TabConfig`, fixing devtools overlay tabs that lost styling after the attributes escape hatch refactor.

## 0.34.0

### Minor Changes

- f8b8b5f: Add `attributes` escape hatch to component-rendered UI components alongside existing `className` props.

  Every element slot on component-rendered components (Tabs, Disclosure, Dialog, Popover, Menu, Listbox, Combobox, RadioGroup) now accepts an optional `*Attributes: ReadonlyArray<Attribute<Message>>` alongside the existing `*ClassName: string`. The component spreads `className` first, then `attributes`, so consumers can pass `Class(...)`, `DataAttribute(...)`, `Style({...})`, or any other attribute through the escape hatch.

  Replace `NoOp` with descriptive `Completed*` messages across all UI components. Every message now carries meaning about what happened. Fire-and-forget commands use object+verb compound nouns (`CompletedScrollLock`, `CompletedDialogShow`). View-dispatched no-ops use descriptive facts (`IgnoredMouseClick`, `SuppressedSpaceScroll`). Consumers matching on `NoOp` must update to the component-specific `Completed*` variants.

  Export `createLazy` and `createKeyedLazy` from `foldkit/html` — previously these were internal-only, now available for consumers building custom lazy-evaluated views.

  Add lazy memoization to DevTools tree nodes and message rows for improved rendering performance.

  **Breaking changes:**
  - **All UI components**: `NoOp` message removed. Replace with the component-specific `Completed*`, `Ignored*`, or `Suppressed*` messages (see each component's public exports).
  - **Tabs**: `tabListAriaLabel` is now required (was optional).
  - **RadioGroup**: `ariaLabel` is now required (new prop — enforces accessible name on the `radiogroup` role).
  - **Foldkit vdom**: `keyed()` now accepts `ReadonlyArray<Attribute<Message>>` instead of `ReadonlyArray<AttributeWithoutKey<Message>>`.

## 0.33.6

### Patch Changes

- 8b27c43: Add `overscroll-behavior: none` to devtools message list and inspector tree to suppress rubber-band overscroll effects

## 0.33.5

### Patch Changes

- 1b27ec6: Fix devtools mobile scroll and border styling: hide init row border on mobile where the pane border provides the separator, add min-h-0 to inspector pane for mobile tab panel scrolling, soften borders from Surface2 to Surface1, remove border and darken text on paused badge, and remove right border from last tab button.

## 0.33.4

### Patch Changes

- ba4d3ec: Add border to devtools badge matching the panel border. Remove bottom border from flush edge. Lowercase "init" in display text.

## 0.33.3

### Patch Changes

- 437e17c: Fix devtools Inspect mode header showing blank status on open and after clearing history. Replace `maybeSelectedIndex` Option with `selectedIndex` + `isFollowingLatest` so the header always reflects the inspected message. Remove `overscroll-behavior: contain` from devtools scrollable areas.

## 0.33.2

### Patch Changes

- 1369d6a: Fix iOS Safari scroll lock blocking touch scrolling inside devtools shadow DOM. Use `composedPath()` to resolve the real touch target across shadow boundaries.

## 0.33.1

### Patch Changes

- 7c0a3b7: Fix devtools overlay scroll locking on mobile with viewport-reactive lock, fix clear history breaking inspection, add keyed elements and semantic HTML to prevent stale DOM during panel transitions, and add overscroll containment.

## 0.33.0

### Minor Changes

- a9f2b8d: Add built-in devtools overlay for inspecting Messages and Model state, with TimeTravel mode (pause and jump to historical states) and Inspect mode (browse snapshots without pausing). Also default the `html()` generic to `never` so omitting the Message type argument produces a compile error on event handlers, and replace classnames with clsx.

## 0.32.0

### Minor Changes

- b5618f7: Add TransitionState support to Dialog for smooth enter/leave CSS transitions via an animated variant. Fix double scrollbar and background scroll on iOS Safari by resetting UA styles on the dialog element and managing scroll lock on open/close.

## 0.31.0

### Minor Changes

- 3ae1c8b: Add TransitionState support to Dialog component for coordinated CSS enter/leave transitions

## 0.30.0

### Minor Changes

- d81a237: Add Button, Input, Textarea, Select, and Fieldset UI components with label and description ID helpers, typed attributes, and individual subpath exports
- 8c9e95f: Automatically constrain floating dropdowns to the viewport using Floating UI's size middleware. Components using anchor positioning (Combobox, Listbox, Menu, Popover) now set max-height based on available space and scroll internally instead of overflowing the page.

### Patch Changes

- d81a237: Export missing message constructors from Menu and Listbox public modules, fix Disclosure Space key scrolling on non-native button elements, and align Combobox pointer-move handler with Menu/Listbox behavior

## 0.29.0

### Minor Changes

- 15e6c87: Add Checkbox UI component with ARIA support, indeterminate state, and lazy memoization. Add runtime reference equality fast-path that skips render and equivalence check when update returns the same model.

## 0.28.0

### Minor Changes

- a672d0c: Add Radio Group component (`Ui.RadioGroup`) with roving tabindex, orientation-aware arrow key navigation, per-option disabled state, and form submission via hidden input

## 0.27.0

### Minor Changes

- 4153513: Add Combobox UI component with nullable, multi-select, and select-on-focus modes. Add lazy factory to all UI components.

## 0.26.0

### Minor Changes

- 7b164d1: Add Popover and Switch UI components with shared anchor and transition infrastructure.

  **Breaking:** Field Validation API improvements — `Invalid` now carries `errors: NonEmptyArray<string>` instead of `error: string`, `validate` and `validateAll` are now methods on the `makeField` return value (standalone `validateField`/`validateFieldAll` exports removed), and `Validation<T>` accepts `ValidationMessage<T>` (string or function).

## 0.25.0

### Minor Changes

- e3e630d: ### Breaking Changes
  - **Subscriptions extracted to domain module** — `makeSubscriptions` moved out of runtime into a dedicated `subscription` module
  - **Listbox split into single-select and multi-select** — the listbox component is now two separate modules (`listbox/single` and `listbox/multi`) instead of a unified component. `selectedValues` is now derived inside `makeView` instead of being required in `ViewBehavior`

  ### Features
  - **Managed resources** — add model-driven acquire/release lifecycle for long-lived browser resources tied to model state
  - **View memoization** — add `createLazy` and `createKeyedLazy` for caching expensive view subtrees
  - **Dev-mode slow view warning** — runtime logs a warning when view builds exceed a performance threshold

  ### Fixes
  - **Disclosure** — escape CSS selector for button focus on close
  - **HTML** — handle multiline class name strings

## 0.24.0

### Minor Changes

- acff49f: Add Listbox UI component with full Headless UI parity, including typeahead search, keyboard navigation, grouped items, horizontal/vertical orientation, and open/close transition support

## 0.23.0

### Minor Changes

- 384525a: Add `resources` config field to `makeElement` and `makeApplication` for sharing long-lived browser services (AudioContext, RTCPeerConnection, etc.) across commands and subscriptions. Define services with `Effect.Service`, pass their default layer via `resources`, and the runtime memoizes and provides them automatically.

## 0.22.0

### Minor Changes

- 515610d: ### Breaking Changes
  - **Menu anchor positioning via portals** — menu items container renders in a portal root (`document.body`) when anchor positioning is enabled, escaping `overflow: hidden` ancestors. Opt out with `portal: false`
  - **Menu isModal defaults to false** — aligns with HeadlessUI, Radix, and Ariakit conventions. Consumers that need scroll lock and inert can opt in with `isModal: true`
  - **Anchor positioning moved to snabbdom hooks** — replaced subscription-based positioning with insert/destroy hooks for tighter lifecycle management
  - **Dropped Popover API from anchor positioning** — removed `popover` attribute approach in favor of portal rendering

  ### Features
  - **iOS Safari scroll lock** — `lockScroll` now intercepts `touchmove` events on iOS Safari, which ignores `overflow: hidden` on `documentElement`
  - **Command namespace export** — `Command` is now exported as a namespace via `foldkit/command` subpath, matching other module exports
  - **Keyboard modifier attributes** — all keyboard handler attributes now include `KeyboardModifiers`
  - **Lifecycle hook attributes** — added `OnInsert` and `OnDestroy` hook attributes for snabbdom lifecycle events
  - **advanceFocus Task and FocusDirection type** — exported for external focus management

## 0.21.0

### Minor Changes

- 4ee0289: ### Breaking Changes
  - **Command streams renamed to subscriptions** — `commandStream` renamed to `subscription` across the public API, including runtime configuration and all related types

  ### Features
  - **Menu button movement detection** — detect button movement during menu leave transition to prevent the menu from closing when the trigger button repositions

## 0.20.0

### Minor Changes

- 5ff61e0: ### Breaking Changes
  - **Task and Command separated** — `Task` now focuses on effect-based operations while `Command` handles message-producing side effects; failures moved to the error channel instead of being encoded in the success type
  - **Tabs orientation moved to view config** — `orientation` is no longer part of the Tabs model; pass it through view configuration instead

  ### Fixes
  - **Empty vdom rendering** — use a comment node instead of an empty text node when rendering empty virtual DOM trees, fixing edge cases with conditional rendering

## 0.19.0

### Minor Changes

- fd9b6cf: ### Breaking Changes
  - **`m()` moved to `foldkit/message`** — import `m` from `foldkit/message` instead of `foldkit/schema`
  - **`r()` and `ts()` helpers added** — `r()` creates route schemas, `ts()` creates general tagged structs; `m()` is now reserved for message variants only

  ### Features
  - **Menu pointer events** — migrated from mouse events to pointer events with touch filtering for better cross-device support
  - **Menu drag-to-select** — split mouse and touch button toggle; mouse users can hold-and-drag to select menu items
  - **Menu scroll lock** — modal menus lock page scroll while open
  - **Menu screen reader isolation** — elements outside modal menus are marked inert
  - **Menu Space typeahead** — Space acts as a typeahead character when search is active
  - **Menu transitions** — transition system for animated open/close
  - **Menu keyboard DOM click** — keyboard selection clicks the actual DOM element for better compatibility
  - **Menu Firefox workaround** — Space keyup workaround for Firefox menu button bug
  - **Menu disabled items** — disabled button support with pointer tracking

  ### Internal
  - Split monolithic Task module into focused sub-files
  - Verb-first message naming across all apps and examples

## 0.18.0

### Minor Changes

- 401e224: Make `Command` accept schema values via conditional type, eliminating the need for individual message type declarations. `Command<typeof Foo>` now extracts the instance type automatically. Added optional `E` and `R` type parameters to `Command` for commands with error or service requirements.

## 0.17.0

### Minor Changes

- 598f974: Add headless Disclosure component and public barrel exports for all modules

## 0.16.0

### Minor Changes

- Add headless Tabs component to foldkit-ui
  - Horizontal and vertical orientations with arrow key navigation
  - Automatic and manual activation modes
  - Disabled tab support, skipped in keyboard navigation
  - Panel persistence option to keep inactive panels in the DOM
  - Element polymorphism for tab list, tab, and panel elements
  - Data attributes (`data-selected`, `data-disabled`) for CSS-driven styling
  - Add `AriaControls` and `AriaOrientation` helpers to the html module

## 0.15.0

### Patch Changes

- 56cfa38: Update dependencies
- 091aa97: Fix errorView not rendering when errors occur during synchronous dispatch (e.g. click handlers). Errors thrown during `Runtime.runSync` now correctly render the error view instead of escaping as uncaught FiberFailure exceptions.

## 0.15.0-canary.1

### Patch Changes

- 56cfa38: Update dependencies

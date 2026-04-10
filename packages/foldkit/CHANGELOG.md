# foldkit

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

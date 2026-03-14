# foldkit

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

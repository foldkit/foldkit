# foldkit

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

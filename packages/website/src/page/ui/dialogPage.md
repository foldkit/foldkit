# Dialog

## Overview

A modal dialog backed by the native `<dialog>` element, opened with `show()` and a high z-index. Bind `Dialog.block` in the parent. The framework manages focus trapping, Escape handling, scroll locking, and backdrop rendering. For non-modal floating content, use Popover instead.

:::Info{label="See it in an app"}
Check out how Dialog is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/dialog.ts).
:::

## Examples

### Basic

Open the Dialog from a trigger by dispatching your own Message. Call the Binding’s `open()` and `close()` operations. Spread the `closeButton` bundle onto a Cancel button to dismiss it. Spread `...title` onto a heading element so the Dialog is labeled for screen readers.

::Demo{name="dialog"}

::Snippet{name="uiDialogBasic" label="Dialog"}

### Animated

Pass `isAnimated: true` at init to coordinate animations. The component manages an Animation block internally. Apply transition classes using `data-closed` (e.g. `data-[closed]:opacity-0 data-[closed]:scale-95`).

::Demo{name="animated"}

::Snippet{name="uiDialogAnimated" label="Animated dialog"}

### Field

A field inside a dialog can open its own overlay, like a Combobox or DatePicker. The overlay portals its panel into the dialog, not to the document body. The panel renders above the dialog's content, a scrolling dialog panel does not clip it, and it stays interactive while the Dialog makes the rest of the page inert. The overlay needs no anchor configuration. Its wrapper needs `position: relative`, as it does outside a dialog. The overlay's click-outside backdrop goes directly before that wrapper, and a positioned wrapper keeps the trigger or input above the backdrop.

::Demo{name="overlay"}

::Snippet{name="uiDialogOverlay" label="Combobox overlay in a Dialog"}

### Stacked

Use a separate Dialog Model for each level and open the second from a button in the first. The framework stacks them by z-index, isolates the page around the topmost Dialog, and traps focus there. Escape closes the top Dialog first; its parent becomes interactive again and receives focus.

::Demo{name="nested"}

::Snippet{name="uiDialogNested" label="Stacked dialogs"}

## Styling

Dialog is headless. The `toView` callback receives attribute bundles for the dialog, backdrop, panel, and closeButton, and the consumer composes the markup. Dialog renders no backdrop of its own, so build your own from the `backdrop` bundle for full control over its appearance.

When `isAnimated` is true, enter/leave animations flow through the [Animation](/ui/animation) module. Style with CSS transitions or CSS keyframe animations. Animation advances once every animation on the element has settled.

| Attribute         | Condition                           |
| ----------------- | ----------------------------------- |
| `data-open`       | Present on the dialog when visible. |
| `data-closed`     | Present during close animation.     |
| `data-transition` | Present during any animation phase. |
| `data-enter`      | Present during the enter animation. |
| `data-leave`      | Present during the leave animation. |

## Starting with an Open Dialog

When a Dialog should be open at application startup, declare its init inputs on the Binding as in the basic example. Put `DialogBinding.open()` in the Composition init plan's `steps` array. The open operation returns a `ShowDialog` Command and emits `Opened` through the Binding's OutMessage policy. The Composition retains init Commands and collects the open operation's Commands. The Runtime executes them after root init returns.

::Snippet{name="uiDialogInitiallyOpen" label="Starting with an open Dialog"}

See [Initialize the child](/core/block#initialize-the-child) for the general child-initialization pattern.

## Keyboard Interaction

| Key      | Description                     |
| -------- | ------------------------------- |
| `Escape` | Closes the dialog.              |
| `Tab`    | Cycles focus within the dialog. |

## Accessibility

### Focus and Modal Isolation

When the Dialog opens, Foldkit marks surrounding content inert and `aria-hidden="true"`, and sets `aria-modal="true"` on the Dialog. Keyboard focus stays inside until it closes, then the original inert and ARIA state is restored before focus returns to the element that opened it. The DevTools overlay remains interactive during development.

### Names and Descriptions

The dialog always sets `aria-labelledby` on the native element. Set `hasDescription: true` when you render a description to add `aria-describedby`; leaving it false prevents a dangling reference when no description is present. Spread `...title` onto your heading (`h.h2([...title], [...])`) and `...description` onto your description element (`h.p([...description], [...])`). You never construct either id yourself.

#### Reuse the Managed IDs

The ids are framework-managed (the `-dialog-title`, `-dialog-description`, and `-panel` suffixes on the configured id). Going through the render info keeps them unique for you. The `titleId(model)` and `descriptionId(model)` helpers imported from `@foldkit/ui/dialog` return the same ids as plain strings for the cases where you need the id as a value outside `toView`, such as a Command that calls `getElementById` or a cross-element reference. As a backstop, the runtime warns on any duplicate id in the rendered tree in development.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Dialog.init()`.

| Name            | Type      | Default | Description                                                                                                                                                                                                                                                                                          |
| --------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`  | —       | Unique ID for the dialog instance.                                                                                                                                                                                                                                                                   |
| `isAnimated`    | `boolean` | `false` | Enables animation coordination for open/close animations.                                                                                                                                                                                                                                            |
| `focusSelector` | `string`  | —       | CSS selector for the element that receives focus when the dialog opens. A selector-based override of the `initialFocus` marker, for an element whose id you do not own or a descendant selector. Takes precedence over `initialFocus`; with neither set, focus falls to the first focusable element. |

### ViewInputs {#view-config}

Pass the child Model as `model` and these fields as `viewInputs` to the Dialog Binding's `embedView` method. The Binding supplies the canonical view, Message wrapper, and composition scope. Keep `toView` at the top level, and spread the published `ChildAttribute` groups unchanged; see [Callback dispatch boundaries](/core/block#callback-dispatch-boundaries).

| Name             | Type                           | Default | Description                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toView`         | `(render: RenderInfo) => Html` | —       | Callback that receives the dialog, backdrop, panel, and closeButton attribute bundles plus a derived `isVisible` flag, and returns the composed layout. The consumer MUST render an `h.dialog(...)` element so the framework can open and close it. |
| `hasDescription` | `boolean`                      | `false` | Whether the dialog renders a description. Adds `aria-describedby` to the dialog when true.                                                                                                                                                          |

### RenderInfo {#render-info}

Payload delivered to the `toView` callback each render.

| Name           | Type                                                                        | Default | Description                                                                                                                                                                                                                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialog`       | `ReadonlyArray<ChildAttribute<Mount.RequirementsOf<typeof Dialog.mounts>>>` | —       | Spread onto an `h.dialog(...)` element. Carries the id, ARIA labelling and modal state, `open` prop, positioning style, lifecycle resource acquisition and cleanup, a handler that suppresses native `cancel` events so canceling a file picker leaves the dialog open, and a mapping from `Dom.showDialog`'s distinct Escape signal to `RequestedClose`. |
| `backdrop`     | `ReadonlyArray<ChildAttribute>`                                             | —       | Spread onto the backdrop element. Includes the Animation data attributes and the outside-click handler that dispatches `RequestedClose` (suppressed while a leave animation is in progress).                                                                                                                                                              |
| `panel`        | `ReadonlyArray<ChildAttribute>`                                             | —       | Spread onto the panel element. Includes the panel id (`${id}-panel`) and the Animation data attributes.                                                                                                                                                                                                                                                   |
| `title`        | `ReadonlyArray<ChildAttribute>`                                             | —       | Spread onto your accessible-name heading (`h.h2([...title], [...])`). Carries the framework-managed id the dialog’s `aria-labelledby` points at, so labelling wires up without hand-rolling the id.                                                                                                                                                       |
| `description`  | `ReadonlyArray<ChildAttribute>`                                             | —       | Spread onto your description element (`h.p([...description], [...])`). Carries the framework-managed id referenced when `hasDescription` is true.                                                                                                                                                                                                         |
| `initialFocus` | `ReadonlyArray<ChildAttribute>`                                             | —       | Spread onto the element that should receive focus when the dialog opens (`h.input([...initialFocus])`). A configured `focusSelector` takes precedence; to focus an element whose id you do not own, use `focusSelector`.                                                                                                                                  |
| `closeButton`  | `ReadonlyArray<ChildAttribute>`                                             | —       | Spread onto an in-panel close control such as a Cancel button. Carries the click handler that closes the dialog, so a plain dismiss needs no parent message, and `type="button"` so a close control inside a form does not submit it.                                                                                                                     |
| `isVisible`    | `boolean`                                                                   | —       | Derived from `isOpen` and the Animation `transitionState`. Render the backdrop and panel only while this is true.                                                                                                                                                                                                                                         |

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Match on the OutMessage in the Binding’s `outMessage.fold` policy.

| Name     | Type | Default | Description                                                                                                                                                                                                                       |
| -------- | ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Opened` | `{}` | —       | Emitted once the dialog has transitioned to open. Fires after `update` has processed `RequestedOpen` and `isOpen` reflects the new state.                                                                                         |
| `Closed` | `{}` | —       | Emitted once the dialog has transitioned to closed. Calling the bound `dialog.close()` operation on an already-closed Model is a no-op that does not re-emit, as is calling close while a leave animation is already in progress. |

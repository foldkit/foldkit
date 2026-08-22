# Dialog

## Overview

A modal dialog backed by the native `<dialog>` element, opened with `show()` and a high z-index. The framework manages focus trapping, Escape handling, scroll locking, and backdrop rendering. For non-modal floating content, use Popover instead.

:::Info{label="See it in an app"}
Check out how Dialog is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/dialog.ts).
:::

## Examples

### Basic

Open the dialog from a trigger by dispatching your own Message and calling `Dialog.open(model)` in your update. Spread the `closeButton` bundle onto a Cancel button to dismiss it, or call `Dialog.close(model)` directly. Both return `{ model, commands?, outMessage? }`. Spread `...title` onto a heading element so the dialog is labeled for screen readers.

::Demo{name="dialog"}

::Snippet{name="uiDialogBasic" label="dialog example"}

### Animated

Pass `isAnimated: true` at init to coordinate animations. The component manages an Animation submodel internally. Apply transition classes using `data-closed` (e.g. `data-[closed]:opacity-0 data-[closed]:scale-95`).

::Demo{name="animated"}

::Snippet{name="uiDialogAnimated" label="animated dialog example"}

### Field

A field inside a dialog can open its own overlay, like a Combobox or DatePicker. By default that overlay portals its panel to the document body, where the dialog renders on top of it. Pass `anchor: { portal: false }` so the panel stays inside the dialog and remains visible.

::Demo{name="overlay"}

::Snippet{name="uiDialogOverlay" label="field dialog example"}

### Stacked

Use a separate Dialog Model for each level and open the second from a button in the first. The framework stacks them by z-index, traps focus in the topmost, and closes them one at a time: Escape closes the top dialog before the one beneath it.

::Demo{name="nested"}

::Snippet{name="uiDialogNested" label="stacked dialogs example"}

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

## Keyboard Interaction

| Key      | Description                     |
| -------- | ------------------------------- |
| `Escape` | Closes the dialog.              |
| `Tab`    | Cycles focus within the dialog. |

## Accessibility

The dialog sets `aria-labelledby` and `aria-describedby` on the native element and hands you the matching ids through the render info. Spread `...title` onto your heading (`h.h2([...title], [...])`) and `...description` onto your description element (`h.p([...description], [...])`). You never construct the id yourself. Focus trapping is handled by the framework.

The ids are framework-managed (the `-dialog-title`, `-dialog-description`, and `-panel` suffixes on the configured id). Going through the render info keeps them unique for you. The `Dialog.titleId(model)` and `Dialog.descriptionId(model)` helpers return the same ids as plain strings for the cases where you need the id as a value outside `toView`, such as a Command that calls `getElementById` or a cross-element reference. As a backstop, the runtime warns on any duplicate id in the rendered tree in development.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Dialog.init()`.

| Name            | Type      | Default | Description                                                                                                                                                                                                                                                                                          |
| --------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`  | —       | Unique ID for the dialog instance.                                                                                                                                                                                                                                                                   |
| `isOpen`        | `boolean` | `false` | Initial open/closed state.                                                                                                                                                                                                                                                                           |
| `isAnimated`    | `boolean` | `false` | Enables animation coordination for open/close animations.                                                                                                                                                                                                                                            |
| `focusSelector` | `string`  | —       | CSS selector for the element that receives focus when the dialog opens. A selector-based override of the `initialFocus` marker, for an element whose id you do not own or a descendant selector. Takes precedence over `initialFocus`; with neither set, focus falls to the first focusable element. |

### ViewConfig {#view-config}

Configuration object passed to `Dialog.view()`.

| Name              | Type                                              | Default | Description                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`           | `Dialog.Model`                                    | —       | The dialog state from your parent Model.                                                                                                                                                                                                            |
| `toParentMessage` | `(childMessage: Dialog.Message) => ParentMessage` | —       | Wraps Dialog Messages in your parent Message type for Submodel delegation.                                                                                                                                                                          |
| `toView`          | `(render: RenderInfo) => Html`                    | —       | Callback that receives the dialog, backdrop, panel, and closeButton attribute bundles plus a derived `isVisible` flag, and returns the composed layout. The consumer MUST render an `h.dialog(...)` element so the framework can open and close it. |

### RenderInfo {#render-info}

Payload delivered to the `toView` callback each render.

| Name           | Type                            | Default | Description                                                                                                                                                                                                                           |
| -------------- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialog`       | `ReadonlyArray<ChildAttribute>` | —       | Spread onto an `h.dialog(...)` element. Carries the id, ARIA labelling, `open` prop, positioning style, and the Escape handler that wires to `RequestedClose`.                                                                        |
| `backdrop`     | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the backdrop element. Includes the Animation data attributes and the outside-click handler that dispatches `RequestedClose` (suppressed while a leave animation is in progress).                                          |
| `panel`        | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the panel element. Includes the panel id (`${id}-panel`) and the Animation data attributes.                                                                                                                               |
| `title`        | `ReadonlyArray<ChildAttribute>` | —       | Spread onto your accessible-name heading (`h.h2([...title], [...])`). Carries the framework-managed id the dialog’s `aria-labelledby` points at, so labelling wires up without hand-rolling the id.                                   |
| `description`  | `ReadonlyArray<ChildAttribute>` | —       | Spread onto your description element (`h.p([...description], [...])`). Carries the framework-managed id the dialog’s `aria-describedby` points at, so the association wires up without hand-rolling the id.                           |
| `initialFocus` | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the element that should receive focus when the dialog opens (`h.input([...initialFocus])`). A configured `focusSelector` takes precedence; to focus an element whose id you do not own, use `focusSelector`.              |
| `closeButton`  | `ReadonlyArray<ChildAttribute>` | —       | Spread onto an in-panel close control such as a Cancel button. Carries the click handler that closes the dialog, so a plain dismiss needs no parent message, and `type="button"` so a close control inside a form does not submit it. |
| `isVisible`    | `boolean`                       | —       | Derived from `isOpen` and the Animation `transitionState`. Render the backdrop and panel only while this is true.                                                                                                                     |

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Pattern-match on the OutMessage in your update handler.

| Name     | Type | Default | Description                                                                                                                                                                                                      |
| -------- | ---- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Opened` | `{}` | —       | Emitted once the dialog has transitioned to open. Fires after `update` has processed `RequestedOpen` and `isOpen` reflects the new state.                                                                        |
| `Closed` | `{}` | —       | Emitted once the dialog has transitioned to closed. Programmatic `Dialog.close` on an already-closed model is a no-op that does not re-emit, as is calling close while a leave animation is already in progress. |

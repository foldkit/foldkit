# Tooltip

## Overview

A non-interactive floating label anchored to a trigger. Tooltips appear on hover after a short delay, or immediately on keyboard focus. They hide on pointer-leave, blur, or Escape. Use tooltips for short hints about a control. Because they rely on hover and keyboard focus, don’t use them for content that must be reachable on touch; for that, or for rich or interactive content, use `Popover` instead.

The positioning engine is shared with `Popover` and `Menu`. Pass `anchor` to control placement and spacing.

:::Info{label="See it in an app"}
Check out how Tooltip is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/tooltip.ts).
:::

## Examples

Hover or tab into the trigger to reveal the tooltip. Hover waits for `showDelay` (default 500ms); keyboard focus shows it immediately.

::Demo{name="demo"}

::Snippet{name="uiTooltipBasic" label="tooltip example"}

## Styling

Tooltip is headless. The `toView` callback receives attribute bundles for the trigger and panel, and the consumer composes the markup. The panel is rendered with `pointer-events: none` so it never captures hover or clicks, which keeps the open/close logic tied to the trigger.

| Attribute        | Condition                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-open`      | Present on trigger and panel when the tooltip is visible.                                                                                                 |
| `data-disabled`  | Present on the trigger when disabled.                                                                                                                     |
| `data-placement` | Present on the panel, set to the side it currently sits on: top, right, bottom, or left. Fixed to the first resolved side when isPlacementLocked is true. |

## Keyboard Interaction

| Key      | Description                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Escape` | Hides the tooltip while visible. It will not reopen until the user disengages by moving the pointer away or blurring the trigger. |

## Accessibility

The panel has `role="tooltip"` and the trigger is linked via `aria-describedby`. Focus is never moved into the tooltip, so assistive technology announces the panel contents as a description of the trigger.

The tooltip describes the trigger but does not name it, so give the trigger an accessible name. For a visible label, wire a native `<label for>` that targets the trigger id with `Tooltip.triggerId(id)` rather than hardcoding the `-trigger` convention. The `for` association makes the trigger properly labeled: assistive technology announces it by the visible label text, and clicking the label focuses the trigger. That is why it is the recommended pattern.

Two ViewConfig fields cover the cases a `<label for>` does not. Pass `ariaLabel` for an icon-only trigger with no visible label, or `ariaLabelledBy` when the element that names the trigger is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Tooltip.init()`.

| Name        | Type             | Default                | Description                                                                                                                                                                                                         |
| ----------- | ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | `string`         | —                      | Unique ID for the tooltip instance.                                                                                                                                                                                 |
| `showDelay` | `Duration.Input` | `Duration.millis(500)` | How long the pointer must hover before the tooltip appears. Accepts any Effect Duration input. A bare number is interpreted as milliseconds. Keyboard focus shows the tooltip immediately regardless of this value. |

### ViewConfig {#view-config}

Configuration object passed to `Tooltip.view()`.

| Name              | Type                                               | Default | Description                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`           | `Tooltip.Model`                                    | —       | The tooltip state from your parent Model.                                                                                                                                                                 |
| `toParentMessage` | `(childMessage: Tooltip.Message) => ParentMessage` | —       | Wraps Tooltip Messages in your parent Message type for Submodel delegation.                                                                                                                               |
| `anchor`          | `AnchorConfig`                                     | —       | Floating positioning config: placement, gap, offset, padding, isPlacementLocked, and portal. Required. Portaled to the document body by default; pass portal: false to keep the panel inside its wrapper. |
| `toView`          | `(render: RenderInfo) => Html`                     | —       | Callback that receives the `trigger` and `panel` attribute bundles plus a derived `isVisible` flag, and returns the composed layout.                                                                      |
| `isDisabled`      | `boolean`                                          | `false` | Disables the trigger. Hover, focus, and keyboard events are ignored and the tooltip will not open.                                                                                                        |
| `ariaLabel`       | `string`                                           | —       | Accessible name for the trigger button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                              |
| `ariaLabelledBy`  | `string`                                           | —       | Id of an external element that labels the trigger button, applied as aria-labelledby. Pair with a visible label element.                                                                                  |

### RenderInfo {#render-info}

Payload delivered to the `toView` callback each render.

| Name        | Type                            | Default | Description                                                                                                                                                   |
| ----------- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trigger`   | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the trigger element. Carries `type="button"`, the hover/focus/keyboard handlers, and `aria-describedby` linking to the panel.                     |
| `panel`     | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the panel element. Carries `role="tooltip"`, the anchor Mount that positions the panel via Floating UI, and a `data-open` attribute when visible. |
| `isVisible` | `boolean`                       | —       | Whether the tooltip is currently visible. The consumer decides whether to render the panel conditionally on this.                                             |

### Programmatic Helpers

Helper functions for driving the tooltip from parent update handlers, returning `[Model, Commands]`.

| Name               | Type                                                 | Default | Description                                                                                                                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reflectShowDelay` | `(model: Model, showDelay: Duration.Input) => Model` | —       | Reflects an externally-sourced hover show-delay onto the Model (a user preference, a restored setting) without emitting an OutMessage. Accepts any Effect Duration input; a bare number is milliseconds. The new delay applies on the next hover. Dual: pass just the delay for a point-free setter in an evo callback. |

### OutMessage {#out-message}

Messages emitted to the parent through the third element of `[Model, Commands, Option<OutMessage>]`. Fire only on visibility transitions, so consumers don’t see spurious events for Messages that only update internal hover/focus/delay state.

| Name     | Type | Default | Description                                                                                                                                                                                                           |
| -------- | ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Shown`  | `{}` | —       | Emitted once the tooltip transitions to visible (isOpen becomes true). Fold it in the `foldOutMessage` of your Tooltip fold to react. Useful for analytics, instrumentation, or coordinating with other transient UI. |
| `Hidden` | `{}` | —       | Emitted once the tooltip transitions to hidden (isOpen becomes false).                                                                                                                                                |

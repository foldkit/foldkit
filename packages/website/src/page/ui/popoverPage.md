# Popover

## Overview

An anchored floating panel with natural Tab navigation. Unlike Dialog (which is modal and traps focus) or Menu (which uses aria-activedescendant for item navigation), Popover holds arbitrary content and uses the disclosure ARIA pattern. Focus flows naturally through the panel content.

For programmatic control in update functions, use `Popover.open(model)` and `Popover.close(model)` which return `[Model, Commands, Option<OutMessage>]` directly.

:::Info{label="See it in an app"}
Check out how Popover is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/popover.ts).
:::

## Examples

### Basic

Pass `anchor` to position the panel relative to the button. The panel can hold any content: links, forms, or informational text.

::Demo{name="basic"}

::Snippet{name="uiPopoverBasic" label="popover example"}

### Animated

Pass `isAnimated: true` at init for animation coordination.

::Demo{name="animated"}

### Nested

Use a separate Popover Model for each level. For a parent panel that opens onto another Popover trigger, pass `contentFocus: true` at init and `focusSelector` in the view so focus lands on the nested trigger.

::Demo{name="nested"}

::Snippet{name="uiPopoverNested" label="nested popovers example"}

## Styling

Popover is headless. The `toView` callback receives attribute bundles for the button, panel, and backdrop, and the consumer composes the markup.

When `isAnimated` is true, enter/leave animations flow through the [Animation](/ui/animation) module. Style with CSS transitions or CSS keyframe animations. Animation advances once every animation on the element has settled.

| Attribute        | Condition                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-open`      | Present on button and panel when open.                                                                                                                    |
| `data-disabled`  | Present on the button when disabled.                                                                                                                      |
| `data-closed`    | Present during close animation.                                                                                                                           |
| `data-placement` | Present on the panel, set to the side it currently sits on: top, right, bottom, or left. Fixed to the first resolved side when isPlacementLocked is true. |

### Drawing an Arrow

`toView` receives an `arrow` bundle carrying the element's id. Popover does not draw the arrow. Spread the bundle onto your own element inside the panel and place it with the custom properties Anchor publishes:

```css
.popover-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  transform: rotate(45deg);
  left: var(--arrow-x);
  top: var(--arrow-y);
}

.popover-panel[data-placement='top'] .popover-arrow {
  bottom: -4px;
}

.popover-panel[data-placement='bottom'] .popover-arrow {
  top: -4px;
}
```

`--arrow-x` and `--arrow-y` are the offset along the panel edge, so exactly one of them is set for any given placement. The side offset is yours: `data-placement` tells you which edge the panel currently sits on, and the rule for that side pins the arrow to it. Pass `arrowPadding` to keep the arrow clear of a rounded corner.

## Keyboard Interaction

By default, the panel receives `tabindex="0"` so it can receive focus. Tab navigates naturally through the panel content. Escape closes and returns focus to the button.

| Key             | Description                                                                   |
| --------------- | ----------------------------------------------------------------------------- |
| `Enter / Space` | Toggles the popover.                                                          |
| `Escape`        | Closes the popover and returns focus to the button.                           |
| `Tab`           | Navigates within the panel. By default, closes the popover when focus leaves. |

## Accessibility

The button receives `aria-expanded` and `aria-controls` linking to the panel. The panel has no role. Popover uses the disclosure pattern, not the menu pattern.

Give the trigger an accessible name. For a visible label, wire a native `<label for>` that targets the trigger id with `Popover.buttonId(id)` rather than hardcoding the `-button` convention. The `for` association makes the trigger properly labeled: assistive technology announces it by the visible label text, and clicking the label opens the popover. That is why it is the recommended pattern.

Two ViewConfig fields cover the cases a `<label for>` does not. Pass `ariaLabel` for an icon-only trigger with no visible label, or `ariaLabelledBy` when the element that names the trigger is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Popover.init()`.

| Name           | Type      | Default | Description                                                                                                                                                                             |
| -------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `string`  | —       | Unique ID for the popover instance.                                                                                                                                                     |
| `isAnimated`   | `boolean` | `false` | Enables animation coordination.                                                                                                                                                         |
| `isModal`      | `boolean` | `false` | Locks page scroll and marks other elements inert when open.                                                                                                                             |
| `contentFocus` | `boolean` | `false` | Hands focus ownership to the consumer. When true, the panel is not focusable and does not close on blur; the consumer must focus a descendant on open and decide on its own blur rules. |

### ViewConfig {#view-config}

Configuration object passed to `Popover.view()`.

| Name              | Type                                               | Default | Description                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`           | `Popover.Model`                                    | —       | The popover state from your parent Model.                                                                                                                                                                 |
| `toParentMessage` | `(childMessage: Popover.Message) => ParentMessage` | —       | Wraps Popover Messages in your parent Message type for Submodel delegation.                                                                                                                               |
| `anchor`          | `AnchorConfig`                                     | —       | Floating positioning config: placement, gap, offset, padding, isPlacementLocked, and portal. Required. Portaled to the document body by default; pass portal: false to keep the panel inside its wrapper. |
| `toView`          | `(render: RenderInfo) => Html`                     | —       | Callback that receives the button, panel, and backdrop attribute bundles plus a derived `isVisible` flag, and returns the composed layout.                                                                |
| `isDisabled`      | `boolean`                                          | `false` | Disables the trigger button.                                                                                                                                                                              |
| `focusSelector`   | `string`                                           | —       | CSS selector for the element to focus after the panel is positioned. Defaults to the panel itself.                                                                                                        |
| `arrowPadding`    | `number`                                           | `0`     | Distance in pixels the arrow keeps from the panel's corners.                                                                                                                                              |
| `ariaLabel`       | `string`                                           | —       | Accessible name for the trigger button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                              |
| `ariaLabelledBy`  | `string`                                           | —       | Id of an external element that labels the trigger button, applied as aria-labelledby. Pair with a visible label element.                                                                                  |

### RenderInfo {#render-info}

Payload delivered to the `toView` callback each render.

| Name        | Type                            | Default | Description                                                                                                                                                               |
| ----------- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button`    | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the trigger button. Includes the button id, `aria-expanded`, `aria-controls`, and pointer/keyboard handlers.                                                  |
| `panel`     | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the floating panel. Includes the anchor Mount that positions the panel via Floating UI, ARIA linkage to the button, and panel keydown/blur handlers.          |
| `backdrop`  | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the modal backdrop element. Includes the portal Mount that moves the backdrop to `document.body`. The backdrop's click handler dispatches `RequestedClose`.   |
| `arrow`     | `ReadonlyArray<ChildAttribute>` | —       | Spread onto your arrow element inside the panel. Carries the id the anchor Mount resolves and `aria-hidden`. Nothing renders until you add the element and the CSS above. |
| `isVisible` | `boolean`                       | —       | Derived from `isOpen` and the Animation `transitionState`. Render the panel and backdrop only while this is true.                                                         |

### OutMessage {#out-message}

Messages emitted to the parent through the third element of `[Model, Commands, Option<OutMessage>]`. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name     | Type | Default | Description                                                                                                                                    |
| -------- | ---- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Opened` | `{}` | —       | Emitted once the popover has transitioned to open. Fires after `update` has processed `RequestedOpen` and `isOpen` reflects the new state.     |
| `Closed` | `{}` | —       | Emitted once the popover has transitioned to closed. Programmatic `Popover.close` on an already-closed model is a no-op that does not re-emit. |

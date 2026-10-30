# Hover Intent

## Overview

HoverIntent keeps a related panel open while the pointer or focus moves between it and a trigger. Pointer entry and departure use configurable delays. Focus opens the panel immediately; if focus is the last thing keeping it open, moving focus away closes it without the pointer grace period. Escape also closes immediately and prevents reopening until the pointer and focus have both left.

HoverIntent is headless. Create a `HoverIntent.HoverIntent` instance in the parent's constructor, hold it in the parent Model, and provide `HoverIntent.HoverIntentLive` to the parent's Layer. It does not render elements, position the panel, assign ARIA roles, or choose styles. Use it when those choices belong to the component you are building. For example, a Hover Card can pair HoverIntent with [Anchor](/ui/anchor), while a hover menu can keep its items available as the pointer moves from the trigger into the panel.

## Examples

### Hover Card

Hover over or focus the “More information” trigger, then move the pointer into the card. Move the pointer or focus away from both elements, or press Escape, to close it.

::Demo{name="hover-card"}

::Snippet{name="uiHoverIntentBasic" label="Hover card"}

### Hover Menu

Hover over or focus the “Actions” trigger, then move the pointer into the menu. Choosing an item closes the menu; the demo items do not navigate or change other page state.

::Demo{name="hover-menu"}

::Snippet{name="uiHoverIntentMenu" label="Hover menu"}

Spread `trigger` onto the trigger element and `panel` onto the panel element. Each bundle supplies the hover, focus, and Escape handlers for that element. Those handlers keep HoverIntent's dispatch, so their Messages go to the HoverIntent instance even though the parent renders the elements.

## Timing and Dismissal

### Pointer Timing

Pointer entry starts `openDelay`, which defaults to 200 milliseconds. When the pointer leaves both elements and neither holds focus, `closeDelay` starts; it defaults to 300 milliseconds. Entering either element again before the delay expires keeps the panel open. Versioning prevents an old wait from changing visibility after a newer interaction.

### Focus Timing

Focus opens immediately. If focus is the last thing keeping the panel open, moving it outside both elements starts a zero-delay close, so clicking or tabbing away does not use the pointer grace period. When focus moves from the trigger into the panel, the panel focus handler cancels that close before it resolves. Keyboard users can therefore move into focusable panel content without closing it.

### Escape Dismissal

Escape closes immediately. When panel content can hold focus, set `focusTriggerSelector` so Escape returns focus to the trigger before removing the panel. If the selector is omitted or does not resolve to a focusable element, HoverIntent does not move focus; removing the focused panel leaves the browser to choose its fallback focus target. After Escape, the panel does not reopen until the pointer and focus have both left the trigger and panel. A later entry can open it again.

## API Reference

### InitConfig {#init-config}

The args a parent passes when it creates an instance with `new`. HoverIntent takes no `id` because it owns no DOM identity; pass `{}` for the default delays.

| Name         | Type             | Default                | Description                                     |
| ------------ | ---------------- | ---------------------- | ----------------------------------------------- |
| `openDelay`  | `Duration.Input` | `Duration.millis(200)` | Delay between pointer entry and opening.        |
| `closeDelay` | `Duration.Input` | `Duration.millis(300)` | Grace period after the final pointer departure. |

### RequestedClose {#requested-close}

Send `HoverIntent.HoverIntent.Message.RequestedClose()` to close HoverIntent immediately, for example after the parent handles a hover-menu item click. It invalidates pending waits and reports `Closed` only when visibility changes. If the trigger is still hovered or focused, the panel stays closed until both hover and focus leave it.

### ViewInputs {#view-inputs}

Pass these fields to the instance's `view`, as in `model.hoverIntent.view({ ... })`. Spread the attribute groups the component passes to your callbacks unchanged; they keep the component's dispatch. See [View input](/core/block#callback-dispatch-boundaries).

| Name                   | Type                           | Description                                                                    |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `focusTriggerSelector` | `string \| undefined`          | Selector for the trigger to focus before Escape removes focused panel content. |
| `toView`               | `(render: RenderInfo) => Html` | Renders consumer-owned markup from the event bundles and visibility state.     |

### RenderInfo {#render-info}

| Name        | Type                            | Description                                                           |
| ----------- | ------------------------------- | --------------------------------------------------------------------- |
| `trigger`   | `ReadonlyArray<ChildAttribute>` | Hover, focus, and Escape attributes for the trigger element.          |
| `panel`     | `ReadonlyArray<ChildAttribute>` | Hover, focus, and Escape attributes for the panel element.            |
| `isVisible` | `boolean`                       | Whether the panel is open. The consumer decides whether to render it. |

### Message

`RequestedClose` is the Message a parent sends. The rest come from the view and the wait Commands. `EnteredTrigger`, `LeftTrigger`, `EnteredPanel`, and `LeftPanel` describe pointer movement. `FocusedTrigger`, `BlurredTrigger`, `FocusedPanel`, and `BlurredPanel` describe focus movement. `PressedEscape` records whether Escape came from the trigger or panel. `CompletedWaitBeforeOpening` and `CompletedWaitBeforeClosing` are produced only by the exported wait Commands.

### OutMessage {#out-message}

Handle these by spreading `...hoverIntent.on({ ... })` into the parent's update record. Both are reported only when visibility changes.

| Name     | Description                                             |
| -------- | ------------------------------------------------------- |
| `Opened` | Emitted when the Model transitions from closed to open. |
| `Closed` | Emitted when the Model transitions from open to closed. |

### WaitBeforeOpening and WaitBeforeClosing {#wait-commands}

These Commands wait for the configured delay and emit their matching completion Message with the version that scheduled the wait. `update` ignores stale versions. The Commands are exported for Story tests. In application code, HoverIntent's update returns them and the Runtime performs them.

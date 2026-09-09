# Hover Intent

## Overview

HoverIntent keeps a related panel open while the pointer or focus moves between it and a trigger. Pointer entry and departure use configurable delays. Focus opens the panel immediately; if focus is the last thing keeping it open, moving focus away closes it without the pointer grace period. Escape also closes immediately and prevents reopening until the pointer and focus have both left.

HoverIntent is headless. It does not render elements, position the panel, assign ARIA roles, or choose styles. Use it when those choices belong to the component you are building. For example, a Hover Card can pair HoverIntent with [Anchor](/ui/anchor), while a hover menu can keep its items available as the pointer moves from the trigger into the panel.

## Examples

### Hover Card

Hover over or focus the “More information” trigger, then move the pointer into the card. Move the pointer or focus away from both elements, or press Escape, to close it.

::Demo{name="hover-card"}

::Snippet{name="uiHoverIntentBasic" label="hover card example"}

### Hover Menu

Hover over or focus the “Actions” trigger, then move the pointer into the menu. Choosing an item closes the menu; the demo items do not navigate or change other page state.

::Demo{name="hover-menu"}

::Snippet{name="uiHoverIntentMenu" label="hover menu example"}

Spread `trigger` onto the trigger element and `panel` onto the panel element. Each bundle supplies the hover, focus, and Escape handlers for that element. The `h.submodel` boundary routes the resulting child Messages back to the parent.

## Timing and Dismissal

Pointer entry starts `openDelay`, which defaults to 200 milliseconds. When the pointer leaves both elements and neither holds focus, `closeDelay` starts; it defaults to 300 milliseconds. Entering either element again before the delay expires keeps the panel open. Versioning prevents an old wait from changing visibility after a newer interaction.

Focus opens immediately. If focus is the last thing keeping the panel open, moving it outside both elements starts a zero-delay close, so clicking or tabbing away does not use the pointer grace period. When focus moves from the trigger into the panel, the panel focus handler cancels that close before it resolves. Keyboard users can therefore move into focusable panel content without closing it.

Escape closes immediately. When panel content can hold focus, set `focusTriggerSelector` so Escape returns focus to the trigger before removing the panel. If the selector is omitted or does not resolve to a focusable element, HoverIntent does not move focus; removing the focused panel leaves the browser to choose its fallback focus target. After Escape, the panel does not reopen until the pointer and focus have both left the trigger and panel. A later entry can open it again.

## API Reference

### init

`(config?: InitConfig) => Model`

Creates a closed HoverIntent Model. `init` takes no `id` because HoverIntent owns no DOM identity.

### InitConfig {#init-config}

| Name         | Type             | Default                | Description                                     |
| ------------ | ---------------- | ---------------------- | ----------------------------------------------- |
| `openDelay`  | `Duration.Input` | `Duration.millis(200)` | Delay between pointer entry and opening.        |
| `closeDelay` | `Duration.Input` | `Duration.millis(300)` | Grace period after the final pointer departure. |

### close

`(model: Model) => Update.ReturnWithOutMessage<Model, Message, OutMessage>`

Closes HoverIntent immediately, for example after the parent handles a hover-menu item click. It invalidates pending waits and emits `Closed` only when visibility changes. If the trigger is still hovered or focused, the panel stays closed until both hover and focus leave it.

### update

`(model: Model, message: Message) => Update.ReturnWithOutMessage<Model, Message, OutMessage>`

Processes pointer, focus, Escape, and wait-completion Messages. `Opened` and `Closed` are emitted only when visibility changes.

### view

`(model: Model, viewInputs: ViewInputs, h: HtmlBuilder<Message>) => Html`

Builds headless trigger and panel event bundles, then calls `ViewInputs.toView`. It does not assign markup, semantics, positioning, or styling.

### ViewInputs {#view-inputs}

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

`EnteredTrigger`, `LeftTrigger`, `EnteredPanel`, and `LeftPanel` describe pointer movement. `FocusedTrigger`, `BlurredTrigger`, `FocusedPanel`, and `BlurredPanel` describe focus movement. `PressedEscape` records whether Escape came from the trigger or panel. `CompletedWaitBeforeOpening` and `CompletedWaitBeforeClosing` are produced only by the exported wait Commands.

### OutMessage {#out-message}

| Name     | Description                                             |
| -------- | ------------------------------------------------------- |
| `Opened` | Emitted when the Model transitions from closed to open. |
| `Closed` | Emitted when the Model transitions from open to closed. |

### WaitBeforeOpening and WaitBeforeClosing {#wait-commands}

These Commands wait for the configured delay and emit their matching completion Message with the version that scheduled the wait. `update` ignores stale versions. The Commands are exported for Story tests; application code should let `update` issue and resolve them through the normal Runtime.

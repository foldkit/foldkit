# Hover Intent

## Overview

HoverIntent keeps a related panel open while the pointer or focus moves between it and a trigger. Pointer entry and departure use configurable delays. Focus opens the panel immediately; if focus is the last thing keeping it open, moving focus away closes it without the pointer grace period. Escape also closes immediately and prevents reopening until the pointer and focus have both left.

HoverIntent is headless. Bind `HoverIntentBlock` in the parent. It does not render elements, position the panel, assign ARIA roles, or choose styles. Use it when those choices belong to the component you are building. For example, a Hover Card can pair HoverIntent with [Anchor](/ui/anchor), while a hover menu can keep its items available as the pointer moves from the trigger into the panel.

## Examples

### Hover Card

Hover over or focus the “More information” trigger, then move the pointer into the card. Move the pointer or focus away from both elements, or press Escape, to close it.

::Demo{name="hover-card"}

::Snippet{name="uiHoverIntentBasic" label="Hover card"}

### Hover Menu

Hover over or focus the “Actions” trigger, then move the pointer into the menu. Choosing an item closes the menu; the demo items do not navigate or change other page state.

::Demo{name="hover-menu"}

::Snippet{name="uiHoverIntentMenu" label="Hover menu"}

Spread `trigger` onto the trigger element and `panel` onto the panel element. Each bundle supplies the hover, focus, and Escape handlers for that element. The `h.block` boundary routes the resulting child Messages back to the parent.

## Keyed Triggers

When many triggers share one panel, such as a hover card on every row of a list, one HoverIntent Model can serve all of them. Spread `keyedTrigger(key)` onto each trigger instead of `trigger`, and render the panel for the trigger that `maybeActiveTriggerKey` names.

::Snippet{name="uiHoverIntentKeyed" label="Keyed triggers"}

### Active Trigger

The panel belongs to one trigger at a time, the active trigger. HoverIntent tracks the pointer and focus separately, so one trigger can hold focus while the pointer is over another.

- The latest trigger to receive the pointer or focus becomes active, unless Escape dismissed the panel for it (see [Escape Dismissal](#escape-dismissal)). While the panel is open, it moves to that trigger at once, without waiting for `closeDelay` and then `openDelay`.
- While the panel is closed, a new trigger restarts `openDelay` for the pointer, or opens the panel at once for focus. Only the latest wait can open the panel.
- When the active trigger loses the pointer or focus, HoverIntent waits the same grace period as a single trigger: `closeDelay` for the pointer, and no delay for focus. If the active trigger or the panel has the pointer or focus again by then, the panel stays with the active trigger. Moving the pointer or focus from the trigger into the panel keeps the panel on that trigger.
- After the grace period, the panel moves to another trigger that still has the pointer or focus and is not dismissed. For example, if the pointer passes over another row while a row's trigger holds focus, the panel follows the pointer, and returns to the focused row `closeDelay` after the pointer leaves.
- The panel closes when neither a trigger nor the panel has the pointer or focus.

One Model may use `trigger` and `keyedTrigger` together. The unkeyed trigger acts as one more trigger, and `maybeActiveTriggerKey` is `None` while it holds the panel.

### Returning Focus on Escape

When the panel holds focusable content, `focusTriggerSelector` has to find the active trigger. Set `aria-expanded` to `true` only on the trigger whose key `maybeActiveTriggerKey` names while `isVisible` is `true`, and pass a selector scoped to the list, such as `#people-list [aria-expanded="true"]`. Escape in the panel then focuses that trigger before the panel is removed. HoverIntent focuses the first element in the document that matches the selector, so without the list scope an expanded control elsewhere on the page could receive focus.

### Removing a Trigger

A removed element cannot report the pointer leaving it, and some browsers do not report focus leaving it either. When you remove a keyed trigger, send the `InformedOfRemovedKeyedTrigger` InMessage with its key, for example with the Binding's `informOfRemovedKeyedTrigger({ key })` in the update handler that removes the item. HoverIntent forgets the pointer, focus, and Escape dismissal on that trigger. If it was the active trigger, the panel moves at once to another trigger that still has the pointer or focus and is not dismissed, or closes when none does. Without the InMessage, HoverIntent keeps treating the removed trigger as engaged and can keep the panel open for a key that no longer renders.

## Timing and Dismissal

### Pointer Timing

Pointer entry starts `openDelay`, which defaults to 200 milliseconds. When the pointer leaves both elements and neither holds focus, `closeDelay` starts; it defaults to 300 milliseconds. Entering either element again before the delay expires keeps the panel open. Versioning prevents an old wait from changing visibility after a newer interaction.

### Focus Timing

Focus opens immediately. If focus is the last thing keeping the panel open, moving it outside both elements starts a zero-delay close, so clicking or tabbing away does not use the pointer grace period. When focus moves from the trigger into the panel, the panel focus handler cancels that close before it resolves. Keyboard users can therefore move into focusable panel content without closing it.

### Escape Dismissal

Escape closes immediately. When panel content can hold focus, set `focusTriggerSelector` so Escape returns focus to the trigger before removing the panel. If the selector is omitted or does not resolve to a focusable element, HoverIntent does not move focus; removing the focused panel leaves the browser to choose its fallback focus target. After Escape, the panel does not reopen until the pointer and focus have both left the trigger and panel. A later entry can open it again.

With keyed triggers, Escape on a trigger dismisses the panel for the trigger that receives Escape, and also for the active trigger when the panel is open. Escape in the panel, and `RequestedClose`, dismiss it for the active trigger. A dismissed trigger does not take the panel until the pointer and focus have both left it, and have also left the panel while the panel belongs to that trigger. While the panel is open for another trigger, the pointer or focus passing over a dismissed trigger leaves the panel where it is, and the panel never moves to a dismissed trigger after a grace period. Each trigger keeps its own dismissal, so dismissing a second trigger does not end the first one's. Another trigger receiving the pointer or focus opens the panel as usual: focus opens it at once, and the pointer after `openDelay`. To return focus to the active keyed trigger, see [Returning Focus on Escape](#returning-focus-on-escape).

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

Pass the child Model as `model` and these fields as `viewInputs` to the HoverIntent Binding's `embedView` method. The Binding supplies the canonical view, Message wrapper, and composition scope. Keep `toView` at the top level, and spread the published `ChildAttribute` groups unchanged; see [Callback dispatch boundaries](/core/block#callback-dispatch-boundaries).

| Name                   | Type                           | Description                                                                    |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `focusTriggerSelector` | `string \| undefined`          | Selector for the trigger to focus before Escape removes focused panel content. |
| `toView`               | `(render: RenderInfo) => Html` | Renders consumer-owned markup from the event bundles and visibility state.     |

### RenderInfo {#render-info}

| Name                    | Type                                             | Description                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trigger`               | `ReadonlyArray<ChildAttribute>`                  | Hover, focus, and Escape attributes for the trigger element.                                                                                                                          |
| `keyedTrigger`          | `(key: string) => ReadonlyArray<ChildAttribute>` | Hover, focus, and Escape attributes for one of many triggers that share the panel.                                                                                                    |
| `maybeActiveTriggerKey` | `Option<string>`                                 | The key of the active trigger. `None` before a keyed trigger engages the panel and while the unkeyed trigger holds it. It keeps the key after the panel closes, so check `isVisible`. |
| `panel`                 | `ReadonlyArray<ChildAttribute>`                  | Hover, focus, and Escape attributes for the panel element.                                                                                                                            |
| `isVisible`             | `boolean`                                        | Whether the panel is open. The consumer decides whether to render it.                                                                                                                 |

### Message

`EnteredTrigger`, `LeftTrigger`, `EnteredPanel`, and `LeftPanel` describe pointer movement. `FocusedTrigger`, `BlurredTrigger`, `FocusedPanel`, and `BlurredPanel` describe focus movement. `EnteredKeyedTrigger`, `LeftKeyedTrigger`, `FocusedKeyedTrigger`, `BlurredKeyedTrigger`, and `PressedEscapeOnKeyedTrigger` describe pointer, focus, and Escape on a keyed trigger and carry its `key`. `PressedEscape` records whether Escape came from the trigger or panel. `CompletedWaitBeforeOpening` and `CompletedWaitBeforeClosing` are produced only by the exported wait Commands.

The parent sends two InMessages. `RequestedClose` closes the panel immediately. `InformedOfRemovedKeyedTrigger` carries the `key` of a keyed trigger whose element was removed; see [Removing a Trigger](#removing-a-trigger).

### OutMessage {#out-message}

| Name     | Description                                             |
| -------- | ------------------------------------------------------- |
| `Opened` | Emitted when the Model transitions from closed to open. |
| `Closed` | Emitted when the Model transitions from open to closed. |

### WaitBeforeOpening and WaitBeforeClosing {#wait-commands}

These Commands wait for the configured delay and emit their matching completion Message with the version that scheduled the wait. `update` ignores stale versions. The Commands are exported for Story tests; application code should let `update` issue and resolve them through the normal Runtime.

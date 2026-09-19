# Toast

## Overview

A stack of transient notifications anchored to a corner of the viewport. Each entry has its own enter and leave animation, its own auto-dismiss timer, its own hover-to-pause behavior, and an opt-in pointer swipe to dismiss. One container lives at the app root; entries are added dynamically via `Toast.show`.

Toast is parameterized on a payload Schema that you provide. The component owns its id, semantic variant, transition, dismiss timer, and hover state. Everything else lives in your payload and is rendered by your `entryToView` callback. `Toast.make(PayloadSchema)` returns a module whose Model, helpers, and view are bound to that payload type.

:::Info{label="See it in an app"}
Check out how Toast is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/toast.ts).
:::

## Examples

Click a variant to push a toast onto the stack. Hover a toast to pause its auto-dismiss; move away and the timer restarts. Drag a toast right to swipe it away; release after 120px and it continues off-screen, otherwise it animates back. Press Escape while dragging to cancel.

::Demo{name="demo"}

::Snippet{name="uiToastBasic" label="toast example"}

## Styling

Toast is headless. The container gets `position: fixed` and flex-column layout from the component (so entries stack correctly for each `position`); every other visual decision lives in your `entryToView` callback and your `entryClassName`. Use `data-variant` on the entry to drive per-variant styling.

Each entry’s enter/leave animations flow through the [Animation](/ui/animation) module. Style with CSS transitions or CSS keyframe animations. Animation advances once every animation on the element has settled.

## Gestures

Swipe is pointer-driven and opt-in. Pass `swipeToDismiss` to `Toast.init` (`{}` for the default rightward 80px threshold, `{ threshold: 120 }` for a longer swipe as in this demo, or `{ direction: 'Left' }` for a leftward swipe); without it the view attaches no `pointerdown` handler and the gesture Messages are no-ops, so an existing Toast without wired subscriptions can never get stuck mid-drag. The direction is independent of the view's `position`, so set it explicitly for a left-anchored stack. With swipe enabled, `Toast.view` attaches `pointerdown` per entry and `Toast.subscriptions` drives `pointermove`, `pointerup`, and `pointercancel` plus `Escape` to cancel, locking `user-select` and cursor to `grabbing` while dragging. Wire the subscriptions at the app root with `Subscription.lift(Toast.subscriptions)`. See the snippet below and [Toast subscriptions in the demo app](https://github.com/foldkit/foldkit/blob/main/packages/website/src/page/ui/subscriptions.ts).

Presses on buttons, links, form controls, and editable elements do not start a swipe, so a close button keeps its normal pointer behavior. To make text selectable with a mouse or pen, put `data-toast-swipe-ignore` on a span around the text, as the demo does. A touch can still start a swipe over that text. Other areas of the entry remain draggable.

While dragging the entry follows the pointer only in the configured direction, with opposite movement clamped to zero. The view sets `data-swipe="move"` and an inline `translate` property holding the offset. The offset lives on `translate` rather than `transform` on purpose: the two compose, so other leave effects can use `transform` without fighting the swipe. Releasing after the configured distance sets `data-swipe="end"`, holds the release offset until the leave phase begins, then targets `100vw` or `-100vw` to carry the entry off-screen before `DismissedToast` fires. Releasing below the threshold (or cancelling with `Escape`) settles back toward zero and reschedules the auto-dismiss timer. The component holds `data-swipe="settling"` for 150ms (`SWIPE_SETTLE_DURATION`) after a cancel so your CSS can animate the snap-back; transition the `translate` property for both phases, as the demos do:

```css
.toast-entry[data-swipe='settling'] {
  transition: translate 150ms ease-out;
}

.toast-entry[data-swipe='end'] {
  transition: translate 240ms ease-in;
}
```

The view also exposes the live offset as `--toast-swipe-move-x` for custom styling, such as fading in an action background behind the entry as it moves.

| Attribute         | Condition                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-variant`    | Present on each entry, with the variant value (Info, Success, Warning, Error). Use for per-variant CSS.                                                                                                                                                                                                                                         |
| `data-enter`      | Present on an entry while its enter animation runs.                                                                                                                                                                                                                                                                                             |
| `data-leave`      | Present on an entry while its leave animation runs.                                                                                                                                                                                                                                                                                             |
| `data-closed`     | Present on an entry at the closed extreme of its enter or leave animation. Pair with data-enter or data-leave to drive the starting and ending CSS states.                                                                                                                                                                                      |
| `data-transition` | Present on an entry while either animation runs.                                                                                                                                                                                                                                                                                                |
| `data-swipe`      | `move` while an entry is being dragged, `settling` while a short or cancelled swipe returns to rest, and `end` while a successful swipe exits. The view positions the entry with the inline `translate` property (which composes with your `transform` animations) and exposes the pointer offset as `--toast-swipe-move-x` for custom styling. |

## Accessibility

The container is a `role="region"` with `aria-live="polite"`, always rendered (even when empty) so screen readers observe the live region from page load. Individual entries receive `role="status"` for Info and Success variants, `role="alert"` for Warning and Error. Auto-dismiss pauses on pointer hover and while dragging. Dismiss via swipe and the close button both flow through the same leave animation and `DismissedToast` OutMessage.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Toast.init()`.

| Name              | Type                                                    | Default               | Description                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`                                                | —                     | Unique ID for the toast container.                                                                                                                                                                                                 |
| `defaultDuration` | `Duration.Input`                                        | `Duration.seconds(4)` | Auto-dismiss duration applied to any show() call that does not provide its own duration or pass sticky: true. Accepts any Effect Duration input; a bare number is interpreted as milliseconds.                                     |
| `swipeToDismiss`  | `{ threshold?: number; direction?: 'Left' \| 'Right' }` | —                     | Opts the container into swipe-to-dismiss. Omit it to leave swipe disabled. Defaults to a rightward 80px threshold. Set `threshold` for the dismissal distance and `direction: 'Left'` for a leftward swipe. Applies per container. |

### ShowInput {#show-input}

Input shape for `Toast.show(model, input)`.

| Name       | Type                                          | Default  | Description                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payload`  | `A (your payload type)`                       | —        | Content for this entry, in whatever shape you supplied to Toast.make(). The component never reads it; it flows through to your entryToView callback.                                                                        |
| `variant`  | `'Info' \| 'Success' \| 'Warning' \| 'Error'` | `'Info'` | Semantic category. Maps to data-variant for styling and to role=status (Info, Success) or role=alert (Warning, Error) for accessibility. The only content-adjacent field the component owns. Everything else is in payload. |
| `duration` | `Duration.Input`                              | —        | Overrides the container's defaultDuration for this entry. Ignored when sticky: true.                                                                                                                                        |
| `sticky`   | `boolean`                                     | `false`  | When true, the entry never auto-dismisses. The user must close it manually.                                                                                                                                                 |

### ViewConfig {#view-config}

Configuration object passed to `Toast.view()`.

| Name                 | Type                                                                                             | Default           | Description                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`              | `Toast.Model`                                                                                    | —                 | The toast container state from your parent Model.                                                                                                                                                                                                                                                                                                            |
| `position`           | `'TopLeft' \| 'TopCenter' \| 'TopRight' \| 'BottomLeft' \| 'BottomCenter' \| 'BottomRight'`      | —                 | Where the toast viewport is anchored on the screen.                                                                                                                                                                                                                                                                                                          |
| `toParentMessage`    | `(childMessage: Toast.Message) => ParentMessage`                                                 | —                 | Wraps Toast Messages in your parent Message type. The view emits `Dismissed`, `HoveredEntry`, `LeftEntry`, and `PressedEntryPointer`.                                                                                                                                                                                                                        |
| `entryToView`        | `(entry: typeof Toast.Entry.Type, handlers: { dismiss: ReadonlyArray<ChildAttribute> }) => Html` | —                 | Renders each entry from its lifecycle fields (for example id, variant, and animation) and its payload (your shape). The component wraps the return in an `<li>` with role, lifecycle handlers, and transition data attributes. Spread handlers.dismiss onto a close button (h.button([...handlers.dismiss], [...])) so users can dismiss the entry manually. |
| `ariaLabel`          | `string`                                                                                         | `'Notifications'` | aria-label on the container region.                                                                                                                                                                                                                                                                                                                          |
| `containerClassName` | `string`                                                                                         | —                 | CSS class for the container `<div>`.                                                                                                                                                                                                                                                                                                                         |
| `entryClassName`     | `string`                                                                                         | —                 | CSS class applied to every entry `<div>`.                                                                                                                                                                                                                                                                                                                    |

### Programmatic Helpers

Toast helpers are child entry points. Fold `show` and `dismiss` with `Update.foldChild` because they take additional input. Fold `dismissAll` with `Update.foldChildStep`.

| Name         | Type                                                                                          | Default | Description                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `show`       | `(model: Model, input: ShowInput) => Update.ReturnWithOutMessage<Model, Message, OutMessage>` | —       | Adds a new toast entry. Fold it from any parent handler that needs to surface a notification. Returns the next Model plus Commands for the enter animation and the auto-dismiss timer. |
| `dismiss`    | `(model: Model, entryId: string) => Update.ReturnWithOutMessage<Model, Message, OutMessage>`  | —       | Begins dismissing a specific entry. Calling it for an entry that is already leaving or has been removed is a no-op.                                                                    |
| `dismissAll` | `(model: Model) => Update.ReturnWithOutMessage<Model, Message, OutMessage>`                   | —       | Begins dismissing every currently-visible entry.                                                                                                                                       |

### Subscriptions

Toast exposes `Toast.subscriptions` with `swipePointer` and `swipeEscape`. Lift them once at the app root so pointer tracking continues even when the pointer leaves the entry:

```ts
import { Subscription } from 'foldkit'

import { Toast } from './toastModule'

export const subscriptions = Subscription.lift(Toast.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.toast,
  toParentMessage: message => Message.GotToastMessage({ message }),
})
```

Without the lift the view still renders `data-swipe="move"` for the initial `pointerdown`, but `pointermove` and `pointerup` never reach the update and the gesture cannot complete.

For custom renderers (for example a [foldcn](https://github.com/elianiva/foldcn)-style stack that owns its own `<li>`), read the pointer offset with `Toast.swipeOffset(entry.swipeState)` and apply `translate: <offset>px` yourself. Mirror the `data-swipe` phases: `move` while `entry.swipeState` is `Dragging`, `settling` while it is `Settling`, and `end` while it is `Dismissing`. For an `end` phase, retain the offset at `LeaveStart` and move toward `100vw` or `-100vw` at `LeaveAnimating`, according to the entry's swipe direction.

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name             | Type                   | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DismissedToast` | `{ payload: Payload }` | —       | Emitted once an entry has finished its leave animation and is being removed from the Model. Carries the toast's payload typed as your `Payload` Schema. Fold it in the `foldOutMessage` of your Toast fold to lift the dismissal into domain state, for example to resolve a pending action or fire analytics. It fires only after `TransitionedOut`, so it represents the actual removal, not the initial dismiss request. |

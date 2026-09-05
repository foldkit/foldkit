# Toast

## Overview

A stack of transient notifications anchored to a corner of the viewport. Each entry has its own enter and leave animation, its own auto-dismiss timer, its own hover-to-pause behavior, and a pointer swipe to dismiss. One container lives at the app root; entries are added dynamically via `Toast.show`.

Toast is parameterized on a payload Schema that you provide. The component owns its id, semantic variant, transition, dismiss timer, and hover state. Everything else lives in your payload and is rendered by your `entryToView` callback. `Toast.make(PayloadSchema)` returns a module whose Model, helpers, and view are bound to that payload type.

:::Info{label="See it in an app"}
Check out how Toast is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/toast.ts).
:::

## Examples

Click a variant to push a toast onto the stack. Hover a toast to pause its auto-dismiss; move away and the timer restarts. Drag a toast horizontally to swipe it away; release past the threshold to dismiss, otherwise it snaps back. Press Escape while dragging to cancel.

::Demo{name="demo"}

::Snippet{name="uiToastBasic" label="toast example"}

## Styling

Toast is headless. The container gets `position: fixed` and flex-column layout from the component (so entries stack correctly for each `position`); every other visual decision lives in your `entryToView` callback and your `entryClassName`. Use `data-variant` on the entry to drive per-variant styling.

Each entry’s enter/leave animations flow through the [Animation](/ui/animation) module. Style with CSS transitions or CSS keyframe animations. Animation advances once every animation on the element has settled.

## Gestures

Swipe is pointer-driven. `Toast.view` attaches `pointerdown` per entry; `Toast.subscriptions` drives `pointermove`, `pointerup`, and `pointercancel` plus `Escape` to cancel, and locks `user-select` and cursor to `grabbing` while dragging. Wire the subscriptions at the app root with `Subscription.lift(Toast.subscriptions)`. See the snippet below and [Toast subscriptions in the demo app](https://github.com/foldkit/foldkit/blob/main/packages/website/src/page/ui/subscriptions.ts).

While dragging the entry follows the pointer with `translateX(offset)` and `data-swipe="move"`. Releasing with `abs(offset) >= swipeThreshold` starts the leave animation and eventually emits `DismissedToast`; releasing below the threshold snaps back and reschedules the auto-dismiss timer. `Escape` cancels the gesture the same way.

| Attribute         | Condition                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-variant`    | Present on each entry, with the variant value (Info, Success, Warning, Error). Use for per-variant CSS.                                                    |
| `data-enter`      | Present on an entry while its enter animation runs.                                                                                                        |
| `data-leave`      | Present on an entry while its leave animation runs.                                                                                                        |
| `data-closed`     | Present on an entry at the closed extreme of its enter or leave animation. Pair with data-enter or data-leave to drive the starting and ending CSS states. |
| `data-transition` | Present on an entry while either animation runs.                                                                                                           |
| `data-swipe`      | `move` while an entry is being dragged. Pair with `transform: translateX` and `--toast-swipe-move-x` set inline by the view for custom swipe styling.      |

## Accessibility

The container is a `role="region"` with `aria-live="polite"`, always rendered (even when empty) so screen readers observe the live region from page load. Individual entries receive `role="status"` for Info and Success variants, `role="alert"` for Warning and Error. Auto-dismiss pauses on pointer hover and while dragging. Dismiss via swipe and the close button both flow through the same leave animation and `DismissedToast` OutMessage.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Toast.init()`.

| Name              | Type             | Default               | Description                                                                                                                                                                                        |
| ----------------- | ---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`         | —                     | Unique ID for the toast container.                                                                                                                                                                 |
| `defaultDuration` | `Duration.Input` | `Duration.seconds(4)` | Auto-dismiss duration applied to any show() call that does not provide its own duration or pass sticky: true. Accepts any Effect Duration input; a bare number is interpreted as milliseconds.     |
| `swipeThreshold`  | `number`         | `80`                  | Horizontal distance in pixels the pointer must travel before a release dismisses the entry. Applies per container; override in `Toast.init({ swipeThreshold })` to match a denser or looser stack. |

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
| `toParentMessage`    | `(childMessage: Dismissed \| HoveredEntry \| LeftEntry) => ParentMessage`                        | —                 | Wraps the subset of Toast Messages that fire from DOM events in your parent Message type.                                                                                                                                                                                                                                                                    |
| `entryToView`        | `(entry: typeof Toast.Entry.Type, handlers: { dismiss: ReadonlyArray<ChildAttribute> }) => Html` | —                 | Renders each entry from its lifecycle fields (for example id, variant, and animation) and its payload (your shape). The component wraps the return in an `<li>` with role, lifecycle handlers, and transition data attributes. Spread handlers.dismiss onto a close button (h.button([...handlers.dismiss], [...])) so users can dismiss the entry manually. |
| `ariaLabel`          | `string`                                                                                         | `'Notifications'` | aria-label on the container region.                                                                                                                                                                                                                                                                                                                          |
| `containerClassName` | `string`                                                                                         | —                 | CSS class for the container `<ol>`.                                                                                                                                                                                                                                                                                                                          |
| `entryClassName`     | `string`                                                                                         | —                 | CSS class applied to every `<li>` entry.                                                                                                                                                                                                                                                                                                                     |

### Programmatic Helpers

Toast helpers are child entry points. Fold `show` and `dismiss` with `Update.foldChild` because they take additional input. Fold `dismissAll` with `Update.foldChildStep`.

| Name         | Type                                                                                          | Default | Description                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `show`       | `(model: Model, input: ShowInput) => Update.ReturnWithOutMessage<Model, Message, OutMessage>` | —       | Adds a new toast entry. Fold it from any parent handler that needs to surface a notification. Returns the next Model plus Commands for the enter animation and the auto-dismiss timer. |
| `dismiss`    | `(model: Model, entryId: string) => Update.ReturnWithOutMessage<Model, Message, OutMessage>`  | —       | Begins dismissing a specific entry. Calling it for an entry that is already leaving or has been removed is a no-op.                                                                    |
| `dismissAll` | `(model: Model) => Update.ReturnWithOutMessage<Model, Message, OutMessage>`                   | —       | Begins dismissing every currently-visible entry.                                                                                                                                       |

### Subscriptions {#subscriptions}

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

For custom renderers (for example a foldcn-style stack that owns its own `<li>`), read the offset with `Toast.swipeOffsetForEntry(model.swipeState, entry.id)` and apply `transform: translateX(offset)` and `data-swipe` yourself.

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name             | Type                   | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DismissedToast` | `{ payload: Payload }` | —       | Emitted once an entry has finished its leave animation and is being removed from the Model. Carries the toast's payload typed as your `Payload` Schema. Fold it in the `foldOutMessage` of your Toast fold to lift the dismissal into domain state, for example to resolve a pending action or fire analytics. It fires only after `TransitionedOut`, so it represents the actual removal, not the initial dismiss request. |

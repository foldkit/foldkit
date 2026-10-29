# Toast

## Overview

A stack of transient notifications positioned along an edge of the viewport. Each entry has its own enter and leave animation and hover state. Non-sticky entries have independent auto-dismiss timers that pause on hover. Swipe-to-dismiss is opt-in for the container. Keep the container at the app root and add entries with the Binding’s `requestShow` operation.

Toast is parameterized on a payload Schema that you provide. The component owns entry IDs, variants, animations, optional dismiss timers, hover state, and swipe state. Your payload holds the content rendered by `entryToView`. `Toast.makeBlock(PayloadSchema)` returns a completed Block whose Model, programmatic API, view, Subscriptions, and handler recipes are bound to that payload type. Each parent Binding supplies its occurrence identity.

:::Info{label="See it in an app"}
Check out how Toast is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/toast.ts).
:::

## Examples

Click a variant to add a toast. Hover a non-sticky toast to pause its auto-dismiss; move away and the timer restarts. Drag a toast right to dismiss it. If you release after more than 40px, it continues off-screen; otherwise it animates back. Press Escape while dragging to cancel.

::Demo{name="demo"}

::Snippet{name="uiToastBasic" label="Toast"}

## Styling

Toast supplies layout and gesture styles but leaves the appearance to you. Its container has fixed positioning and a flex layout that stacks entries according to `position`. Use `containerClassName`, `entryClassName`, and `entryToView` for your styling; `data-variant` is available for per-variant CSS.

Each entry’s enter and leave phases flow through [Animation](/ui/animation). Style the entry wrapper with CSS transitions or keyframe animations; each phase waits for those animations to finish.

## Gestures

### Enable Swipe to Dismiss

Swipe is pointer-driven and opt-in. Pass `swipeToDismiss` to the Toast Binding’s `init`. For example: `{}` enables a rightward swipe with a 40px threshold, `{ threshold: 120 }` requires a longer swipe, and `{ direction: 'Left' }` enables a leftward swipe. Without it, the Toast view attaches no `pointerdown` handler or `touch-action` restriction. Direction is independent of `position`, so configure it explicitly for a left-anchored stack.

### Track the Pointer

With swipe enabled, Toast handles `pointerdown` on each entry. Connect the completed Block returned by `Toast.makeBlock` and include the Binding in the owning Composition’s `bindings`; that one relationship carries the Toast instance’s pointer Subscriptions and handler recipes through application composition. The Subscriptions track `pointermove`, `pointerup`, and `pointercancel` even when the pointer leaves the entry. Without the Binding, the parent cannot embed the Toast view. Escape cancels active drags. While dragging, Toast prevents text selection and shows the grabbing cursor. The example above shows the Binding.

### Preserve Nested Interactions

Presses on buttons, links, form controls, and editable elements do not start a swipe, so a close button keeps its normal pointer behavior. To make text selectable with a mouse or pen, put `data-toast-swipe-ignore` on a span around the text, as the demo does. A touch can still start a swipe over that text. Other areas of the entry remain draggable.

### Complete or Cancel a Swipe

While dragging, the entry follows the pointer only in the configured direction; movement in the opposite direction is clamped to zero. The Toast view sets `data-swipe="move"` and the entry's inline `translate` offset. The `translate` property composes with any `transform` animation you apply. Dismissal depends on release distance, not velocity. Releasing more than the threshold sets `data-swipe="end"`, holds the release offset until leave animation starts, then targets `100vw` or `-100vw` to carry the entry off-screen before `DismissedToast` fires.

Releasing at or below the threshold, or cancelling with Escape, returns the entry to zero offset and resumes auto-dismiss when applicable. Toast holds `data-swipe="settling"` for 150ms (`SWIPE_SETTLE_DURATION`) after either case. Add a `translate` transition for the snap-back and exit, as the demos do:

::Snippet{name="uiToastSwipeStyles" label="Swipe transition styles"}

### Style the Swipe Offset

While an entry is translated, the view exposes its drag or release offset as `--toast-swipe-move-x`. You can use it to style an action background behind the moving entry.

| Attribute         | Condition                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-variant`    | Present on each entry, with the variant value (Info, Success, Warning, Error). Use for per-variant CSS.                                                                                                                                                                                                                                         |
| `data-enter`      | Present on an entry while its enter animation runs.                                                                                                                                                                                                                                                                                             |
| `data-leave`      | Present on an entry while its leave animation runs.                                                                                                                                                                                                                                                                                             |
| `data-closed`     | Present on an entry at the closed extreme of its enter or leave animation. Pair with data-enter or data-leave to drive the starting and ending CSS states.                                                                                                                                                                                      |
| `data-transition` | Present on an entry while either animation runs.                                                                                                                                                                                                                                                                                                |
| `data-swipe`      | `move` while an entry is being dragged, `settling` while a short or cancelled swipe returns to rest, and `end` while a successful swipe exits. The view positions the entry with the inline `translate` property (which composes with your `transform` animations) and exposes the pointer offset as `--toast-swipe-move-x` for custom styling. |

## Accessibility

The container has `role="region"` and `aria-live="polite"`. It stays in the DOM when empty so screen readers can observe notifications added later. Each entry has `aria-atomic="true"` and receives `role="status"` for Info and Success or `role="alert"` for Warning and Error. Auto-dismiss pauses on pointer hover and while dragging. Swipe and close-button dismissal both use the leave animation and emit `DismissedToast` when the entry is removed.

## Testing

Use the completed Toast Block's `test.drainEntry` helper in a [Story test](/testing/story) to resolve the animation and timer Commands for a newly shown toast that auto-dismisses:

::Snippet{name="uiToastDrainEntry" label="Draining a fresh Toast entry in Story"}

Pass the exact `binding` and `entryId`. A keyed Toast Binding also requires its exact occurrence `key`. The optional timer `version` defaults to `0`. The helper selects the completed Toast factory, Binding placement, keyed occurrence, entry, and timer version before resolving enter generation `1`, the auto-dismiss timer, and leave generation `2`.

`drainEntry` only handles a freshly shown, non-sticky entry whose enter lifecycle and initial auto-dismiss timer are still pending. It rejects a sticky entry, an entry whose lifecycle has already advanced, the wrong timer version, a key on an unkeyed Binding, a missing or wrong key on a keyed Binding, and an ancestor selection that still matches more than one pending timer. Resolve individual public Commands when a test starts from another lifecycle state.

## API Reference

### InitConfig {#init-config}

Configuration object passed to the Toast Binding’s `init()`.

| Name              | Type                                                    | Default               | Description                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`                                                | —                     | Unique ID for the toast container.                                                                                                                                                                                                 |
| `defaultDuration` | `Duration.Input`                                        | `Duration.seconds(4)` | Auto-dismiss duration for a `requestShow` call without its own `duration` or `sticky: true`. Accepts any Effect Duration input; a bare number means milliseconds.                                                                  |
| `swipeToDismiss`  | `{ threshold?: number; direction?: 'Left' \| 'Right' }` | —                     | Opts the container into swipe-to-dismiss. Omit it to leave swipe disabled. Defaults to a rightward 40px threshold. Set `threshold` for the dismissal distance and `direction: 'Left'` for a leftward swipe. Applies per container. |

### ShowInput {#show-input}

Input shape for `toast.requestShow(input)`.

| Name       | Type                                          | Default  | Description                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payload`  | `A (your payload type)`                       | —        | Content for this entry, in the shape you supplied to `Toast.makeBlock`. Toast passes it to your `entryToView` callback without reading it.                                                                                  |
| `variant`  | `'Info' \| 'Success' \| 'Warning' \| 'Error'` | `'Info'` | Semantic category. Maps to data-variant for styling and to role=status (Info, Success) or role=alert (Warning, Error) for accessibility. The only content-adjacent field the component owns. Everything else is in payload. |
| `duration` | `Duration.Input`                              | —        | Overrides the container's defaultDuration for this entry. No auto-dismiss timer is scheduled when `sticky: true`.                                                                                                           |
| `sticky`   | `boolean`                                     | `false`  | When true, the entry does not auto-dismiss. It can still be closed with the close button, an enabled swipe, or `toast.requestDismiss`.                                                                                      |

### ViewInputs {#view-config}

Pass the child Model as `model` and these fields as `viewInputs` to the Toast Binding's `embedView` method. The Binding supplies the canonical view, Message wrapper, and composition scope. Keep `entryToView` at the top level, and spread `handlers.dismiss` unchanged; see [Callback dispatch boundaries](/core/block#callback-dispatch-boundaries).

| Name                 | Type                                                                                        | Default           | Description                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `position`           | `'TopLeft' \| 'TopCenter' \| 'TopRight' \| 'BottomLeft' \| 'BottomCenter' \| 'BottomRight'` | —                 | Where the toast viewport is anchored on the screen.                                                                                                                                                    |
| `entryToView`        | `(entry, handlers: EntryHandlers) => Html`                                                  | —                 | Renders content inside the entry `<div>`, which Toast owns along with its role, lifecycle handlers, and data attributes. Spread `handlers.dismiss` onto a close button to let users dismiss the entry. |
| `ariaLabel`          | `string`                                                                                    | `'Notifications'` | aria-label on the container region.                                                                                                                                                                    |
| `containerClassName` | `string`                                                                                    | —                 | CSS class for the container `<div>`.                                                                                                                                                                   |
| `entryClassName`     | `string`                                                                                    | —                 | CSS class applied to every entry `<div>`.                                                                                                                                                              |

### Programmatic Helpers

Toast operations are public parent Steps. Call the Binding’s `requestShow`, `requestDismiss`, and `requestDismissAll` operations from the parent.

| Name                | Type                                | Default | Description                                                                                                                                                                                  |
| ------------------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requestShow`       | `(input: ShowInput) => parent Step` | —       | Adds a new toast entry. Fold it from any parent handler that needs to surface a notification. Returns the next Model plus Commands for the enter animation and, unless sticky, auto-dismiss. |
| `requestDismiss`    | `(entryId: string) => parent Step`  | —       | Begins dismissing a specific entry. Calling it for an entry that is already leaving or has been removed is a no-op.                                                                          |
| `requestDismissAll` | `() => parent Step`                 | —       | Begins dismissing every currently-visible entry.                                                                                                                                             |

### Effects and Subscriptions

#### Lift Pointer Subscriptions

Each completed Block returned by `Toast.makeBlock` can be bound once and included in the owner’s `bindings`; composition carries `swipePointer`, `swipeEscape`, and their handler recipes automatically. The source `subscriptions` registry remains available when a Scene test needs to call `Subscription.emit` for one of those entries. The stable factory name keeps separate Toast instances distinct. The [example above](#examples) shows the Binding alongside the Toast Model and Message.

The composed Binding ensures `pointermove` and `pointerup` reach the Toast update after the initial `pointerdown`, even when the pointer leaves the entry.

#### Render Toasts Without `Toast.view`

If you render the Toast Model without `Toast.view`, you own the entry markup, accessibility roles, `pointerdown` handler, and swipe styling. Import the ordinary `swipeOffset` helper from `@foldkit/ui/toast` and call `swipeOffset(entry.swipeState)`, then apply the `translate` property yourself. Mirror the `data-swipe` phases: `move` while the entry is `Dragging`, `settling` while it is `Settling`, and `end` while it is `Dismissing`. In the `end` phase, retain the offset at `LeaveStart`, then move toward `100vw` or `-100vw` at `LeaveAnimating` according to the swipe direction. By contrast, `entryToView` only renders content inside the `<div>` wrapper owned by `Toast.view`.

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Handle the OutMessage in the Binding’s selected `fold` policy.

| Name             | Type                   | Default | Description                                                                                                                                                                                                                                                                                        |
| ---------------- | ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DismissedToast` | `{ payload: Payload }` | —       | Emitted when an entry finishes its leave animation and is removed from the Model. It carries the payload from your `Payload` Schema. Handle it in the Binding's selected `fold` policy to update domain state or return an analytics Command. It reports removal, not the initial dismiss request. |

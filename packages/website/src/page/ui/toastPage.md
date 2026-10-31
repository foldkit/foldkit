# Toast

## Overview

A stack of transient notifications positioned along an edge of the viewport. Each entry has its own enter and leave animation and hover state. Non-sticky entries have independent auto-dismiss timers that pause on hover. Swipe-to-dismiss is opt-in for the container. Keep the container at the app root and add entries by sending it the Message `Toast.requestShow` builds.

Toast is parameterized on a payload Schema that you provide. The component owns entry IDs, variants, animations, optional dismiss timers, hover state, and swipe state. Your payload holds the content rendered by `entryToView`. `Toast.makeBlock(PayloadSchema)` returns a Block class bound to that payload type, with its Layer attached as `Live` and a `requestShow` helper that builds the show Message. Call it once at module scope, create an instance in the parent's constructor, and provide its `Live` to the parent's Layer.

:::Info{label="See it in an app"}
Check out how Toast is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/page/toastPage.ts).
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

Swipe is pointer-driven and opt-in. Pass `swipeToDismiss` when you create the instance. For example: `{}` enables a rightward swipe with a 40px threshold, `{ threshold: 120 }` requires a longer swipe, and `{ direction: 'Left' }` enables a leftward swipe. Without it, the Toast view attaches no `pointerdown` handler or `touch-action` restriction. Direction is independent of `position`, so configure it explicitly for a left-anchored stack.

### Track the Pointer

With swipe enabled, Toast handles `pointerdown` on each entry. Each Toast instance runs its own pointer Subscriptions while it is in the parent Model. They track `pointermove`, `pointerup`, and `pointercancel` even when the pointer leaves the entry, so the parent writes no Subscription wiring. Escape cancels active drags. While dragging, Toast prevents text selection and shows the grabbing cursor.

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

Use the `test.drainEntry` helper on the class `Toast.makeBlock` returns in a [Story test](/testing/story) to resolve the animation and timer Commands for a newly shown toast that auto-dismisses:

::Snippet{name="uiToastDrainEntry" label="Draining a fresh Toast entry in Story"}

Pass the Toast instance's `path` from the Story's root Block, as in `Block.deliver`, and the `entryId`. Omit `path` when the Toast is the root. The optional timer `version` defaults to `0`. The helper selects the Toast class, instance, entry, and timer version before resolving enter generation `1`, the auto-dismiss timer, and leave generation `2`.

`drainEntry` only handles a freshly shown, non-sticky entry whose enter lifecycle and initial auto-dismiss timer are still pending. It rejects a sticky entry, an entry whose lifecycle has already advanced, the wrong timer version, and a `path` that still matches more than one pending timer. Resolve individual public Commands when a test starts from another lifecycle state.

## API Reference

### InitConfig {#init-config}

The args a parent passes when it creates an instance with `new`.

| Name              | Type                                                    | Default               | Description                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`                                                | —                     | Unique ID for the toast container.                                                                                                                                                                                                 |
| `defaultDuration` | `Duration.Input`                                        | `Duration.seconds(4)` | Auto-dismiss duration for an entry shown without its own `duration` or `sticky: true`. Accepts any Effect Duration input; a bare number means milliseconds.                                                                        |
| `swipeToDismiss`  | `{ threshold?: number; direction?: 'Left' \| 'Right' }` | —                     | Opts the container into swipe-to-dismiss. Omit it to leave swipe disabled. Defaults to a rightward 40px threshold. Set `threshold` for the dismissal distance and `direction: 'Left'` for a leftward swipe. Applies per container. |

### ShowInput {#show-input}

Input shape for `Toast.requestShow(input)`, called on the class `Toast.makeBlock` returns.

| Name       | Type                                          | Default  | Description                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payload`  | `A (your payload type)`                       | —        | Content for this entry, in the shape you supplied to `Toast.makeBlock`. Toast passes it to your `entryToView` callback without reading it.                                                                                  |
| `variant`  | `'Info' \| 'Success' \| 'Warning' \| 'Error'` | `'Info'` | Semantic category. Maps to data-variant for styling and to role=status (Info, Success) or role=alert (Warning, Error) for accessibility. The only content-adjacent field the component owns. Everything else is in payload. |
| `duration` | `Duration.Input`                              | —        | Overrides the container's defaultDuration for this entry. No auto-dismiss timer is scheduled when `sticky: true`.                                                                                                           |
| `sticky`   | `boolean`                                     | `false`  | When true, the entry does not auto-dismiss. It can still be closed with the close button, an enabled swipe, or a `RequestedDismiss` Message from the parent.                                                                |

### ViewInputs {#view-config}

Pass these fields to the instance's `view`, as in `model.toast.view({ ... })`. Spread the attribute groups the component passes to your callbacks unchanged; they keep the component's dispatch. See [View input](/core/block#callback-dispatch-boundaries).

| Name                 | Type                                                                                        | Default           | Description                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `position`           | `'TopLeft' \| 'TopCenter' \| 'TopRight' \| 'BottomLeft' \| 'BottomCenter' \| 'BottomRight'` | —                 | Where the toast viewport is anchored on the screen.                                                                                                                                                    |
| `entryToView`        | `(entry, handlers: EntryHandlers) => Html`                                                  | —                 | Renders content inside the entry `<div>`, which Toast owns along with its role, lifecycle handlers, and data attributes. Spread `handlers.dismiss` onto a close button to let users dismiss the entry. |
| `ariaLabel`          | `string`                                                                                    | `'Notifications'` | aria-label on the container region.                                                                                                                                                                    |
| `containerClassName` | `string`                                                                                    | —                 | CSS class for the container `<div>`.                                                                                                                                                                   |
| `entryClassName`     | `string`                                                                                    | —                 | CSS class applied to every entry `<div>`.                                                                                                                                                              |

### Messages a Parent Sends

Send these to the Toast instance from a parent update handler, as in `messages: [model.toast.send(Toast.requestShow(input))]`.

| Message                         | Built with                          | Description                                                                                                              |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `RequestedShow`                 | `Toast.requestShow(input)`          | Adds a new toast entry. Toast starts the enter animation and, unless the entry is sticky, the auto-dismiss timer.        |
| `RequestedDismiss({ entryId })` | `Toast.Message.RequestedDismiss`    | Begins dismissing a specific entry. Sending it for an entry that is already leaving or has been removed changes nothing. |
| `RequestedDismissAll()`         | `Toast.Message.RequestedDismissAll` | Begins dismissing every currently-visible entry.                                                                         |

### Pointer Subscriptions

Each Toast instance runs its `swipePointer` and `swipeEscape` Subscriptions while it is in the parent Model. They deliver `pointermove` and `pointerup` to the Toast after the initial `pointerdown`, even when the pointer leaves the entry.

#### Render Toasts Without the Toast View

If you render the Toast entries without the instance's `view`, you own the entry markup, accessibility roles, `pointerdown` handler, and swipe styling. Import the ordinary `swipeOffset` helper from `@foldkit/ui/toast` and call `swipeOffset(entry.swipeState)`, then apply the `translate` property yourself. Mirror the `data-swipe` phases: `move` while the entry is `Dragging`, `settling` while it is `Settling`, and `end` while it is `Dismissing`. In the `end` phase, retain the offset at `LeaveStart`, then move toward `100vw` or `-100vw` at `LeaveAnimating` according to the swipe direction. By contrast, `entryToView` only renders content inside the `<div>` wrapper the Toast view owns.

### OutMessage {#out-message}

Facts the component reports to its parent. Handle them by spreading the instance's `.on({ ... })` into the parent's update record. Variants without a handler are ignored.

| Name             | Type                   | Default | Description                                                                                                                                                                                                                                                                          |
| ---------------- | ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DismissedToast` | `{ payload: Payload }` | —       | Emitted when an entry finishes its leave animation and is removed from the Model. It carries the payload from your `Payload` Schema. Handle it with the instance's `.on` to update domain state or return an analytics Command. It reports removal, not the initial dismiss request. |

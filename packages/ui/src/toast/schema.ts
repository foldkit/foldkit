import { Duration, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { Animation } from '../animation/index.js'

// VARIANT

/** Semantic category of a toast. Drives the default ARIA role: `status` for
 *  `Info` / `Success`, `alert` for `Warning` / `Error`. Also surfaced as
 *  `data-variant` on each entry for per-variant CSS. This is the only
 *  content-adjacent field the Toast Block owns. The rest of the entry's
 *  content lives in the user-provided payload. */
export const Variant = Schema.Literals(['Info', 'Success', 'Warning', 'Error'])
export type Variant = typeof Variant.Type

// POSITION

/** Where the toast viewport is anchored on the screen and how entries stack. */
export const Position = Schema.Literals([
  'TopLeft',
  'TopCenter',
  'TopRight',
  'BottomLeft',
  'BottomCenter',
  'BottomRight',
])
export type Position = typeof Position.Type

// SWIPE

/** Direction in which a pointer can drag an entry to dismiss it. */
export const SwipeDirection = Schema.Literals(['Left', 'Right'])
export type SwipeDirection = typeof SwipeDirection.Type

const SwipeConfig = Schema.Struct({
  direction: SwipeDirection,
  threshold: Schema.Number,
})
type SwipeConfig = typeof SwipeConfig.Type

/** Per-entry swipe gesture state. `Dragging` retains the initiating
 *  `pointerId`, so move, release, and cancel Messages update only the entry
 *  that started the gesture and ignore unrelated touches. `Settling` returns
 *  a cancelled or short swipe to rest. `Dismissing` retains the release offset
 *  and direction while the leave animation carries the entry off-screen. The
 *  settle generation lives in the entry's `swipeVersion` so a stale settle
 *  timer cannot clear a later gesture. */
export const SwipeState = defineTaggedUnion({
  Idle: {},
  Dragging: {
    pointerId: Schema.Number,
    startX: Schema.Number,
    currentX: Schema.Number,
  },
  Settling: {
    offsetX: Schema.Number,
  },
  Dismissing: {
    offsetX: Schema.Number,
    direction: SwipeDirection,
  },
})
export type SwipeState = typeof SwipeState.Type

/** Default distance in pixels a pointer must travel to dismiss a Toast. */
export const DEFAULT_SWIPE_THRESHOLD = 40

/** Default direction in which a pointer can dismiss a Toast. */
export const DEFAULT_SWIPE_DIRECTION: SwipeDirection = 'Right'

/** Time an entry remains in `Settling` after a short or cancelled swipe,
 *  allowing consumer CSS to animate it back to rest. */
export const SWIPE_SETTLE_DURATION = Duration.millis(150)

// ENTRY

const makeEntryFields = <A, I>(payloadSchema: Schema.Codec<A, I>) => ({
  id: Schema.String,
  variant: Variant,
  maybeDuration: Schema.Option(Schema.DurationFromMillis),
  pendingDismissVersion: Schema.Number,
  isHovered: Schema.Boolean,
  swipeState: SwipeState,
  swipeVersion: Schema.Number,
  payload: payloadSchema,
})

/** Schema factory for the fields of a toast entry that a parent supplies
 *  with `Added`. Toast creates the entry's Animation instance itself. */
export const makeEntryInput = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  Schema.Struct(makeEntryFields(payloadSchema))

/** Schema factory for a single toast entry. `payloadSchema` is user-provided
 *  and defines the shape of per-entry content, whatever the consumer wants
 *  to encode. The Toast Block itself owns only lifecycle + a11y fields: `id`,
 *  `variant` (for ARIA role), `animation` (the entry's Animation instance),
 *  `maybeDuration`, `pendingDismissVersion` (for cancellable auto-dismiss),
 *  `isHovered` (for pause-on-hover), and `swipeState` + `swipeVersion` (for
 *  the opt-in swipe gesture). */
export const makeEntry = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  Schema.Struct({
    ...makeEntryFields(payloadSchema),
    animation: Animation,
  })

// MODEL

/**
 * Schema factory for the Toast container's state. `nextEntryKey` generates
 * unique entry IDs from the Model: each `RequestedShow` creates the entry
 * `<id>-entry-<nextEntryKey>` and advances the key.
 */
export const makeModel = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  Schema.Struct({
    id: Schema.String,
    defaultDuration: Schema.DurationFromMillis,
    entries: Schema.Array(makeEntry(payloadSchema)),
    nextEntryKey: Schema.Number,
    maybeSwipeConfig: Schema.Option(SwipeConfig),
  })

// MESSAGE

/** Payload-independent Message variants shared by every Toast Block. */
export const Message = defineMessageUnion({
  RequestedDismiss: { entryId: Schema.String },
  RequestedDismissAll: {},
  Dismissed: { entryId: Schema.String },
  CompletedWaitBeforeDismissal: {
    entryId: Schema.String,
    version: Schema.Number,
  },
  HoveredEntry: { entryId: Schema.String },
  LeftEntry: { entryId: Schema.String },
  PressedEntryPointer: {
    entryId: Schema.String,
    pointerId: Schema.Number,
    clientX: Schema.Number,
  },
  MovedSwipePointer: { pointerId: Schema.Number, clientX: Schema.Number },
  ReleasedSwipePointer: { pointerId: Schema.Number, clientX: Schema.Number },
  CancelledSwipe: { pointerId: Schema.Number },
  PressedEscape: {},
  CompletedWaitForSwipeSettled: {
    entryId: Schema.String,
    version: Schema.Number,
  },
})
export type Message = typeof Message.Type

export type Dismissed = typeof Message.Dismissed.Type
export type RequestedDismiss = typeof Message.RequestedDismiss.Type
export type RequestedDismissAll = typeof Message.RequestedDismissAll.Type
export type CompletedWaitBeforeDismissal =
  typeof Message.CompletedWaitBeforeDismissal.Type
export type HoveredEntry = typeof Message.HoveredEntry.Type
export type LeftEntry = typeof Message.LeftEntry.Type
export type PressedEntryPointer = typeof Message.PressedEntryPointer.Type
export type MovedSwipePointer = typeof Message.MovedSwipePointer.Type
export type ReleasedSwipePointer = typeof Message.ReleasedSwipePointer.Type
export type CancelledSwipe = typeof Message.CancelledSwipe.Type
export type PressedEscape = typeof Message.PressedEscape.Type
export type CompletedWaitForSwipeSettled =
  typeof Message.CompletedWaitForSwipeSettled.Type

/** Factory for the union of all Messages the Toast Block can produce. */
export const makeMessage = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  defineMessageUnion({
    RequestedShow: {
      payload: payloadSchema,
      variant: Variant,
      maybeDuration: Schema.Option(Schema.DurationFromMillis),
      isSticky: Schema.Boolean,
    },
    Added: { entry: makeEntryInput(payloadSchema) },
    RequestedDismiss: { entryId: Schema.String },
    RequestedDismissAll: {},
    Dismissed: { entryId: Schema.String },
    CompletedWaitBeforeDismissal: {
      entryId: Schema.String,
      version: Schema.Number,
    },
    HoveredEntry: { entryId: Schema.String },
    LeftEntry: { entryId: Schema.String },
    PressedEntryPointer: {
      entryId: Schema.String,
      pointerId: Schema.Number,
      clientX: Schema.Number,
    },
    MovedSwipePointer: { pointerId: Schema.Number, clientX: Schema.Number },
    ReleasedSwipePointer: { pointerId: Schema.Number, clientX: Schema.Number },
    CancelledSwipe: { pointerId: Schema.Number },
    PressedEscape: {},
    CompletedWaitForSwipeSettled: {
      entryId: Schema.String,
      version: Schema.Number,
    },
  })

/** Factory for the union of OutMessages the Toast Block can produce. */
export const makeOutMessage = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  defineMessageUnion({ DismissedToast: { payload: payloadSchema } })

// INIT

/** Opt-in configuration for swipe-to-dismiss. Without `swipeToDismiss`,
 *  the view attaches no pointer handler and swipe Messages do nothing.
 *  Pass `{}` for the default rightward swipe, `{ threshold }` to change
 *  the distance, or `{ direction: 'Left' }` to swipe left. */
export type SwipeToDismissConfig = Readonly<{
  threshold?: number
  direction?: SwipeDirection
}>

/**
 * Constructor args for a Toast instance. `id` is the DOM id of the container
 * and prefixes entry ids. `defaultDuration` applies to `RequestedShow`
 * Messages without a duration, unless `isSticky` disables auto-dismissal.
 * Accepts any Effect Duration input; bare numbers are milliseconds.
 */
export type InitConfig = Readonly<{
  id: string
  defaultDuration?: Duration.Input
  swipeToDismiss?: SwipeToDismissConfig
}>

export const DEFAULT_DURATION = Duration.seconds(4)

import { Duration, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import * as Animation from '../animation/schema.js'

// VARIANT

/** Semantic category of a toast. Drives the default ARIA role: `status` for
 *  `Info` / `Success`, `alert` for `Warning` / `Error`. Also surfaced as
 *  `data-variant` on each entry for per-variant CSS. This is the only
 *  content-adjacent field the component owns. The rest of the entry's
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

// ENTRY

/** Schema factory for a single toast entry. `payloadSchema` is user-provided
 *  and defines the shape of per-entry content, whatever the consumer wants
 *  to encode. The component itself owns only lifecycle + a11y fields: `id`,
 *  `variant` (for ARIA role), `animation`, `maybeDuration`,
 *  `pendingDismissVersion` (for cancellable auto-dismiss), and `isHovered`
 *  (for pause-on-hover). */
export const makeEntry = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  Schema.Struct({
    id: Schema.String,
    variant: Variant,
    animation: Animation.Model,
    maybeDuration: Schema.Option(Schema.DurationFromMillis),
    pendingDismissVersion: Schema.Number,
    isHovered: Schema.Boolean,
    payload: payloadSchema,
  })

// SWIPE

/** Tracks the active swipe gesture. Only one toast can be swiped at a time.
 *  `Settling` is the released-but-not-yet-resting phase: it retains the
 *  entry's final offset so the view keeps rendering it after the pointer
 *  is gone. A release past the threshold settles into the leave
 *  animation with the offset held; a release below the threshold (or a
 *  cancel) settles back toward zero while consumer CSS animates the
 *  snap-back behind `data-swipe="settling"`. */
export const SwipeState = defineTaggedUnion({
  Idle: {},
  Dragging: {
    entryId: Schema.String,
    startX: Schema.Number,
    currentX: Schema.Number,
  },
  Settling: {
    entryId: Schema.String,
    offsetX: Schema.Number,
  },
})
export type SwipeState = typeof SwipeState.Type

export const DEFAULT_SWIPE_THRESHOLD = 80

/** How long the view holds `data-swipe="settling"` after a cancelled
 *  swipe so consumer CSS can animate the snap-back. Match a custom
 *  `transition` on `[data-swipe="settling"]` to this duration. */
export const SWIPE_SETTLE_DURATION = Duration.millis(150)

// MODEL

/** Schema factory for the toast container's state. `nextEntryKey` is a
 *  monotonic counter used to generate unique entry IDs purely from Model
 *  state. Thread the updated model through successive `show()` calls.
 *  Calling `show()` twice against the same pre-update model in the same tick
 *  will produce duplicate entry IDs. */
export const makeModel = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  Schema.Struct({
    id: Schema.String,
    defaultDuration: Schema.DurationFromMillis,
    entries: Schema.Array(makeEntry(payloadSchema)),
    nextEntryKey: Schema.Number,
    swipeState: SwipeState,
    maybeSwipeThreshold: Schema.Option(Schema.Number),
    swipeVersion: Schema.Number,
  })

// MESSAGE

/** Payload-independent Message variants shared by every bound Toast module. */
export const Message = defineMessageUnion({
  Dismissed: { entryId: Schema.String },
  DismissedAll: {},
  CompletedWaitBeforeDismissal: {
    entryId: Schema.String,
    version: Schema.Number,
  },
  HoveredEntry: { entryId: Schema.String },
  LeftEntry: { entryId: Schema.String },
  GotAnimationMessage: {
    entryId: Schema.String,
    message: Animation.Message,
  },
  PressedEntryPointer: { entryId: Schema.String, clientX: Schema.Number },
  MovedSwipePointer: { clientX: Schema.Number },
  ReleasedSwipePointer: { clientX: Schema.Number },
  CancelledSwipe: {},
  CompletedWaitForSwipeSettled: {
    entryId: Schema.String,
    version: Schema.Number,
  },
})

export type Dismissed = typeof Message.Dismissed.Type
export type DismissedAll = typeof Message.DismissedAll.Type
export type CompletedWaitBeforeDismissal =
  typeof Message.CompletedWaitBeforeDismissal.Type
export type HoveredEntry = typeof Message.HoveredEntry.Type
export type LeftEntry = typeof Message.LeftEntry.Type
export type GotAnimationMessage = typeof Message.GotAnimationMessage.Type
export type PressedEntryPointer = typeof Message.PressedEntryPointer.Type
export type MovedSwipePointer = typeof Message.MovedSwipePointer.Type
export type ReleasedSwipePointer = typeof Message.ReleasedSwipePointer.Type
export type CancelledSwipe = typeof Message.CancelledSwipe.Type
export type CompletedWaitForSwipeSettled =
  typeof Message.CompletedWaitForSwipeSettled.Type

/** Factory for the union of all messages the toast component can produce. */
export const makeMessage = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  defineMessageUnion({
    Added: { entry: makeEntry(payloadSchema) },
    Dismissed: { entryId: Schema.String },
    DismissedAll: {},
    CompletedWaitBeforeDismissal: {
      entryId: Schema.String,
      version: Schema.Number,
    },
    HoveredEntry: { entryId: Schema.String },
    LeftEntry: { entryId: Schema.String },
    GotAnimationMessage: {
      entryId: Schema.String,
      message: Animation.Message,
    },
    PressedEntryPointer: { entryId: Schema.String, clientX: Schema.Number },
    MovedSwipePointer: { clientX: Schema.Number },
    ReleasedSwipePointer: { clientX: Schema.Number },
    CancelledSwipe: {},
    CompletedWaitForSwipeSettled: {
      entryId: Schema.String,
      version: Schema.Number,
    },
  })

/** Factory for the union of out-messages the toast component can produce. */
export const makeOutMessage = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  defineMessageUnion({ DismissedToast: { payload: payloadSchema } })

// INIT

/** Opt-in configuration for the swipe-to-dismiss gesture. Omit
 *  `swipeToDismiss` from `InitConfig` to leave swipe disabled: the view
 *  attaches no pointer handler and the gesture Messages are no-ops, so a
 *  Toast without wired subscriptions can never get stuck mid-drag. Pass
 *  `{}` for the default threshold or `{ threshold }` to tune how far in
 *  pixels the pointer must travel before a release dismisses the entry. */
export type SwipeToDismissConfig = Readonly<{
  threshold?: number
}>

/** Configuration for creating a toast container model. `defaultDuration` is
 *  applied to any `show()` call that doesn't provide its own `duration` or
 *  pass `sticky: true`. Accepts any Effect Duration input; a bare number is
 *  interpreted as milliseconds. */
export type InitConfig = Readonly<{
  id: string
  defaultDuration?: Duration.Input
  swipeToDismiss?: SwipeToDismissConfig
}>

export const DEFAULT_DURATION = Duration.seconds(4)

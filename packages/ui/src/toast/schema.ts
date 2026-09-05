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

/** Tracks the active swipe gesture. Only one toast can be swiped at a time. */
export const SwipeState = defineTaggedUnion({
  Idle: {},
  Dragging: {
    entryId: Schema.String,
    startX: Schema.Number,
    currentX: Schema.Number,
  },
})
export type SwipeState = typeof SwipeState.Type

export const DEFAULT_SWIPE_THRESHOLD = 80

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
    swipeThreshold: Schema.Number,
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
  })

/** Factory for the union of out-messages the toast component can produce. */
export const makeOutMessage = <A, I>(payloadSchema: Schema.Codec<A, I>) =>
  defineMessageUnion({ DismissedToast: { payload: payloadSchema } })

// INIT

/** Configuration for creating a toast container model. `defaultDuration` is
 *  applied to any `show()` call that doesn't provide its own `duration` or
 *  pass `sticky: true`. Accepts any Effect Duration input; a bare number is
 *  interpreted as milliseconds. */
export type InitConfig = Readonly<{
  id: string
  defaultDuration?: Duration.Input
  swipeThreshold?: number
}>

export const DEFAULT_DURATION = Duration.seconds(4)

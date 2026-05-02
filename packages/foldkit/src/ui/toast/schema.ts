import { Duration, Schema as S } from 'effect'

import { m } from '../../message/index.js'
import {
  Message as AnimationMessage,
  Model as AnimationModel,
} from '../animation/schema.js'

// VARIANT

/** Semantic category of a toast. Drives the default ARIA role: `status` for
 *  `Info` / `Success`, `alert` for `Warning` / `Error`. Also surfaced as
 *  `data-variant` on each entry for per-variant CSS. This is the only
 *  content-adjacent field the component owns — the rest of the entry's
 *  content lives in the user-provided payload. */
export const Variant = S.Literals(['Info', 'Success', 'Warning', 'Error'])
export type Variant = typeof Variant.Type

// POSITION

/** Where the toast viewport is anchored on the screen and how entries stack. */
export const Position = S.Literals([
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
 *  and defines the shape of per-entry content — whatever the consumer wants
 *  to encode. The component itself owns only lifecycle + a11y fields: `id`,
 *  `variant` (for ARIA role), `animation`, `maybeDuration`,
 *  `pendingDismissVersion` (for cancellable auto-dismiss), and `isHovered`
 *  (for pause-on-hover). */
export const makeEntry = <A, I>(payloadSchema: S.Codec<A, I>) =>
  S.Struct({
    id: S.String,
    variant: Variant,
    animation: AnimationModel,
    maybeDuration: S.Option(S.DurationFromMillis),
    pendingDismissVersion: S.Number,
    isHovered: S.Boolean,
    payload: payloadSchema,
  })

// MODEL

/** Schema factory for the toast container's state. `nextEntryKey` is a
 *  monotonic counter used to generate unique entry IDs purely from Model
 *  state. Thread the updated model through successive `show()` calls —
 *  calling `show()` twice against the same pre-update model in the same tick
 *  will produce duplicate entry IDs. */
export const makeModel = <A, I>(payloadSchema: S.Codec<A, I>) =>
  S.Struct({
    id: S.String,
    defaultDuration: S.DurationFromMillis,
    entries: S.Array(makeEntry(payloadSchema)),
    nextEntryKey: S.Number,
  })

// MESSAGE

/** Sent when an entry should begin dismissing. Starts the leave animation;
 *  the entry is removed from the stack when `TransitionedOut` fires. */
export const Dismissed = m('Dismissed', { entryId: S.String })
/** Sent when every currently-visible entry should begin dismissing. */
export const DismissedAll = m('DismissedAll')
/** Sent when an entry's auto-dismiss timer fires. Carries a version echoed
 *  from the scheduling moment so stale timers (from hover or manual dismiss)
 *  are discarded. */
export const ElapsedDuration = m('ElapsedDuration', {
  entryId: S.String,
  version: S.Number,
})
/** Sent when the pointer enters an entry. Pauses the auto-dismiss timer by
 *  advancing the entry's version. */
export const HoveredEntry = m('HoveredEntry', { entryId: S.String })
/** Sent when the pointer leaves an entry. Restarts the auto-dismiss timer
 *  with the entry's full duration. */
export const LeftEntry = m('LeftEntry', { entryId: S.String })
/** Wraps a single entry's Animation submodel message for delegation. */
export const GotAnimationMessage = m('GotAnimationMessage', {
  entryId: S.String,
  message: AnimationMessage,
})

export type Dismissed = typeof Dismissed.Type
export type DismissedAll = typeof DismissedAll.Type
export type ElapsedDuration = typeof ElapsedDuration.Type
export type HoveredEntry = typeof HoveredEntry.Type
export type LeftEntry = typeof LeftEntry.Type
export type GotAnimationMessage = typeof GotAnimationMessage.Type

/** Factory for the `Added` message, which carries a fully-constructed entry
 *  whose shape depends on the user-provided payload. */
export const makeAdded = <A, I>(payloadSchema: S.Codec<A, I>) =>
  m('Added', { entry: makeEntry(payloadSchema) })

/** Factory for the union of all messages the toast component can produce. */
export const makeMessage = <A, I>(payloadSchema: S.Codec<A, I>) =>
  S.Union([
    makeAdded(payloadSchema),
    Dismissed,
    DismissedAll,
    ElapsedDuration,
    HoveredEntry,
    LeftEntry,
    GotAnimationMessage,
  ])

// INIT

/** Configuration for creating a toast container model. `defaultDuration` is
 *  applied to any `show()` call that doesn't provide its own `duration` or
 *  pass `sticky: true`. Accepts any Effect Duration input; a bare number is
 *  interpreted as milliseconds. */
export type InitConfig = Readonly<{
  id: string
  defaultDuration?: Duration.Input
}>

export const DEFAULT_DURATION = Duration.seconds(4)

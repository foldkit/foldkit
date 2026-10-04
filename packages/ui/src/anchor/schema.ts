import { Schema } from 'effect'

/** Schema mirroring `@floating-ui/dom`'s `Placement` literal union: a side
 *  (`top`/`right`/`bottom`/`left`) optionally suffixed with `-start` or `-end`. */
export const Placement = Schema.Literals([
  'top',
  'right',
  'bottom',
  'left',
  'top-start',
  'top-end',
  'right-start',
  'right-end',
  'bottom-start',
  'bottom-end',
  'left-start',
  'left-end',
])

export type Placement = typeof Placement.Type

/** Schema mirroring `@floating-ui/dom`'s `Padding` type: a uniform number or a
 *  partial per-side object (`top`/`right`/`bottom`/`left`). */
export const Padding = Schema.Union([
  Schema.Number,
  Schema.Struct({
    top: Schema.optionalKey(Schema.Number),
    right: Schema.optionalKey(Schema.Number),
    bottom: Schema.optionalKey(Schema.Number),
    left: Schema.optionalKey(Schema.Number),
  }),
])

export type Padding = typeof Padding.Type

/** Static configuration for anchor-based positioning of a floating element relative to a button. */
export const AnchorConfig = Schema.Struct({
  placement: Schema.optional(Placement),
  gap: Schema.optional(Schema.Number),
  offset: Schema.optional(Schema.Number),
  padding: Schema.optional(Padding),
  portal: Schema.optional(Schema.Boolean),
  isPlacementLocked: Schema.optional(Schema.Boolean),
})

export type AnchorConfig = typeof AnchorConfig.Type

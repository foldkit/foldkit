import { Schema } from 'effect'

/** A window scroll offset in CSS pixels, as `window.scrollX` and
 *  `window.scrollY` report it. */
export const ScrollPosition = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
})
/** A window scroll offset in CSS pixels, as `window.scrollX` and
 *  `window.scrollY` report it. */
export type ScrollPosition = typeof ScrollPosition.Type

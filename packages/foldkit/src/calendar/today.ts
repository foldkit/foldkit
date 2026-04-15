import { Clock, Effect } from 'effect'

import {
  type CalendarDate,
  fromDateInZone,
  fromDateLocal,
} from './calendarDate'

/**
 * Effect-based accessors for the current calendar date. Uses Effect's `Clock`
 * service under the hood, so tests can freeze time with `TestClock` and
 * production uses the real system clock.
 *
 * This is the **only** impurity boundary in the calendar module — every
 * other function in this module is referentially transparent.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { Effect } from 'effect'
 *
 * const program = Effect.gen(function* () {
 *   const today = yield* Calendar.today.local
 *   const nycToday = yield* Calendar.today.inZone('America/New_York')
 *   return { today, nycToday }
 * })
 * ```
 */
export const today = {
  /**
   * The current calendar date in the browser's local timezone.
   */
  local: Effect.map(
    Clock.currentTimeMillis,
    (millis): CalendarDate => fromDateLocal(new Date(millis)),
  ),

  /**
   * The current calendar date in a specific IANA timezone
   * (e.g. `"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`).
   */
  inZone: (timeZone: string) =>
    Effect.map(
      Clock.currentTimeMillis,
      (millis): CalendarDate => fromDateInZone(new Date(millis), timeZone),
    ),
}

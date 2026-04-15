import { Function, Schema as S } from 'effect'

import { addDays, subtractDays } from './arithmetic'
import { type CalendarDate, daysInMonth, unsafeMake } from './calendarDate'

/**
 * Schema for days of the week, Sunday through Saturday. Tagged union preferred
 * over 0-6 numeric indices to avoid magic numbers at call sites.
 */
export const DayOfWeek = S.Literal(
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
)

export type DayOfWeek = typeof DayOfWeek.Type

const dayOfWeekFromIndex = (index: number): DayOfWeek => {
  if (index === 0) return 'Sunday'
  if (index === 1) return 'Monday'
  if (index === 2) return 'Tuesday'
  if (index === 3) return 'Wednesday'
  if (index === 4) return 'Thursday'
  if (index === 5) return 'Friday'
  return 'Saturday'
}

const dayOfWeekToIndex = (day: DayOfWeek): number => {
  if (day === 'Sunday') return 0
  if (day === 'Monday') return 1
  if (day === 'Tuesday') return 2
  if (day === 'Wednesday') return 3
  if (day === 'Thursday') return 4
  if (day === 'Friday') return 5
  return 6
}

// NOTE: Sakamoto's algorithm for day-of-week. The offsets array is a
// precomputed lookup table that makes the formula branch-free.
// See https://en.wikipedia.org/wiki/Determination_of_the_day_of_the_week#Sakamoto's_methods
const sakamotoOffsets: ReadonlyArray<number> = [
  0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4,
]

/**
 * Returns the day of the week for a calendar date.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.dayOfWeek(Calendar.make(2026, 1, 1)) // "Thursday"
 * Calendar.dayOfWeek(Calendar.make(2000, 1, 1)) // "Saturday"
 * ```
 */
export const dayOfWeek = (self: CalendarDate): DayOfWeek => {
  const adjustedYear = self.month < 3 ? self.year - 1 : self.year
  const offset = sakamotoOffsets[self.month - 1] ?? 0
  // The `+ 7) % 7` trick handles negative results from the modulo operation
  // on negative years — JS `%` preserves sign, so we wrap back into [0, 6].
  const index =
    (((adjustedYear +
      Math.floor(adjustedYear / 4) -
      Math.floor(adjustedYear / 100) +
      Math.floor(adjustedYear / 400) +
      offset +
      self.day) %
      7) +
      7) %
    7
  return dayOfWeekFromIndex(index)
}

/**
 * Returns the first day of the month containing `self`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.firstOfMonth(Calendar.make(2026, 4, 13))
 * // { year: 2026, month: 4, day: 1 }
 * ```
 */
export const firstOfMonth = (self: CalendarDate): CalendarDate =>
  unsafeMake(self.year, self.month, 1)

/**
 * Returns the last day of the month containing `self`. Leap-year aware
 * for February.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.lastOfMonth(Calendar.make(2024, 2, 10))
 * // { year: 2024, month: 2, day: 29 } — leap year
 *
 * Calendar.lastOfMonth(Calendar.make(2026, 2, 10))
 * // { year: 2026, month: 2, day: 28 }
 * ```
 */
export const lastOfMonth = (self: CalendarDate): CalendarDate =>
  unsafeMake(self.year, self.month, daysInMonth(self.year, self.month))

/**
 * Returns the start-of-week date for the week containing `self`, where
 * `firstDayOfWeek` specifies which day begins the week. Returns `self`
 * itself when it already falls on `firstDayOfWeek`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.startOfWeek(Calendar.make(2026, 4, 15), 'Sunday')
 * // The Sunday that begins the week containing April 15, 2026
 *
 * pipe(Calendar.make(2026, 4, 15), Calendar.startOfWeek('Monday'))
 * ```
 */
export const startOfWeek: {
  (firstDayOfWeek: DayOfWeek): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, firstDayOfWeek: DayOfWeek): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, firstDayOfWeek: DayOfWeek): CalendarDate => {
    const startIndex = dayOfWeekToIndex(firstDayOfWeek)
    const dateIndex = dayOfWeekToIndex(dayOfWeek(self))
    const offset = (dateIndex - startIndex + 7) % 7
    return subtractDays(self, offset)
  },
)

/**
 * Returns the end-of-week date — six days after the start of the week.
 */
export const endOfWeek: {
  (firstDayOfWeek: DayOfWeek): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, firstDayOfWeek: DayOfWeek): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, firstDayOfWeek: DayOfWeek): CalendarDate =>
    addDays(startOfWeek(self, firstDayOfWeek), 6),
)

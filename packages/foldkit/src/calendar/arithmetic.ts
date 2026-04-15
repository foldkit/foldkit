import { Function } from 'effect'

import { type CalendarDate, daysInMonth, unsafeMake } from './calendarDate'

// NOTE: Rata Die conversion uses Howard Hinnant's algorithm, which correctly
// handles all Gregorian dates including century and quadricentennial leap-year
// boundaries. Treat `toRataDie`/`fromRataDie` as mathematical primitives —
// their correctness is verified by the test suite, not by reading the formulas.
// See http://howardhinnant.github.io/date_algorithms.html

const MONTHS_PER_YEAR = 12
const DAYS_PER_YEAR = 365

// NOTE: Gregorian era constants for Howard Hinnant's Rata Die algorithm.
// `YEARS_PER_ERA` is the length of the full Gregorian leap-year cycle.
// `DAYS_PER_ERA` is the exact day count over that cycle (400 × 365.2425).
// `EPOCH_DAY_OFFSET` aligns the Rata Die ordinal with 1970-01-01 = 0.
const YEARS_PER_ERA = 400
const DAYS_PER_ERA = 146097
const EPOCH_DAY_OFFSET = 719468

const toRataDie = (date: CalendarDate): number => {
  const { year, month, day } = date
  const adjustedYear = month <= 2 ? year - 1 : year
  const era = Math.floor(adjustedYear / YEARS_PER_ERA)
  const yearOfEra = adjustedYear - era * YEARS_PER_ERA
  const dayOfYear =
    Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1
  const dayOfEra =
    yearOfEra * DAYS_PER_YEAR +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear
  return era * DAYS_PER_ERA + dayOfEra - EPOCH_DAY_OFFSET
}

const fromRataDie = (rataDie: number): CalendarDate => {
  const shifted = rataDie + EPOCH_DAY_OFFSET
  const era = Math.floor(shifted / DAYS_PER_ERA)
  const dayOfEra = shifted - era * DAYS_PER_ERA
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      DAYS_PER_YEAR,
  )
  const year = yearOfEra + era * YEARS_PER_ERA
  const dayOfYear =
    dayOfEra -
    (DAYS_PER_YEAR * yearOfEra +
      Math.floor(yearOfEra / 4) -
      Math.floor(yearOfEra / 100))
  const monthAdjusted = Math.floor((5 * dayOfYear + 2) / 153)
  const month = monthAdjusted < 10 ? monthAdjusted + 3 : monthAdjusted - 9
  const day = dayOfYear - Math.floor((153 * monthAdjusted + 2) / 5) + 1
  return unsafeMake(month <= 2 ? year + 1 : year, month, day)
}

/**
 * Adds `n` days to a calendar date. Negative `n` subtracts days.
 * Handles month and year rollovers correctly in both directions.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.addDays(Calendar.make(2026, 4, 13), 5)
 * // { year: 2026, month: 4, day: 18 }
 *
 * pipe(Calendar.make(2026, 4, 30), Calendar.addDays(1))
 * // { year: 2026, month: 5, day: 1 }
 * ```
 */
export const addDays: {
  (n: number): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, n: number): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, n: number): CalendarDate =>
    n === 0 ? self : fromRataDie(toRataDie(self) + n),
)

/**
 * Subtracts `n` days from a calendar date. Equivalent to `addDays(self, -n)`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.subtractDays(Calendar.make(2026, 5, 1), 1)
 * // { year: 2026, month: 4, day: 30 }
 *
 * pipe(Calendar.make(2026, 1, 1), Calendar.subtractDays(1))
 * // { year: 2025, month: 12, day: 31 }
 * ```
 */
export const subtractDays: {
  (n: number): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, n: number): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, n: number): CalendarDate => addDays(self, -n),
)

/**
 * Adds `n` months to a calendar date. Negative `n` subtracts months.
 *
 * Clamps the day to the last valid day of the resulting month when the
 * original day would exceed it. So `addMonths(make(2026, 1, 31), 1)` returns
 * February 28, 2026 (not March 3).
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.addMonths(Calendar.make(2026, 4, 13), 3)
 * // { year: 2026, month: 7, day: 13 }
 *
 * pipe(Calendar.make(2026, 1, 31), Calendar.addMonths(1))
 * // { year: 2026, month: 2, day: 28 } — clamped from 31
 * ```
 */
export const addMonths: {
  (n: number): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, n: number): CalendarDate
} = Function.dual(2, (self: CalendarDate, n: number): CalendarDate => {
  const totalMonthsFromZero = self.year * MONTHS_PER_YEAR + (self.month - 1) + n
  const newYear = Math.floor(totalMonthsFromZero / MONTHS_PER_YEAR)
  const newMonth =
    (((totalMonthsFromZero % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) %
      MONTHS_PER_YEAR) +
    1
  const newDay = Math.min(self.day, daysInMonth(newYear, newMonth))
  return unsafeMake(newYear, newMonth, newDay)
})

/**
 * Subtracts `n` months from a calendar date. Equivalent to `addMonths(self, -n)`.
 */
export const subtractMonths: {
  (n: number): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, n: number): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, n: number): CalendarDate => addMonths(self, -n),
)

/**
 * Adds `n` years to a calendar date. Handles leap-year edge cases by clamping
 * day-of-month when the target year's month is shorter (February 29 in a
 * leap year + 1 year = February 28).
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.addYears(Calendar.make(2024, 2, 29), 1)
 * // { year: 2025, month: 2, day: 28 } — clamped
 *
 * pipe(Calendar.make(2026, 4, 13), Calendar.addYears(5))
 * // { year: 2031, month: 4, day: 13 }
 * ```
 */
export const addYears: {
  (n: number): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, n: number): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, n: number): CalendarDate =>
    addMonths(self, n * MONTHS_PER_YEAR),
)

/**
 * Subtracts `n` years from a calendar date. Equivalent to `addYears(self, -n)`.
 */
export const subtractYears: {
  (n: number): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, n: number): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, n: number): CalendarDate => addYears(self, -n),
)

/**
 * Returns the number of days from `self` until `end`, positive when `end` is
 * after `self`, negative when before, zero when equal. Matches `Temporal.PlainDate.until`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * const today = Calendar.make(2026, 4, 13)
 * const birthday = Calendar.make(2026, 7, 15)
 *
 * Calendar.daysUntil(today, birthday) // 93
 * pipe(today, Calendar.daysUntil(birthday)) // 93
 * ```
 */
export const daysUntil: {
  (end: CalendarDate): (self: CalendarDate) => number
  (self: CalendarDate, end: CalendarDate): number
} = Function.dual(
  2,
  (self: CalendarDate, end: CalendarDate): number =>
    toRataDie(end) - toRataDie(self),
)

/**
 * Returns the number of days from `start` until `self`, positive when `self`
 * is after `start`, negative when before, zero when equal. Matches
 * `Temporal.PlainDate.since`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * const today = Calendar.make(2026, 4, 13)
 * const startOfYear = Calendar.make(2026, 1, 1)
 *
 * Calendar.daysSince(today, startOfYear) // 102
 * pipe(today, Calendar.daysSince(startOfYear)) // 102
 * ```
 */
export const daysSince: {
  (start: CalendarDate): (self: CalendarDate) => number
  (self: CalendarDate, start: CalendarDate): number
} = Function.dual(
  2,
  (self: CalendarDate, start: CalendarDate): number =>
    toRataDie(self) - toRataDie(start),
)

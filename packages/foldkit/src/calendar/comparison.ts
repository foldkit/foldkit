import {
  type Equivalence as Equivalence_,
  Function,
  Order as Order_,
} from 'effect'

import type { CalendarDate } from './calendarDate.js'

/**
 * Total ordering over calendar dates. Uses lexicographic comparison on
 * `year`, then `month`, then `day` — which matches calendar chronology
 * because the struct fields are already in the right order.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { Array } from 'effect'
 *
 * const dates = [
 *   Calendar.make(2026, 5, 1),
 *   Calendar.make(2026, 4, 30),
 *   Calendar.make(2026, 4, 13),
 * ]
 * Array.sort(dates, Calendar.Order)
 * ```
 */
export const Order: Order_.Order<CalendarDate> = Order_.Struct({
  year: Order_.Number,
  month: Order_.Number,
  day: Order_.Number,
})

/**
 * Value-based equivalence for calendar dates.
 */
export const Equivalence: Equivalence_.Equivalence<CalendarDate> = (a, b) =>
  a.year === b.year && a.month === b.month && a.day === b.day

/**
 * Returns `true` when two calendar dates represent the same day.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.isEqual(Calendar.make(2026, 4, 13), Calendar.make(2026, 4, 13)) // true
 * pipe(Calendar.make(2026, 4, 13), Calendar.isEqual(Calendar.make(2026, 4, 14))) // false
 * ```
 */
export const isEqual: {
  (that: CalendarDate): (self: CalendarDate) => boolean
  (self: CalendarDate, that: CalendarDate): boolean
} = Function.dual(2, (self: CalendarDate, that: CalendarDate): boolean =>
  Equivalence(self, that),
)

/**
 * Returns `true` when `self` is strictly before `that`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.isBefore(Calendar.make(2026, 4, 12), Calendar.make(2026, 4, 13)) // true
 * pipe(Calendar.make(2026, 4, 14), Calendar.isBefore(Calendar.make(2026, 4, 13))) // false
 * ```
 */
export const isBefore: {
  (that: CalendarDate): (self: CalendarDate) => boolean
  (self: CalendarDate, that: CalendarDate): boolean
} = Function.dual(
  2,
  (self: CalendarDate, that: CalendarDate): boolean => Order(self, that) < 0,
)

/**
 * Returns `true` when `self` is strictly after `that`.
 */
export const isAfter: {
  (that: CalendarDate): (self: CalendarDate) => boolean
  (self: CalendarDate, that: CalendarDate): boolean
} = Function.dual(
  2,
  (self: CalendarDate, that: CalendarDate): boolean => Order(self, that) > 0,
)

/**
 * Returns `true` when `self` is before or equal to `that`.
 */
export const isBeforeOrEqual: {
  (that: CalendarDate): (self: CalendarDate) => boolean
  (self: CalendarDate, that: CalendarDate): boolean
} = Function.dual(
  2,
  (self: CalendarDate, that: CalendarDate): boolean => Order(self, that) <= 0,
)

/**
 * Returns `true` when `self` is after or equal to `that`.
 */
export const isAfterOrEqual: {
  (that: CalendarDate): (self: CalendarDate) => boolean
  (self: CalendarDate, that: CalendarDate): boolean
} = Function.dual(
  2,
  (self: CalendarDate, that: CalendarDate): boolean => Order(self, that) >= 0,
)

/**
 * Returns the earlier of two calendar dates.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.min(Calendar.make(2026, 4, 13), Calendar.make(2026, 4, 14))
 * // { year: 2026, month: 4, day: 13 }
 *
 * pipe(Calendar.make(2026, 4, 14), Calendar.min(Calendar.make(2026, 4, 13)))
 * // { year: 2026, month: 4, day: 13 }
 * ```
 */
export const min: {
  (that: CalendarDate): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, that: CalendarDate): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, that: CalendarDate): CalendarDate =>
    Order(self, that) <= 0 ? self : that,
)

/**
 * Returns the later of two calendar dates.
 */
export const max: {
  (that: CalendarDate): (self: CalendarDate) => CalendarDate
  (self: CalendarDate, that: CalendarDate): CalendarDate
} = Function.dual(
  2,
  (self: CalendarDate, that: CalendarDate): CalendarDate =>
    Order(self, that) >= 0 ? self : that,
)

/**
 * Returns `true` when `self` is within the inclusive range `[minimum, maximum]`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.between(Calendar.make(2026, 4, 13), {
 *   minimum: Calendar.make(2026, 1, 1),
 *   maximum: Calendar.make(2026, 12, 31),
 * }) // true
 *
 * pipe(
 *   Calendar.make(2026, 4, 13),
 *   Calendar.between({
 *     minimum: Calendar.make(2027, 1, 1),
 *     maximum: Calendar.make(2027, 12, 31),
 *   }),
 * ) // false
 * ```
 */
export const between: {
  (options: {
    readonly minimum: CalendarDate
    readonly maximum: CalendarDate
  }): (self: CalendarDate) => boolean
  (
    self: CalendarDate,
    options: {
      readonly minimum: CalendarDate
      readonly maximum: CalendarDate
    },
  ): boolean
} = Function.dual(
  2,
  (
    self: CalendarDate,
    options: {
      readonly minimum: CalendarDate
      readonly maximum: CalendarDate
    },
  ): boolean =>
    Order(self, options.minimum) >= 0 && Order(self, options.maximum) <= 0,
)

/**
 * Clamps `self` to the inclusive range `[minimum, maximum]`. Returns
 * `minimum` when `self` is before it, `maximum` when `self` is after it,
 * and `self` itself otherwise.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.clamp(Calendar.make(2025, 12, 31), {
 *   minimum: Calendar.make(2026, 1, 1),
 *   maximum: Calendar.make(2026, 12, 31),
 * })
 * // { year: 2026, month: 1, day: 1 }
 * ```
 */
export const clamp: {
  (options: {
    readonly minimum: CalendarDate
    readonly maximum: CalendarDate
  }): (self: CalendarDate) => CalendarDate
  (
    self: CalendarDate,
    options: {
      readonly minimum: CalendarDate
      readonly maximum: CalendarDate
    },
  ): CalendarDate
} = Function.dual(
  2,
  (
    self: CalendarDate,
    options: {
      readonly minimum: CalendarDate
      readonly maximum: CalendarDate
    },
  ): CalendarDate => {
    if (Order(self, options.minimum) < 0) {
      return options.minimum
    }
    if (Order(self, options.maximum) > 0) {
      return options.maximum
    }
    return self
  },
)

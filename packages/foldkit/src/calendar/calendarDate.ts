import {
  Effect,
  Option,
  Schema as S,
  SchemaIssue,
  SchemaTransformation,
} from 'effect'

/**
 * Determines if a year is a leap year in the Gregorian calendar.
 *
 * A year is a leap year if it is divisible by 4, except for century years
 * (divisible by 100) which must also be divisible by 400. So 2000 is a leap
 * year but 1900 is not.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.isLeapYear(2024) // true
 * Calendar.isLeapYear(2026) // false
 * Calendar.isLeapYear(2000) // true (divisible by 400)
 * Calendar.isLeapYear(1900) // false (century, not divisible by 400)
 * ```
 */
export const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

/**
 * Returns the number of days in a given month of a given year.
 * Leap-year-aware: February returns 29 in leap years, 28 otherwise.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.daysInMonth(2026, 1) // 31 (January)
 * Calendar.daysInMonth(2026, 2) // 28 (February, non-leap)
 * Calendar.daysInMonth(2024, 2) // 29 (February, leap)
 * Calendar.daysInMonth(2026, 4) // 30 (April)
 * ```
 */
export const daysInMonth = (year: number, month: number): number => {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30
  }
  return 31
}

/**
 * A calendar date — year, month, day. No time, no timezone.
 *
 * Models the same concept as Java's `LocalDate` or TC39's `Temporal.PlainDate`.
 * Useful when you need to represent a date without a clock attached —
 * birthdays, deadlines, form date inputs, event calendars.
 *
 * Validation ensures the date is a real calendar date: months are 1-12 and
 * days are within the month's actual length. Leap-year-aware, so February 30
 * is rejected and February 29 is only accepted in leap years.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { Schema as S } from 'effect'
 *
 * const date = Calendar.make(2026, 4, 13)
 * S.decodeUnknownSync(Calendar.CalendarDate)({ year: 2026, month: 4, day: 13 })
 * ```
 */
export const CalendarDate = S.Struct({
  year: S.Int,
  month: S.Int.check(S.isBetween({ minimum: 1, maximum: 12 })),
  day: S.Int.check(S.isBetween({ minimum: 1, maximum: 31 })),
}).check(
  S.makeFilter(
    ({ year, month, day }) =>
      day <= daysInMonth(year, month) ? undefined : 'invalid calendar date',
    {
      identifier: 'CalendarDate',
      description:
        'a valid calendar date (year, month 1-12, day within month length)',
    },
  ),
)

export type CalendarDate = typeof CalendarDate.Type

/**
 * Type guard for `CalendarDate`. Returns true when `value` is a valid
 * calendar date struct.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.isCalendarDate({ year: 2026, month: 4, day: 13 }) // true
 * Calendar.isCalendarDate({ year: 2026, month: 2, day: 30 }) // false
 * Calendar.isCalendarDate('2026-04-13') // false
 * ```
 */
export const isCalendarDate: (value: unknown) => value is CalendarDate =
  S.is(CalendarDate)

/**
 * Constructs a `CalendarDate`, validating via Schema.
 * Throws a `ParseError` if the combination is not a real calendar date
 * (e.g. February 30, month 13, day 0).
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * const birthday = Calendar.make(1990, 7, 15)
 * Calendar.make(2024, 2, 29) // OK, 2024 is a leap year
 * Calendar.make(2026, 2, 29) // throws — not a leap year
 * ```
 */
export const make = (year: number, month: number, day: number): CalendarDate =>
  S.decodeUnknownSync(CalendarDate)({ year, month, day })

/**
 * Constructs a `CalendarDate` without Schema validation. Only for inputs the
 * caller knows are valid — typically arithmetic results inside the calendar
 * module. Consumers should prefer `make`.
 */
export const unsafeMake = (
  year: number,
  month: number,
  day: number,
): CalendarDate =>
  CalendarDate.make({ year, month, day }, { disableChecks: true })

/**
 * Constructs a `CalendarDate` from a JavaScript `Date` object, reading the
 * year/month/day in the browser's local timezone.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * const date = Calendar.fromDateLocal(new Date())
 * ```
 */
export const fromDateLocal = (date: Date): CalendarDate =>
  unsafeMake(date.getFullYear(), date.getMonth() + 1, date.getDate())

/**
 * Constructs a `CalendarDate` from a JavaScript `Date` object, reading the
 * year/month/day in a specific IANA timezone (e.g. `"America/New_York"`).
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * const bookingDate = Calendar.fromDateInZone(new Date(), 'America/New_York')
 * ```
 */
export const fromDateInZone = (date: Date, timeZone: string): CalendarDate => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const getPart = (type: string): number => {
    const part = parts.find(candidate => candidate.type === type)
    return part ? Number(part.value) : 0
  }
  return unsafeMake(getPart('year'), getPart('month'), getPart('day'))
}

/**
 * Converts a `CalendarDate` to a JavaScript `Date` object representing
 * midnight at the start of that day in the browser's local timezone.
 *
 * Note: `Date` objects always carry a time and timezone component. This
 * function intentionally pins the time to local midnight. For cross-timezone
 * use, pass the result through an `Intl.DateTimeFormat` with an explicit
 * timezone, or keep working with `CalendarDate`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * const jsDate = Calendar.toDateLocal(Calendar.make(2026, 4, 13))
 * ```
 */
export const toDateLocal = (calendarDate: CalendarDate): Date =>
  new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)

const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Schema transform between an ISO 8601 date string (`YYYY-MM-DD`) and a
 * `CalendarDate`. Useful for form inputs, JSON serialization, URL query
 * parameters, and hidden form input values.
 *
 * Decoding accepts only zero-padded ISO dates. Invalid calendar dates like
 * `2026-02-30` decode the string shape but fail the `CalendarDate` filter.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { Schema as S } from 'effect'
 *
 * const decode = S.decodeUnknownSync(Calendar.CalendarDateFromIsoString)
 * const encode = S.encodeSync(Calendar.CalendarDateFromIsoString)
 *
 * decode('2026-04-13') // { year: 2026, month: 4, day: 13 }
 * encode(Calendar.make(2026, 4, 13)) // "2026-04-13"
 * ```
 */
export const CalendarDateFromIsoString = S.String.pipe(
  S.decodeTo(
    CalendarDate,
    SchemaTransformation.transformOrFail({
      decode: input => {
        const match = input.match(isoPattern)
        if (match === null) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(Option.some(input), {
              description: `Expected ISO date (YYYY-MM-DD), got ${JSON.stringify(input)}`,
            }),
          )
        }
        const [, yearString, monthString, dayString] = match
        return Effect.succeed({
          year: Number(yearString),
          month: Number(monthString),
          day: Number(dayString),
        })
      },
      encode: ({ year, month, day }) =>
        Effect.succeed(
          `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        ),
    }),
  ),
)

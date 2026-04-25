import { Function, Schema as S } from 'effect'

import type { CalendarDate } from './calendarDate.js'
import { DayOfWeek, dayOfWeek } from './info.js'

const twelveStrings = S.Tuple(
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
)

const sevenStrings = S.Tuple(
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
)

/**
 * Locale configuration for rendering calendar dates. Contains only data —
 * month/day names and the first day of the week. Formatting functions
 * (`formatLong`, `formatShort`, `formatAriaLabel`) are separate exports that
 * take a `LocaleConfig` as input.
 *
 * Day names are always stored Sunday-first in the config; `firstDayOfWeek`
 * controls how the view rotates them at render time.
 */
export const LocaleConfig = S.Struct({
  firstDayOfWeek: DayOfWeek,
  monthNames: twelveStrings,
  shortMonthNames: twelveStrings,
  dayNames: sevenStrings,
  shortDayNames: sevenStrings,
})

export type LocaleConfig = typeof LocaleConfig.Type

/**
 * Default English (United States) locale. Picker components default to this
 * when no locale is passed via ViewConfig. Consumers who want a different
 * locale pass their own `LocaleConfig`.
 */
export const defaultEnglishLocale: LocaleConfig = {
  firstDayOfWeek: 'Sunday',
  monthNames: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  shortMonthNames: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  dayNames: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  shortDayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

const pickMonthName = (locale: LocaleConfig, month: number): string => {
  if (month === 1) return locale.monthNames[0]
  if (month === 2) return locale.monthNames[1]
  if (month === 3) return locale.monthNames[2]
  if (month === 4) return locale.monthNames[3]
  if (month === 5) return locale.monthNames[4]
  if (month === 6) return locale.monthNames[5]
  if (month === 7) return locale.monthNames[6]
  if (month === 8) return locale.monthNames[7]
  if (month === 9) return locale.monthNames[8]
  if (month === 10) return locale.monthNames[9]
  if (month === 11) return locale.monthNames[10]
  return locale.monthNames[11]
}

const pickShortMonthName = (locale: LocaleConfig, month: number): string => {
  if (month === 1) return locale.shortMonthNames[0]
  if (month === 2) return locale.shortMonthNames[1]
  if (month === 3) return locale.shortMonthNames[2]
  if (month === 4) return locale.shortMonthNames[3]
  if (month === 5) return locale.shortMonthNames[4]
  if (month === 6) return locale.shortMonthNames[5]
  if (month === 7) return locale.shortMonthNames[6]
  if (month === 8) return locale.shortMonthNames[7]
  if (month === 9) return locale.shortMonthNames[8]
  if (month === 10) return locale.shortMonthNames[9]
  if (month === 11) return locale.shortMonthNames[10]
  return locale.shortMonthNames[11]
}

const pickDayName = (locale: LocaleConfig, day: DayOfWeek): string => {
  if (day === 'Sunday') return locale.dayNames[0]
  if (day === 'Monday') return locale.dayNames[1]
  if (day === 'Tuesday') return locale.dayNames[2]
  if (day === 'Wednesday') return locale.dayNames[3]
  if (day === 'Thursday') return locale.dayNames[4]
  if (day === 'Friday') return locale.dayNames[5]
  return locale.dayNames[6]
}

/**
 * Renders a calendar date in long form. Example: `"January 15, 2026"`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 * import { pipe } from 'effect'
 *
 * Calendar.formatLong(Calendar.make(2026, 1, 15), Calendar.defaultEnglishLocale)
 * // "January 15, 2026"
 *
 * pipe(
 *   Calendar.make(2026, 1, 15),
 *   Calendar.formatLong(Calendar.defaultEnglishLocale),
 * )
 * // "January 15, 2026"
 * ```
 */
export const formatLong: {
  (locale: LocaleConfig): (self: CalendarDate) => string
  (self: CalendarDate, locale: LocaleConfig): string
} = Function.dual(
  2,
  (self: CalendarDate, locale: LocaleConfig): string =>
    `${pickMonthName(locale, self.month)} ${self.day}, ${self.year}`,
)

/**
 * Renders a calendar date in short form. Example: `"Jan 15, 2026"`.
 */
export const formatShort: {
  (locale: LocaleConfig): (self: CalendarDate) => string
  (self: CalendarDate, locale: LocaleConfig): string
} = Function.dual(
  2,
  (self: CalendarDate, locale: LocaleConfig): string =>
    `${pickShortMonthName(locale, self.month)} ${self.day}, ${self.year}`,
)

/**
 * Renders an accessibility label for a calendar date, suitable for
 * `aria-label` on a grid cell. Example: `"Monday, January 15, 2026"`.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.formatAriaLabel(Calendar.make(2026, 1, 15), Calendar.defaultEnglishLocale)
 * // "Thursday, January 15, 2026"
 * ```
 */
export const formatAriaLabel: {
  (locale: LocaleConfig): (self: CalendarDate) => string
  (self: CalendarDate, locale: LocaleConfig): string
} = Function.dual(2, (self: CalendarDate, locale: LocaleConfig): string => {
  const dayName = pickDayName(locale, dayOfWeek(self))
  const monthName = pickMonthName(locale, self.month)
  return `${dayName}, ${monthName} ${self.day}, ${self.year}`
})

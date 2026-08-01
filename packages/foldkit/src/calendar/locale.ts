import { Array, Function, Match as M, Schema as S, pipe } from 'effect'

import { ts } from '../schema/index.js'
import type { CalendarDate } from './calendarDate.js'
import { DayOfWeek, dayOfWeek } from './info.js'

const twelveStrings = S.Tuple([
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
])

const sevenStrings = S.Tuple([
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
  S.String,
])

// DATE FORMAT

/** Draws the full month name from `monthNames`. */
export const MonthName = ts('MonthName')
/** Draws the abbreviated month name from `shortMonthNames`. */
export const ShortMonthName = ts('ShortMonthName')
/** The month as a bare number, `1` through `12`. */
export const MonthNumber = ts('MonthNumber')
/** The month as a zero-padded number, `01` through `12`. */
export const PaddedMonthNumber = ts('PaddedMonthNumber')
/** The day of the month as a bare number, `1` through `31`. */
export const DayNumber = ts('DayNumber')
/** The day of the month as a zero-padded number, `01` through `31`. */
export const PaddedDayNumber = ts('PaddedDayNumber')
/** Draws the full weekday name from `dayNames`. */
export const DayName = ts('DayName')
/** Draws the abbreviated weekday name from `shortDayNames`. */
export const ShortDayName = ts('ShortDayName')
/** The year, rendered as digits. */
export const YearNumber = ts('YearNumber')
/** Fixed text held between the other parts: separators, punctuation, and
 * suffixes such as `年`. */
export const LiteralText = ts('LiteralText', { text: S.String })

/**
 * One element of a `DateFormat`. Every part except `LiteralText` draws its
 * text from the `LocaleConfig` or from the date being formatted, so a format
 * describes ordering and punctuation while the name arrays supply the words.
 */
export const DatePart = S.Union([
  MonthName,
  ShortMonthName,
  MonthNumber,
  PaddedMonthNumber,
  DayNumber,
  PaddedDayNumber,
  DayName,
  ShortDayName,
  YearNumber,
  LiteralText,
])

export type DatePart = typeof DatePart.Type

/**
 * An ordered list of parts rendered left to right. Because ordering lives in
 * the data rather than in the formatting functions, a locale whose dates read
 * day-first or year-first renders correctly without a code change.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * // "15. Januar 2026"
 * const germanLong: Calendar.DateFormat = [
 *   Calendar.DayNumber(),
 *   Calendar.LiteralText({ text: '. ' }),
 *   Calendar.MonthName(),
 *   Calendar.LiteralText({ text: ' ' }),
 *   Calendar.YearNumber(),
 * ]
 * ```
 */
export const DateFormat = S.Array(DatePart)

export type DateFormat = typeof DateFormat.Type

/**
 * Locale configuration for rendering calendar dates. Contains only data: the
 * month and day names, the first day of the week, and the `DateFormat` for
 * each of the four shapes the formatters produce. Formatting functions
 * (`formatLong`, `formatShort`, `formatAriaLabel`, `formatMonthYear`) are
 * separate exports that take a `LocaleConfig` as input.
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
  longFormat: DateFormat,
  shortFormat: DateFormat,
  ariaLabelFormat: DateFormat,
  monthYearFormat: DateFormat,
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
  longFormat: [
    MonthName(),
    LiteralText({ text: ' ' }),
    DayNumber(),
    LiteralText({ text: ', ' }),
    YearNumber(),
  ],
  shortFormat: [
    ShortMonthName(),
    LiteralText({ text: ' ' }),
    DayNumber(),
    LiteralText({ text: ', ' }),
    YearNumber(),
  ],
  ariaLabelFormat: [
    DayName(),
    LiteralText({ text: ', ' }),
    MonthName(),
    LiteralText({ text: ' ' }),
    DayNumber(),
    LiteralText({ text: ', ' }),
    YearNumber(),
  ],
  monthYearFormat: [MonthName(), LiteralText({ text: ' ' }), YearNumber()],
}

const pickByMonth = (
  names: typeof twelveStrings.Type,
  month: number,
): string => {
  if (month === 1) return names[0]
  if (month === 2) return names[1]
  if (month === 3) return names[2]
  if (month === 4) return names[3]
  if (month === 5) return names[4]
  if (month === 6) return names[5]
  if (month === 7) return names[6]
  if (month === 8) return names[7]
  if (month === 9) return names[8]
  if (month === 10) return names[9]
  if (month === 11) return names[10]
  return names[11]
}

const pickByDay = (names: typeof sevenStrings.Type, day: DayOfWeek): string => {
  if (day === 'Sunday') return names[0]
  if (day === 'Monday') return names[1]
  if (day === 'Tuesday') return names[2]
  if (day === 'Wednesday') return names[3]
  if (day === 'Thursday') return names[4]
  if (day === 'Friday') return names[5]
  return names[6]
}

const PAD_WIDTH = 2
const PAD_CHARACTER = '0'

const toPaddedNumber = (value: number): string =>
  String(value).padStart(PAD_WIDTH, PAD_CHARACTER)

const renderPart = (
  self: CalendarDate,
  locale: LocaleConfig,
  part: DatePart,
): string =>
  M.value(part).pipe(
    M.tagsExhaustive({
      MonthName: () => pickByMonth(locale.monthNames, self.month),
      ShortMonthName: () => pickByMonth(locale.shortMonthNames, self.month),
      MonthNumber: () => String(self.month),
      PaddedMonthNumber: () => toPaddedNumber(self.month),
      DayNumber: () => String(self.day),
      PaddedDayNumber: () => toPaddedNumber(self.day),
      DayName: () => pickByDay(locale.dayNames, dayOfWeek(self)),
      ShortDayName: () => pickByDay(locale.shortDayNames, dayOfWeek(self)),
      YearNumber: () => String(self.year),
      LiteralText: ({ text }) => text,
    }),
  )

/**
 * Renders a calendar date through an arbitrary `DateFormat`. The four named
 * formatters below are this function applied to the matching field of the
 * `LocaleConfig`; reach for it directly when a view needs a shape the locale
 * does not carry.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.format(Calendar.make(2026, 1, 15), Calendar.defaultEnglishLocale, [
 *   Calendar.YearNumber(),
 *   Calendar.LiteralText({ text: '-' }),
 *   Calendar.PaddedMonthNumber(),
 *   Calendar.LiteralText({ text: '-' }),
 *   Calendar.PaddedDayNumber(),
 * ])
 * // "2026-01-15"
 * ```
 */
export const format = (
  self: CalendarDate,
  locale: LocaleConfig,
  dateFormat: DateFormat,
): string =>
  pipe(
    dateFormat,
    Array.map(part => renderPart(self, locale, part)),
    Array.join(''),
  )

/**
 * Renders a calendar date through the locale's `longFormat`. Under
 * `defaultEnglishLocale`: `"January 15, 2026"`.
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
} = Function.dual(2, (self: CalendarDate, locale: LocaleConfig): string =>
  format(self, locale, locale.longFormat),
)

/**
 * Renders a calendar date through the locale's `shortFormat`. Under
 * `defaultEnglishLocale`: `"Jan 15, 2026"`.
 */
export const formatShort: {
  (locale: LocaleConfig): (self: CalendarDate) => string
  (self: CalendarDate, locale: LocaleConfig): string
} = Function.dual(2, (self: CalendarDate, locale: LocaleConfig): string =>
  format(self, locale, locale.shortFormat),
)

/**
 * Renders a calendar date through the locale's `ariaLabelFormat`, suitable
 * for `aria-label` on a grid cell. Under `defaultEnglishLocale`:
 * `"Thursday, January 15, 2026"`.
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
} = Function.dual(2, (self: CalendarDate, locale: LocaleConfig): string =>
  format(self, locale, locale.ariaLabelFormat),
)

/**
 * Renders the month and year of a calendar date through the locale's
 * `monthYearFormat`, for calendar headings and month-cell labels. Under
 * `defaultEnglishLocale`: `"January 2026"`.
 *
 * The day of `self` is ignored unless the locale's `monthYearFormat` names a
 * day part, so callers with only a year and month can pass any day.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * Calendar.formatMonthYear(Calendar.make(2026, 1, 1), Calendar.defaultEnglishLocale)
 * // "January 2026"
 * ```
 */
export const formatMonthYear: {
  (locale: LocaleConfig): (self: CalendarDate) => string
  (self: CalendarDate, locale: LocaleConfig): string
} = Function.dual(2, (self: CalendarDate, locale: LocaleConfig): string =>
  format(self, locale, locale.monthYearFormat),
)

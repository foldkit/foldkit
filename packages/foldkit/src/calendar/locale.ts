import { Array, Function, Option, Schema, pipe } from 'effect'

import { defineTaggedUnion } from '../schema/index.js'
import type { CalendarDate } from './calendarDate.js'
import { DayOfWeek, dayOfWeek } from './info.js'

const twelveStrings = Schema.Tuple([
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
])

const sevenStrings = Schema.Tuple([
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
])

// DATE FORMAT

/**
 * One part of a `DateFormat`. Name parts draw from the `LocaleConfig`, number
 * parts draw from the date, and `LiteralText` supplies separators,
 * punctuation, or suffixes such as `年`.
 *
 * `MonthName`, `DayName`, and their `Short*` counterparts select from the
 * corresponding locale name arrays. `MonthNumber` and `DayNumber` render
 * unpadded numbers; their `Padded*` counterparts render two digits.
 * `YearNumber` renders the full year.
 */
export const DatePart = defineTaggedUnion({
  MonthName: {},
  ShortMonthName: {},
  MonthNumber: {},
  PaddedMonthNumber: {},
  DayNumber: {},
  PaddedDayNumber: {},
  DayName: {},
  ShortDayName: {},
  YearNumber: {},
  LiteralText: { text: Schema.String },
})

export type DatePart = typeof DatePart.Type

/**
 * A non-empty ordered list of parts rendered left to right. Because ordering
 * lives in the data rather than in the formatting functions, a locale whose
 * dates read day-first or year-first renders correctly without a code change.
 *
 * @example
 * ```ts
 * import { Calendar } from 'foldkit'
 *
 * // "15. Januar 2026"
 * const germanLong: Calendar.DateFormat = [
 *   Calendar.DatePart.DayNumber(),
 *   Calendar.DatePart.LiteralText({ text: '. ' }),
 *   Calendar.DatePart.MonthName(),
 *   Calendar.DatePart.LiteralText({ text: ' ' }),
 *   Calendar.DatePart.YearNumber(),
 * ]
 * ```
 */
export const DateFormat = Schema.NonEmptyArray(DatePart)

export type DateFormat = typeof DateFormat.Type

/** A non-empty format restricted to month and year parts. */
export const MonthYearFormat = Schema.NonEmptyArray(
  DatePart.subset([
    'MonthName',
    'ShortMonthName',
    'MonthNumber',
    'PaddedMonthNumber',
    'YearNumber',
    'LiteralText',
  ]),
)

export type MonthYearFormat = typeof MonthYearFormat.Type

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
export const LocaleConfig = Schema.Struct({
  firstDayOfWeek: DayOfWeek,
  monthNames: twelveStrings,
  shortMonthNames: twelveStrings,
  dayNames: sevenStrings,
  shortDayNames: sevenStrings,
  longFormat: DateFormat,
  shortFormat: DateFormat,
  ariaLabelFormat: DateFormat,
  monthYearFormat: MonthYearFormat,
})

export type LocaleConfig = typeof LocaleConfig.Type

/**
 * Default English (United States) locale. Calendar components default to this
 * when initialization receives no locale. Consumers who want a different
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
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: ', ' }),
    DatePart.YearNumber(),
  ],
  shortFormat: [
    DatePart.ShortMonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: ', ' }),
    DatePart.YearNumber(),
  ],
  ariaLabelFormat: [
    DatePart.DayName(),
    DatePart.LiteralText({ text: ', ' }),
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: ', ' }),
    DatePart.YearNumber(),
  ],
  monthYearFormat: [
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
}

const pickByMonth = (names: typeof twelveStrings.Type, month: number): string =>
  pipe(
    names,
    Array.get(month - 1),
    Option.getOrElse(() => Array.lastNonEmpty(names)),
  )

const DAY_OF_WEEK_INDEX: Readonly<Record<DayOfWeek, number>> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

const pickByDay = (names: typeof sevenStrings.Type, day: DayOfWeek): string =>
  pipe(
    names,
    Array.get(DAY_OF_WEEK_INDEX[day]),
    Option.getOrElse(() => Array.lastNonEmpty(names)),
  )

const PAD_WIDTH = 2
const PAD_CHARACTER = '0'

const toPaddedNumber = (value: number): string =>
  String(value).padStart(PAD_WIDTH, PAD_CHARACTER)

const renderPart = (
  self: CalendarDate,
  locale: LocaleConfig,
  part: DatePart,
): string =>
  DatePart.match<string>(part, {
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
  })

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
 *   Calendar.DatePart.YearNumber(),
 *   Calendar.DatePart.LiteralText({ text: '-' }),
 *   Calendar.DatePart.PaddedMonthNumber(),
 *   Calendar.DatePart.LiteralText({ text: '-' }),
 *   Calendar.DatePart.PaddedDayNumber(),
 * ])
 * // "2026-01-15"
 * ```
 */
export const format: {
  (locale: LocaleConfig, dateFormat: DateFormat): (self: CalendarDate) => string
  (self: CalendarDate, locale: LocaleConfig, dateFormat: DateFormat): string
} = Function.dual(
  3,
  (self: CalendarDate, locale: LocaleConfig, dateFormat: DateFormat): string =>
    pipe(
      dateFormat,
      Array.map(part => renderPart(self, locale, part)),
      Array.join(''),
    ),
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
 * The day of `self` is ignored, so callers with only a year and month can pass
 * any valid day.
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

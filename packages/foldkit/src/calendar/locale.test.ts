import { Schema, pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import { make } from './calendarDate.js'
import {
  DateFormat,
  DatePart,
  LocaleConfig,
  MonthYearFormat,
  defaultEnglishLocale,
  format,
  formatAriaLabel,
  formatLong,
  formatMonthYear,
  formatShort,
} from './locale.js'

describe('date format schemas', () => {
  it('requires at least one part', () => {
    expect(Schema.is(DateFormat)([])).toBe(false)
  })

  it('restricts month-year formats to month, year, and literal parts', () => {
    expect(Schema.is(MonthYearFormat)([DatePart.MonthName()])).toBe(true)
    expect(Schema.is(MonthYearFormat)([DatePart.DayNumber()])).toBe(false)
  })
})

describe('defaultEnglishLocale', () => {
  it('has twelve month names starting with January', () => {
    expect(defaultEnglishLocale.monthNames).toHaveLength(12)
    expect(defaultEnglishLocale.monthNames[0]).toBe('January')
    expect(defaultEnglishLocale.monthNames[11]).toBe('December')
  })

  it('has twelve short month names', () => {
    expect(defaultEnglishLocale.shortMonthNames).toHaveLength(12)
    expect(defaultEnglishLocale.shortMonthNames[0]).toBe('Jan')
    expect(defaultEnglishLocale.shortMonthNames[11]).toBe('Dec')
  })

  it('has seven day names Sunday-first', () => {
    expect(defaultEnglishLocale.dayNames).toHaveLength(7)
    expect(defaultEnglishLocale.dayNames[0]).toBe('Sunday')
    expect(defaultEnglishLocale.dayNames[6]).toBe('Saturday')
  })

  it('has firstDayOfWeek set to Sunday', () => {
    expect(defaultEnglishLocale.firstDayOfWeek).toBe('Sunday')
  })

  it('validates against the LocaleConfig schema', () => {
    const result = LocaleConfig.make(defaultEnglishLocale)
    expect(result).toStrictEqual(defaultEnglishLocale)
  })
})

describe('formatLong', () => {
  it('renders the full month name, day, and year', () => {
    expect(formatLong(make(2026, 1, 15), defaultEnglishLocale)).toBe(
      'January 15, 2026',
    )
    expect(formatLong(make(2026, 12, 31), defaultEnglishLocale)).toBe(
      'December 31, 2026',
    )
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 13), formatLong(defaultEnglishLocale))).toBe(
      'April 13, 2026',
    )
  })
})

describe('formatShort', () => {
  it('renders the abbreviated month name, day, and year', () => {
    expect(formatShort(make(2026, 1, 15), defaultEnglishLocale)).toBe(
      'Jan 15, 2026',
    )
    expect(formatShort(make(2026, 12, 31), defaultEnglishLocale)).toBe(
      'Dec 31, 2026',
    )
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 13), formatShort(defaultEnglishLocale))).toBe(
      'Apr 13, 2026',
    )
  })
})

describe('formatAriaLabel', () => {
  it('renders the full weekday, month, day, and year', () => {
    expect(formatAriaLabel(make(2026, 1, 15), defaultEnglishLocale)).toBe(
      'Thursday, January 15, 2026',
    )
  })

  it('handles different days of the week correctly', () => {
    expect(formatAriaLabel(make(2026, 4, 13), defaultEnglishLocale)).toBe(
      'Monday, April 13, 2026',
    )
    expect(formatAriaLabel(make(2026, 4, 19), defaultEnglishLocale)).toBe(
      'Sunday, April 19, 2026',
    )
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 1, 15), formatAriaLabel(defaultEnglishLocale))).toBe(
      'Thursday, January 15, 2026',
    )
  })
})

describe('formatMonthYear', () => {
  it('renders the full month name and year', () => {
    expect(formatMonthYear(make(2026, 1, 1), defaultEnglishLocale)).toBe(
      'January 2026',
    )
  })

  it('ignores the day when the format names no day part', () => {
    expect(formatMonthYear(make(2026, 1, 28), defaultEnglishLocale)).toBe(
      'January 2026',
    )
  })
})

const germanLocale: LocaleConfig = {
  firstDayOfWeek: 'Monday',
  monthNames: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
  shortMonthNames: [
    'Jan.',
    'Feb.',
    'März',
    'Apr.',
    'Mai',
    'Juni',
    'Juli',
    'Aug.',
    'Sept.',
    'Okt.',
    'Nov.',
    'Dez.',
  ],
  dayNames: [
    'Sonntag',
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
  ],
  shortDayNames: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  longFormat: [
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: '. ' }),
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
  shortFormat: [
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: '. ' }),
    DatePart.ShortMonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
  ariaLabelFormat: [
    DatePart.DayName(),
    DatePart.LiteralText({ text: ', ' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: '. ' }),
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
  monthYearFormat: [
    DatePart.MonthName(),
    DatePart.LiteralText({ text: ' ' }),
    DatePart.YearNumber(),
  ],
}

const japaneseLocale: LocaleConfig = {
  ...defaultEnglishLocale,
  monthNames: [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ],
  dayNames: [
    '日曜日',
    '月曜日',
    '火曜日',
    '水曜日',
    '木曜日',
    '金曜日',
    '土曜日',
  ],
  longFormat: [
    DatePart.YearNumber(),
    DatePart.LiteralText({ text: '年' }),
    DatePart.MonthNumber(),
    DatePart.LiteralText({ text: '月' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: '日' }),
  ],
  ariaLabelFormat: [
    DatePart.YearNumber(),
    DatePart.LiteralText({ text: '年' }),
    DatePart.MonthNumber(),
    DatePart.LiteralText({ text: '月' }),
    DatePart.DayNumber(),
    DatePart.LiteralText({ text: '日' }),
    DatePart.DayName(),
  ],
  monthYearFormat: [
    DatePart.YearNumber(),
    DatePart.LiteralText({ text: '年' }),
    DatePart.MonthNumber(),
    DatePart.LiteralText({ text: '月' }),
  ],
}

describe('locale-driven ordering', () => {
  const date = make(2026, 1, 15)

  it('renders a day-first locale day-first', () => {
    expect(formatLong(date, germanLocale)).toBe('15. Januar 2026')
    expect(formatShort(date, germanLocale)).toBe('15. Jan. 2026')
    expect(formatAriaLabel(date, germanLocale)).toBe(
      'Donnerstag, 15. Januar 2026',
    )
  })

  it('renders a year-first locale year-first, with unit markers', () => {
    expect(formatLong(date, japaneseLocale)).toBe('2026年1月15日')
    expect(formatAriaLabel(date, japaneseLocale)).toBe('2026年1月15日木曜日')
    expect(formatMonthYear(date, japaneseLocale)).toBe('2026年1月')
  })

  it('keeps the English default unchanged', () => {
    expect(formatLong(date, defaultEnglishLocale)).toBe('January 15, 2026')
  })
})

describe('format', () => {
  it('renders an arbitrary format the locale does not carry', () => {
    expect(
      format(make(2026, 1, 5), defaultEnglishLocale, [
        DatePart.YearNumber(),
        DatePart.LiteralText({ text: '-' }),
        DatePart.PaddedMonthNumber(),
        DatePart.LiteralText({ text: '-' }),
        DatePart.PaddedDayNumber(),
      ]),
    ).toBe('2026-01-05')
  })

  it('renders every part against a single date', () => {
    expect(
      format(make(2026, 1, 5), defaultEnglishLocale, [
        DatePart.MonthName(),
        DatePart.LiteralText({ text: '|' }),
        DatePart.ShortMonthName(),
        DatePart.LiteralText({ text: '|' }),
        DatePart.MonthNumber(),
        DatePart.LiteralText({ text: '|' }),
        DatePart.PaddedMonthNumber(),
        DatePart.LiteralText({ text: '|' }),
        DatePart.DayNumber(),
        DatePart.LiteralText({ text: '|' }),
        DatePart.PaddedDayNumber(),
        DatePart.LiteralText({ text: '|' }),
        DatePart.DayName(),
        DatePart.LiteralText({ text: '|' }),
        DatePart.ShortDayName(),
        DatePart.LiteralText({ text: '|' }),
        DatePart.YearNumber(),
      ]),
    ).toBe('January|Jan|1|01|5|05|Monday|Mon|2026')
  })

  it('supports pipe-style application', () => {
    expect(
      pipe(
        make(2026, 1, 5),
        format(defaultEnglishLocale, [
          DatePart.YearNumber(),
          DatePart.LiteralText({ text: '-' }),
          DatePart.PaddedMonthNumber(),
          DatePart.LiteralText({ text: '-' }),
          DatePart.PaddedDayNumber(),
        ]),
      ),
    ).toBe('2026-01-05')
  })
})

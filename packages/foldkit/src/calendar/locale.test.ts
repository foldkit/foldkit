import { pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import { make } from './calendarDate.js'
import {
  DayName,
  DayNumber,
  LiteralText,
  LocaleConfig,
  MonthName,
  MonthNumber,
  PaddedDayNumber,
  PaddedMonthNumber,
  ShortDayName,
  ShortMonthName,
  YearNumber,
  defaultEnglishLocale,
  format,
  formatAriaLabel,
  formatLong,
  formatMonthYear,
  formatShort,
} from './locale.js'

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
    // This is a compile-time check via the type annotation on
    // defaultEnglishLocale. If it didn't match, the file wouldn't compile.
    // At runtime, the Schema can still verify the shape.
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
    // 2026-01-15 is a Thursday
    expect(formatAriaLabel(make(2026, 1, 15), defaultEnglishLocale)).toBe(
      'Thursday, January 15, 2026',
    )
  })

  it('handles different days of the week correctly', () => {
    // 2026-04-13 is a Monday
    expect(formatAriaLabel(make(2026, 4, 13), defaultEnglishLocale)).toBe(
      'Monday, April 13, 2026',
    )
    // 2026-04-19 is a Sunday
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
    DayNumber(),
    LiteralText({ text: '. ' }),
    MonthName(),
    LiteralText({ text: ' ' }),
    YearNumber(),
  ],
  shortFormat: [
    DayNumber(),
    LiteralText({ text: '. ' }),
    ShortMonthName(),
    LiteralText({ text: ' ' }),
    YearNumber(),
  ],
  ariaLabelFormat: [
    DayName(),
    LiteralText({ text: ', ' }),
    DayNumber(),
    LiteralText({ text: '. ' }),
    MonthName(),
    LiteralText({ text: ' ' }),
    YearNumber(),
  ],
  monthYearFormat: [MonthName(), LiteralText({ text: ' ' }), YearNumber()],
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
    YearNumber(),
    LiteralText({ text: '年' }),
    MonthNumber(),
    LiteralText({ text: '月' }),
    DayNumber(),
    LiteralText({ text: '日' }),
  ],
  ariaLabelFormat: [
    YearNumber(),
    LiteralText({ text: '年' }),
    MonthNumber(),
    LiteralText({ text: '月' }),
    DayNumber(),
    LiteralText({ text: '日' }),
    DayName(),
  ],
  monthYearFormat: [
    YearNumber(),
    LiteralText({ text: '年' }),
    MonthNumber(),
    LiteralText({ text: '月' }),
  ],
}

describe('locale-driven ordering', () => {
  // 2026-01-15 is a Thursday.
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
        YearNumber(),
        LiteralText({ text: '-' }),
        PaddedMonthNumber(),
        LiteralText({ text: '-' }),
        PaddedDayNumber(),
      ]),
    ).toBe('2026-01-05')
  })

  it('renders every part against a single date', () => {
    expect(
      format(make(2026, 1, 5), defaultEnglishLocale, [
        MonthName(),
        LiteralText({ text: '|' }),
        ShortMonthName(),
        LiteralText({ text: '|' }),
        MonthNumber(),
        LiteralText({ text: '|' }),
        PaddedMonthNumber(),
        LiteralText({ text: '|' }),
        DayNumber(),
        LiteralText({ text: '|' }),
        PaddedDayNumber(),
        LiteralText({ text: '|' }),
        DayName(),
        LiteralText({ text: '|' }),
        ShortDayName(),
        LiteralText({ text: '|' }),
        YearNumber(),
      ]),
    ).toBe('January|Jan|1|01|5|05|Monday|Mon|2026')
  })

  it('renders an empty format as an empty string', () => {
    expect(format(make(2026, 1, 5), defaultEnglishLocale, [])).toBe('')
  })
})

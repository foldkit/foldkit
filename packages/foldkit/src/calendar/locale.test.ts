import { pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import { make } from './calendarDate.js'
import {
  LocaleConfig,
  defaultEnglishLocale,
  formatAriaLabel,
  formatLong,
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

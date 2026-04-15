import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  CalendarDate,
  CalendarDateFromIsoString,
  daysInMonth,
  fromDateInZone,
  fromDateLocal,
  isCalendarDate,
  isLeapYear,
  make,
  toDateLocal,
  unsafeMake,
} from './calendarDate'

describe('isLeapYear', () => {
  it('returns true for years divisible by 4 but not by 100', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2028)).toBe(true)
  })

  it('returns false for years not divisible by 4', () => {
    expect(isLeapYear(2023)).toBe(false)
    expect(isLeapYear(2026)).toBe(false)
  })

  it('returns false for century years not divisible by 400', () => {
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2100)).toBe(false)
  })

  it('returns true for century years divisible by 400', () => {
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(2400)).toBe(true)
  })
})

describe('daysInMonth', () => {
  it('returns 31 for January, March, May, July, August, October, December', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 3)).toBe(31)
    expect(daysInMonth(2026, 5)).toBe(31)
    expect(daysInMonth(2026, 7)).toBe(31)
    expect(daysInMonth(2026, 8)).toBe(31)
    expect(daysInMonth(2026, 10)).toBe(31)
    expect(daysInMonth(2026, 12)).toBe(31)
  })

  it('returns 30 for April, June, September, November', () => {
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 6)).toBe(30)
    expect(daysInMonth(2026, 9)).toBe(30)
    expect(daysInMonth(2026, 11)).toBe(30)
  })

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2000, 2)).toBe(29)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(1900, 2)).toBe(28)
  })
})

describe('make', () => {
  it('constructs a valid calendar date', () => {
    expect(make(2026, 4, 13)).toStrictEqual({ year: 2026, month: 4, day: 13 })
  })

  it('accepts February 29 in a leap year', () => {
    expect(make(2024, 2, 29)).toStrictEqual({ year: 2024, month: 2, day: 29 })
  })

  it('rejects February 29 in a non-leap year', () => {
    expect(() => make(2026, 2, 29)).toThrow()
  })

  it('rejects February 30', () => {
    expect(() => make(2026, 2, 30)).toThrow()
  })

  it('rejects April 31', () => {
    expect(() => make(2026, 4, 31)).toThrow()
  })

  it('rejects month 0', () => {
    expect(() => make(2026, 0, 1)).toThrow()
  })

  it('rejects month 13', () => {
    expect(() => make(2026, 13, 1)).toThrow()
  })

  it('rejects day 0', () => {
    expect(() => make(2026, 4, 0)).toThrow()
  })

  it('rejects day 32', () => {
    expect(() => make(2026, 1, 32)).toThrow()
  })
})

describe('unsafeMake', () => {
  it('constructs without validation', () => {
    expect(unsafeMake(2026, 4, 13)).toStrictEqual({
      year: 2026,
      month: 4,
      day: 13,
    })
  })

  it('does not validate the day-in-month constraint', () => {
    const invalid = unsafeMake(2026, 2, 30)
    expect(invalid.day).toBe(30)
  })
})

describe('isCalendarDate', () => {
  it('returns true for a valid calendar date struct', () => {
    expect(isCalendarDate({ year: 2026, month: 4, day: 13 })).toBe(true)
  })

  it('returns false for an impossible calendar date', () => {
    expect(isCalendarDate({ year: 2026, month: 2, day: 30 })).toBe(false)
  })

  it('returns false for February 29 in a non-leap year', () => {
    expect(isCalendarDate({ year: 2026, month: 2, day: 29 })).toBe(false)
  })

  it('returns true for February 29 in a leap year', () => {
    expect(isCalendarDate({ year: 2024, month: 2, day: 29 })).toBe(true)
  })

  it('returns false for a missing field', () => {
    expect(isCalendarDate({ year: 2026, month: 4 })).toBe(false)
  })

  it('returns false for a primitive value', () => {
    expect(isCalendarDate('2026-04-13')).toBe(false)
    expect(isCalendarDate(null)).toBe(false)
    expect(isCalendarDate(undefined)).toBe(false)
  })
})

describe('fromDateLocal', () => {
  it('reads year, month, and day from a JS Date in local time', () => {
    // new Date(year, monthIndex, day) constructs in local time; reading back
    // with the same local-time getters round-trips cleanly.
    const jsDate = new Date(2026, 3, 13)
    expect(fromDateLocal(jsDate)).toStrictEqual(make(2026, 4, 13))
  })

  it('handles month boundaries', () => {
    const jsDate = new Date(2026, 11, 31)
    expect(fromDateLocal(jsDate)).toStrictEqual(make(2026, 12, 31))
  })
})

describe('fromDateInZone', () => {
  it('reads year, month, and day in a specified IANA timezone', () => {
    // 2026-04-13T12:00:00Z is April 13 in UTC and in America/New_York (08:00 local).
    const jsDate = new Date(Date.UTC(2026, 3, 13, 12, 0, 0))
    expect(fromDateInZone(jsDate, 'America/New_York')).toStrictEqual(
      make(2026, 4, 13),
    )
    expect(fromDateInZone(jsDate, 'UTC')).toStrictEqual(make(2026, 4, 13))
  })

  it('handles timezone-dependent date transitions', () => {
    // 2026-04-13T01:00:00Z is still April 12 in New York (21:00 on the 12th)
    // but April 13 in UTC.
    const jsDate = new Date(Date.UTC(2026, 3, 13, 1, 0, 0))
    expect(fromDateInZone(jsDate, 'UTC')).toStrictEqual(make(2026, 4, 13))
    expect(fromDateInZone(jsDate, 'America/New_York')).toStrictEqual(
      make(2026, 4, 12),
    )
  })
})

describe('toDateLocal', () => {
  it('produces a Date at local midnight', () => {
    const jsDate = toDateLocal(make(2026, 4, 13))
    expect(jsDate.getFullYear()).toBe(2026)
    expect(jsDate.getMonth()).toBe(3)
    expect(jsDate.getDate()).toBe(13)
    expect(jsDate.getHours()).toBe(0)
    expect(jsDate.getMinutes()).toBe(0)
  })

  it('round-trips through fromDateLocal', () => {
    const original = make(2026, 4, 13)
    expect(fromDateLocal(toDateLocal(original))).toStrictEqual(original)
  })
})

describe('CalendarDateFromIsoString', () => {
  const decode = S.decodeUnknownSync(CalendarDateFromIsoString)
  const encode = S.encodeSync(CalendarDateFromIsoString)

  it('decodes a valid ISO date string', () => {
    expect(decode('2026-04-13')).toStrictEqual({
      year: 2026,
      month: 4,
      day: 13,
    })
  })

  it('decodes a leap day in a leap year', () => {
    expect(decode('2024-02-29')).toStrictEqual({
      year: 2024,
      month: 2,
      day: 29,
    })
  })

  it('rejects a leap day in a non-leap year', () => {
    expect(() => decode('2026-02-29')).toThrow()
  })

  it('rejects an ISO date without zero padding', () => {
    expect(() => decode('2026-4-13')).toThrow()
  })

  it('rejects a non-ISO separator', () => {
    expect(() => decode('2026/04/13')).toThrow()
  })

  it('rejects an impossible calendar date', () => {
    expect(() => decode('2026-02-30')).toThrow()
    expect(() => decode('2026-04-31')).toThrow()
    expect(() => decode('2026-13-01')).toThrow()
  })

  it('rejects a completely malformed string', () => {
    expect(() => decode('abc')).toThrow()
    expect(() => decode('')).toThrow()
  })

  it('encodes a calendar date to its ISO string representation', () => {
    expect(encode(make(2026, 4, 13))).toBe('2026-04-13')
  })

  it('pads single-digit months and days with zeros', () => {
    expect(encode(make(2026, 1, 1))).toBe('2026-01-01')
    expect(encode(make(2026, 9, 5))).toBe('2026-09-05')
  })

  it('round-trips through decode and encode', () => {
    const original = '2024-02-29'
    expect(encode(decode(original))).toBe(original)
  })
})

describe('CalendarDate schema', () => {
  const decode = S.decodeUnknownSync(CalendarDate)

  it('validates a proper struct', () => {
    expect(decode({ year: 2026, month: 4, day: 13 })).toStrictEqual({
      year: 2026,
      month: 4,
      day: 13,
    })
  })

  it('rejects non-integer years', () => {
    expect(() => decode({ year: 2026.5, month: 4, day: 13 })).toThrow()
  })

  it('rejects missing fields', () => {
    expect(() => decode({ year: 2026, month: 4 })).toThrow()
  })
})

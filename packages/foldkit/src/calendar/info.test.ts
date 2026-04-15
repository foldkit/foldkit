import { pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import { make } from './calendarDate'
import {
  dayOfWeek,
  endOfWeek,
  firstOfMonth,
  lastOfMonth,
  startOfWeek,
} from './info'

describe('dayOfWeek', () => {
  it('returns the correct day for known reference dates', () => {
    // 2000-01-01 was a Saturday
    expect(dayOfWeek(make(2000, 1, 1))).toBe('Saturday')
    // 2024-02-29 (leap day) was a Thursday
    expect(dayOfWeek(make(2024, 2, 29))).toBe('Thursday')
    // 2026-01-01 is a Thursday
    expect(dayOfWeek(make(2026, 1, 1))).toBe('Thursday')
    // 2026-04-13 is a Monday
    expect(dayOfWeek(make(2026, 4, 13))).toBe('Monday')
  })

  it('handles January and February via the year-adjustment rule', () => {
    // Sakamoto's algorithm adjusts Jan/Feb to use the previous year
    expect(dayOfWeek(make(2024, 1, 1))).toBe('Monday')
    expect(dayOfWeek(make(2024, 2, 1))).toBe('Thursday')
  })

  it('handles century boundaries correctly', () => {
    // 1900-01-01 was a Monday
    expect(dayOfWeek(make(1900, 1, 1))).toBe('Monday')
    // 2000-01-01 was a Saturday
    expect(dayOfWeek(make(2000, 1, 1))).toBe('Saturday')
    // 2100-01-01 will be a Friday
    expect(dayOfWeek(make(2100, 1, 1))).toBe('Friday')
  })

  it('handles consecutive days correctly', () => {
    expect(dayOfWeek(make(2026, 4, 13))).toBe('Monday')
    expect(dayOfWeek(make(2026, 4, 14))).toBe('Tuesday')
    expect(dayOfWeek(make(2026, 4, 15))).toBe('Wednesday')
    expect(dayOfWeek(make(2026, 4, 16))).toBe('Thursday')
    expect(dayOfWeek(make(2026, 4, 17))).toBe('Friday')
    expect(dayOfWeek(make(2026, 4, 18))).toBe('Saturday')
    expect(dayOfWeek(make(2026, 4, 19))).toBe('Sunday')
  })
})

describe('firstOfMonth', () => {
  it('returns day 1 of the same month', () => {
    expect(firstOfMonth(make(2026, 4, 13))).toStrictEqual(make(2026, 4, 1))
  })

  it('is idempotent on the first of the month', () => {
    expect(firstOfMonth(make(2026, 4, 1))).toStrictEqual(make(2026, 4, 1))
  })
})

describe('lastOfMonth', () => {
  it('returns the last day of a 31-day month', () => {
    expect(lastOfMonth(make(2026, 1, 5))).toStrictEqual(make(2026, 1, 31))
  })

  it('returns the last day of a 30-day month', () => {
    expect(lastOfMonth(make(2026, 4, 5))).toStrictEqual(make(2026, 4, 30))
  })

  it('returns February 28 in a non-leap year', () => {
    expect(lastOfMonth(make(2026, 2, 5))).toStrictEqual(make(2026, 2, 28))
  })

  it('returns February 29 in a leap year', () => {
    expect(lastOfMonth(make(2024, 2, 5))).toStrictEqual(make(2024, 2, 29))
  })
})

describe('startOfWeek', () => {
  it('returns the Sunday before a mid-week date when the week starts on Sunday', () => {
    // 2026-04-15 is a Wednesday; Sunday before is 2026-04-12
    expect(startOfWeek(make(2026, 4, 15), 'Sunday')).toStrictEqual(
      make(2026, 4, 12),
    )
  })

  it('returns the Monday before a mid-week date when the week starts on Monday', () => {
    // 2026-04-15 is a Wednesday; Monday before is 2026-04-13
    expect(startOfWeek(make(2026, 4, 15), 'Monday')).toStrictEqual(
      make(2026, 4, 13),
    )
  })

  it('returns the Saturday before a mid-week date when the week starts on Saturday', () => {
    // 2026-04-15 is a Wednesday; Saturday before is 2026-04-11
    expect(startOfWeek(make(2026, 4, 15), 'Saturday')).toStrictEqual(
      make(2026, 4, 11),
    )
  })

  it('is idempotent when self already falls on firstDayOfWeek', () => {
    // 2026-04-12 is a Sunday
    expect(startOfWeek(make(2026, 4, 12), 'Sunday')).toStrictEqual(
      make(2026, 4, 12),
    )
  })

  it('crosses month boundaries correctly', () => {
    // 2026-05-02 is a Saturday; Sunday before is 2026-04-26
    expect(startOfWeek(make(2026, 5, 2), 'Sunday')).toStrictEqual(
      make(2026, 4, 26),
    )
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 15), startOfWeek('Monday'))).toStrictEqual(
      make(2026, 4, 13),
    )
  })
})

describe('endOfWeek', () => {
  it('returns the Saturday at the end of a Sunday-start week', () => {
    // 2026-04-15 is a Wednesday; end of Sunday-start week is 2026-04-18 (Saturday)
    expect(endOfWeek(make(2026, 4, 15), 'Sunday')).toStrictEqual(
      make(2026, 4, 18),
    )
  })

  it('returns the Sunday at the end of a Monday-start week', () => {
    // 2026-04-15 is a Wednesday; end of Monday-start week is 2026-04-19 (Sunday)
    expect(endOfWeek(make(2026, 4, 15), 'Monday')).toStrictEqual(
      make(2026, 4, 19),
    )
  })

  it('is always six days after startOfWeek', () => {
    const date = make(2026, 4, 15)
    const start = startOfWeek(date, 'Sunday')
    const end = endOfWeek(date, 'Sunday')
    expect(end.year).toBe(start.year)
    // 12 + 6 = 18 (same month in this case)
    expect(end.day - start.day).toBe(6)
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 15), endOfWeek('Monday'))).toStrictEqual(
      make(2026, 4, 19),
    )
  })
})

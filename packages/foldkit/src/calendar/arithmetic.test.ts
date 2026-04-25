import { pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  addDays,
  addMonths,
  addYears,
  daysSince,
  daysUntil,
  subtractDays,
  subtractMonths,
  subtractYears,
} from './arithmetic.js'
import { make } from './calendarDate.js'

describe('addDays', () => {
  it('returns the same date when adding zero', () => {
    const date = make(2026, 4, 13)
    expect(addDays(date, 0)).toStrictEqual(date)
  })

  it('adds within the same month', () => {
    expect(addDays(make(2026, 4, 13), 5)).toStrictEqual(make(2026, 4, 18))
  })

  it('rolls over into the next month', () => {
    expect(addDays(make(2026, 4, 30), 1)).toStrictEqual(make(2026, 5, 1))
  })

  it('rolls over into the next year', () => {
    expect(addDays(make(2026, 12, 31), 1)).toStrictEqual(make(2027, 1, 1))
  })

  it('subtracts within the same month', () => {
    expect(addDays(make(2026, 4, 13), -5)).toStrictEqual(make(2026, 4, 8))
  })

  it('rolls over into the previous month', () => {
    expect(addDays(make(2026, 5, 1), -1)).toStrictEqual(make(2026, 4, 30))
  })

  it('rolls over into the previous year', () => {
    expect(addDays(make(2026, 1, 1), -1)).toStrictEqual(make(2025, 12, 31))
  })

  it('crosses leap day forward in a leap year', () => {
    expect(addDays(make(2024, 2, 28), 1)).toStrictEqual(make(2024, 2, 29))
    expect(addDays(make(2024, 2, 28), 2)).toStrictEqual(make(2024, 3, 1))
  })

  it('skips leap day in a non-leap year', () => {
    expect(addDays(make(2026, 2, 28), 1)).toStrictEqual(make(2026, 3, 1))
  })

  it('handles large positive offsets', () => {
    expect(addDays(make(2026, 1, 1), 365)).toStrictEqual(make(2027, 1, 1))
  })

  it('handles large negative offsets', () => {
    expect(addDays(make(2027, 1, 1), -365)).toStrictEqual(make(2026, 1, 1))
  })

  it('handles very large positive offsets across centuries', () => {
    expect(addDays(make(2000, 1, 1), 146097)).toStrictEqual(make(2400, 1, 1))
  })

  it('handles offsets across leap year boundaries', () => {
    expect(addDays(make(2024, 1, 1), 366)).toStrictEqual(make(2025, 1, 1))
  })

  it('supports pipe-style (data-last) application', () => {
    expect(pipe(make(2026, 4, 13), addDays(5))).toStrictEqual(make(2026, 4, 18))
  })

  it('produces the same result regardless of call style', () => {
    const date = make(2026, 4, 30)
    expect(addDays(date, 1)).toStrictEqual(pipe(date, addDays(1)))
  })
})

describe('subtractDays', () => {
  it('is the inverse of addDays', () => {
    expect(subtractDays(make(2026, 4, 13), 10)).toStrictEqual(
      addDays(make(2026, 4, 13), -10),
    )
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 5, 1), subtractDays(1))).toStrictEqual(
      make(2026, 4, 30),
    )
  })
})

describe('addMonths', () => {
  it('returns the same date when adding zero months', () => {
    expect(addMonths(make(2026, 4, 13), 0)).toStrictEqual(make(2026, 4, 13))
  })

  it('adds within the same year', () => {
    expect(addMonths(make(2026, 4, 13), 3)).toStrictEqual(make(2026, 7, 13))
  })

  it('rolls over into the next year', () => {
    expect(addMonths(make(2026, 11, 1), 2)).toStrictEqual(make(2027, 1, 1))
  })

  it('rolls over into the previous year', () => {
    expect(addMonths(make(2026, 1, 1), -1)).toStrictEqual(make(2025, 12, 1))
  })

  it('clamps Jan 31 + 1 month to Feb 28 in a non-leap year', () => {
    expect(addMonths(make(2026, 1, 31), 1)).toStrictEqual(make(2026, 2, 28))
  })

  it('clamps Jan 31 + 1 month to Feb 29 in a leap year', () => {
    expect(addMonths(make(2024, 1, 31), 1)).toStrictEqual(make(2024, 2, 29))
  })

  it('clamps Mar 31 + 1 month to Apr 30', () => {
    expect(addMonths(make(2026, 3, 31), 1)).toStrictEqual(make(2026, 4, 30))
  })

  it('clamps May 31 - 1 month to Apr 30', () => {
    expect(addMonths(make(2026, 5, 31), -1)).toStrictEqual(make(2026, 4, 30))
  })

  it('handles many-month offsets', () => {
    expect(addMonths(make(2026, 4, 13), 24)).toStrictEqual(make(2028, 4, 13))
  })

  it('handles negative many-month offsets', () => {
    expect(addMonths(make(2028, 4, 13), -24)).toStrictEqual(make(2026, 4, 13))
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 1, 31), addMonths(1))).toStrictEqual(
      make(2026, 2, 28),
    )
  })
})

describe('subtractMonths', () => {
  it('is the inverse of addMonths', () => {
    expect(subtractMonths(make(2026, 4, 13), 3)).toStrictEqual(
      addMonths(make(2026, 4, 13), -3),
    )
  })
})

describe('addYears', () => {
  it('adds a full year', () => {
    expect(addYears(make(2026, 4, 13), 1)).toStrictEqual(make(2027, 4, 13))
  })

  it('clamps Feb 29 in a leap year + 1 year to Feb 28', () => {
    expect(addYears(make(2024, 2, 29), 1)).toStrictEqual(make(2025, 2, 28))
  })

  it('clamps Feb 29 + 4 years back to Feb 29', () => {
    expect(addYears(make(2024, 2, 29), 4)).toStrictEqual(make(2028, 2, 29))
  })

  it('handles century boundaries with clamping', () => {
    // 2100 is NOT a leap year (century not divisible by 400)
    expect(addYears(make(2024, 2, 29), 76)).toStrictEqual(make(2100, 2, 28))
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 13), addYears(5))).toStrictEqual(
      make(2031, 4, 13),
    )
  })
})

describe('subtractYears', () => {
  it('is the inverse of addYears', () => {
    expect(subtractYears(make(2026, 4, 13), 2)).toStrictEqual(
      addYears(make(2026, 4, 13), -2),
    )
  })
})

describe('daysUntil', () => {
  it('returns 0 for identical dates', () => {
    const date = make(2026, 4, 13)
    expect(daysUntil(date, date)).toBe(0)
  })

  it('returns a positive count when end is later', () => {
    expect(daysUntil(make(2026, 4, 13), make(2026, 4, 14))).toBe(1)
  })

  it('returns a negative count when end is earlier', () => {
    expect(daysUntil(make(2026, 4, 14), make(2026, 4, 13))).toBe(-1)
  })

  it('handles cross-month spans', () => {
    expect(daysUntil(make(2026, 4, 1), make(2026, 5, 1))).toBe(30)
  })

  it('handles cross-year spans in a non-leap year', () => {
    expect(daysUntil(make(2026, 1, 1), make(2027, 1, 1))).toBe(365)
  })

  it('handles cross-year spans through a leap year', () => {
    expect(daysUntil(make(2024, 1, 1), make(2025, 1, 1))).toBe(366)
  })

  it('is consistent with addDays', () => {
    const from = make(2026, 4, 13)
    const to = addDays(from, 1000)
    expect(daysUntil(from, to)).toBe(1000)
  })

  it('is consistent with addDays across a full Gregorian cycle', () => {
    const from = make(2000, 1, 1)
    const to = addDays(from, 146097)
    expect(daysUntil(from, to)).toBe(146097)
  })

  it('supports pipe-style application', () => {
    const today = make(2026, 4, 13)
    const future = make(2026, 4, 20)
    expect(pipe(today, daysUntil(future))).toBe(7)
  })
})

describe('daysSince', () => {
  it('returns 0 for identical dates', () => {
    const date = make(2026, 4, 13)
    expect(daysSince(date, date)).toBe(0)
  })

  it('returns a positive count when self is later', () => {
    expect(daysSince(make(2026, 4, 14), make(2026, 4, 13))).toBe(1)
  })

  it('returns a negative count when self is earlier', () => {
    expect(daysSince(make(2026, 4, 13), make(2026, 4, 14))).toBe(-1)
  })

  it('is the negation of daysUntil', () => {
    const a = make(2026, 4, 13)
    const b = make(2026, 7, 15)
    expect(daysSince(a, b)).toBe(-daysUntil(a, b))
  })

  it('supports pipe-style application', () => {
    const today = make(2026, 4, 13)
    const startOfYear = make(2026, 1, 1)
    expect(pipe(today, daysSince(startOfYear))).toBe(102)
  })
})

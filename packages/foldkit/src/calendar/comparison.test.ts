import { pipe } from 'effect'
import { describe, expect, it } from 'vitest'

import { make } from './calendarDate.js'
import {
  Equivalence,
  Order,
  between,
  clamp,
  isAfter,
  isAfterOrEqual,
  isBefore,
  isBeforeOrEqual,
  isEqual,
  max,
  min,
} from './comparison.js'

describe('isEqual', () => {
  it('returns true for identical dates', () => {
    expect(isEqual(make(2026, 4, 13), make(2026, 4, 13))).toBe(true)
  })

  it('returns false when years differ', () => {
    expect(isEqual(make(2025, 4, 13), make(2026, 4, 13))).toBe(false)
  })

  it('returns false when months differ', () => {
    expect(isEqual(make(2026, 3, 13), make(2026, 4, 13))).toBe(false)
  })

  it('returns false when days differ', () => {
    expect(isEqual(make(2026, 4, 12), make(2026, 4, 13))).toBe(false)
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 13), isEqual(make(2026, 4, 13)))).toBe(true)
    expect(pipe(make(2026, 4, 13), isEqual(make(2026, 4, 14)))).toBe(false)
  })
})

describe('isBefore', () => {
  it('returns true when year is earlier', () => {
    expect(isBefore(make(2025, 12, 31), make(2026, 1, 1))).toBe(true)
  })

  it('returns true when month is earlier in same year', () => {
    expect(isBefore(make(2026, 3, 31), make(2026, 4, 1))).toBe(true)
  })

  it('returns true when day is earlier in same month', () => {
    expect(isBefore(make(2026, 4, 12), make(2026, 4, 13))).toBe(true)
  })

  it('returns false for the same date', () => {
    expect(isBefore(make(2026, 4, 13), make(2026, 4, 13))).toBe(false)
  })

  it('returns false when date is later', () => {
    expect(isBefore(make(2026, 4, 14), make(2026, 4, 13))).toBe(false)
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 12), isBefore(make(2026, 4, 13)))).toBe(true)
  })
})

describe('isAfter', () => {
  it('returns true when date is later', () => {
    expect(isAfter(make(2026, 4, 14), make(2026, 4, 13))).toBe(true)
  })

  it('returns false for the same date', () => {
    expect(isAfter(make(2026, 4, 13), make(2026, 4, 13))).toBe(false)
  })

  it('returns false when date is earlier', () => {
    expect(isAfter(make(2026, 4, 12), make(2026, 4, 13))).toBe(false)
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 14), isAfter(make(2026, 4, 13)))).toBe(true)
  })
})

describe('isBeforeOrEqual', () => {
  it('returns true for earlier dates', () => {
    expect(isBeforeOrEqual(make(2026, 4, 12), make(2026, 4, 13))).toBe(true)
  })

  it('returns true for the same date', () => {
    expect(isBeforeOrEqual(make(2026, 4, 13), make(2026, 4, 13))).toBe(true)
  })

  it('returns false for later dates', () => {
    expect(isBeforeOrEqual(make(2026, 4, 14), make(2026, 4, 13))).toBe(false)
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 13), isBeforeOrEqual(make(2026, 4, 13)))).toBe(
      true,
    )
  })
})

describe('isAfterOrEqual', () => {
  it('returns true for later dates', () => {
    expect(isAfterOrEqual(make(2026, 4, 14), make(2026, 4, 13))).toBe(true)
  })

  it('returns true for the same date', () => {
    expect(isAfterOrEqual(make(2026, 4, 13), make(2026, 4, 13))).toBe(true)
  })

  it('returns false for earlier dates', () => {
    expect(isAfterOrEqual(make(2026, 4, 12), make(2026, 4, 13))).toBe(false)
  })
})

describe('Order', () => {
  it('returns a negative number when first date is earlier', () => {
    expect(Order(make(2026, 4, 12), make(2026, 4, 13))).toBeLessThan(0)
  })

  it('returns a positive number when first date is later', () => {
    expect(Order(make(2026, 4, 14), make(2026, 4, 13))).toBeGreaterThan(0)
  })

  it('returns zero for equal dates', () => {
    expect(Order(make(2026, 4, 13), make(2026, 4, 13))).toBe(0)
  })

  it('orders by year first, then month, then day', () => {
    expect(Order(make(2025, 12, 31), make(2026, 1, 1))).toBeLessThan(0)
    expect(Order(make(2026, 1, 31), make(2026, 2, 1))).toBeLessThan(0)
    expect(Order(make(2026, 4, 12), make(2026, 4, 13))).toBeLessThan(0)
  })
})

describe('Equivalence', () => {
  it('returns true for equal dates', () => {
    expect(Equivalence(make(2026, 4, 13), make(2026, 4, 13))).toBe(true)
  })

  it('returns false for different dates', () => {
    expect(Equivalence(make(2026, 4, 13), make(2026, 4, 14))).toBe(false)
  })
})

describe('min', () => {
  it('returns the earlier date', () => {
    expect(min(make(2026, 4, 13), make(2026, 4, 14))).toStrictEqual(
      make(2026, 4, 13),
    )
  })

  it('returns either when equal', () => {
    expect(min(make(2026, 4, 13), make(2026, 4, 13))).toStrictEqual(
      make(2026, 4, 13),
    )
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 14), min(make(2026, 4, 13)))).toStrictEqual(
      make(2026, 4, 13),
    )
  })
})

describe('max', () => {
  it('returns the later date', () => {
    expect(max(make(2026, 4, 13), make(2026, 4, 14))).toStrictEqual(
      make(2026, 4, 14),
    )
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 4, 13), max(make(2026, 4, 14)))).toStrictEqual(
      make(2026, 4, 14),
    )
  })
})

describe('between', () => {
  const minimum = make(2026, 1, 1)
  const maximum = make(2026, 12, 31)

  it('returns true when self is within the range', () => {
    expect(between(make(2026, 6, 15), { minimum, maximum })).toBe(true)
  })

  it('returns true when self equals the minimum', () => {
    expect(between(minimum, { minimum, maximum })).toBe(true)
  })

  it('returns true when self equals the maximum', () => {
    expect(between(maximum, { minimum, maximum })).toBe(true)
  })

  it('returns false when self is before the minimum', () => {
    expect(between(make(2025, 12, 31), { minimum, maximum })).toBe(false)
  })

  it('returns false when self is after the maximum', () => {
    expect(between(make(2027, 1, 1), { minimum, maximum })).toBe(false)
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2026, 6, 15), between({ minimum, maximum }))).toBe(true)
  })
})

describe('clamp', () => {
  const minimum = make(2026, 1, 1)
  const maximum = make(2026, 12, 31)

  it('returns self when within the range', () => {
    const date = make(2026, 6, 15)
    expect(clamp(date, { minimum, maximum })).toStrictEqual(date)
  })

  it('returns the minimum when self is before the range', () => {
    expect(clamp(make(2025, 12, 31), { minimum, maximum })).toStrictEqual(
      minimum,
    )
  })

  it('returns the maximum when self is after the range', () => {
    expect(clamp(make(2027, 1, 1), { minimum, maximum })).toStrictEqual(maximum)
  })

  it('supports pipe-style application', () => {
    expect(pipe(make(2025, 12, 31), clamp({ minimum, maximum }))).toStrictEqual(
      minimum,
    )
  })
})

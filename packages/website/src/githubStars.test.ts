import { describe, expect, test } from 'vitest'

import { formatStarCount } from './githubStars'

describe('formatStarCount', () => {
  test.each([
    [0, '0'],
    [42, '42'],
    [999, '999'],
    [1000, '1k'],
    [1200, '1.2k'],
    [4242, '4.2k'],
  ])('formats %i as %s', (count, expected) => {
    expect(formatStarCount(count)).toBe(expected)
  })
})

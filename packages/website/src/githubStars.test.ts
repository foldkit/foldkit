import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { formatStarCount, initialGitHubStars } from './githubStars'

describe('initialGitHubStars', () => {
  test('a baked count seeds Success so the badge renders immediately', () => {
    const stars = initialGitHubStars(4242)
    expect(stars._tag).toBe('Success')
    expect(Option.getOrNull(AsyncData.getData(stars))).toBe(4242)
  })

  test('an absent baked count seeds Loading', () => {
    const stars = initialGitHubStars(null)
    expect(stars._tag).toBe('Loading')
    expect(Option.isNone(AsyncData.getData(stars))).toBe(true)
  })
})

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

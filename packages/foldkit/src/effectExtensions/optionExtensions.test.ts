import { describe, it } from '@effect/vitest'
import { Option, pipe } from 'effect'
import { expect } from 'vitest'

import { fromString, when } from './optionExtensions.js'

describe('fromString', () => {
  it('returns Some for non-empty string', () => {
    const result = fromString('hello')
    expect(Option.isSome(result)).toBe(true)
    expect(Option.getOrNull(result)).toBe('hello')
  })

  it('returns None for empty string', () => {
    const result = fromString('')
    expect(Option.isNone(result)).toBe(true)
  })
})

describe('when', () => {
  it('returns Some when condition is true (data-first)', () => {
    expect(when(true, 42)).toStrictEqual(Option.some(42))
  })

  it('returns None when condition is false (data-first)', () => {
    expect(when(false, 42)).toStrictEqual(Option.none())
  })

  it('returns Some when condition is true (data-last)', () => {
    expect(pipe(true, when(42))).toStrictEqual(Option.some(42))
  })

  it('returns None when condition is false (data-last)', () => {
    expect(pipe(false, when(42))).toStrictEqual(Option.none())
  })
})

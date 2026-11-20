import { Option } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { stripPrefix } from './stringExtensions.js'

describe('stripPrefix', () => {
  it('strips a matching prefix', () => {
    const result = stripPrefix('hello')('helloworld')
    expect(Option.getOrNull(result)).toBe('world')
  })

  it('returns None for non-matching prefix', () => {
    const result = stripPrefix('hello')('goodbye')
    expect(Option.isNone(result)).toBe(true)
  })

  it('returns Some empty string when input equals prefix', () => {
    const result = stripPrefix('hello')('hello')
    expect(Option.isSome(result)).toBe(true)
    expect(Option.getOrNull(result)).toBe('')
  })
})

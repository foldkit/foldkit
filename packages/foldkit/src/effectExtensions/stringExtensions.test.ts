import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import { stripPrefix, stripPrefixNonEmpty } from './stringExtensions.js'

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

describe('stripPrefixNonEmpty', () => {
  it('strips a matching prefix with remaining content', () => {
    const result = stripPrefixNonEmpty('hello')('helloworld')
    expect(Option.getOrNull(result)).toBe('world')
  })

  it('returns None when result would be empty', () => {
    const result = stripPrefixNonEmpty('hello')('hello')
    expect(Option.isNone(result)).toBe(true)
  })

  it('returns None for non-matching prefix', () => {
    const result = stripPrefixNonEmpty('hello')('goodbye')
    expect(Option.isNone(result)).toBe(true)
  })
})

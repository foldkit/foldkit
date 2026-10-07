import { Option } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { isPlainObject } from './predicateExtensions.js'

describe('isPlainObject', () => {
  it('accepts object literals and objects without a prototype', () => {
    expect(isPlainObject({ scrollOwner: 'host' })).toBe(true)
    expect(isPlainObject(Object.create(null))).toBe(true)
  })

  it('rejects arrays, class instances, and Effect values', () => {
    expect(isPlainObject([1, 2])).toBe(false)
    expect(isPlainObject(new Map())).toBe(false)
    expect(isPlainObject(new Uint8Array([7]))).toBe(false)
    expect(isPlainObject(Option.some(1))).toBe(false)
  })

  it('rejects null and primitives', () => {
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject('state')).toBe(false)
  })
})

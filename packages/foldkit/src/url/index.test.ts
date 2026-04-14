import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import { Url, fromString, toString } from './index.js'

describe('fromString', () => {
  it('parses a full URL with all parts', () => {
    const result = fromString('https://example.com:8080/path?q=1#hash')
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.protocol).toBe('https:')
      expect(result.value.host).toBe('example.com')
      expect(Option.getOrNull(result.value.port)).toBe('8080')
      expect(result.value.pathname).toBe('/path')
      expect(Option.getOrNull(result.value.search)).toBe('q=1')
      expect(Option.getOrNull(result.value.hash)).toBe('hash')
    }
  })

  it('parses a URL without port', () => {
    const result = fromString('https://example.com/path')
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(Option.isNone(result.value.port)).toBe(true)
    }
  })

  it('parses a URL without search or hash', () => {
    const result = fromString('https://example.com/path')
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(Option.isNone(result.value.search)).toBe(true)
      expect(Option.isNone(result.value.hash)).toBe(true)
    }
  })

  it('parses root path', () => {
    const result = fromString('https://example.com/')
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.pathname).toBe('/')
    }
  })

  it('parses a URL with only search', () => {
    const result = fromString('https://example.com/path?key=value')
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(Option.getOrNull(result.value.search)).toBe('key=value')
      expect(Option.isNone(result.value.hash)).toBe(true)
    }
  })

  it('parses a URL with only hash', () => {
    const result = fromString('https://example.com/path#section')
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(Option.isNone(result.value.search)).toBe(true)
      expect(Option.getOrNull(result.value.hash)).toBe('section')
    }
  })

  it('returns None for invalid strings', () => {
    const result = fromString('not-a-url')
    expect(Option.isNone(result)).toBe(true)
  })
})

describe('toString', () => {
  it('serializes a full URL', () => {
    const url: Url = {
      protocol: 'https:',
      host: 'example.com',
      port: Option.some('8080'),
      pathname: '/path',
      search: Option.some('q=1'),
      hash: Option.some('hash'),
    }
    expect(toString(url)).toBe('https://example.com:8080/path?q=1#hash')
  })

  it('serializes without optional parts', () => {
    const url: Url = {
      protocol: 'https:',
      host: 'example.com',
      port: Option.none(),
      pathname: '/path',
      search: Option.none(),
      hash: Option.none(),
    }
    expect(toString(url)).toBe('https://example.com/path')
  })

  it('serializes root path', () => {
    const url: Url = {
      protocol: 'https:',
      host: 'example.com',
      port: Option.none(),
      pathname: '/',
      search: Option.none(),
      hash: Option.none(),
    }
    expect(toString(url)).toBe('https://example.com/')
  })
})

describe('round-trip', () => {
  it('fromString then toString preserves the URL', () => {
    const original = 'https://example.com:3000/api/users?page=2#top'
    const parsed = fromString(original)
    expect(Option.isSome(parsed)).toBe(true)
    if (Option.isSome(parsed)) {
      expect(toString(parsed.value)).toBe(original)
    }
  })

  it('round-trips a simple URL', () => {
    const original = 'https://example.com/'
    const parsed = fromString(original)
    expect(Option.isSome(parsed)).toBe(true)
    if (Option.isSome(parsed)) {
      expect(toString(parsed.value)).toBe(original)
    }
  })
})

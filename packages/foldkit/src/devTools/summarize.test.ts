import { describe, expect, it } from 'vitest'

import { formatPathNotFound, resolvePath, summarizeValue } from './summarize.js'

describe('resolvePath', () => {
  const model = {
    route: { _tag: 'Home' },
    session: { user: { id: 'u1', name: 'Alice' } },
    cards: [
      { id: 'c1', title: 'A' },
      { id: 'c2', title: 'B' },
      { id: 'c3', title: 'C' },
    ],
  }

  it('resolves the bare root path to the whole value', () => {
    const result = resolvePath(model, 'root')
    expect(result).toEqual({ _tag: 'Found', value: model, atPath: 'root' })
  })

  it('resolves a top-level field', () => {
    const result = resolvePath(model, 'root.route')
    expect(result).toEqual({
      _tag: 'Found',
      value: { _tag: 'Home' },
      atPath: 'root.route',
    })
  })

  it('resolves a nested record path', () => {
    const result = resolvePath(model, 'root.session.user.name')
    expect(result).toEqual({
      _tag: 'Found',
      value: 'Alice',
      atPath: 'root.session.user.name',
    })
  })

  it('resolves an array index segment', () => {
    const result = resolvePath(model, 'root.cards.1')
    expect(result).toEqual({
      _tag: 'Found',
      value: { id: 'c2', title: 'B' },
      atPath: 'root.cards.1',
    })
  })

  it('rejects paths that do not start with root', () => {
    const result = resolvePath(model, 'session.user')
    expect(result._tag).toBe('NotFound')
    if (result._tag === 'NotFound') {
      expect(result.reason).toMatch(/must start with 'root'/)
    }
  })

  it('reports availableKeys when a key is missing', () => {
    const result = resolvePath(model, 'root.facility')
    expect(result._tag).toBe('NotFound')
    if (result._tag === 'NotFound') {
      expect(result.failedAt).toBe('root')
      expect(new Set(result.availableKeys)).toEqual(
        new Set(['route', 'session', 'cards']),
      )
    }
  })

  it('reports the failure point for nested misses', () => {
    const result = resolvePath(model, 'root.session.user.email')
    expect(result._tag).toBe('NotFound')
    if (result._tag === 'NotFound') {
      expect(result.failedAt).toBe('root.session.user')
      expect(new Set(result.availableKeys)).toEqual(new Set(['id', 'name']))
    }
  })

  it('reports out-of-bounds array indices as NotFound', () => {
    const result = resolvePath(model, 'root.cards.99')
    expect(result._tag).toBe('NotFound')
    if (result._tag === 'NotFound') {
      expect(result.failedAt).toBe('root.cards')
    }
  })

  it('rejects non-integer segments against an array', () => {
    const fractional = resolvePath(model, 'root.cards.1.5')
    expect(fractional._tag).toBe('NotFound')

    const nonNumeric = resolvePath(model, 'root.cards.abc')
    expect(nonNumeric._tag).toBe('NotFound')
    if (nonNumeric._tag === 'NotFound') {
      expect(nonNumeric.failedAt).toBe('root.cards')
    }
  })

  it('reports descent into a primitive as NotFound', () => {
    const result = resolvePath(model, 'root.session.user.name.first')
    expect(result._tag).toBe('NotFound')
    if (result._tag === 'NotFound') {
      expect(result.failedAt).toBe('root.session.user.name')
      expect(result.reason).toMatch(/Cannot descend into a primitive/)
    }
  })
})

describe('formatPathNotFound', () => {
  it('appends available keys when present', () => {
    const formatted = formatPathNotFound({
      _tag: 'NotFound',
      failedAt: 'root',
      reason: "No 'facility' at 'root'.",
      availableKeys: ['route', 'session'],
    })
    expect(formatted).toBe(
      "No 'facility' at 'root'. Available keys: route, session.",
    )
  })

  it('omits the available keys hint when there are none', () => {
    const formatted = formatPathNotFound({
      _tag: 'NotFound',
      failedAt: '',
      reason: "Path must start with 'root'. Received: 'oops'.",
      availableKeys: [],
    })
    expect(formatted).toBe("Path must start with 'root'. Received: 'oops'.")
  })
})

describe('summarizeValue', () => {
  it('passes primitives through unchanged', () => {
    expect(summarizeValue(42)).toBe(42)
    expect(summarizeValue(true)).toBe(true)
    expect(summarizeValue(null)).toBe(null)
    expect(summarizeValue(undefined)).toBe(undefined)
  })

  it('passes short strings through', () => {
    expect(summarizeValue('hello')).toBe('hello')
  })

  it('truncates long strings', () => {
    const long = 'x'.repeat(500)
    expect(summarizeValue(long)).toEqual({
      _summary: 'string',
      length: 500,
      head: 'x'.repeat(200),
    })
  })

  it('collapses arrays to length plus head/last sample', () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
      id: `c${index}`,
    }))
    expect(summarizeValue(items)).toEqual({
      _summary: 'array',
      length: 25,
      sample: [{ id: 'c0' }, { id: 'c24' }],
    })
  })

  it('emits all elements when an array fits within the sample budget', () => {
    expect(summarizeValue([1, 2])).toEqual({
      _summary: 'array',
      length: 2,
      sample: [1, 2],
    })
  })

  it('walks records up to a depth of 3', () => {
    const value = {
      a: {
        b: {
          c: {
            d: { deep: 'too far' },
          },
        },
      },
    }
    expect(summarizeValue(value)).toEqual({
      a: {
        b: {
          c: { _summary: 'record', keys: ['d'] },
        },
      },
    })
  })

  it('preserves _tag fields on tagged unions and summarizes large data siblings', () => {
    const remoteOk = {
      _tag: 'Ok',
      data: Array.from({ length: 25 }, (_, index) => ({ id: index })),
    }
    expect(summarizeValue(remoteOk)).toEqual({
      _tag: 'Ok',
      data: {
        _summary: 'array',
        length: 25,
        sample: [{ id: 0 }, { id: 24 }],
      },
    })
  })

  it('produces JSON-serializable output for a representative model', () => {
    const model = {
      route: { _tag: 'FacilityDetail', facilityId: 'f1' },
      remote: {
        _tag: 'Ok',
        data: Array.from({ length: 50 }, (_, index) => ({
          id: `u${index}`,
          notes: 'x'.repeat(300),
        })),
      },
    }
    expect(() => JSON.stringify(summarizeValue(model))).not.toThrow()
  })
})

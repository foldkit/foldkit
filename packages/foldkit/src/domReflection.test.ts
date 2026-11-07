import { Array } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { assertStyleIsRepresentable } from './domReflection.js'

const ENTRIES_PAST_CACHE_LIMIT = 5000

describe('assertStyleIsRepresentable', () => {
  it('accepts a representable style on every call', () => {
    const style = { left: '12px', '--tint': 'rgb(1, 2, 3)' }

    expect(() => assertStyleIsRepresentable(style)).not.toThrow()
    expect(() => assertStyleIsRepresentable(style)).not.toThrow()
  })

  it('refuses each unrepresentable entry on every call', () => {
    const cases: ReadonlyArray<
      Readonly<{ style: Record<string, unknown>; error: RegExp }>
    > = [
      { style: { remove: 'opacity' }, error: /lifecycle control/ },
      { style: { 'color; position': 'fixed' }, error: /cannot be represented/ },
      { style: { notARealProperty: 'x' }, error: /not a CSSStyleDeclaration/ },
      { style: { opacity: 0.5 }, error: /must be a string/ },
      { style: { color: 'red; position: fixed' }, error: /unsafe CSS/ },
      { style: { '--overlay': 'red !important' }, error: /unsafe CSS/ },
    ]

    for (const { style, error } of cases) {
      expect(() => assertStyleIsRepresentable(style)).toThrow(error)
      expect(() => assertStyleIsRepresentable(style)).toThrow(error)
    }
  })

  it('refuses an unsafe value for a property that passed with a safe one', () => {
    expect(() => assertStyleIsRepresentable({ color: 'red' })).not.toThrow()
    expect(() =>
      assertStyleIsRepresentable({ color: 'red; position: fixed' }),
    ).toThrow(/unsafe CSS/)
  })

  it('refuses two spellings of one declaration after each passed alone', () => {
    expect(() => assertStyleIsRepresentable({ fontSize: '1px' })).not.toThrow()
    expect(() =>
      assertStyleIsRepresentable({ 'font-size': '1px' }),
    ).not.toThrow()
    expect(() =>
      assertStyleIsRepresentable({ fontSize: '1px', 'font-size': '1px' }),
    ).toThrow(/both name the "font-size"/)
  })

  it('reports a duplicate declaration before the later entry value', () => {
    const style = { fontSize: '1px', 'font-size': 1 }

    expect(() => assertStyleIsRepresentable(style)).toThrow(/both name/)
    expect(() => assertStyleIsRepresentable(style)).toThrow(/both name/)
  })

  it('checks every entry after more distinct values than it remembers', () => {
    Array.forEach(Array.range(1, ENTRIES_PAST_CACHE_LIMIT), offset => {
      assertStyleIsRepresentable({ left: `${offset}px` })
    })

    expect(() => assertStyleIsRepresentable({ left: '1px' })).not.toThrow()
    expect(() =>
      assertStyleIsRepresentable({ left: '1px', 'left-': '1px' }),
    ).toThrow(/not a CSSStyleDeclaration/)
    expect(() => assertStyleIsRepresentable({ left: '1px; top: 0' })).toThrow(
      /unsafe CSS/,
    )
  })
})

import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { makeModifyFieldsFor, modifyFields } from './index.js'

describe('modifyFields', () => {
  it('transforms specified fields', () => {
    const result = modifyFields(
      { count: 0, name: 'test' },
      { count: n => n + 1 },
    )
    expect(result).toStrictEqual({ count: 1, name: 'test' })
  })

  it('supports curried form', () => {
    const inc = modifyFields<
      { count: number; name: string },
      { count: (a: number) => number }
    >({
      count: n => n + 1,
    })
    const result = inc({ count: 0, name: 'test' })
    expect(result).toStrictEqual({ count: 1, name: 'test' })
  })

  it('preserves untransformed fields', () => {
    const result = modifyFields(
      { a: 1, b: 'hello', c: true },
      { a: n => n * 2 },
    )
    expect(result).toStrictEqual({ a: 2, b: 'hello', c: true })
  })

  it('preserves branded source fields in data-first calls', () => {
    const Brand: unique symbol = Symbol()
    type Branded = Readonly<{
      count: number
      name: string
      [Brand]: true
    }>
    const branded: Branded = { count: 1, name: 'test', [Brand]: true }
    const result = modifyFields(branded, { count: count => count + 1 })

    expect(result).toStrictEqual({ count: 2, name: 'test', [Brand]: true })
    expectTypeOf(result).toExtend<Branded>()
  })

  it('retains narrower transformed fields and rejects widening', () => {
    const state: Readonly<{ status: 'Idle' | 'Ready' }> = { status: 'Idle' }
    const ready = modifyFields(state, { status: () => 'Ready' })
    const widenStatus = (): string => 'Ready'

    expectTypeOf(ready.status).toEqualTypeOf<'Ready'>()
    // @ts-expect-error A field transform cannot widen its source field.
    modifyFields(state, { status: widenStatus })
  })

  it('handles empty transforms', () => {
    const obj = { x: 1, y: 2 }
    const result = modifyFields(obj, {})
    expect(result).toBe(obj)
  })

  it('preserves identity when transformed values are unchanged', () => {
    const obj = { count: NaN, details: { name: 'test' } }

    expect(
      modifyFields(obj, {
        count: count => count,
        details: details => details,
      }),
    ).toBe(obj)
    expect(modifyFields<typeof obj, {}>({})(obj)).toBe(obj)

    const replacedDetails = modifyFields(obj, {
      details: () => ({ name: 'test' }),
    })

    expect(replacedDetails).not.toBe(obj)
    expect(replacedDetails.details).not.toBe(obj.details)
    expect(replacedDetails).toEqual(obj)
  })

  it('treats a changed signed zero as a field change', () => {
    const obj = { count: 0 }
    const result = modifyFields(obj, { count: () => -0 })

    expect(result).not.toBe(obj)
    expect(Object.is(result.count, -0)).toBe(true)
    expect(Object.is(obj.count, 0)).toBe(true)
  })

  it('transforms enumerable Symbol fields and preserves other Symbols', () => {
    const Count = Symbol('Count')
    const Details = Symbol('Details')
    const obj = { [Count]: 1, [Details]: { name: 'test' } }
    const result = modifyFields(obj, { [Count]: count => count + 1 })

    expect(result[Count]).toBe(2)
    expect(result[Details]).toBe(obj[Details])
    expect(modifyFields(obj, { [Count]: count => count })).toBe(obj)
  })

  it('reads and transforms each source field once in source key order', () => {
    const calls: Array<string> = []
    const Last = Symbol('Last')
    const source = {
      get first() {
        calls.push('read first')
        return 1
      },
      get second() {
        calls.push('read second')
        return 2
      },
      get [Last]() {
        calls.push('read last')
        return 3
      },
    }
    const transforms = {
      [Last](value: number) {
        expect(this).toBe(transforms)
        calls.push('transform last')
        return value
      },
      second(value: number) {
        expect(this).toBe(transforms)
        calls.push('transform second')
        return value
      },
      first(value: number) {
        expect(this).toBe(transforms)
        calls.push('transform first')
        return value + 1
      },
    }
    const result = modifyFields(source, transforms)

    expect(calls).toEqual([
      'read first',
      'transform first',
      'read second',
      'transform second',
      'read last',
      'transform last',
    ])
    expect(result).toEqual({ first: 2, second: 2, [Last]: 3 })
    expect(
      Object.getOwnPropertyDescriptor(result, 'first')?.get,
    ).toBeUndefined()
  })

  it('ignores inherited and unknown transformers but applies nonenumerable own transformers', () => {
    const unexpectedTransform = () => {
      throw new Error('This transformer has no source field')
    }
    const source = { count: 1, name: 'test' }
    const transforms = { count: unexpectedTransform }
    Object.setPrototypeOf(transforms, { name: unexpectedTransform })
    Object.defineProperty(transforms, 'count', {
      value: (count: number) => count + 1,
      enumerable: false,
    })
    Object.defineProperty(transforms, 'unknown', {
      value: unexpectedTransform,
      enumerable: true,
    })
    Object.setPrototypeOf(source, { inherited: true })
    Object.defineProperty(source, 'hidden', { value: true })
    Object.defineProperty(transforms, 'hidden', {
      value: unexpectedTransform,
    })

    const result = modifyFields(source, transforms)

    expect(result).toEqual({ count: 2, name: 'test' })
    expect(Reflect.ownKeys(result)).toEqual(['count', 'name'])
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  })

  it('copies an own __proto__ field without changing the output prototype', () => {
    const originalPrototype = { name: 'original' }
    const nextPrototype = { name: 'next' }
    const source = { ['__proto__']: originalPrototype, count: 1 }
    const result = modifyFields(source, {
      ['__proto__']: () => nextPrototype,
    })

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    expect(Object.hasOwn(result, '__proto__')).toBe(true)
    expect(result.__proto__).toBe(nextPrototype)
    expect(source.__proto__).toBe(originalPrototype)
  })

  it('rejects keys not present in the source object', () => {
    // @ts-expect-error - 'typo' is not a key of { count: number }
    modifyFields({ count: 0 }, { typo: (n: number) => n + 1 })
  })
})

describe('makeModifyFieldsFor', () => {
  it('shares identity preservation while retaining refined Model fields', () => {
    const modifyCount = makeModifyFieldsFor<{ count: number }>()
    const model = { count: 1, details: { name: 'test' } }
    const unchanged = modifyCount(model, { count: count => count })
    const incremented = modifyCount(model, { count: count => count + 1 })

    expect(unchanged).toBe(model)
    expect(incremented).toEqual({ count: 2, details: model.details })
    expect(incremented.details).toBe(model.details)
    expectTypeOf(incremented).toEqualTypeOf<typeof model>()
  })
})

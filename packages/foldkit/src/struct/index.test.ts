import { Struct } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { makeModifyFieldsFor, modifyFields } from './index.js'

const symbolKey = Symbol('symbolKey')

const makeAwkwardStruct = (): Record<PropertyKey, unknown> => {
  const struct: Record<PropertyKey, unknown> = {
    name: 'test',
    2: 'two',
    [symbolKey]: 'symbol',
    1: 'one',
    count: 0,
  }
  Object.defineProperty(struct, '__proto__', {
    value: 'own proto',
    enumerable: true,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(struct, 'hidden', {
    value: 'hidden',
    enumerable: false,
  })
  return struct
}

const awkwardTransforms = {
  count: (value: unknown) => `count ${String(value)}`,
  1: (value: unknown) => `index ${String(value)}`,
  [symbolKey]: (value: unknown) => `symbol ${String(value)}`,
  __proto__: (value: unknown) => `proto ${String(value)}`,
  hidden: (value: unknown) => `transformed ${String(value)}`,
  missing: (value: unknown) => `missing ${String(value)}`,
}

const describeStruct = (struct: object) =>
  Reflect.ownKeys(struct).map(key => [
    key,
    Object.getOwnPropertyDescriptor(struct, key),
  ])

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

  it('handles empty transforms', () => {
    const obj = { x: 1, y: 2 }
    const result = modifyFields(obj, {})
    expect(result).toStrictEqual({ x: 1, y: 2 })
  })

  it('rejects keys not present in the source object', () => {
    // @ts-expect-error - 'typo' is not a key of { count: number }
    modifyFields({ count: 0 }, { typo: (n: number) => n + 1 })
  })

  it('returns the same keys, order, and values as Struct.evolve', () => {
    const struct = makeAwkwardStruct()
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const result = modifyFields(struct, awkwardTransforms as any)
    const expected = Struct.evolve(struct, awkwardTransforms)

    expect(describeStruct(result)).toStrictEqual(describeStruct(expected))
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  })

  it('leaves the source struct unchanged', () => {
    const struct = { count: 0, name: 'test' }
    const result = modifyFields(struct, { count: n => n + 1 })

    expect(result).not.toBe(struct)
    expect(struct).toStrictEqual({ count: 0, name: 'test' })
  })
})

describe('makeModifyFieldsFor', () => {
  it('returns the same keys, order, and values as Struct.evolve', () => {
    const struct = makeAwkwardStruct()
    const modifyAwkwardFields = makeModifyFieldsFor<Record<string, unknown>>()
    const result = modifyAwkwardFields(struct, awkwardTransforms)
    const expected = Struct.evolve(struct, awkwardTransforms)

    expect(describeStruct(result)).toStrictEqual(describeStruct(expected))
  })

  it('keeps fields outside the base shape', () => {
    const modifyCount = makeModifyFieldsFor<{ count: number }>()
    const result = modifyCount(
      { count: 0, name: 'test' },
      { count: n => n + 1 },
    )

    expect(result).toStrictEqual({ count: 1, name: 'test' })
  })
})

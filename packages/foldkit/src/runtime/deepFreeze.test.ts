import { describe, it } from '@effect/vitest'
import { Equal, Hash, Option } from 'effect'
import { expect } from 'vitest'

import { deepFreeze } from './deepFreeze.js'

describe('deepFreeze', () => {
  it('returns primitives unchanged', () => {
    expect(deepFreeze(null)).toBe(null)
    expect(deepFreeze(undefined)).toBe(undefined)
    expect(deepFreeze(0)).toBe(0)
    expect(deepFreeze('')).toBe('')
    expect(deepFreeze(false)).toBe(false)
    expect(deepFreeze(Number.NaN)).toBeNaN()
  })

  it('freezes arrays so push throws', () => {
    const array = [1, 2, 3]
    deepFreeze(array)
    expect(Object.isFrozen(array)).toBe(true)
    expect(() => array.push(4)).toThrow(TypeError)
  })

  it('freezes nested arrays recursively', () => {
    const array = [
      [1, 2],
      [3, 4],
    ]
    deepFreeze(array)
    expect(Object.isFrozen(array)).toBe(true)
    expect(Object.isFrozen(array[0])).toBe(true)
    expect(Object.isFrozen(array[1])).toBe(true)
  })

  it('freezes nested plain objects recursively', () => {
    const model = {
      user: { name: 'test', address: { city: 'NY' } },
      items: [{ id: 1 }, { id: 2 }],
    }
    deepFreeze(model)
    expect(Object.isFrozen(model)).toBe(true)
    expect(Object.isFrozen(model.user)).toBe(true)
    expect(Object.isFrozen(model.user.address)).toBe(true)
    expect(Object.isFrozen(model.items)).toBe(true)
    expect(Object.isFrozen(model.items[0])).toBe(true)
  })

  it('is idempotent by reference', () => {
    const model = { count: 0 }
    const first = deepFreeze(model)
    const second = deepFreeze(first)
    expect(second).toBe(first)
    expect(second).toBe(model)
  })

  it('handles cycles without infinite recursion', () => {
    type Node = { label: string; self?: Node }
    const node: Node = { label: 'root' }
    node.self = node
    expect(() => deepFreeze(node)).not.toThrow()
    expect(Object.isFrozen(node)).toBe(true)
  })

  it('returns already-frozen input unchanged', () => {
    const frozen = Object.freeze({ a: 1 })
    expect(deepFreeze(frozen)).toBe(frozen)
  })

  it('leaves Date instances untouched', () => {
    const model = { createdAt: new Date(0) }
    deepFreeze(model)
    expect(Object.isFrozen(model.createdAt)).toBe(false)
  })

  it('leaves Map instances untouched', () => {
    const map = new Map<string, number>([['a', 1]])
    const model = { map }
    deepFreeze(model)
    expect(Object.isFrozen(map)).toBe(false)
    expect(() => map.set('b', 2)).not.toThrow()
  })

  it('leaves Set instances untouched', () => {
    const set = new Set([1, 2])
    const model = { set }
    deepFreeze(model)
    expect(Object.isFrozen(set)).toBe(false)
    expect(() => set.add(3)).not.toThrow()
  })

  it('leaves class instances untouched', () => {
    class Counter {
      constructor(public count = 0) {}
    }
    const counter = new Counter()
    const model = { counter }
    deepFreeze(model)
    expect(Object.isFrozen(counter)).toBe(false)
    expect(() => {
      counter.count = 1
    }).not.toThrow()
  })

  it('walks into Option.some payload but leaves the Some wrapper intact', () => {
    const payload = { value: 1 }
    const option = Option.some(payload)
    deepFreeze(option)
    expect(Object.isFrozen(option)).toBe(false)
    expect(Object.isFrozen(payload)).toBe(true)
    expect(() => {
      payload.value = 2
    }).toThrow(TypeError)
  })

  it('leaves Option.none untouched', () => {
    const option = Option.none()
    deepFreeze(option)
    expect(Object.isFrozen(option)).toBe(false)
  })

  it('preserves Hash.hash and Equal.equals on Options after freezing', () => {
    const payload = { id: 42 }
    const a = Option.some(payload)
    const b = Option.some(payload)
    deepFreeze(a)
    deepFreeze(b)
    expect(() => Hash.hash(a)).not.toThrow()
    expect(() => Equal.equals(a, b)).not.toThrow()
    expect(Equal.equals(a, b)).toBe(true)
  })
})

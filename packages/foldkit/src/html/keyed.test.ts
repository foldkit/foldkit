import { describe, expect, it } from 'vitest'

import { inertHtml as ih } from './index.js'

describe('keyed', () => {
  it('preserves every PropertyKey without coercion', () => {
    const keys: ReadonlyArray<PropertyKey> = [1, '1', Symbol('1')]

    for (const key of keys) {
      const vnode = ih.keyed('div')(key)
      expect(vnode?.key).toBe(key)
    }
  })
})

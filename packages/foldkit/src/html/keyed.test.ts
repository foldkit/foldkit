import { describe, expect, it } from 'vitest'

import { isClientOnlyProperty } from '../propertyProvenance.js'
import { customElement, inertHtml as ih } from './index.js'

describe('keyed', () => {
  it('preserves every PropertyKey without coercion', () => {
    const keys: ReadonlyArray<PropertyKey> = [1, '1', Symbol('1')]

    for (const key of keys) {
      const vnode = ih.keyed('div')(key)
      expect(vnode?.key).toBe(key)
    }
  })

  it('preserves property reflection across direct, keyed, and dynamic tags', () => {
    const clientOnlyType = [
      ih.div([ih.Type('button')]),
      ih.keyed('div')('keyed-div', [ih.Type('button')]),
      customElement<never>()('DIV')([ih.Type('button')]),
    ]
    for (const vnode of clientOnlyType) {
      expect(isClientOnlyProperty(vnode?.data?.props, 'type')).toBe(true)
    }

    const reflectedType = [
      ih.input([ih.Type('button')]),
      ih.keyed('input')('keyed-input', [ih.Type('button')]),
      customElement<never>()('INPUT')([ih.Type('button')]),
    ]
    for (const vnode of reflectedType) {
      expect(isClientOnlyProperty(vnode?.data?.props, 'type')).toBe(false)
    }
  })

  it('preserves content and element-state refusals across tag paths', () => {
    const conflictingOutputBuilders = [
      () => ih.output([ih.Value('model')], ['child']),
      () => ih.keyed('output')('keyed-output', [ih.Value('model')], ['child']),
      () => customElement<never>()('OUTPUT')([ih.Value('model')], ['child']),
    ]
    for (const build of conflictingOutputBuilders) {
      expect(build).toThrow(
        '[foldkit] <output> was given both a controlled value and children.',
      )
    }

    const invalidListItemBuilders = [
      () => ih.li([ih.Value('1.5')]),
      () => ih.keyed('li')('keyed-li', [ih.Value('1.5')]),
      () => customElement<never>()('LI')([ih.Value('1.5')]),
    ]
    for (const build of invalidListItemBuilders) {
      expect(build).toThrow('<li> reads value as an integer')
    }

    const fileInputBuilders = [
      () => ih.input([ih.Type('file'), ih.Value('secret')]),
      () =>
        ih.keyed('input')('keyed-file', [ih.Type('file'), ih.Value('secret')]),
      () =>
        customElement<never>()('INPUT')([ih.Type('file'), ih.Value('secret')]),
    ]
    for (const build of fileInputBuilders) {
      expect(build).toThrow('<input type="file"> was given a value')
    }
  })
})

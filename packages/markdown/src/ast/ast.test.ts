import { describe, expect, it } from 'vitest'

import { decodeDocument } from './ast.js'

const wireDocument = (): unknown => ({
  blocks: [
    {
      _tag: 'Heading',
      level: 1,
      content: [{ _tag: 'Text', value: 'Title' }],
    },
    {
      _tag: 'Paragraph',
      content: [{ _tag: 'Text', value: 'Prose.' }],
    },
  ],
})

describe('decodeDocument', () => {
  it('returns the first document when one wire object is decoded again', () => {
    const wire = wireDocument()

    expect(decodeDocument(wire)).toBe(decodeDocument(wire))
  })

  it('decodes distinct wire objects independently', () => {
    const first = decodeDocument(wireDocument())
    const second = decodeDocument(wireDocument())

    expect(first).not.toBe(second)
    expect(first).toStrictEqual(second)
  })

  it('throws on a block outside the markdown vocabulary, every time', () => {
    const wire = { blocks: [{ _tag: 'Marquee' }] }

    expect(() => decodeDocument(wire)).toThrowError('at ["blocks"][0]')
    expect(() => decodeDocument(wire)).toThrowError('at ["blocks"][0]')
  })

  it('throws on input that is not an object', () => {
    expect(() => decodeDocument('not a document')).toThrowError(
      'Expected object',
    )
  })

  it('bypasses the cache when override options are passed', () => {
    const wire = wireDocument()
    const cached = decodeDocument(wire)
    const overridden = decodeDocument(wire, {})

    expect(overridden).not.toBe(cached)
    expect(overridden).toStrictEqual(cached)
    expect(decodeDocument(wire)).toBe(cached)
  })
})

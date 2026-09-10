import { Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion, taggedStruct } from '../schema/index.js'
import {
  indexMessageSchemaDocument,
  narrowToVariant,
  variantTagsAtPathPrefix,
} from './schemaSummarize.js'

const expectSome = <A>(option: Option.Option<A>): A => {
  expect(Option.isSome(option)).toBe(true)
  return Option.getOrThrow(option)
}

const ChildMessage = defineMessageUnion({ Opened: {}, Closed: {} })

const Message = defineMessageUnion({
  Completed: {},
  ScrolledSidebar: { scroll: Schema.Number },
  ClickedLink: { href: Schema.String },
  GotChildMessage: { message: ChildMessage },
  WithMaybeNote: { maybeNote: Schema.Option(Schema.String) },
})

const document = Schema.toJsonSchemaDocument(Message)

describe('indexMessageSchemaDocument', () => {
  it('returns one entry per top-level variant', () => {
    const entries = expectSome(indexMessageSchemaDocument(document))
    expect(entries.map(entry => entry.tag)).toEqual([
      'Completed',
      'ScrolledSidebar',
      'ClickedLink',
      'GotChildMessage',
      'WithMaybeNote',
    ])
  })

  it('reports payload field names per variant', () => {
    const entries = expectSome(indexMessageSchemaDocument(document))
    expect(entries).toMatchObject([
      { tag: 'Completed', payloadFields: [] },
      { tag: 'ScrolledSidebar', payloadFields: ['scroll'] },
      { tag: 'ClickedLink', payloadFields: ['href'] },
      { tag: 'GotChildMessage', payloadFields: ['message'] },
      { tag: 'WithMaybeNote', payloadFields: ['maybeNote'] },
    ])
  })

  it('flags tagged-union payload fields via unionFields', () => {
    const entries = expectSome(indexMessageSchemaDocument(document))
    expect(entries).toMatchObject([
      { tag: 'Completed', unionFields: [] },
      { tag: 'ScrolledSidebar', unionFields: [] },
      { tag: 'ClickedLink', unionFields: [] },
      { tag: 'GotChildMessage', unionFields: ['message'] },
      { tag: 'WithMaybeNote', unionFields: ['maybeNote'] },
    ])
  })

  it('flags Schema.Option payload fields via unionFields because they render as tagged unions', () => {
    const entries = expectSome(indexMessageSchemaDocument(document))
    expect(entries).toContainEqual(
      expect.objectContaining({
        tag: 'WithMaybeNote',
        unionFields: ['maybeNote'],
      }),
    )
  })

  it('returns None for non-discriminated documents', () => {
    const plain = Schema.toJsonSchemaDocument(
      Schema.Struct({ name: Schema.String }),
    )
    expect(indexMessageSchemaDocument(plain)).toEqual(Option.none())
  })
})

describe('narrowToVariant', () => {
  it('reduces the top-level anyOf to a single matching variant', () => {
    const narrowed = expectSome(narrowToVariant(document, 'ScrolledSidebar'))
    expect(narrowed).toMatchObject({
      dialect: 'draft-2020-12',
      schema: {
        anyOf: [
          {
            type: 'object',
            properties: {
              _tag: { enum: ['ScrolledSidebar'] },
            },
          },
        ],
      },
    })
  })

  it('preserves the document definitions block', () => {
    const narrowed = expectSome(narrowToVariant(document, 'ScrolledSidebar'))
    expect(narrowed).toHaveProperty('definitions')
  })

  it('collapses nested unions inside a wrapper variant to a summary placeholder', () => {
    const narrowed = expectSome(narrowToVariant(document, 'GotChildMessage'))
    expect(narrowed).toMatchObject({
      schema: {
        anyOf: [
          {
            properties: {
              _tag: { enum: ['GotChildMessage'] },
              message: {
                _summary: 'union',
                variants: [{ tag: 'Opened' }, { tag: 'Closed' }],
              },
            },
          },
        ],
      },
    })
  })

  it('expands a nested path one level deeper than its wrapper', () => {
    const narrowed = expectSome(
      narrowToVariant(document, 'GotChildMessage.Opened'),
    )
    expect(narrowed).toMatchObject({
      schema: {
        anyOf: [
          {
            properties: {
              _tag: { enum: ['GotChildMessage'] },
              message: {
                anyOf: [
                  {
                    properties: { _tag: { enum: ['Opened'] } },
                  },
                ],
              },
            },
          },
        ],
      },
    })
  })

  it('returns None for an unknown top-level variant tag', () => {
    expect(narrowToVariant(document, 'NotAVariant')).toEqual(Option.none())
  })

  it('returns None for an unknown nested variant tag', () => {
    expect(narrowToVariant(document, 'GotChildMessage.NotAVariant')).toEqual(
      Option.none(),
    )
  })

  it('returns None when stepping past a variant without a tagged-union payload', () => {
    expect(narrowToVariant(document, 'ScrolledSidebar.AnyTag')).toEqual(
      Option.none(),
    )
  })

  it('returns None for a variant with multiple tagged-union payload fields', () => {
    const TwoUnions = taggedStruct('TwoUnions', {
      message: ChildMessage,
      fallback: ChildMessage,
    })
    const unionWithTwoUnions = Schema.Union([TwoUnions])
    const twoUnionDoc = Schema.toJsonSchemaDocument(unionWithTwoUnions)
    expect(narrowToVariant(twoUnionDoc, 'TwoUnions.Opened')).toEqual(
      Option.none(),
    )
  })

  it('returns None for an empty variant path', () => {
    expect(narrowToVariant(document, '')).toEqual(Option.none())
  })

  it('collapses discriminated unions inside the definitions block', () => {
    const SharedUnion = Schema.Union([
      Schema.TaggedStruct('Alpha', { value: Schema.String }),
      Schema.TaggedStruct('Beta', { value: Schema.Number }),
    ]).annotate({ identifier: 'SharedUnion' })

    const SharedDocMessage = Schema.Union([
      Schema.TaggedStruct('UsesA', { shared: SharedUnion }),
      Schema.TaggedStruct('UsesB', { shared: SharedUnion }),
    ])

    const sharedDoc = Schema.toJsonSchemaDocument(SharedDocMessage)
    const narrowed = expectSome(narrowToVariant(sharedDoc, 'UsesA'))
    expect(narrowed).toMatchObject({
      definitions: {
        SharedUnion: {
          _summary: 'union',
          variants: [{ tag: 'Alpha' }, { tag: 'Beta' }],
        },
      },
    })
  })
})

describe('variantTagsAtPathPrefix', () => {
  it('returns the top-level tags for an empty prefix', () => {
    const tags = expectSome(variantTagsAtPathPrefix(document, []))
    expect(tags).toEqual([
      'Completed',
      'ScrolledSidebar',
      'ClickedLink',
      'GotChildMessage',
      'WithMaybeNote',
    ])
  })

  it("returns a wrapper's child variant tags when the prefix resolves through one step", () => {
    const tags = expectSome(
      variantTagsAtPathPrefix(document, ['GotChildMessage']),
    )
    expect(tags).toEqual(['Opened', 'Closed'])
  })

  it('returns None when a prefix segment names a variant with no tagged-union payload', () => {
    expect(variantTagsAtPathPrefix(document, ['ScrolledSidebar'])).toEqual(
      Option.none(),
    )
  })

  it('returns None when a prefix segment names no variant', () => {
    expect(variantTagsAtPathPrefix(document, ['NotAVariant'])).toEqual(
      Option.none(),
    )
  })
})

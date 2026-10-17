import { Option, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { typeToString } from './typeToString'
import { TypeDocTypeSchema } from './typedoc'

describe('TypeDoc compatibility', () => {
  test('decodes and renders labeled optional and rest tuple elements', () => {
    const type = Schema.decodeSync(TypeDocTypeSchema)({
      type: 'tuple',
      elements: [
        {
          type: 'namedTupleMember',
          name: 'message',
          isOptional: false,
          element: { type: 'reference', name: 'Message' },
        },
        {
          type: 'namedTupleMember',
          name: 'context',
          isOptional: true,
          element: { type: 'reference', name: 'Context' },
        },
        {
          type: 'rest',
          elementType: {
            type: 'namedTupleMember',
            name: 'values',
            isOptional: false,
            element: {
              type: 'array',
              elementType: { type: 'intrinsic', name: 'number' },
            },
          },
        },
      ],
    })

    expect(typeToString(Option.some(type))).toBe(
      '[message: Message, context?: Context, ...values: Array<number>]',
    )
  })

  test('renders a rest element nested inside its tuple label', () => {
    const type = Schema.decodeSync(TypeDocTypeSchema)({
      type: 'namedTupleMember',
      name: 'context',
      isOptional: false,
      element: {
        type: 'rest',
        elementType: { type: 'reference', name: 'Context' },
      },
    })

    expect(typeToString(Option.some(type))).toBe('...context: Context')
  })

  test('decodes and renders an empty tuple whose elements are omitted', () => {
    const type = Schema.decodeSync(TypeDocTypeSchema)({
      type: 'typeOperator',
      operator: 'readonly',
      target: { type: 'tuple' },
    })

    expect(typeToString(Option.some(type))).toBe('readonly []')
  })
})

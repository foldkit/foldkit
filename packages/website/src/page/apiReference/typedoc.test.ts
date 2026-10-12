import { Option, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { typeToString } from './typeToString'
import { TypeDocTypeSchema } from './typedoc'

describe('TypeDoc compatibility', () => {
  test('decodes and renders an empty tuple whose elements are omitted', () => {
    const type = Schema.decodeSync(TypeDocTypeSchema)({
      type: 'typeOperator',
      operator: 'readonly',
      target: { type: 'tuple' },
    })

    expect(typeToString(Option.some(type))).toBe('readonly []')
  })
})

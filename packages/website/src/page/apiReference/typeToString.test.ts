import { Option, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { typeToString } from './typeToString'
import { TypeDocTypeSchema } from './typedoc'

describe('namedTupleMember', () => {
  test('renders an optional labeled tuple slot', () => {
    const decoded = Schema.decodeUnknownSync(TypeDocTypeSchema)({
      type: 'namedTupleMember',
      name: 'options',
      isOptional: true,
      element: { type: 'intrinsic', name: 'string' },
    })

    expect(typeToString(Option.some(decoded))).toBe('options?: string')
  })
})

import { Schema } from 'effect'
import { expect, test } from 'vitest'

import { makeInstanceSchema } from './instanceSchema.js'

const Instance = makeInstanceSchema<
  'Counter',
  Schema.Struct<{ count: Schema.Number }>
>('Counter', Schema.Struct({ count: Schema.Number }))
type Instance = typeof Instance.Type

const schemaCheck: Schema.Struct<Schema.Struct.Fields> = Instance
void schemaCheck

test('ready occurrences use ordinary snapshot data without construction recipes', () => {
  const instance = Instance.make({ key: 'first', model: { count: 3 } })
  const codec = Schema.toCodecJson(Instance)
  const encoded = Schema.encodeSync(codec)(instance)

  expect(encoded).toEqual({ key: 'first', model: { count: 3 } })
  expect(Schema.decodeSync(codec)(encoded)).toEqual(instance)
  expect(Schema.is(Instance)({ key: 'first', args: [3] })).toBe(false)
})

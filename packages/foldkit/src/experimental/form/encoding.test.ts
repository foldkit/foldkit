import { Effect, Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Form from './form.js'

const RecordContext = Schema.Struct({ recordId: Schema.String })
const SaveData = Schema.Struct({ id: Schema.NumberFromString })

const account = Form.define({
  name: 'Account',
  fields: {
    handle: Form.field({ schema: Schema.NonEmptyString, initial: '' }),
    accepted: Form.field({ schema: Schema.Boolean, initial: true }),
    username: Form.field({
      schema: Schema.String,
      initial: 'ada',
      validate: () => Effect.succeed([]),
    }),
  },
  submit: {
    data: SaveData,
    error: Schema.String,
    context: RecordContext,
    execute: () => Effect.succeed(SaveData.make({ id: 7 })),
    toFieldErrors: () => ({ username: 'Taken' }),
  },
})

const context = { recordId: 'profile-1' }
const validating = account.submit(account.init(), context).model
const submitting = account.update(
  validating,
  account.Message.CompletedValidateField({
    name: 'username',
    generation: 1,
    result: Result.succeed([]),
  }),
).model
const failed = account.update(
  submitting,
  account.Message.CompletedSubmit({
    generation: 1,
    result: Result.fail('Taken'),
  }),
).model
const succeeded = account.update(
  submitting,
  account.Message.CompletedSubmit({
    generation: 1,
    result: Result.succeed(SaveData.make({ id: 7 })),
  }),
).model

describe('Model and Message encoding', () => {
  const ModelJson = Schema.toCodecJson(account.Model)
  const MessageJson = Schema.toCodecJson(account.Message)

  it.each([
    ['an input that fails its encoded-side checks', account.init()],
    ['a Validating submission with its context', validating],
    ['a Submitting submission with its sent inputs', submitting],
    ['a Failed submission with a rejected field', failed],
    ['a Succeeded submission with transformed data', succeeded],
  ])('round-trips a Model holding %s through JSON', (_state, model) => {
    expect(
      Schema.decodeSync(ModelJson)(Schema.encodeSync(ModelJson)(model)),
    ).toEqual(model)
  })

  it.each([
    ['a change to input its Schema rejects', account.changed('handle', '')],
    [
      'a validation completion',
      account.Message.CompletedValidateField({
        name: 'username',
        generation: 1,
        result: Result.fail('Unavailable'),
      }),
    ],
    [
      'a submission completion with transformed data',
      account.Message.CompletedSubmit({
        generation: 1,
        result: Result.succeed(SaveData.make({ id: 7 })),
      }),
    ],
  ])('round-trips %s through JSON', (_message, message) => {
    expect(
      Schema.decodeSync(MessageJson)(Schema.encodeSync(MessageJson)(message)),
    ).toEqual(message)
  })

  it('rejects a change Message whose input does not match its field', () => {
    expect(() =>
      Schema.decodeUnknownSync(account.Message)({
        _tag: 'ChangedField',
        change: { name: 'accepted', input: 'yes' },
      }),
    ).toThrow()
  })
})

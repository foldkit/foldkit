import { Array, Effect, Option, Schema } from 'effect'
import { expect, expectTypeOf, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import * as Form from './form.js'

const encodedOptional = Form.define({
  name: 'EncodedOptional',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    nickname: Form.field({
      schema: Schema.OptionFromOptionalKey(Schema.String),
      initial: { value: Option.none() },
    }),
  },
})

it('stores Option values and encodes None as a missing key', () => {
  const initial = encodedOptional.init()
  expectTypeOf(encodedOptional.values(initial)).toEqualTypeOf<{
    readonly nickname: Option.Option<string>
  }>()
  expect(encodedOptional.values(initial)).toEqual({
    nickname: Option.none(),
  })

  expect(
    Schema.encodeSync(encodedOptional.Model)(initial).fields.nickname.input,
  ).toEqual({})

  const change = encodedOptional.update(
    initial,
    encodedOptional.changed('nickname', { value: Option.some('Ada') }),
  )

  expect(encodedOptional.values(change.model)).toEqual({
    nickname: Option.some('Ada'),
  })

  expect(
    Schema.encodeSync(encodedOptional.Model)(change.model).fields.nickname
      .input,
  ).toEqual({ value: 'Ada' })
  expect(
    encodedOptional.field(change.model, 'nickname').meta.isDefaultValue,
  ).toBe(false)

  const clear = encodedOptional.update(
    change.model,
    encodedOptional.changed('nickname', { value: Option.none() }),
  )

  expect(encodedOptional.values(clear.model)).toEqual({
    nickname: Option.none(),
  })

  expect(encodedOptional.field(clear.model, 'nickname').meta).toEqual({
    isTouched: true,
    isBlurred: false,
    isDirty: true,
    isDefaultValue: true,
  })
  const encoded = Schema.encodeSync(encodedOptional.Model)(clear.model)
  expect(Schema.decodeSync(encodedOptional.Model)(encoded)).toEqual(clear.model)
})

it('uses configured defaults for omitted overrides and captures explicit Option values', () => {
  const form = Form.define({
    name: 'OptionalDefault',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      name: Form.field({
        schema: Schema.OptionFromOptionalKey(Schema.String),
        initial: { value: Option.some('Ada') },
      }),
    },
  })

  expect(form.values(form.init())).toEqual({ name: Option.some('Ada') })
  const initial = form.init({ name: { value: Option.none() } })
  expect(form.values(initial)).toEqual({ name: Option.none() })
  const change = form.update(
    initial,
    form.changed('name', { value: Option.some('Grace') }),
  )

  const reset = form.reset(change.model)
  expect(form.values(reset.model)).toEqual({
    name: Option.none(),
  })
  const reinitialize = form.reinitialize(change.model, {
    name: { value: Option.none() },
  })

  expect(form.values(reinitialize.model)).toEqual({ name: Option.none() })
  const configuredDefaults = form.reinitialize(reinitialize.model)
  expect(form.values(configuredDefaults.model)).toEqual({
    name: Option.some('Ada'),
  })
})

it('requires an Option value and submits Some', () => {
  const isEmpty = vi.fn(Option.isNone<number>)
  const required = Form.define({
    name: 'RequiredOptionalNumber',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      age: Form.field({
        schema: Schema.OptionFromNullOr(Schema.Number),
        initial: { value: Option.none() },
        rules: FieldValidation.makeRules<Option.Option<number>>({
          required: 'Enter an age',
          isEmpty,
        }),
      }),
    },
  })

  const invalid = required.submit(required.init())

  expect(isEmpty).toHaveBeenCalledWith(Option.none())
  expect(required.field(invalid.model, 'age').errors).toEqual(['Enter an age'])
  expect(invalid.commands ?? []).toEqual([])

  const change = required.update(
    invalid.model,
    required.changed('age', { value: Option.some(0) }),
  )

  expect(isEmpty).toHaveBeenCalledWith(Option.some(0))
  const submit = required.submit(change.model)

  expect(required.submission(submit.model)._tag).toBe('Submitting')
  expect(
    Array.head(submit.commands ?? []).pipe(Option.getOrThrow).args,
  ).toEqual({ values: { age: Option.some(0) }, token: { generation: 2 } })
})

it('rejects missing required decoded keys in inputs and encoded Messages', () => {
  const form = Form.define({
    name: 'RequiredNumber',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      age: Form.field({
        schema: Schema.NumberFromString,
        initial: { value: 0 },
      }),
    },
  })

  expect(() => Reflect.apply(form.changed, undefined, ['age', {}])).toThrow()
  expect(() =>
    Schema.decodeUnknownSync(form.Message)({
      _tag: 'ChangedField',
      change: { name: 'age', input: {} },
    }),
  ).toThrow()
  expect(() =>
    Schema.decodeUnknownSync(encodedOptional.Message)({
      _tag: 'ChangedField',
      change: { name: 'nickname' },
    }),
  ).toThrow()
})

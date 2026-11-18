import { Array, Effect, Option, Schema, SchemaTransformation } from 'effect'
import { expect, expectTypeOf, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import * as Form from './form.js'

const OptionalText = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Option(Schema.String),
    SchemaTransformation.transform({
      decode: text => (text === '' ? Option.none() : Option.some(text)),
      encode: Option.getOrElse(() => ''),
    }),
  ),
)

const nicknameForm = Form.define({
  name: 'OptionalText',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    nickname: Form.field({ schema: OptionalText, initial: '' }),
  },
})

it('decodes blank text input as None and stores the text the control holds', () => {
  const initial = nicknameForm.init()

  expectTypeOf(nicknameForm.inputs(initial).nickname).toEqualTypeOf<string>()
  expectTypeOf(
    nicknameForm.field(initial, 'nickname').maybeValue,
  ).toEqualTypeOf<Option.Option<Option.Option<string>>>()
  expect(nicknameForm.field(initial, 'nickname').maybeValue).toEqual(
    Option.some(Option.none()),
  )

  const change = nicknameForm.update(
    initial,
    nicknameForm.changed('nickname', 'Ada'),
  )

  expect(nicknameForm.inputs(change.model)).toEqual({ nickname: 'Ada' })
  expect(nicknameForm.field(change.model, 'nickname').maybeValue).toEqual(
    Option.some(Option.some('Ada')),
  )
  expect(nicknameForm.field(change.model, 'nickname').meta.isDefaultValue).toBe(
    false,
  )

  const clear = nicknameForm.update(
    change.model,
    nicknameForm.changed('nickname', ''),
  )

  expect(nicknameForm.field(clear.model, 'nickname').meta).toEqual({
    isTouched: true,
    isBlurred: false,
    isEdited: true,
    isDefaultValue: true,
  })

  const json = Schema.toCodecJson(nicknameForm.Model)
  expect(Schema.decodeSync(json)(Schema.encodeSync(json)(clear.model))).toEqual(
    clear.model,
  )
})

it('submits the decoded Option value', () => {
  const blank = nicknameForm.submit(nicknameForm.init())
  const filled = nicknameForm.submit(
    nicknameForm.init({ nickname: Option.some('Ada') }),
  )

  expect(Array.head(blank.commands ?? []).pipe(Option.getOrThrow).args).toEqual(
    {
      values: { nickname: Option.none() },
      context: undefined,
      token: { generation: 1 },
    },
  )
  expect(
    Array.head(filled.commands ?? []).pipe(Option.getOrThrow).args,
  ).toEqual({
    values: { nickname: Option.some('Ada') },
    context: undefined,
    token: { generation: 1 },
  })
})

it('encodes Option overrides into inputs and uses configured defaults for omitted overrides', () => {
  const form = Form.define({
    name: 'OptionalDefault',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      name: Form.field({ schema: OptionalText, initial: 'Ada' }),
    },
  })

  expect(form.inputs(form.init())).toEqual({ name: 'Ada' })

  const initial = form.init({ name: Option.none() })
  expect(form.inputs(initial)).toEqual({ name: '' })

  const change = form.update(initial, form.changed('name', 'Grace'))
  const reset = form.reset(change.model)
  expect(form.inputs(reset.model)).toEqual({ name: '' })

  const reinitialize = form.reinitialize(change.model, {
    name: Option.some('Lin'),
  })
  expect(form.inputs(reinitialize.model)).toEqual({ name: 'Lin' })

  const configuredDefaults = form.reinitialize(reinitialize.model)
  expect(form.inputs(configuredDefaults.model)).toEqual({ name: 'Ada' })
})

it('requires an Option value and submits Some', () => {
  const isEmpty = vi.fn(Option.isNone<number>)
  const required = Form.define({
    name: 'RequiredOptionalNumber',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      age: Form.field({
        schema: Schema.OptionFromNullOr(Schema.Number),
        initial: null,
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

  const change = required.update(invalid.model, required.changed('age', 0))

  expect(isEmpty).toHaveBeenCalledWith(Option.some(0))
  const submit = required.submit(change.model)

  expect(required.submission(submit.model)._tag).toBe('Submitting')
  expect(
    Array.head(submit.commands ?? []).pipe(Option.getOrThrow).args,
  ).toEqual({
    values: { age: Option.some(0) },
    context: undefined,
    token: { generation: 2 },
  })
})

it('rejects missing or mistyped inputs in change Messages', () => {
  const form = Form.define({
    name: 'RequiredNumber',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      age: Form.field({ schema: Schema.FiniteFromString, initial: '0' }),
    },
  })

  expect(() => Reflect.apply(form.changed, undefined, ['age', 12])).toThrow()
  expect(() =>
    Schema.decodeUnknownSync(form.Message)({
      _tag: 'ChangedField',
      change: { name: 'age', input: {} },
    }),
  ).toThrow()
  expect(() =>
    Schema.decodeUnknownSync(form.Message)({
      _tag: 'ChangedField',
      change: { name: 'age' },
    }),
  ).toThrow()
})

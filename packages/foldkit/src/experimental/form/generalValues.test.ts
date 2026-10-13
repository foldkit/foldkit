import { Array, Effect, Option, Result, Schema, Struct } from 'effect'
import { expect, expectTypeOf, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import * as Form from './form.js'

const Location = defineTaggedUnion({
  Unspecified: {},
  Coordinates: { latitude: Schema.Number, longitude: Schema.Number },
})
type Location = typeof Location.Type
const preferences = Form.define({
  name: 'Preferences',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    topics: Form.field({
      schema: Schema.Array(Schema.String),
      initial: { value: ['Foldkit'] },
      validateOn: 'Blur',
      rules: FieldValidation.makeRules<ReadonlyArray<string>>({
        required: 'Choose a topic',
        isEmpty: Array.isReadonlyArrayEmpty,
      }),
    }),
    selected: Form.field({
      schema: Schema.OptionFromNullOr(Schema.String),
      initial: { value: Option.none() },
      rules: FieldValidation.makeRules<Option.Option<string>>({
        required: 'Choose an item',
        isEmpty: Option.isNone,
      }),
    }),
    location: Form.field({
      schema: Location,
      initial: { value: Location.Unspecified() },
    }),
  },
})

it('preserves decoded compound values through selectors and Message constructors', () => {
  const initial = preferences.init()
  expectTypeOf(preferences.field(initial, 'topics').value).toEqualTypeOf<
    ReadonlyArray<string>
  >()
  expectTypeOf(preferences.values(initial).selected).toEqualTypeOf<
    Option.Option<string>
  >()
  expectTypeOf(preferences.values(initial).location).toEqualTypeOf<Location>()
  const topicsChange = preferences.update(
    initial,
    preferences.changed('topics', { value: ['Effect', 'Foldkit'] }),
  )
  const selectedChange = preferences.update(
    topicsChange.model,
    preferences.changed('selected', { value: Option.some('Effect') }),
  )
  const locationChange = preferences.update(
    selectedChange.model,
    preferences.Message.ChangedField({
      change: {
        name: 'location',
        input: { value: Location.Coordinates({ latitude: 48, longitude: 2 }) },
      },
    }),
  )

  expect(preferences.values(locationChange.model)).toEqual({
    topics: ['Effect', 'Foldkit'],
    selected: Option.some('Effect'),
    location: Location.Coordinates({ latitude: 48, longitude: 2 }),
  })

  expect(preferences.field(selectedChange.model, 'selected').errors).toEqual([])

  const encoded = Schema.encodeSync(preferences.Model)(locationChange.model)
  expect(
    Schema.decodeUnknownSync(preferences.Model)(
      JSON.parse(JSON.stringify(encoded)),
    ),
  ).toEqual(locationChange.model)
  const messages = [
    preferences.changed('topics', { value: ['Effect'] }),
    preferences.changed('selected', { value: Option.some('Effect') }),
    preferences.changed('location', {
      value: Location.Coordinates({ latitude: 48, longitude: 2 }),
    }),
  ]
  for (const message of messages) {
    const encodedMessage = Schema.encodeSync(preferences.Message)(message)
    expect(
      Schema.decodeUnknownSync(preferences.Message)(
        JSON.parse(JSON.stringify(encodedMessage)),
      ),
    ).toEqual(message)
  }
  expect(() =>
    Schema.decodeUnknownSync(preferences.Message)({
      _tag: 'ChangedField',
      change: { name: 'topics', input: { value: [1] } },
    }),
  ).toThrow()
})

it('uses structural default equality while preserving dirty history', () => {
  const initial = preferences.init({
    selected: { value: Option.some('Effect') },
    location: { value: Location.Coordinates({ latitude: 48, longitude: 2 }) },
  })
  const topicsChange = preferences.update(
    initial,
    preferences.changed('topics', { value: ['Other'] }),
  )
  const topicsReturn = preferences.update(
    topicsChange.model,
    preferences.changed('topics', { value: ['Foldkit'] }),
  )
  const selectedChange = preferences.update(
    topicsReturn.model,
    preferences.changed('selected', { value: Option.some('Effect') }),
  )
  const locationChange = preferences.update(
    selectedChange.model,
    preferences.changed('location', {
      value: Location.Coordinates({ latitude: 48, longitude: 2 }),
    }),
  )
  for (const name of Struct.keys(locationChange.model.fields)) {
    const field = preferences.field(locationChange.model, name)
    expect(field.meta.isDefaultValue).toBe(true)
    expect(field.meta.isDirty).toBe(true)
  }
})

it('honors decoded Schema equivalence annotations', () => {
  const exactNumber = Schema.Number.pipe(
    Schema.overrideToEquivalence(() => Object.is),
  )
  const numeric = Form.define({
    name: 'ExactNumber',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      value: Form.field({ schema: exactNumber, initial: { value: 0 } }),
    },
  })
  const changed = numeric.update(
    numeric.init(),
    numeric.changed('value', { value: -0 }),
  )

  expect(numeric.field(changed.model, 'value').meta.isDefaultValue).toBe(false)
})

it('distinguishes omitted overrides from explicit undefined and null values', () => {
  const presence = Form.define({
    name: 'Presence',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      note: Form.field({
        schema: Schema.Union([Schema.String, Schema.Undefined, Schema.Null]),
        initial: { value: 'Configured' },
      }),
    },
  })

  expect(presence.values(presence.init()).note).toBe('Configured')
  const undefinedInitial = Form.field({
    schema: Schema.UndefinedOr(Schema.String),
    initial: { value: undefined },
  })

  expect(undefinedInitial.initialize().defaultInput.value).toBeUndefined()
  const explicitNull = presence.init({ note: { value: null } })
  const nullChange = presence.update(
    explicitNull,
    presence.changed('note', { value: 'Changed' }),
  )

  const nullReset = presence.reset(nullChange.model)
  expect(presence.values(nullReset.model).note).toBeNull()
  const explicitUndefined = presence.init({ note: { value: undefined } })
  expect(presence.values(explicitUndefined).note).toBeUndefined()
  const changed = presence.update(
    explicitUndefined,
    presence.changed('note', { value: null }),
  )

  expect(presence.values(changed.model).note).toBeNull()
  const undefinedReset = presence.reset(changed.model)
  expect(presence.values(undefinedReset.model).note).toBeUndefined()
  const reinitialized = presence.reinitialize(changed.model, {
    note: { value: undefined },
  })

  expect(presence.values(reinitialized.model).note).toBeUndefined()
  const configuredDefaults = presence.reinitialize(reinitialized.model)
  expect(presence.values(configuredDefaults.model).note).toBe('Configured')
  const undefinedMessage = presence.changed('note', { value: undefined })
  const undefinedChange = presence.update(changed.model, undefinedMessage)
  expect(presence.values(undefinedChange.model).note).toBeUndefined()
  expect(() =>
    Schema.decodeUnknownSync(presence.Message)({
      _tag: 'ChangedField',
      change: { name: 'note' },
    }),
  ).toThrow()
})

it('validates compound empty values and preserves field and repeated-blur identity', () => {
  const initial = preferences.init()
  const topicsChange = preferences.update(
    initial,
    preferences.changed('topics', { value: [] }),
  )

  expect(topicsChange.model.fields.selected).toBe(initial.fields.selected)
  expect(topicsChange.model.fields.location).toBe(initial.fields.location)
  const topicsBlur = preferences.update(
    topicsChange.model,
    preferences.blurred('topics'),
  )

  expect(preferences.field(topicsBlur.model, 'topics').errors).toEqual([
    'Choose a topic',
  ])
  const repeatedBlur = preferences.update(
    topicsBlur.model,
    preferences.blurred('topics'),
  )

  expect(repeatedBlur.model).toBe(topicsBlur.model)

  const invalidSubmit = preferences.submit(repeatedBlur.model)

  expect(preferences.field(invalidSubmit.model, 'selected').errors).toEqual([
    'Choose an item',
  ])
  expect(invalidSubmit.commands ?? []).toEqual([])
})

it('captures compound reset defaults and submission snapshots across immutable changes', () => {
  const initial = preferences.init({
    topics: { value: ['Original'] },
    selected: { value: Option.some('Item') },
  })

  const submitted = preferences.submit(initial)
  const edited = preferences.update(
    submitted.model,
    preferences.changed('topics', { value: ['Edited'] }),
  )

  expect(preferences.submit(edited.model).model).toBe(edited.model)
  expect(
    Array.head(submitted.commands ?? []).pipe(Option.getOrThrow).args,
  ).toEqual({
    values: {
      topics: ['Original'],
      selected: Option.some('Item'),
      location: Location.Unspecified(),
    },
    token: { generation: 1 },
  })

  expect(preferences.values(edited.model).topics).toEqual(['Edited'])
  expect(preferences.values(initial).topics).toEqual(['Original'])
  expect(preferences.values(initial)).not.toBe(preferences.values(initial))
  const reset = preferences.reset(edited.model)
  expect(preferences.values(reset.model).topics).toEqual(['Original'])
  const reinitialized = preferences.reinitialize(reset.model, {
    topics: { value: ['New'] },
    selected: { value: Option.some('New') },
  })
  const newerSubmit = preferences.submit(reinitialized.model)

  expect(
    preferences.update(
      newerSubmit.model,
      preferences.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.succeed(undefined),
      }),
    ).model,
  ).toBe(newerSubmit.model)

  expect(newerSubmit.model.generation).toBe(2)

  const newerEdit = preferences.update(
    newerSubmit.model,
    preferences.changed('topics', { value: [] }),
  )

  expect(
    preferences.values(preferences.reset(newerEdit.model).model).topics,
  ).toEqual(['New'])
})

it('preserves untouched compound states without running their codec checks', () => {
  const check = vi.fn(() => true)
  const CheckedTopic = Schema.String.check(Schema.makeFilter<string>(check))
  const counted = Form.define({
    name: 'Counted',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      text: Form.field({ schema: Schema.String, initial: { value: '' } }),
      topics: Form.field({
        schema: Schema.Array(CheckedTopic),
        initial: { value: ['Effect', 'Foldkit'] },
        validateOn: 'Blur',
      }),
    },
  })
  const initial = counted.init()
  const topics = initial.fields.topics
  check.mockClear()

  const change = counted.update(
    initial,
    counted.changed('text', { value: 'Next' }),
  )

  expect(check).not.toHaveBeenCalled()
  expect(change.model.fields.topics).toBe(topics)
  expect(counted.values(change.model).topics).toBe(topics.input.value)
  expect(counted.field(change.model, 'text').value).toBe('Next')
  expect(counted.field(change.model, 'topics').value).toBe(topics.input.value)
  expect(check).not.toHaveBeenCalled()

  const blur = counted.update(change.model, counted.blurred('text'))
  expect(blur.model.fields.topics).toBe(topics)
  expect(counted.field(blur.model, 'text').meta.isBlurred).toBe(true)
  expect(check).not.toHaveBeenCalled()
})

it('runs current-value rules without decoding compound defaults or values', () => {
  const check = vi.fn(() => true)
  const validateTopic = vi.fn((value: ReadonlyArray<string>) =>
    Array.isReadonlyArrayNonEmpty(value),
  )
  const CheckedTopic = Schema.String.check(Schema.makeFilter<string>(check))
  const counted = Form.define({
    name: 'CountedRules',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      topics: Form.field({
        schema: Schema.Array(CheckedTopic),
        initial: { value: ['Foldkit'] },
        validateOn: 'Blur',
        rules: FieldValidation.makeRules<ReadonlyArray<string>>({
          rules: [[validateTopic, 'Choose a topic']],
        }),
      }),
    },
  })
  const initial = counted.init()
  check.mockClear()
  validateTopic.mockClear()

  const blur = counted.update(initial, counted.blurred('topics'))
  expect(validateTopic).toHaveBeenCalledWith(initial.fields.topics.input.value)
  expect(check).not.toHaveBeenCalled()
  expect(counted.update(blur.model, counted.blurred('topics')).model).toBe(
    blur.model,
  )

  validateTopic.mockClear()
  const submit = counted.submit(blur.model)

  expect(validateTopic).toHaveBeenCalledWith(initial.fields.topics.input.value)
  expect(submit.model.submission._tag).toBe('Submitting')
  expect(check).not.toHaveBeenCalled()

  const reset = counted.reset(submit.model)
  expect(counted.values(reset.model).topics).toBe(
    initial.fields.topics.defaultInput.value,
  )

  expect(counted.field(reset.model, 'topics').meta.isDirty).toBe(false)
  expect(check).not.toHaveBeenCalled()
})

it('rejects compound values that fail decoded checks at input boundaries', () => {
  const CheckedTopic = Schema.String.check(
    Schema.makeFilter<string>(value => value !== 'Rejected'),
  )
  const schema = Schema.Array(CheckedTopic)
  const topics = Form.field({ schema, initial: { value: ['Foldkit'] } })
  const checked = Form.define({
    name: 'CheckedInputs',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { topics },
  })
  const initial = checked.init()

  expect(() => checked.changed('topics', { value: ['Rejected'] })).toThrow()
  expect(() =>
    Schema.decodeSync(checked.Message)({
      _tag: 'ChangedField',
      change: { name: 'topics', input: { value: ['Rejected'] } },
    }),
  ).toThrow()
  expect(() =>
    Schema.decodeSync(checked.Model)({
      ...initial,
      fields: {
        topics: {
          ...initial.fields.topics,
          defaultInput: { value: ['Rejected'] },
        },
      },
    }),
  ).toThrow()
})

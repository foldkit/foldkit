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
      initial: ['Foldkit'],
      validateOn: 'Blur',
      rules: FieldValidation.makeRules<ReadonlyArray<string>>({
        required: 'Choose a topic',
        isEmpty: Array.isReadonlyArrayEmpty,
      }),
    }),
    selected: Form.field({
      schema: Schema.OptionFromNullOr(Schema.String),
      initial: null,
      rules: FieldValidation.makeRules<Option.Option<string>>({
        required: 'Choose an item',
        isEmpty: Option.isNone,
      }),
    }),
    location: Form.field({
      schema: Location,
      initial: Location.Unspecified(),
    }),
  },
})

it('preserves compound inputs through selectors and Message constructors', () => {
  const initial = preferences.init()
  expectTypeOf(preferences.field(initial, 'topics').input).toEqualTypeOf<
    ReadonlyArray<string>
  >()
  expectTypeOf(preferences.inputs(initial).selected).toEqualTypeOf<
    string | null
  >()
  expectTypeOf(preferences.field(initial, 'selected').maybeValue).toEqualTypeOf<
    Option.Option<Option.Option<string>>
  >()
  const topicsChange = preferences.update(
    initial,
    preferences.changed('topics', ['Effect', 'Foldkit']),
  )
  const selectedChange = preferences.update(
    topicsChange.model,
    preferences.changed('selected', 'Effect'),
  )
  const locationChange = preferences.update(
    selectedChange.model,
    preferences.Message.ChangedField({
      change: {
        name: 'location',
        input: Location.Coordinates({ latitude: 48, longitude: 2 }),
      },
    }),
  )

  expect(preferences.inputs(locationChange.model)).toEqual({
    topics: ['Effect', 'Foldkit'],
    selected: 'Effect',
    location: Location.Coordinates({ latitude: 48, longitude: 2 }),
  })
  expect(
    preferences.field(locationChange.model, 'selected').maybeValue,
  ).toEqual(Option.some(Option.some('Effect')))

  expect(preferences.field(selectedChange.model, 'selected').errors).toEqual([])

  const encoded = Schema.encodeSync(preferences.Model)(locationChange.model)
  expect(
    Schema.decodeUnknownSync(preferences.Model)(
      JSON.parse(JSON.stringify(encoded)),
    ),
  ).toEqual(locationChange.model)
  const messages = [
    preferences.changed('topics', ['Effect']),
    preferences.changed('selected', 'Effect'),
    preferences.changed(
      'location',
      Location.Coordinates({ latitude: 48, longitude: 2 }),
    ),
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
      change: { name: 'topics', input: [1] },
    }),
  ).toThrow()
})

it('uses structural default equality while preserving dirty history', () => {
  const initial = preferences.init({
    selected: Option.some('Effect'),
    location: Location.Coordinates({ latitude: 48, longitude: 2 }),
  })
  const topicsChange = preferences.update(
    initial,
    preferences.changed('topics', ['Other']),
  )
  const topicsReturn = preferences.update(
    topicsChange.model,
    preferences.changed('topics', ['Foldkit']),
  )
  const selectedChange = preferences.update(
    topicsReturn.model,
    preferences.changed('selected', 'Effect'),
  )
  const locationChange = preferences.update(
    selectedChange.model,
    preferences.changed(
      'location',
      Location.Coordinates({ latitude: 48, longitude: 2 }),
    ),
  )
  for (const name of Struct.keys(locationChange.model.fields)) {
    const field = preferences.field(locationChange.model, name)
    expect(field.meta.isDefaultValue).toBe(true)
    expect(field.meta.isEdited).toBe(true)
  }
})

it('honors decoded Schema equivalence annotations', () => {
  const exactNumber = Schema.Number.pipe(
    Schema.overrideToEquivalence(() => Object.is),
  )
  const numeric = Form.define({
    name: 'ExactNumber',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { value: Form.field({ schema: exactNumber, initial: 0 }) },
  })
  const changed = numeric.update(numeric.init(), numeric.changed('value', -0))

  expect(numeric.field(changed.model, 'value').meta.isDefaultValue).toBe(false)
})

it('distinguishes omitted overrides from explicit undefined and null values', () => {
  const presence = Form.define({
    name: 'Presence',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      note: Form.field({
        schema: Schema.Union([Schema.String, Schema.Undefined, Schema.Null]),
        initial: 'Configured',
      }),
    },
  })

  expect(presence.inputs(presence.init()).note).toBe('Configured')
  const undefinedInitial = Form.field({
    schema: Schema.UndefinedOr(Schema.String),
    initial: undefined,
  })

  expect(undefinedInitial.initialize().defaultInput).toBeUndefined()
  const explicitNull = presence.init({ note: null })
  const nullChange = presence.update(
    explicitNull,
    presence.changed('note', 'Changed'),
  )

  const nullReset = presence.reset(nullChange.model)
  expect(presence.inputs(nullReset.model).note).toBeNull()
  const explicitUndefined = presence.init({ note: undefined })
  expect(presence.inputs(explicitUndefined).note).toBeUndefined()
  const changed = presence.update(
    explicitUndefined,
    presence.changed('note', null),
  )

  expect(presence.inputs(changed.model).note).toBeNull()
  const undefinedReset = presence.reset(changed.model)
  expect(presence.inputs(undefinedReset.model).note).toBeUndefined()
  const reinitialized = presence.reinitialize(changed.model, {
    note: undefined,
  })

  expect(presence.inputs(reinitialized.model).note).toBeUndefined()
  const configuredDefaults = presence.reinitialize(reinitialized.model)
  expect(presence.inputs(configuredDefaults.model).note).toBe('Configured')
  const undefinedMessage = presence.changed('note', undefined)
  const undefinedChange = presence.update(changed.model, undefinedMessage)
  expect(presence.inputs(undefinedChange.model).note).toBeUndefined()
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
    preferences.changed('topics', []),
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
    topics: ['Original'],
    selected: Option.some('Item'),
  })

  const submitted = preferences.submit(initial)
  const edited = preferences.update(
    submitted.model,
    preferences.changed('topics', ['Edited']),
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
    context: undefined,
    token: { generation: 1 },
  })

  expect(preferences.inputs(edited.model).topics).toEqual(['Edited'])
  expect(preferences.inputs(initial).topics).toEqual(['Original'])
  expect(preferences.inputs(initial)).not.toBe(preferences.inputs(initial))
  const reset = preferences.reset(edited.model)
  expect(preferences.inputs(reset.model).topics).toEqual(['Original'])
  const reinitialized = preferences.reinitialize(reset.model, {
    topics: ['New'],
    selected: Option.some('New'),
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
    preferences.changed('topics', []),
  )

  expect(
    preferences.inputs(preferences.reset(newerEdit.model).model).topics,
  ).toEqual(['New'])
})

it('keeps untouched compound states and their codec checks idle on unrelated edits', () => {
  const check = vi.fn(() => true)
  const CheckedTopic = Schema.String.check(Schema.makeFilter<string>(check))
  const counted = Form.define({
    name: 'Counted',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      text: Form.field({ schema: Schema.String, initial: '' }),
      topics: Form.field({
        schema: Schema.Array(CheckedTopic),
        initial: ['Effect', 'Foldkit'],
        validateOn: 'Blur',
      }),
    },
  })
  const initial = counted.init()
  const topics = initial.fields.topics
  check.mockClear()

  const change = counted.update(initial, counted.changed('text', 'Next'))
  const blur = counted.update(change.model, counted.blurred('text'))

  expect(check).not.toHaveBeenCalled()
  expect(change.model.fields.topics).toBe(topics)
  expect(blur.model.fields.topics).toBe(topics)
  expect(counted.inputs(change.model).topics).toBe(topics.input)
  expect(counted.field(change.model, 'text').input).toBe('Next')
  expect(counted.field(blur.model, 'text').meta.isBlurred).toBe(true)
})

it('decodes the input before running rules on blur and submit', () => {
  const validateTopic = vi.fn((value: ReadonlyArray<string>) =>
    Array.isReadonlyArrayNonEmpty(value),
  )
  const counted = Form.define({
    name: 'CountedRules',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: {
      topics: Form.field({
        schema: Schema.Array(Schema.NonEmptyString),
        initial: ['Foldkit'],
        validateOn: 'Blur',
        rules: FieldValidation.makeRules<ReadonlyArray<string>>({
          rules: [[validateTopic, 'Choose a topic']],
        }),
      }),
    },
  })
  const initial = counted.init()

  const blur = counted.update(initial, counted.blurred('topics'))
  expect(validateTopic).toHaveBeenCalledWith(['Foldkit'])
  expect(counted.update(blur.model, counted.blurred('topics')).model).toBe(
    blur.model,
  )

  validateTopic.mockClear()
  const submit = counted.submit(blur.model)

  expect(validateTopic).not.toHaveBeenCalled()
  expect(submit.model.submission._tag).toBe('Submitting')

  const invalidInput = counted.update(
    counted.reset(submit.model).model,
    counted.changed('topics', ['']),
  )
  validateTopic.mockClear()
  const invalidSubmit = counted.submit(invalidInput.model)

  expect(validateTopic).not.toHaveBeenCalled()
  expect(counted.field(invalidSubmit.model, 'topics').errors).toHaveLength(1)
  expect(counted.submission(invalidSubmit.model)._tag).toBe('Idle')
  expect(counted.field(invalidSubmit.model, 'topics').meta.isEdited).toBe(true)
})

it('stores compound input that fails its checks and rejects mismatched shapes at input boundaries', () => {
  const CheckedTopic = Schema.String.check(
    Schema.makeFilter<string>(value => value !== 'Rejected', {
      message: 'Topic rejected',
    }),
  )
  const topics = Form.field({
    schema: Schema.Array(CheckedTopic),
    initial: ['Foldkit'],
  })
  const checked = Form.define({
    name: 'CheckedInputs',
    submit: { error: Schema.String, execute: () => Effect.void },
    fields: { topics },
  })
  const initial = checked.init()
  const change = checked.update(
    initial,
    checked.changed('topics', ['Rejected']),
  )

  expect(checked.inputs(change.model).topics).toEqual(['Rejected'])
  expect(checked.field(change.model, 'topics').errors).toEqual([
    'Topic rejected',
  ])
  expect(
    Schema.decodeSync(checked.Model)(
      Schema.encodeSync(checked.Model)(change.model),
    ),
  ).toEqual(change.model)
  expect(() =>
    Schema.decodeUnknownSync(checked.Message)({
      _tag: 'ChangedField',
      change: { name: 'topics', input: [1] },
    }),
  ).toThrow()
})

import { Array, Effect, Option, Schema, SchemaTransformation } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import * as Form from './form.js'

const submit = { error: Schema.String, execute: () => Effect.void }

describe('typed inputs', () => {
  const quantity = Form.define({
    name: 'Quantity',
    submit,
    fields: {
      count: Form.field({ schema: Schema.FiniteFromString, initial: '3' }),
      age: Form.field({
        schema: Schema.FiniteFromString.annotate({ message: 'Enter a number' }),
        initial: '',
      }),
    },
  })

  it('stores the input and decodes it into the value', () => {
    const view = quantity.fieldView(quantity.init(), 'count')

    expect(view.input).toBe('3')
    expect(view.maybeValue).toEqual(Option.some(3))
  })

  it('encodes decoded overrides into inputs that become the reset defaults', () => {
    const initial = quantity.init({ count: 4 })
    const change = quantity.update(initial, quantity.changed('count', '9'))

    expect(quantity.inputs(initial).count).toBe('4')
    expect(quantity.inputs(quantity.reset(change.model).model).count).toBe('4')
  })

  it('holds input its Schema rejects and shows the decode message', () => {
    const change = quantity.update(
      quantity.init(),
      quantity.changed('age', '12a'),
    )
    const view = quantity.fieldView(change.model, 'age')

    expect(view.input).toBe('12a')
    expect(view.maybeValue).toEqual(Option.none())
    expect(view.errors).toEqual(['Enter a number'])
  })

  it('shows a decode error when the Schema has no message annotation', () => {
    const change = quantity.update(
      quantity.init(),
      quantity.changed('count', '12a'),
    )

    expect(quantity.fieldView(change.model, 'count').errors).toHaveLength(1)
  })
})

describe('input that fails encoded-side checks', () => {
  const AgeInput = Schema.String.check(
    Schema.isNonEmpty({ message: 'Enter your age' }),
  ).pipe(
    Schema.decodeTo(
      Schema.Finite.annotate({ message: 'Enter a number' }),
      SchemaTransformation.numberFromString,
    ),
  )
  const checked = Form.define({
    name: 'EncodedChecks',
    submit,
    fields: {
      age: Form.field({ schema: AgeInput, initial: '' }),
      tags: Form.field({
        schema: Schema.Array(Schema.NonEmptyString),
        initial: [],
      }),
    },
  })

  it('stores the input and shows the check message as the field error', () => {
    const change = checked.update(checked.init(), checked.changed('age', ''))

    expect(checked.inputs(change.model).age).toBe('')
    expect(checked.fieldView(change.model, 'age').errors).toEqual([
      'Enter your age',
    ])
  })

  it('lets a parent Model Schema construct a Form holding that input', () => {
    const Parent = Schema.Struct({ form: checked.Model })

    expect(() => Parent.make({ form: checked.init() })).not.toThrow()
  })

  it('encodes overrides that fail the checks without throwing', () => {
    const initial = checked.init({ tags: [''] })
    const reinitialize = checked.reinitialize(initial, { tags: ['', 'ok'] })

    expect(checked.inputs(initial).tags).toEqual([''])
    expect(checked.inputs(reinitialize.model).tags).toEqual(['', 'ok'])
  })
})

describe('compound inputs', () => {
  const Location = defineTaggedUnion({
    Unspecified: {},
    Coordinates: { latitude: Schema.Number, longitude: Schema.Number },
  })
  const preferences = Form.define({
    name: 'Preferences',
    submit,
    fields: {
      topics: Form.field({
        schema: Schema.Array(Schema.String),
        initial: ['Foldkit'],
      }),
      favoriteTopic: Form.field({
        schema: Schema.OptionFromNullOr(Schema.String),
        initial: null,
      }),
      location: Form.field({
        schema: Location,
        initial: Location.Unspecified(),
      }),
    },
  })
  const paris = Location.Coordinates({ latitude: 48, longitude: 2 })

  it('stores arrays, nullable inputs, and tagged unions as given', () => {
    const changes = [
      preferences.changed('topics', ['Effect', 'Foldkit']),
      preferences.changed('favoriteTopic', 'Effect'),
      preferences.changed('location', paris),
    ]
    const model = Array.reduce(
      changes,
      preferences.init(),
      (current, message) => preferences.update(current, message).model,
    )

    expect(preferences.inputs(model)).toEqual({
      topics: ['Effect', 'Foldkit'],
      favoriteTopic: 'Effect',
      location: paris,
    })
    expect(preferences.fieldView(model, 'favoriteTopic').maybeValue).toEqual(
      Option.some(Option.some('Effect')),
    )
  })

  it('compares an input with its default by content', () => {
    const initial = preferences.init({ location: paris })
    const away = preferences.update(
      initial,
      preferences.changed('topics', ['Other']),
    )
    const back = preferences.update(
      away.model,
      preferences.changed('topics', ['Foldkit']),
    )
    const sameLocation = preferences.update(
      back.model,
      preferences.changed(
        'location',
        Location.Coordinates({ latitude: 48, longitude: 2 }),
      ),
    )

    expect(
      preferences.fieldView(sameLocation.model, 'topics').meta.isDefaultValue,
    ).toBe(true)
    expect(
      preferences.fieldView(sameLocation.model, 'location').meta.isDefaultValue,
    ).toBe(true)
  })

  it('compares inputs with the equivalence annotated on the field Schema', () => {
    const exactNumber = Schema.Number.pipe(
      Schema.overrideToEquivalence(() => Object.is),
    )
    const exact = Form.define({
      name: 'ExactNumber',
      submit,
      fields: { value: Form.field({ schema: exactNumber, initial: 0 }) },
    })
    const change = exact.update(exact.init(), exact.changed('value', -0))

    expect(exact.fieldView(change.model, 'value').meta.isDefaultValue).toBe(
      false,
    )
  })

  it('leaves the checks of unrelated fields idle on an edit', () => {
    const check = vi.fn(() => true)
    const counted = Form.define({
      name: 'Counted',
      submit,
      fields: {
        text: Form.field({ schema: Schema.String, initial: '' }),
        topics: Form.field({
          schema: Schema.Array(
            Schema.String.check(Schema.makeFilter<string>(check)),
          ),
          initial: ['Effect'],
          validateOn: 'Blur',
        }),
      },
    })
    const initial = counted.init()
    check.mockClear()

    const change = counted.update(initial, counted.changed('text', 'Next'))
    counted.update(change.model, counted.blurred('text'))

    expect(check).not.toHaveBeenCalled()
  })
})

describe('optional inputs', () => {
  const OptionalText = Schema.String.pipe(
    Schema.decodeTo(
      Schema.Option(Schema.String),
      SchemaTransformation.transform({
        decode: text => (text === '' ? Option.none() : Option.some(text)),
        encode: Option.getOrElse(() => ''),
      }),
    ),
  )
  const profile = Form.define({
    name: 'Profile',
    submit,
    fields: { nickname: Form.field({ schema: OptionalText, initial: 'Ada' }) },
  })

  it('decodes blank text into None', () => {
    const change = profile.update(
      profile.init(),
      profile.changed('nickname', ''),
    )

    expect(profile.fieldView(change.model, 'nickname').maybeValue).toEqual(
      Option.some(Option.none()),
    )
  })

  it('submits the decoded Option value', () => {
    const blank = profile.submit(profile.init({ nickname: Option.none() }))

    expect(blank.commands?.map(command => command.args)).toEqual([
      {
        values: { nickname: Option.none() },
        context: undefined,
        generation: 1,
      },
    ])
  })

  it('encodes Option overrides into text inputs', () => {
    const blank = profile.init({ nickname: Option.none() })
    const named = profile.reinitialize(blank, { nickname: Option.some('Lin') })

    expect(profile.inputs(blank).nickname).toBe('')
    expect(profile.inputs(named.model).nickname).toBe('Lin')
  })

  it('requires a value from a nullable input when its rules say so', () => {
    const age = Form.define({
      name: 'RequiredAge',
      submit,
      fields: {
        age: Form.field({
          schema: Schema.OptionFromNullOr(Schema.Number),
          initial: null,
          rules: FieldValidation.makeRules<Option.Option<number>>({
            required: 'Enter an age',
            isEmpty: Option.isNone,
          }),
        }),
      },
    })
    const empty = age.submit(age.init())
    const zero = age.submit(
      age.update(empty.model, age.changed('age', 0)).model,
    )

    expect(age.fieldView(empty.model, 'age').errors).toEqual(['Enter an age'])
    expect(zero.commands?.map(command => command.args)).toEqual([
      { values: { age: Option.some(0) }, context: undefined, generation: 2 },
    ])
  })
})

describe('overrides', () => {
  const presence = Form.define({
    name: 'Presence',
    submit,
    fields: {
      note: Form.field({
        schema: Schema.Union([Schema.String, Schema.Undefined, Schema.Null]),
        initial: 'Configured',
      }),
    },
  })

  it('uses the configured initial input for an omitted override', () => {
    expect(presence.inputs(presence.init()).note).toBe('Configured')
    expect(
      presence.inputs(
        presence.reinitialize(presence.init({ note: null })).model,
      ).note,
    ).toBe('Configured')
  })

  it('uses an explicit null or undefined override as the default', () => {
    const fromNull = presence.init({ note: null })
    const fromUndefined = presence.init({ note: undefined })
    const edited = presence.update(fromUndefined, presence.changed('note', 'x'))

    expect(presence.inputs(fromNull).note).toBeNull()
    expect(presence.inputs(presence.reset(edited.model).model).note).toBe(
      undefined,
    )
  })
})

describe('field names', () => {
  it('stores fields named like Object prototype members as own fields', () => {
    const text = Form.field({ schema: Schema.String, initial: '' })
    const special = Form.define({
      name: 'Special',
      submit,
      fields: { ['__proto__']: text, constructor: text, toString: text },
    })
    const change = special.update(
      special.init(),
      special.changed('__proto__', 'value'),
    )

    expect(special.inputs(change.model)).toEqual({
      ['__proto__']: 'value',
      constructor: '',
      toString: '',
    })
  })
})

describe('field metadata', () => {
  const contact = Form.define({
    name: 'Contact',
    submit,
    fields: { email: Form.field({ schema: Schema.String, initial: '' }) },
  })

  it('starts with a pristine field at its default', () => {
    expect(contact.fieldView(contact.init(), 'email').meta).toEqual({
      isTouched: false,
      isBlurred: false,
      isEdited: false,
      isDefaultValue: true,
    })
  })

  it('marks an edited field touched and edited even when it returns to its default', () => {
    const away = contact.update(contact.init(), contact.changed('email', 'a'))
    const back = contact.update(away.model, contact.changed('email', ''))

    expect(contact.fieldView(back.model, 'email').meta).toEqual({
      isTouched: true,
      isBlurred: false,
      isEdited: true,
      isDefaultValue: true,
    })
  })

  it('marks a blurred field touched without marking it edited', () => {
    const blur = contact.update(contact.init(), contact.blurred('email'))

    expect(contact.fieldView(blur.model, 'email').meta).toEqual({
      isTouched: true,
      isBlurred: true,
      isEdited: false,
      isDefaultValue: true,
    })
  })
})

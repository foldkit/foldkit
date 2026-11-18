import { Array, Effect, Option, Schema, SchemaTransformation } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import * as Form from './form.js'

const voidSubmit = { error: Schema.String, execute: () => Effect.void }

describe('typed inputs', () => {
  const quantityForm = Form.define({
    name: 'Quantity',
    submit: voidSubmit,
    fields: {
      count: Form.field({ schema: Schema.FiniteFromString, initial: '3' }),
      age: Form.field({
        schema: Schema.FiniteFromString.annotate({ message: 'Enter a number' }),
        initial: '',
      }),
    },
  })

  it('stores the input and decodes it into the value', () => {
    const countFieldView = quantityForm.fieldView(quantityForm.init(), 'count')

    expect(countFieldView.input).toBe('3')
    expect(countFieldView.maybeValue).toEqual(Option.some(3))
  })

  it('encodes decoded overrides into inputs that become the reset defaults', () => {
    const initialModel = quantityForm.init({ count: 4 })
    const change = quantityForm.update(
      initialModel,
      quantityForm.changed('count', '9'),
    )

    expect(quantityForm.inputs(initialModel).count).toBe('4')
    expect(
      quantityForm.inputs(quantityForm.reset(change.model).model).count,
    ).toBe('4')
  })

  it('holds input its Schema rejects and shows the decode message', () => {
    const change = quantityForm.update(
      quantityForm.init(),
      quantityForm.changed('age', '12a'),
    )
    const ageFieldView = quantityForm.fieldView(change.model, 'age')

    expect(ageFieldView.input).toBe('12a')
    expect(ageFieldView.maybeValue).toEqual(Option.none())
    expect(ageFieldView.errors).toEqual(['Enter a number'])
  })

  it('shows a decode error when the Schema has no message annotation', () => {
    const change = quantityForm.update(
      quantityForm.init(),
      quantityForm.changed('count', '12a'),
    )

    expect(quantityForm.fieldView(change.model, 'count').errors).toHaveLength(1)
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
  const encodedChecksForm = Form.define({
    name: 'EncodedChecks',
    submit: voidSubmit,
    fields: {
      age: Form.field({ schema: AgeInput, initial: '' }),
      tags: Form.field({
        schema: Schema.Array(Schema.NonEmptyString),
        initial: [],
      }),
    },
  })

  it('stores the input and shows the check message as the field error', () => {
    const change = encodedChecksForm.update(
      encodedChecksForm.init(),
      encodedChecksForm.changed('age', ''),
    )

    expect(encodedChecksForm.inputs(change.model).age).toBe('')
    expect(encodedChecksForm.fieldView(change.model, 'age').errors).toEqual([
      'Enter your age',
    ])
  })

  it('lets a parent Model Schema build a Form that holds that input', () => {
    const Parent = Schema.Struct({ form: encodedChecksForm.Model })

    expect(() => Parent.make({ form: encodedChecksForm.init() })).not.toThrow()
  })

  it('encodes overrides that fail the checks without throwing', () => {
    const initialModel = encodedChecksForm.init({ tags: [''] })
    const reinitialize = encodedChecksForm.reinitialize(initialModel, {
      tags: ['', 'ok'],
    })

    expect(encodedChecksForm.inputs(initialModel).tags).toEqual([''])
    expect(encodedChecksForm.inputs(reinitialize.model).tags).toEqual([
      '',
      'ok',
    ])
  })
})

describe('compound inputs', () => {
  const Location = defineTaggedUnion({
    Unspecified: {},
    Coordinates: { latitude: Schema.Number, longitude: Schema.Number },
  })
  const preferencesForm = Form.define({
    name: 'Preferences',
    submit: voidSubmit,
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
      preferencesForm.changed('topics', ['Effect', 'Foldkit']),
      preferencesForm.changed('favoriteTopic', 'Effect'),
      preferencesForm.changed('location', paris),
    ]
    const model = Array.reduce(
      changes,
      preferencesForm.init(),
      (current, message) => preferencesForm.update(current, message).model,
    )

    expect(preferencesForm.inputs(model)).toEqual({
      topics: ['Effect', 'Foldkit'],
      favoriteTopic: 'Effect',
      location: paris,
    })
    expect(
      preferencesForm.fieldView(model, 'favoriteTopic').maybeValue,
    ).toEqual(Option.some(Option.some('Effect')))
  })

  it('compares an input with its default by content', () => {
    const initialModel = preferencesForm.init({ location: paris })
    const topicsChange = preferencesForm.update(
      initialModel,
      preferencesForm.changed('topics', ['Other']),
    )
    const topicsRevert = preferencesForm.update(
      topicsChange.model,
      preferencesForm.changed('topics', ['Foldkit']),
    )
    const sameLocation = preferencesForm.update(
      topicsRevert.model,
      preferencesForm.changed(
        'location',
        Location.Coordinates({ latitude: 48, longitude: 2 }),
      ),
    )

    expect(
      preferencesForm.fieldView(sameLocation.model, 'topics').meta
        .isDefaultInput,
    ).toBe(true)
    expect(
      preferencesForm.fieldView(sameLocation.model, 'location').meta
        .isDefaultInput,
    ).toBe(true)
  })

  it('compares inputs with the equivalence annotated on the field Schema', () => {
    const ExactNumber = Schema.Number.pipe(
      Schema.overrideToEquivalence(() => Object.is),
    )
    const exactForm = Form.define({
      name: 'ExactNumber',
      submit: voidSubmit,
      fields: { value: Form.field({ schema: ExactNumber, initial: 0 }) },
    })
    const change = exactForm.update(
      exactForm.init(),
      exactForm.changed('value', -0),
    )

    expect(exactForm.fieldView(change.model, 'value').meta.isDefaultInput).toBe(
      false,
    )
  })

  it('leaves the checks of unrelated fields idle on an edit', () => {
    const check = vi.fn(() => true)
    const countedForm = Form.define({
      name: 'Counted',
      submit: voidSubmit,
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
    const initialModel = countedForm.init()
    check.mockClear()

    const change = countedForm.update(
      initialModel,
      countedForm.changed('text', 'Next'),
    )
    countedForm.update(change.model, countedForm.blurred('text'))

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
  const profileForm = Form.define({
    name: 'Profile',
    submit: voidSubmit,
    fields: { nickname: Form.field({ schema: OptionalText, initial: 'Ada' }) },
  })

  it('decodes blank text into None', () => {
    const change = profileForm.update(
      profileForm.init(),
      profileForm.changed('nickname', ''),
    )

    expect(profileForm.fieldView(change.model, 'nickname').maybeValue).toEqual(
      Option.some(Option.none()),
    )
  })

  it('submits the decoded Option value', () => {
    const blankSubmit = profileForm.submit(
      profileForm.init({ nickname: Option.none() }),
    )

    expect(blankSubmit.commands?.map(command => command.args)).toEqual([
      {
        values: { nickname: Option.none() },
        context: undefined,
        generation: 1,
      },
    ])
  })

  it('encodes Option overrides into text inputs', () => {
    const blank = profileForm.init({ nickname: Option.none() })
    const named = profileForm.reinitialize(blank, {
      nickname: Option.some('Lin'),
    })

    expect(profileForm.inputs(blank).nickname).toBe('')
    expect(profileForm.inputs(named.model).nickname).toBe('Lin')
  })

  it('requires a value from a nullable input when its rules say so', () => {
    const requiredAgeForm = Form.define({
      name: 'RequiredAge',
      submit: voidSubmit,
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
    const emptySubmit = requiredAgeForm.submit(requiredAgeForm.init())
    const zeroSubmit = requiredAgeForm.submit(
      requiredAgeForm.update(
        emptySubmit.model,
        requiredAgeForm.changed('age', 0),
      ).model,
    )

    expect(requiredAgeForm.fieldView(emptySubmit.model, 'age').errors).toEqual([
      'Enter an age',
    ])
    expect(zeroSubmit.commands?.map(command => command.args)).toEqual([
      { values: { age: Option.some(0) }, context: undefined, generation: 2 },
    ])
  })
})

describe('overrides', () => {
  const presenceForm = Form.define({
    name: 'Presence',
    submit: voidSubmit,
    fields: {
      note: Form.field({
        schema: Schema.Union([Schema.String, Schema.Undefined, Schema.Null]),
        initial: 'Configured',
      }),
    },
  })

  it('uses the configured initial input for an omitted override', () => {
    expect(presenceForm.inputs(presenceForm.init()).note).toBe('Configured')
    expect(
      presenceForm.inputs(
        presenceForm.reinitialize(presenceForm.init({ note: null })).model,
      ).note,
    ).toBe('Configured')
  })

  it('uses an explicit null or undefined override as the default', () => {
    const fromNull = presenceForm.init({ note: null })
    const fromUndefined = presenceForm.init({ note: undefined })
    const edited = presenceForm.update(
      fromUndefined,
      presenceForm.changed('note', 'x'),
    )

    expect(presenceForm.inputs(fromNull).note).toBeNull()
    expect(
      presenceForm.inputs(presenceForm.reset(edited.model).model).note,
    ).toBe(undefined)
  })
})

describe('field names', () => {
  it('stores fields named like Object prototype members', () => {
    const textField = Form.field({ schema: Schema.String, initial: '' })
    const specialForm = Form.define({
      name: 'Special',
      submit: voidSubmit,
      fields: {
        ['__proto__']: textField,
        constructor: textField,
        toString: textField,
      },
    })
    const change = specialForm.update(
      specialForm.init(),
      specialForm.changed('__proto__', 'value'),
    )

    expect(specialForm.inputs(change.model)).toEqual({
      ['__proto__']: 'value',
      constructor: '',
      toString: '',
    })
  })
})

describe('field metadata', () => {
  const contactForm = Form.define({
    name: 'Contact',
    submit: voidSubmit,
    fields: { email: Form.field({ schema: Schema.String, initial: '' }) },
  })

  it('starts a field untouched, unedited, and at its default', () => {
    expect(contactForm.fieldView(contactForm.init(), 'email').meta).toEqual({
      isTouched: false,
      isBlurred: false,
      isEdited: false,
      isDefaultInput: true,
    })
  })

  it('marks an edited field touched and edited even when it returns to its default', () => {
    const emailChange = contactForm.update(
      contactForm.init(),
      contactForm.changed('email', 'a'),
    )
    const emailRevert = contactForm.update(
      emailChange.model,
      contactForm.changed('email', ''),
    )

    expect(contactForm.fieldView(emailRevert.model, 'email').meta).toEqual({
      isTouched: true,
      isBlurred: false,
      isEdited: true,
      isDefaultInput: true,
    })
  })

  it('marks a blurred field touched without marking it edited', () => {
    const blur = contactForm.update(
      contactForm.init(),
      contactForm.blurred('email'),
    )

    expect(contactForm.fieldView(blur.model, 'email').meta).toEqual({
      isTouched: true,
      isBlurred: true,
      isEdited: false,
      isDefaultInput: true,
    })
  })
})

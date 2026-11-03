import { Array, Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Form from './form.js'

const [isEmail] = FieldValidation.Rule.email('Invalid email')
const [isLongEnough] = FieldValidation.Rule.minLength(8, 'Too short')

const email = Form.field({ schema: Schema.String, initial: { value: '' } })
const registration = Form.define({
  name: 'Registration',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    email,
    age: Form.field({ schema: Schema.Number, initial: { value: 18 } }),
    accepted: Form.field({ schema: Schema.Boolean, initial: { value: false } }),
  },
})

describe('Form codec inference', () => {
  it('rejects cross-field payloads during Message decoding', () => {
    expect(() =>
      Schema.decodeUnknownSync(registration.Message)({
        _tag: 'ChangedField',
        change: { name: 'age', input: { value: '21' } },
      }),
    ).toThrow()
  })
})

const edit = Form.define({
  name: 'Edit',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: { email },
})

const requiredEmail = Form.field({
  schema: Schema.String,
  initial: { value: '' },
  validateOn: 'Blur',
  rules: FieldValidation.makeRules({
    required: 'Enter email',
    rules: [
      [isEmail, 'Invalid email'],
      [isLongEnough, 'Too short'],
    ],
  }),
})
const validated = Form.define({
  name: 'Validated',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    email: requiredEmail,
    age: Form.field({
      schema: Schema.Number,
      initial: { value: 18 },
      rules: FieldValidation.makeRules<number>({
        rules: [[age => age >= 18, 'Must be an adult']],
      }),
    }),
    accepted: Form.field({
      schema: Schema.Boolean,
      initial: { value: false },
      rules: FieldValidation.makeRules<boolean>({
        rules: [[accepted => accepted, 'Accept terms']],
      }),
    }),
  },
})

describe('initialization and codecs', () => {
  it('captures initialization overrides and isolates reused definitions', () => {
    const initial = registration.init({
      email: { value: 'edited@example.com' },
    })
    const changed = registration.update(
      initial,
      registration.changed('email', { value: 'new@example.com' }),
    )
    const reverted = registration.update(
      changed.model,
      registration.changed('email', { value: 'edited@example.com' }),
    )

    expect(registration.field(reverted.model, 'email').meta).toEqual({
      isTouched: true,
      isBlurred: false,
      isDirty: true,
      isDefaultValue: true,
    })

    expect(
      registration.values(registration.reset(changed.model).model).email,
    ).toBe('edited@example.com')
    expect(edit.values(edit.init()).email).toBe('')
  })

  it('supports transformed scalar codecs in Models and Messages', () => {
    const numeric = Form.define({
      name: 'Numeric',
      submit: { error: Schema.String, execute: () => Effect.void },
      fields: {
        count: Form.field({
          schema: Schema.NumberFromString,
          initial: { value: 3 },
        }),
      },
    })
    const initial = numeric.init({ count: { value: 4 } })
    const encoded = Schema.encodeSync(numeric.Model)(initial)
    expect(encoded.fields.count.defaultInput.value).toBe('4')
    expect(Schema.decodeSync(numeric.Model)(encoded)).toEqual(initial)
    const message = numeric.changed('count', { value: 5 })
    expect(Schema.encodeSync(numeric.Message)(message)).toEqual({
      _tag: 'ChangedField',
      change: { name: 'count', input: { value: '5' } },
    })

    expect(
      Schema.decodeSync(numeric.Message)({
        _tag: 'ChangedField',
        change: { name: 'count', input: { value: '6' } },
      }),
    ).toEqual(numeric.changed('count', { value: 6 }))
  })

  it('constructs special field names as own properties', () => {
    const special = Form.define({
      name: 'Special',
      submit: { error: Schema.String, execute: () => Effect.void },
      fields: { ['__proto__']: email, constructor: email, toString: email },
    })
    const initial = special.init()
    expect(Object.hasOwn(initial.fields, '__proto__')).toBe(true)
    expect(
      special.values(
        special.update(
          initial,
          special.changed('__proto__', { value: 'value' }),
        ).model,
      ),
    ).toEqual({ ['__proto__']: 'value', constructor: '', toString: '' })
  })
})

describe('field validation', () => {
  it('validates on the configured triggers and clears feedback for a changed blur field', () => {
    const emailChange = validated.update(
      validated.init(),
      validated.changed('email', { value: 'bad' }),
    )

    expect(validated.field(emailChange.model, 'email').errors).toEqual([])

    const emailBlur = validated.update(
      emailChange.model,
      validated.blurred('email'),
    )

    expect(validated.field(emailBlur.model, 'email').errors).toEqual([
      'Invalid email',
    ])
    expect(validated.field(emailBlur.model, 'email').meta.isBlurred).toBe(true)

    const emailCorrection = validated.update(
      emailBlur.model,
      validated.changed('email', { value: 'good@example.com' }),
    )

    expect(validated.field(emailCorrection.model, 'email').errors).toEqual([])

    const ageChange = validated.update(
      emailCorrection.model,
      validated.changed('age', { value: 10 }),
    )

    expect(validated.field(ageChange.model, 'age').errors).toEqual([
      'Must be an adult',
    ])
    const boolChange = validated.update(
      ageChange.model,
      validated.changed('accepted', { value: false }),
    )

    expect(validated.field(boolChange.model, 'accepted').errors).toEqual([
      'Accept terms',
    ])
  })

  it('compares numeric defaults with Schema equivalence independently of dirty history', () => {
    const numeric = Form.define({
      name: 'Equality',
      submit: { error: Schema.String, execute: () => Effect.void },
      fields: {
        value: Form.field({ schema: Schema.Number, initial: { value: NaN } }),
        zero: Form.field({ schema: Schema.Number, initial: { value: 0 } }),
      },
    })
    const initial = numeric.init()
    expect(numeric.field(initial, 'value').meta.isDefaultValue).toBe(true)

    const changed = numeric.update(
      initial,
      numeric.changed('zero', { value: -0 }),
    )

    expect(numeric.field(changed.model, 'zero').meta.isDefaultValue).toBe(true)

    const reverted = numeric.update(
      changed.model,
      numeric.changed('zero', { value: 0 }),
    )

    expect(numeric.field(reverted.model, 'zero').meta.isDefaultValue).toBe(true)
    expect(numeric.field(reverted.model, 'zero').meta.isDirty).toBe(true)
    expect(numeric.field(initial, 'zero').meta.isDirty).toBe(false)
  })

  it('turns a field validation Effect into a Command and ignores a stale result', () => {
    const checked = Form.define({
      name: 'Checked',
      submit: { error: Schema.String, execute: () => Effect.void },
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: { value: '' },
          rules: FieldValidation.makeRules({ required: 'Required' }),
          validate: value => Effect.succeed(value === 'taken' ? ['Taken'] : []),
        }),
      },
    })
    const changed = checked.update(
      checked.init(),
      checked.changed('username', { value: 'taken' }),
    )

    expect(changed.model.fields.username.validation._tag).toBe('Validating')
    const maybeCommand = Array.head(changed.commands ?? [])
    if (Option.isNone(maybeCommand)) {
      throw new Error('Expected a validation Command')
    }

    const completed = checked.update(
      changed.model,
      Effect.runSync(maybeCommand.value.effect),
    )

    expect(checked.field(completed.model, 'username').errors).toEqual(['Taken'])

    const replaced = checked.update(
      changed.model,
      checked.changed('username', { value: 'open' }),
    )
    const ignored = checked.update(
      replaced.model,
      Effect.runSync(maybeCommand.value.effect),
    )

    expect(ignored.model.fields.username.validation._tag).toBe('Validating')
    expect(checked.field(ignored.model, 'username').errors).toEqual([])

    const empty = checked.update(
      checked.init(),
      checked.changed('username', { value: '' }),
    )

    expect(empty.commands).toEqual([])
    expect(checked.field(empty.model, 'username').errors).toEqual(['Required'])
  })
})

describe('submission', () => {
  it('validates every field and records invalid attempts without constructing Commands', () => {
    const formSubmit = validated.submit(validated.init())

    expect(formSubmit.model.submitCount).toBe(1)
    expect(formSubmit.model.submission._tag).toBe('Idle')
    expect(validated.field(formSubmit.model, 'email').errors).toEqual([
      'Enter email',
    ])
    expect(validated.field(formSubmit.model, 'accepted').errors).toEqual([
      'Accept terms',
    ])
    expect(formSubmit.commands ?? []).toEqual([])

    const badEmail = validated.update(
      formSubmit.model,
      validated.changed('email', { value: 'bad' }),
    )
    const secondSubmit = validated.submit(badEmail.model)

    expect(validated.field(secondSubmit.model, 'email').errors).toEqual([
      'Invalid email',
      'Too short',
    ])
    expect(secondSubmit.model.submitCount).toBe(2)
  })

  it('captures values, blocks duplicate pending submissions, and preserves pending state during edits', () => {
    const initial = registration.init({
      email: { value: 'original@example.com' },
    })

    const formSubmit = registration.submit(initial)
    const pendingSubmit = registration.submit(formSubmit.model)

    expect(pendingSubmit.model).toBe(formSubmit.model)
    expect(pendingSubmit.model.submitCount).toBe(1)
    expect(formSubmit.commands).toHaveLength(1)

    const change = registration.update(
      formSubmit.model,
      registration.changed('email', { value: 'edited@example.com' }),
    )

    expect(change.model.submission).toEqual(formSubmit.model.submission)
    expect(
      Array.head(formSubmit.commands ?? []).pipe(Option.getOrThrow).args,
    ).toEqual({
      values: { email: 'original@example.com', age: 18, accepted: false },
      token: { generation: 1 },
    })
  })

  it('settles only the pending token and ignores completion from before a reset', () => {
    const firstSubmit = registration.submit(registration.init())
    const firstToken = Schema.Struct({ generation: Schema.Number }).make({
      generation: firstSubmit.model.generation,
    })
    const reset = registration.reset(firstSubmit.model)
    expect(reset.model.generation).toBe(firstSubmit.model.generation)
    expect(
      registration.update(
        reset.model,
        registration.Message.CompletedSubmit({
          token: firstToken,
          result: Result.succeed(undefined),
        }),
      ).model,
    ).toBe(reset.model)
    const secondSubmit = registration.submit(reset.model)

    expect(secondSubmit.model.generation).toBe(firstToken.generation + 1)
    expect(
      registration.update(
        secondSubmit.model,
        registration.Message.CompletedSubmit({
          token: firstToken,
          result: Result.fail('stale'),
        }),
      ).model,
    ).toBe(secondSubmit.model)
    const secondToken = Schema.Struct({ generation: Schema.Number }).make({
      generation: secondSubmit.model.generation,
    })
    const failed = registration.update(
      secondSubmit.model,
      registration.Message.CompletedSubmit({
        token: secondToken,
        result: Result.fail('Try again'),
      }),
    )
    expect(registration.submission(failed.model)).toEqual(
      registration.Submission.Failed({ error: 'Try again' }),
    )

    expect(
      registration.update(
        failed.model,
        registration.Message.CompletedSubmit({
          token: secondToken,
          result: Result.succeed(undefined),
        }),
      ).model,
    ).toBe(failed.model)
    const change = registration.update(
      failed.model,
      registration.changed('email', { value: 'changed' }),
    )

    expect(change.model.submission._tag).toBe('Idle')
    expect(change.model.submitCount).toBe(1)

    const thirdSubmit = registration.submit(change.model)
    const succeeded = registration.update(
      thirdSubmit.model,
      registration.Message.CompletedSubmit({
        token: Schema.Struct({ generation: Schema.Number }).make({
          generation: thirdSubmit.model.generation,
        }),
        result: Result.succeed(undefined),
      }),
    )

    expect(succeeded.model.submission._tag).toBe('Succeeded')
    expect(
      registration.update(
        succeeded.model,
        registration.changed('age', { value: 25 }),
      ).model.submission._tag,
    ).toBe('Idle')
  })

  it('accepts optional empty and unvalidated fields during submission', () => {
    const optional = Form.define({
      name: 'Optional',
      submit: { error: Schema.String, execute: () => Effect.void },
      fields: {
        email: Form.field({
          schema: Schema.String,
          initial: { value: '' },
          rules: FieldValidation.makeRules({
            rules: [[isEmail, 'Invalid email']],
          }),
        }),
        note: Form.field({ schema: Schema.String, initial: { value: '' } }),
      },
    })

    const submitted = optional.submit(optional.init())

    expect(optional.submission(submitted.model)._tag).toBe('Submitting')
    expect(optional.field(submitted.model, 'email').errors).toEqual([])
    expect(
      Array.head(submitted.commands ?? []).pipe(Option.getOrThrow).args,
    ).toEqual({ values: { email: '', note: '' }, token: { generation: 1 } })
  })
})

describe('reset and reinitialize', () => {
  it('resets captured defaults, interaction, validation, submission feedback, and attempt count', () => {
    const initial = validated.init({
      email: { value: 'default@example.com' },
      accepted: { value: true },
    })
    const change = validated.update(
      initial,
      validated.changed('email', { value: 'bad' }),
    )
    const blur = validated.update(change.model, validated.blurred('email'))
    const formSubmit = validated.submit(blur.model)
    const reset = validated.reset(formSubmit.model)
    expect(validated.values(reset.model)).toEqual({
      email: 'default@example.com',
      age: 18,
      accepted: true,
    })

    expect(validated.field(reset.model, 'email')).toEqual({
      value: 'default@example.com',
      errors: [],
      meta: {
        isTouched: false,
        isBlurred: false,
        isDirty: false,
        isDefaultValue: true,
      },
    })

    expect(reset.model.submitCount).toBe(0)
    expect(reset.model.submission._tag).toBe('Idle')
  })

  it('captures new live defaults without reusing an earlier submission token', () => {
    const firstSubmit = registration.submit(registration.init())
    const firstToken = Schema.Struct({ generation: Schema.Number }).make({
      generation: firstSubmit.model.generation,
    })
    const reinitialized = registration.reinitialize(firstSubmit.model, {
      email: { value: 'second@example.com' },
    })

    expect(registration.submitCount(reinitialized.model)).toBe(0)
    expect(registration.submission(reinitialized.model)._tag).toBe('Idle')
    expect(registration.field(reinitialized.model, 'email').meta).toEqual({
      isTouched: false,
      isBlurred: false,
      isDirty: false,
      isDefaultValue: true,
    })

    expect(
      registration.update(
        reinitialized.model,
        registration.Message.CompletedSubmit({
          token: firstToken,
          result: Result.succeed(undefined),
        }),
      ).model,
    ).toBe(reinitialized.model)
    const secondSubmit = registration.submit(reinitialized.model)

    expect(
      registration.update(
        secondSubmit.model,
        registration.Message.CompletedSubmit({
          token: firstToken,
          result: Result.fail('stale'),
        }),
      ).model,
    ).toBe(secondSubmit.model)

    expect(secondSubmit.model.generation).toBe(firstToken.generation + 1)
    const changed = registration.update(
      secondSubmit.model,
      registration.changed('email', { value: 'third@example.com' }),
    )

    expect(
      registration.values(registration.reset(changed.model).model).email,
    ).toBe('second@example.com')
  })

  it.each([
    { name: 'undefined parent field', parentField: undefined },
    { name: 'erased parent field metadata', parentField: 'form' },
  ])('preserves required parent data with $name', ({ parentField }) => {
    const ExtendedForm = Schema.Struct({
      ...registration.Model.fields,
      recordId: Schema.String,
    })
    const Parent = Schema.Struct({ form: ExtendedForm })
    type Parent = typeof Parent.Type
    const ParentMessage = defineMessageUnion({
      GotFormMessage: { message: registration.Message },
    })
    type ParentMessage = typeof ParentMessage.Type
    const toLens = (
      config: Pick<
        Form.FormLens<
          Parent,
          ParentMessage,
          ReturnType<typeof registration.init>,
          typeof registration.Message.Type
        >,
        'read' | 'write' | 'toParentMessage'
      >,
    ): Form.FormLens<
      Parent,
      ParentMessage,
      ReturnType<typeof registration.init>,
      typeof registration.Message.Type
    > => config
    const config = {
      parentField,
      read: (model: Parent) => Option.some(model.form),
      write: (model: Parent, nextForm: ReturnType<typeof registration.init>) =>
        modifyFields(model, {
          form: () =>
            ExtendedForm.make({ ...nextForm, recordId: model.form.recordId }),
        }),
      toParentMessage: (message: typeof registration.Message.Type) =>
        ParentMessage.GotFormMessage({ message }),
    }
    const lifted = registration.lift<Parent, ParentMessage>(toLens(config))
    const initial = Parent.make({
      form: ExtendedForm.make({
        ...registration.init(),
        recordId: 'profile-1',
      }),
    })
    const reinitialized = lifted.reinitialize(initial, {
      email: { value: 'new@example.com' },
    })

    expect(reinitialized.model.form.recordId).toBe('profile-1')
    expect(Schema.is(Schema.toType(Parent))(reinitialized.model)).toBe(true)
    expect(registration.values(reinitialized.model.form).email).toBe(
      'new@example.com',
    )
  })
})

describe('parent lifting', () => {
  it('lifts into parent fields and omits callbacks when a full lens cannot read a child', () => {
    const Parent = Schema.Struct({
      form: registration.Model,
      other: Schema.Number,
    })
    type Parent = typeof Parent.Type
    const ParentMessage = defineMessageUnion({
      GotFormMessage: { message: registration.Message },
    })
    type ParentMessage = typeof ParentMessage.Type
    const lifted = registration.lift<Parent, ParentMessage>({
      parentField: 'form',
      toParentMessage: message => ParentMessage.GotFormMessage({ message }),
    })
    const initial = Parent.make({ form: registration.init(), other: 7 })
    const formChange = lifted.fold(
      initial,
      registration.changed('age', { value: 22 }),
    )

    expect(formChange.model.other).toBe(7)
    expect(registration.values(formChange.model.form).age).toBe(22)
    const absent = registration.lift<Parent, ParentMessage>({
      read: () => Option.none(),
      write: model => model,
      toParentMessage: message => ParentMessage.GotFormMessage({ message }),
    })

    expect(absent.submit(initial).model).toBe(initial)

    expect(absent.reset(initial).model).toBe(initial)
    expect(
      absent.reinitialize(initial, { email: { value: 'new@example.com' } })
        .model,
    ).toBe(initial)
    const reinitialized = lifted.reinitialize(initial, {
      email: { value: 'new@example.com' },
    })

    expect(reinitialized.model.other).toBe(7)
    expect(registration.values(reinitialized.model.form).email).toBe(
      'new@example.com',
    )
  })

  it('adapts inherited lens methods and preserves their receiver in every lifted operation', () => {
    const Extended = Schema.Struct({
      ...registration.Model.fields,
      recordId: Schema.String,
    })
    const Parent = Schema.Struct({ form: Extended })
    type Parent = typeof Parent.Type
    type Child = typeof registration.Model.Type
    type ChildMessage = typeof registration.Message.Type

    class ProfileLens implements Form.FormLens<
      Parent,
      ChildMessage,
      Child,
      ChildMessage
    > {
      readonly recordId = 'profile-1'

      read(model: Parent) {
        return model.form.recordId === this.recordId
          ? Option.some(model.form)
          : Option.none()
      }

      write(model: Parent, nextForm: Child): Parent {
        return modifyFields(model, {
          form: () => Extended.make({ ...nextForm, recordId: this.recordId }),
        })
      }

      toParentMessage(message: ChildMessage) {
        return message
      }
    }

    const initial = Parent.make({
      form: Extended.make({ ...registration.init(), recordId: 'profile-1' }),
    })
    const lifted = registration.lift<Parent, ChildMessage>(new ProfileLens())
    const formChange = lifted.fold(
      initial,
      registration.changed('age', { value: 22 }),
    )

    expect(registration.values(formChange.model.form).age).toBe(22)

    const formReset = lifted.reset(formChange.model)
    expect(registration.values(formReset.model.form).age).toBe(18)

    const formReinitialize = lifted.reinitialize(initial, {
      age: { value: 30 },
    })
    expect(registration.values(formReinitialize.model.form).age).toBe(30)

    const formSubmit = lifted.submit(initial)
    const submission = registration.submission(formSubmit.model.form)
    if (submission._tag !== 'Submitting') {
      throw new Error('Expected a pending submission')
    }

    const formSucceed = lifted.fold(
      formSubmit.model,
      registration.Message.CompletedSubmit({
        token: submission.token,
        result: Result.succeed(undefined),
      }),
    )
    expect(registration.submission(formSucceed.model.form)._tag).toBe(
      'Succeeded',
    )

    const formFail = lifted.fold(
      formSubmit.model,
      registration.Message.CompletedSubmit({
        token: submission.token,
        result: Result.fail('Save failed'),
      }),
    )

    expect(registration.submission(formFail.model.form)._tag).toBe('Failed')

    for (const result of [
      formChange,
      formReset,
      formReinitialize,
      formSubmit,
      formSucceed,
      formFail,
    ]) {
      expect(result.model.form.recordId).toBe('profile-1')
      expect(Schema.is(Schema.toType(Parent))(result.model)).toBe(true)
    }
  })

  it('reinitializes direct parent fields with unused lens properties', () => {
    const Parent = Schema.Struct({ form: registration.Model })
    type Parent = typeof Parent.Type
    type Config = Form.ParentFieldConfig<
      Parent,
      typeof registration.Message.Type,
      ReturnType<typeof registration.init>,
      typeof registration.Message.Type
    >
    const direct = registration.lift<Parent, typeof registration.Message.Type>({
      parentField: 'form',
      read: undefined,
      write: undefined,
      toParentMessage: message => message,
    })
    const toDirectConfig = (
      config: Pick<Config, 'parentField' | 'toParentMessage'>,
    ): Config => config
    const parentField: 'form' = 'form'
    const metadataConfig = {
      parentField,
      read: () => Option.none(),
      toParentMessage: (message: typeof registration.Message.Type) => message,
    }
    const withReaderMetadata = registration.lift<
      Parent,
      typeof registration.Message.Type
    >(toDirectConfig(metadataConfig))
    const initial = Parent.make({ form: registration.init() })

    for (const lifted of [direct, withReaderMetadata]) {
      const reinitialized = lifted.reinitialize(initial, {
        email: { value: 'new@example.com' },
      })

      expect(Schema.is(Schema.toType(Parent))(reinitialized.model)).toBe(true)
      expect(registration.values(reinitialized.model.form).email).toBe(
        'new@example.com',
      )
    }
  })

  it('preserves branch-specific parent data when a full lens reinitializes the Form', () => {
    const ExtendedForm = Schema.Struct({
      ...registration.Model.fields,
      recordId: Schema.String,
    })
    const Parent = defineTaggedUnion({
      Draft: { form: registration.Model },
      Saved: { form: ExtendedForm },
    })
    type Parent = typeof Parent.Type
    const ParentMessage = defineMessageUnion({
      GotFormMessage: { message: registration.Message },
    })
    type ParentMessage = typeof ParentMessage.Type
    const lifted = registration.lift<Parent, ParentMessage>({
      read: model => Option.some(model.form),
      write: (model, nextForm) =>
        Parent.match<Parent>(model, {
          Draft: parentModel =>
            modifyFields(parentModel, { form: () => nextForm }),
          Saved: parentModel =>
            modifyFields(parentModel, {
              form: () =>
                ExtendedForm.make({
                  ...nextForm,
                  recordId: parentModel.form.recordId,
                }),
            }),
        }),
      toParentMessage: message => ParentMessage.GotFormMessage({ message }),
    })
    const saved = Parent.Saved({
      form: ExtendedForm.make({
        ...registration.init(),
        recordId: 'profile-1',
      }),
    })
    const reinitialized = lifted.reinitialize(saved, {
      email: { value: 'saved@example.com' },
    })

    expect(reinitialized.model).toMatchObject({
      _tag: 'Saved',
      form: { recordId: 'profile-1' },
    })

    expect(Schema.is(Schema.toType(Parent))(reinitialized.model)).toBe(true)
    expect(registration.values(reinitialized.model.form).email).toBe(
      'saved@example.com',
    )

    const draft = Parent.Draft({ form: registration.init() })
    const draftReinitialized = lifted.reinitialize(draft, {
      email: { value: 'draft@example.com' },
    })

    expect(draftReinitialized.model._tag).toBe('Draft')
    expect(Schema.is(Schema.toType(Parent))(draftReinitialized.model)).toBe(
      true,
    )
    expect(registration.values(draftReinitialized.model.form).email).toBe(
      'draft@example.com',
    )
  })
})

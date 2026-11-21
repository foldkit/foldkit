import { Array, Context, Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import * as Form from './form.js'

const voidSubmit = { error: Schema.String, execute: () => Effect.void }

const firstCommand = <Command>(commands: ReadonlyArray<Command> | undefined) =>
  Array.head(commands ?? []).pipe(Option.getOrThrow)

const CheckArgs = Schema.Struct({ generation: Schema.Number })

const checkGeneration = (
  commands: ReadonlyArray<Readonly<{ args?: unknown }>> | undefined,
) => Schema.decodeUnknownSync(CheckArgs)(firstCommand(commands).args).generation

const [isEmail] = FieldValidation.Rule.email('Invalid email')
const [isLongEnough] = FieldValidation.Rule.minLength(8, 'Too short')

const accountForm = Form.define({
  name: 'Account',
  submit: voidSubmit,
  fields: {
    email: Form.field({
      schema: Schema.String,
      initial: '',
      validateOn: 'Blur',
      rules: FieldValidation.makeRules({
        required: 'Enter email',
        rules: [
          [isEmail, 'Invalid email'],
          [isLongEnough, 'Too short'],
        ],
      }),
    }),
    age: Form.field({
      schema: Schema.Number,
      initial: 18,
      rules: FieldValidation.makeRules<number>({
        rules: [[age => age >= 18, 'Must be an adult']],
      }),
    }),
  },
})

const checkedUsernameForm = Form.define({
  name: 'Checked',
  submit: voidSubmit,
  fields: {
    username: Form.field({
      schema: Schema.String,
      initial: '',
      rules: FieldValidation.makeRules({ required: 'Required' }),
      validate: value => Effect.succeed(value === 'taken' ? ['Taken'] : []),
    }),
  },
})

const completedValidateUsername = (
  generation: number,
  errors: ReadonlyArray<string>,
) =>
  checkedUsernameForm.Message.CompletedValidateField({
    name: 'username',
    generation,
    result: Result.succeed(errors),
  })

describe('Command names', () => {
  it('names each validation Command after the Form and field', () => {
    expect(checkedUsernameForm.ValidateField.username.name).toBe(
      'ValidateCheckedUsername',
    )
  })

  it('has a validation Command only for fields with a validate Effect', () => {
    expect(Object.keys(accountForm.ValidateField)).toEqual([])
    expect(Object.keys(checkedUsernameForm.ValidateField)).toEqual(['username'])
  })

  it('throws when two field names would give their validation Commands the same name', () => {
    expect(() =>
      Form.define({
        name: 'Account',
        submit: { execute: () => Effect.void },
        fields: {
          email: Form.field({ schema: Schema.String, initial: '' }),
          userName: Form.field({ schema: Schema.String, initial: '' }),
          UserName: Form.field({ schema: Schema.String, initial: '' }),
        },
      }),
    ).toThrow(
      'Form "Account" has field names that differ only in the case of their first letter, so their validation Commands would share a name: userName, UserName',
    )
  })
})

describe('validation triggers', () => {
  it('validates a Change field on each change', () => {
    const change = accountForm.update(
      accountForm.init(),
      accountForm.changed('age', 10),
    )

    expect(accountForm.fieldView(change.model, 'age').errors).toEqual([
      'Must be an adult',
    ])
  })

  it('waits for blur before validating a Blur field', () => {
    const change = accountForm.update(
      accountForm.init(),
      accountForm.changed('email', 'x'),
    )
    const blur = accountForm.update(change.model, accountForm.blurred('email'))

    expect(accountForm.fieldView(change.model, 'email').errors).toEqual([])
    expect(accountForm.fieldView(blur.model, 'email').errors).toEqual([
      'Invalid email',
    ])
  })

  it('clears the errors of a Blur field when its input changes', () => {
    const change = accountForm.update(
      accountForm.init(),
      accountForm.changed('email', 'x'),
    )
    const blur = accountForm.update(change.model, accountForm.blurred('email'))
    const correction = accountForm.update(
      blur.model,
      accountForm.changed('email', 'ada@example.com'),
    )

    expect(accountForm.fieldView(correction.model, 'email').errors).toEqual([])
  })

  it('shows the first failing rule on blur and every failing rule on submit', () => {
    const change = accountForm.update(
      accountForm.init(),
      accountForm.changed('email', 'x'),
    )
    const blur = accountForm.update(change.model, accountForm.blurred('email'))
    const attempt = accountForm.submit(change.model)

    expect(accountForm.fieldView(blur.model, 'email').errors).toEqual([
      'Invalid email',
    ])
    expect(accountForm.fieldView(attempt.model, 'email').errors).toEqual([
      'Invalid email',
      'Too short',
    ])
  })

  it('keeps every failing rule when a Blur field is blurred after submit', () => {
    const change = accountForm.update(
      accountForm.init(),
      accountForm.changed('email', 'x'),
    )
    const attempt = accountForm.submit(change.model)
    const blur = accountForm.update(attempt.model, accountForm.blurred('email'))

    expect(accountForm.fieldView(blur.model, 'email').errors).toEqual([
      'Invalid email',
      'Too short',
    ])
  })

  it('does not check a Change field on blur', () => {
    const blur = checkedUsernameForm.update(
      checkedUsernameForm.init(),
      checkedUsernameForm.blurred('username'),
    )

    expect(
      checkedUsernameForm.fieldView(blur.model, 'username').errors,
    ).toEqual([])
    expect(blur.commands ?? []).toEqual([])
  })
})

describe('asynchronous checks', () => {
  it('returns a validation Command for a value that passes its rules', () => {
    const change = checkedUsernameForm.update(
      checkedUsernameForm.init(),
      checkedUsernameForm.changed('username', 'taken'),
    )

    expect(change.commands?.map(command => command.args)).toEqual([
      { value: 'taken', generation: 1 },
    ])
  })

  it('shows the errors the check returns', () => {
    const change = checkedUsernameForm.update(
      checkedUsernameForm.init(),
      checkedUsernameForm.changed('username', 'taken'),
    )
    const validationCompletion = checkedUsernameForm.update(
      change.model,
      completedValidateUsername(1, ['Taken']),
    )

    expect(
      checkedUsernameForm.fieldView(validationCompletion.model, 'username')
        .errors,
    ).toEqual(['Taken'])
  })

  it('skips the check when the rules fail', () => {
    const change = checkedUsernameForm.update(
      checkedUsernameForm.init(),
      checkedUsernameForm.changed('username', ''),
    )

    expect(change.commands ?? []).toEqual([])
    expect(
      checkedUsernameForm.fieldView(change.model, 'username').errors,
    ).toEqual(['Required'])
  })

  it('ignores a check for an input a later change replaced', () => {
    const firstChange = checkedUsernameForm.update(
      checkedUsernameForm.init(),
      checkedUsernameForm.changed('username', 'taken'),
    )
    const secondChange = checkedUsernameForm.update(
      firstChange.model,
      checkedUsernameForm.changed('username', 'open'),
    )
    const thirdChange = checkedUsernameForm.update(
      secondChange.model,
      checkedUsernameForm.changed('username', 'taken'),
    )

    expect(
      checkedUsernameForm.update(
        thirdChange.model,
        completedValidateUsername(1, ['Taken']),
      ).model,
    ).toBe(thirdChange.model)
  })

  it('ignores a pending check after a change that fails the rules', () => {
    const change = checkedUsernameForm.update(
      checkedUsernameForm.init(),
      checkedUsernameForm.changed('username', 'taken'),
    )
    const clear = checkedUsernameForm.update(
      change.model,
      checkedUsernameForm.changed('username', ''),
    )
    const validationCompletion = checkedUsernameForm.update(
      clear.model,
      completedValidateUsername(checkGeneration(change.commands), []),
    )

    expect(
      checkedUsernameForm.fieldView(validationCompletion.model, 'username')
        .errors,
    ).toEqual(['Required'])
  })

  it.each(['reset', 'reinitialize'])(
    'ignores a check that started before %s',
    operation => {
      const change = checkedUsernameForm.update(
        checkedUsernameForm.init(),
        checkedUsernameForm.changed('username', 'taken'),
      )
      const cleared =
        operation === 'reset'
          ? checkedUsernameForm.reset(change.model)
          : checkedUsernameForm.reinitialize(change.model, {})
      const changeAfterClear = checkedUsernameForm.update(
        cleared.model,
        checkedUsernameForm.changed('username', 'taken'),
      )

      const currentGeneration = checkGeneration(changeAfterClear.commands)
      const currentCompletion = checkedUsernameForm.update(
        changeAfterClear.model,
        completedValidateUsername(currentGeneration, ['Taken']),
      )

      expect(
        checkedUsernameForm.update(
          changeAfterClear.model,
          completedValidateUsername(checkGeneration(change.commands), [
            'Taken',
          ]),
        ).model,
      ).toBe(changeAfterClear.model)
      expect(
        checkedUsernameForm.fieldView(currentCompletion.model, 'username')
          .errors,
      ).toEqual(['Taken'])
    },
  )

  it('runs the validator only when its Command runs', () => {
    const validate = vi.fn((_value: string) => Effect.fail('Unavailable'))
    const deferredForm = Form.define({
      name: 'Deferred',
      submit: voidSubmit,
      fields: {
        username: Form.field({ schema: Schema.String, initial: '', validate }),
      },
    })
    const change = deferredForm.update(
      deferredForm.init(),
      deferredForm.changed('username', 'next'),
    )

    expect(validate).not.toHaveBeenCalled()

    Effect.runSync(firstCommand(change.commands).effect)

    expect(validate).toHaveBeenCalledExactlyOnceWith('next')
  })

  it('shows a failed check as the field error', () => {
    const failingForm = Form.define({
      name: 'Failing',
      submit: voidSubmit,
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: '',
          validate: () => Effect.fail('Check unavailable'),
        }),
      },
    })
    const change = failingForm.update(
      failingForm.init(),
      failingForm.changed('username', 'next'),
    )
    const validationCompletion = failingForm.update(
      change.model,
      Effect.runSync(firstCommand(change.commands).effect),
    )

    expect(
      failingForm.fieldView(validationCompletion.model, 'username').errors,
    ).toEqual(['Check unavailable'])
  })

  it('runs only the validator of the field whose Command runs', () => {
    class UsernameValidator extends Context.Service<
      UsernameValidator,
      { check: (value: string) => ReadonlyArray<string> }
    >()('UsernameValidator') {}
    class AgeValidator extends Context.Service<
      AgeValidator,
      { check: (value: number) => ReadonlyArray<string> }
    >()('AgeValidator') {}
    const checkUsername = vi.fn((_value: string) => ['Taken'])
    const checkAge = vi.fn((_value: number) => [])
    const servicefulForm = Form.define({
      name: 'Serviceful',
      submit: voidSubmit,
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: '',
          validate: value =>
            Effect.map(UsernameValidator, service => service.check(value)),
        }),
        age: Form.field({
          schema: Schema.FiniteFromString,
          initial: '18',
          validate: value =>
            Effect.map(AgeValidator, service => service.check(value)),
        }),
      },
    })
    const change = servicefulForm.update(
      servicefulForm.init(),
      servicefulForm.changed('username', 'taken'),
    )

    Effect.runSync(
      firstCommand(change.commands).effect.pipe(
        Effect.provideService(UsernameValidator, { check: checkUsername }),
        Effect.provideService(AgeValidator, { check: checkAge }),
      ),
    )

    expect(checkUsername).toHaveBeenCalledExactlyOnceWith('taken')
    expect(checkAge).not.toHaveBeenCalled()
  })
})

describe('checks on blur', () => {
  const blurCheckedForm = Form.define({
    name: 'BlurChecked',
    submit: voidSubmit,
    fields: {
      username: Form.field({
        schema: Schema.String,
        initial: 'ada',
        validateOn: 'Blur',
        validate: () => Effect.succeed([]),
      }),
    },
  })

  it('reuses a pending check on a repeated blur', () => {
    const blur = blurCheckedForm.update(
      blurCheckedForm.init(),
      blurCheckedForm.blurred('username'),
    )
    const repeated = blurCheckedForm.update(
      blur.model,
      blurCheckedForm.blurred('username'),
    )

    expect(blur.commands).toHaveLength(1)
    expect(repeated.model).toBe(blur.model)
    expect(repeated.commands ?? []).toEqual([])
  })

  it('reuses a successful check on the next blur', () => {
    const blur = blurCheckedForm.update(
      blurCheckedForm.init(),
      blurCheckedForm.blurred('username'),
    )
    const validationCompletion = blurCheckedForm.update(
      blur.model,
      blurCheckedForm.Message.CompletedValidateField({
        name: 'username',
        generation: 1,
        result: Result.succeed([]),
      }),
    )

    expect(
      blurCheckedForm.update(
        validationCompletion.model,
        blurCheckedForm.blurred('username'),
      ).commands ?? [],
    ).toEqual([])
  })

  it('checks a failed input again on the next blur', () => {
    const blur = blurCheckedForm.update(
      blurCheckedForm.init(),
      blurCheckedForm.blurred('username'),
    )
    const failed = blurCheckedForm.update(
      blur.model,
      blurCheckedForm.Message.CompletedValidateField({
        name: 'username',
        generation: 1,
        result: Result.succeed(['Taken']),
      }),
    )

    expect(
      blurCheckedForm.update(failed.model, blurCheckedForm.blurred('username'))
        .commands,
    ).toHaveLength(1)
  })
})

describe('changing several fields', () => {
  const grantsForm = Form.define({
    name: 'Grants',
    submit: voidSubmit,
    fields: {
      canUse: Form.field({ schema: Schema.Boolean, initial: true }),
      canDelete: Form.field({
        schema: Schema.Boolean,
        initial: true,
        rules: FieldValidation.makeRules<boolean>({
          rules: [[canDelete => canDelete, 'Deletion stays on']],
        }),
      }),
      title: Form.field({
        schema: Schema.String,
        initial: '',
        validateOn: 'Blur',
        rules: FieldValidation.makeRules({ required: 'Enter a title' }),
      }),
      owner: Form.field({
        schema: Schema.String,
        initial: 'ada',
        validate: () => Effect.succeed([]),
      }),
    },
  })

  it('applies every change and checks each changed Change field', () => {
    const change = grantsForm.update(
      grantsForm.init(),
      grantsForm.changedFields({ canUse: false, canDelete: false }),
    )

    expect(grantsForm.inputs(change.model)).toEqual({
      canUse: false,
      canDelete: false,
      title: '',
      owner: 'ada',
    })
    expect(grantsForm.fieldView(change.model, 'canUse')).toMatchObject({
      maybeValue: Option.some(false),
      meta: { isEdited: true },
    })
    expect(grantsForm.fieldView(change.model, 'canDelete')).toMatchObject({
      errors: ['Deletion stays on'],
      meta: { isEdited: true },
    })
    expect(grantsForm.fieldView(change.model, 'owner').meta.isEdited).toBe(
      false,
    )
  })

  it('waits for blur before checking a changed Blur field', () => {
    const change = grantsForm.update(
      grantsForm.init(),
      grantsForm.changedFields({ canUse: false, title: '' }),
    )
    const blur = grantsForm.update(change.model, grantsForm.blurred('title'))

    expect(grantsForm.fieldView(change.model, 'title').errors).toEqual([])
    expect(grantsForm.fieldView(blur.model, 'title').errors).toEqual([
      'Enter a title',
    ])
  })

  it('returns the check Command of each changed field with a validate Effect', () => {
    const change = grantsForm.update(
      grantsForm.init(),
      grantsForm.changedFields({ canUse: false, owner: 'grace' }),
    )

    expect(change.commands?.map(command => command.args)).toEqual([
      { value: 'grace', generation: 1 },
    ])
  })

  it('checks a repeated field once with its last input', () => {
    const change = grantsForm.update(
      grantsForm.init(),
      grantsForm.Message.ChangedFields({
        changes: [
          { name: 'owner', input: 'grace' },
          { name: 'owner', input: 'linus' },
        ],
      }),
    )

    expect(grantsForm.inputs(change.model).owner).toBe('linus')
    expect(change.commands?.map(command => command.args)).toEqual([
      { value: 'linus', generation: 1 },
    ])
  })

  it('keeps a pending submission and returns a settled one to Idle', () => {
    const attempt = grantsForm.submit(
      grantsForm.init({ title: 'Editor', owner: '' }),
    )
    const changeWhileSubmitting = grantsForm.update(
      attempt.model,
      grantsForm.changedFields({ canUse: false, canDelete: false }),
    )
    const rejection = grantsForm.update(
      attempt.model,
      grantsForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Unavailable'),
      }),
    )
    const changeAfterFailure = grantsForm.update(
      rejection.model,
      grantsForm.changedFields({ canUse: false, canDelete: false }),
    )

    expect(grantsForm.submission(attempt.model)._tag).toBe('Submitting')
    expect(grantsForm.submission(changeWhileSubmitting.model)._tag).toBe(
      'Submitting',
    )
    expect(grantsForm.formError(rejection.model)).toEqual(
      Option.some('Unavailable'),
    )
    expect(grantsForm.submission(changeAfterFailure.model)._tag).toBe('Idle')
    expect(grantsForm.formError(changeAfterFailure.model)).toEqual(
      Option.none(),
    )
  })

  it('leaves the Model unchanged when no field changes', () => {
    const initialModel = grantsForm.init()
    const change = grantsForm.update(initialModel, grantsForm.changedFields({}))

    expect(change.model).toBe(initialModel)
    expect(change.commands ?? []).toEqual([])
  })
})

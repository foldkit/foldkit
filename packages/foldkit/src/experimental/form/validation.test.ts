import { Array, Context, Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import * as Form from './form.js'

const voidSubmit = { error: Schema.String, execute: () => Effect.void }

const firstCommand = <Command>(commands: ReadonlyArray<Command> | undefined) =>
  Array.head(commands ?? []).pipe(Option.getOrThrow)

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
})

describe('asynchronous checks', () => {
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

  it('names each validation Command after the Form and field', () => {
    expect(checkedUsernameForm.ValidateField.username.name).toBe(
      'ValidateCheckedUsername',
    )
  })

  it('throws when two field names would give their validation Commands the same name', () => {
    expect(() =>
      Form.define({
        name: 'Account',
        submit: { execute: () => Effect.void },
        fields: {
          userName: Form.field({ schema: Schema.String, initial: '' }),
          UserName: Form.field({ schema: Schema.String, initial: '' }),
        },
      }),
    ).toThrow('Form "Account" has field names that differ only')
  })

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
          : checkedUsernameForm.reinitialize(change.model)
      const changeAfterClear = checkedUsernameForm.update(
        cleared.model,
        checkedUsernameForm.changed('username', 'taken'),
      )

      expect(
        checkedUsernameForm.update(
          changeAfterClear.model,
          completedValidateUsername(1, ['Taken']),
        ).model,
      ).toBe(changeAfterClear.model)
      expect(
        checkedUsernameForm.update(
          changeAfterClear.model,
          completedValidateUsername(2, ['Taken']),
        ).model,
      ).not.toBe(changeAfterClear.model)
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
  const makeBlurCheckedForm = (
    validate: (value: string) => Effect.Effect<ReadonlyArray<string>, string>,
  ) =>
    Form.define({
      name: 'BlurChecked',
      submit: voidSubmit,
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: 'ada',
          validateOn: 'Blur',
          validate,
        }),
      },
    })

  it('reuses a pending check on a repeated blur', () => {
    const blurCheckedForm = makeBlurCheckedForm(() => Effect.succeed([]))
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
    const blurCheckedForm = makeBlurCheckedForm(() => Effect.succeed([]))
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
    const blurCheckedForm = makeBlurCheckedForm(() => Effect.succeed(['Taken']))
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

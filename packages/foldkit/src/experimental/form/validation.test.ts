import { Array, Context, Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import * as Form from './form.js'

const submit = { error: Schema.String, execute: () => Effect.void }

const firstCommand = <Command>(commands: ReadonlyArray<Command> | undefined) =>
  Array.head(commands ?? []).pipe(Option.getOrThrow)

const [isEmail] = FieldValidation.Rule.email('Invalid email')
const [isLongEnough] = FieldValidation.Rule.minLength(8, 'Too short')

const account = Form.define({
  name: 'Account',
  submit,
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
    const change = account.update(account.init(), account.changed('age', 10))

    expect(account.fieldView(change.model, 'age').errors).toEqual([
      'Must be an adult',
    ])
  })

  it('waits for blur before validating a Blur field', () => {
    const change = account.update(account.init(), account.changed('email', 'x'))
    const blur = account.update(change.model, account.blurred('email'))

    expect(account.fieldView(change.model, 'email').errors).toEqual([])
    expect(account.fieldView(blur.model, 'email').errors).toEqual([
      'Invalid email',
    ])
  })

  it('clears the errors of a Blur field when its input changes', () => {
    const change = account.update(account.init(), account.changed('email', 'x'))
    const blur = account.update(change.model, account.blurred('email'))
    const correction = account.update(
      blur.model,
      account.changed('email', 'ada@example.com'),
    )

    expect(account.fieldView(correction.model, 'email').errors).toEqual([])
  })

  it('shows the first failing rule on blur and every failing rule on submit', () => {
    const change = account.update(account.init(), account.changed('email', 'x'))
    const blur = account.update(change.model, account.blurred('email'))
    const attempt = account.submit(change.model)

    expect(account.fieldView(blur.model, 'email').errors).toEqual([
      'Invalid email',
    ])
    expect(account.fieldView(attempt.model, 'email').errors).toEqual([
      'Invalid email',
      'Too short',
    ])
  })
})

describe('asynchronous checks', () => {
  const username = Form.define({
    name: 'Checked',
    submit,
    fields: {
      username: Form.field({
        schema: Schema.String,
        initial: '',
        rules: FieldValidation.makeRules({ required: 'Required' }),
        validate: value => Effect.succeed(value === 'taken' ? ['Taken'] : []),
      }),
    },
  })
  const completion = (generation: number, errors: ReadonlyArray<string>) =>
    username.Message.CompletedValidateField({
      name: 'username',
      generation,
      result: Result.succeed(errors),
    })

  it('names each validation Command after the Form and field', () => {
    expect(username.ValidateField.username.name).toBe('ValidateCheckedUsername')
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
    const change = username.update(
      username.init(),
      username.changed('username', 'taken'),
    )

    expect(change.commands?.map(command => command.args)).toEqual([
      { value: 'taken', generation: 1 },
    ])
  })

  it('shows the errors the check returns', () => {
    const change = username.update(
      username.init(),
      username.changed('username', 'taken'),
    )
    const checked = username.update(change.model, completion(1, ['Taken']))

    expect(username.fieldView(checked.model, 'username').errors).toEqual([
      'Taken',
    ])
  })

  it('skips the check when the rules fail', () => {
    const change = username.update(
      username.init(),
      username.changed('username', ''),
    )

    expect(change.commands ?? []).toEqual([])
    expect(username.fieldView(change.model, 'username').errors).toEqual([
      'Required',
    ])
  })

  it('ignores a check for an input a later change replaced', () => {
    const first = username.update(
      username.init(),
      username.changed('username', 'taken'),
    )
    const second = username.update(
      first.model,
      username.changed('username', 'open'),
    )
    const third = username.update(
      second.model,
      username.changed('username', 'taken'),
    )

    expect(username.update(third.model, completion(1, ['Taken'])).model).toBe(
      third.model,
    )
  })

  it.each(['reset', 'reinitialize'])(
    'ignores a check that started before %s',
    operation => {
      const change = username.update(
        username.init(),
        username.changed('username', 'taken'),
      )
      const cleared =
        operation === 'reset'
          ? username.reset(change.model)
          : username.reinitialize(change.model)
      const next = username.update(
        cleared.model,
        username.changed('username', 'taken'),
      )

      expect(username.update(next.model, completion(1, ['Taken'])).model).toBe(
        next.model,
      )
      expect(
        username.update(next.model, completion(2, ['Taken'])).model,
      ).not.toBe(next.model)
    },
  )

  it('runs the validator only when its Command runs', () => {
    const validate = vi.fn((_value: string) => Effect.fail('Unavailable'))
    const deferred = Form.define({
      name: 'Deferred',
      submit,
      fields: {
        username: Form.field({ schema: Schema.String, initial: '', validate }),
      },
    })
    const change = deferred.update(
      deferred.init(),
      deferred.changed('username', 'next'),
    )

    expect(validate).not.toHaveBeenCalled()

    Effect.runSync(firstCommand(change.commands).effect)

    expect(validate).toHaveBeenCalledExactlyOnceWith('next')
  })

  it('shows a failed check as the field error', () => {
    const failing = Form.define({
      name: 'Failing',
      submit,
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: '',
          validate: () => Effect.fail('Check unavailable'),
        }),
      },
    })
    const change = failing.update(
      failing.init(),
      failing.changed('username', 'next'),
    )
    const checked = failing.update(
      change.model,
      Effect.runSync(firstCommand(change.commands).effect),
    )

    expect(failing.fieldView(checked.model, 'username').errors).toEqual([
      'Check unavailable',
    ])
  })

  it('runs only the validator of the field whose Command runs', () => {
    class CheckUsername extends Context.Service<
      CheckUsername,
      { check: (value: string) => ReadonlyArray<string> }
    >()('CheckUsername') {}
    class CheckAge extends Context.Service<
      CheckAge,
      { check: (value: number) => ReadonlyArray<string> }
    >()('CheckAge') {}
    const checkUsername = vi.fn((_value: string) => ['Taken'])
    const checkAge = vi.fn((_value: number) => [])
    const serviceful = Form.define({
      name: 'Serviceful',
      submit,
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: '',
          validate: value =>
            Effect.map(CheckUsername, service => service.check(value)),
        }),
        age: Form.field({
          schema: Schema.FiniteFromString,
          initial: '18',
          validate: value =>
            Effect.map(CheckAge, service => service.check(value)),
        }),
      },
    })
    const change = serviceful.update(
      serviceful.init(),
      serviceful.changed('username', 'taken'),
    )

    Effect.runSync(
      firstCommand(change.commands).effect.pipe(
        Effect.provideService(CheckUsername, { check: checkUsername }),
        Effect.provideService(CheckAge, { check: checkAge }),
      ),
    )

    expect(checkUsername).toHaveBeenCalledExactlyOnceWith('taken')
    expect(checkAge).not.toHaveBeenCalled()
  })
})

describe('checks on blur', () => {
  const blurChecked = (
    validate: (value: string) => Effect.Effect<ReadonlyArray<string>, string>,
  ) =>
    Form.define({
      name: 'BlurChecked',
      submit,
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
    const form = blurChecked(() => Effect.succeed([]))
    const blur = form.update(form.init(), form.blurred('username'))
    const repeated = form.update(blur.model, form.blurred('username'))

    expect(blur.commands).toHaveLength(1)
    expect(repeated.model).toBe(blur.model)
    expect(repeated.commands ?? []).toEqual([])
  })

  it('reuses a successful check on the next blur', () => {
    const form = blurChecked(() => Effect.succeed([]))
    const blur = form.update(form.init(), form.blurred('username'))
    const checked = form.update(
      blur.model,
      form.Message.CompletedValidateField({
        name: 'username',
        generation: 1,
        result: Result.succeed([]),
      }),
    )

    expect(
      form.update(checked.model, form.blurred('username')).commands ?? [],
    ).toEqual([])
  })

  it('checks a failed input again on the next blur', () => {
    const form = blurChecked(() => Effect.succeed(['Taken']))
    const blur = form.update(form.init(), form.blurred('username'))
    const failed = form.update(
      blur.model,
      form.Message.CompletedValidateField({
        name: 'username',
        generation: 1,
        result: Result.succeed(['Taken']),
      }),
    )

    expect(
      form.update(failed.model, form.blurred('username')).commands,
    ).toHaveLength(1)
  })
})

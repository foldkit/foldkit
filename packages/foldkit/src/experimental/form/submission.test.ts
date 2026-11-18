import { Array, Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import * as Form from './form.js'

const firstCommand = <Command>(commands: ReadonlyArray<Command> | undefined) =>
  Array.head(commands ?? []).pipe(Option.getOrThrow)

const SaveData = Schema.Struct({ id: Schema.Number })

const profile = Form.define({
  name: 'Profile',
  fields: {
    email: Form.field({
      schema: Schema.String,
      initial: 'ada@example.com',
      rules: FieldValidation.makeRules({ required: 'Enter email' }),
    }),
    accepted: Form.field({
      schema: Schema.Boolean,
      initial: true,
      rules: FieldValidation.makeRules<boolean>({
        rules: [[accepted => accepted, 'Accept terms']],
      }),
    }),
  },
  submit: {
    data: SaveData,
    error: Schema.String,
    execute: () => Effect.succeed(SaveData.make({ id: 7 })),
  },
})

const completedSubmit = (
  generation: number,
  result: Result.Result<typeof SaveData.Type, string>,
) => profile.Message.CompletedSubmit({ generation, result })

const checkedUsername = Form.define({
  name: 'CheckedUsername',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    username: Form.field({
      schema: Schema.String,
      initial: 'ada',
      validate: () => Effect.succeed([]),
    }),
  },
})

const usernameChecked = (generation: number) =>
  checkedUsername.Message.CompletedValidateField({
    name: 'username',
    generation,
    result: Result.succeed([]),
  })

describe('submission attempts', () => {
  it('names the Submit Command after the Form', () => {
    expect(profile.Submit.name).toBe('SubmitProfile')
  })

  it('returns one Submit Command with the decoded values when every field passes', () => {
    const attempt = profile.submit(profile.init())

    expect(profile.submission(attempt.model)._tag).toBe('Submitting')
    expect(attempt.commands?.map(command => command.args)).toEqual([
      {
        values: { email: 'ada@example.com', accepted: true },
        context: undefined,
        generation: 1,
      },
    ])
  })

  it('shows every invalid field and returns to Idle without a Command', () => {
    const attempt = profile.submit(profile.init({ email: '', accepted: false }))

    expect(profile.submission(attempt.model)._tag).toBe('Idle')
    expect(attempt.commands ?? []).toEqual([])
    expect(profile.fieldView(attempt.model, 'email').errors).toEqual([
      'Enter email',
    ])
    expect(profile.fieldView(attempt.model, 'accepted').errors).toEqual([
      'Accept terms',
    ])
  })

  it('counts every attempt since init', () => {
    const invalid = profile.submit(profile.init({ email: '' }))
    const valid = profile.submit(
      profile.update(invalid.model, profile.changed('email', 'a@b.c')).model,
    )

    expect(profile.submitCount(valid.model)).toBe(2)
  })

  it('ignores submit while an attempt is pending', () => {
    const attempt = profile.submit(profile.init())
    const repeated = profile.submit(attempt.model)

    expect(repeated.model).toBe(attempt.model)
    expect(repeated.commands ?? []).toEqual([])
  })

  it('ignores submit while field checks are pending', () => {
    const change = checkedUsername.update(
      checkedUsername.init(),
      checkedUsername.changed('username', 'grace'),
    )
    const attempt = checkedUsername.submit(change.model)
    const repeated = checkedUsername.submit(attempt.model)

    expect(checkedUsername.submission(attempt.model)._tag).toBe('Validating')
    expect(repeated.model).toBe(attempt.model)
    expect(repeated.commands ?? []).toEqual([])
    expect(checkedUsername.submitCount(repeated.model)).toBe(1)
  })

  it('keeps Submitting and the sent values when a field changes during submission', () => {
    const attempt = profile.submit(profile.init())
    const change = profile.update(
      attempt.model,
      profile.changed('email', 'grace@example.com'),
    )

    expect(profile.submission(change.model)).toEqual(
      profile.Submission.Submitting({
        generation: 1,
        inputs: { email: 'ada@example.com', accepted: true },
      }),
    )
  })

  it('runs execution only when the Submit Command runs', () => {
    const execute = vi.fn((values: Readonly<{ name: string }>) =>
      Effect.succeed(values.name.length),
    )
    const deferred = Form.define({
      name: 'Deferred',
      fields: { name: Form.field({ schema: Schema.String, initial: 'Ada' }) },
      submit: { data: Schema.Number, execute },
    })
    const attempt = deferred.submit(deferred.init())

    expect(execute).not.toHaveBeenCalled()
    expect(Effect.runSync(firstCommand(attempt.commands).effect)).toEqual(
      deferred.Message.CompletedSubmit({
        generation: 1,
        result: Result.succeed(3),
      }),
    )
  })
})

describe('attempts with asynchronous checks', () => {
  it('waits for a pending check before sending the Submit Command', () => {
    const change = checkedUsername.update(
      checkedUsername.init(),
      checkedUsername.changed('username', 'grace'),
    )
    const attempt = checkedUsername.submit(change.model)
    const checked = checkedUsername.update(attempt.model, usernameChecked(1))

    expect(checkedUsername.submission(attempt.model)._tag).toBe('Validating')
    expect(attempt.commands ?? []).toEqual([])
    expect(checked.commands?.map(command => command.name)).toEqual([
      'SubmitCheckedUsername',
    ])
  })

  it.each([{ errors: [] }, { errors: ['Taken'] }])(
    'settles the attempt only after every check completes, with errors $errors',
    ({ errors }) => {
      const pair = Form.define({
        name: 'Pair',
        submit: { error: Schema.String, execute: () => Effect.void },
        fields: {
          first: Form.field({
            schema: Schema.String,
            initial: 'Ada',
            validate: () => Effect.succeed(errors),
          }),
          second: Form.field({
            schema: Schema.String,
            initial: 'Lovelace',
            validate: () => Effect.succeed([]),
          }),
        },
      })
      const attempt = pair.submit(pair.init())
      const firstChecked = pair.update(
        attempt.model,
        pair.Message.CompletedValidateField({
          name: 'first',
          generation: 1,
          result: Result.succeed(errors),
        }),
      )
      const bothChecked = pair.update(
        firstChecked.model,
        pair.Message.CompletedValidateField({
          name: 'second',
          generation: 1,
          result: Result.succeed([]),
        }),
      )

      expect(pair.submission(firstChecked.model)._tag).toBe('Validating')
      expect(pair.submission(bothChecked.model)._tag).toBe(
        Array.isArrayEmpty(errors) ? 'Submitting' : 'Idle',
      )
      expect(bothChecked.commands ?? []).toHaveLength(
        Array.isArrayEmpty(errors) ? 1 : 0,
      )
    },
  )

  it('cancels a Validating attempt when a field changes', () => {
    const attempt = checkedUsername.submit(checkedUsername.init())
    const change = checkedUsername.update(
      attempt.model,
      checkedUsername.changed('username', 'grace'),
    )
    const checked = checkedUsername.update(change.model, usernameChecked(2))

    expect(checkedUsername.submission(checked.model)._tag).toBe('Idle')
    expect(checked.commands ?? []).toEqual([])
  })

  it('sends no second Submit when a field check completes during submission', () => {
    const attempt = checkedUsername.submit(checkedUsername.init())
    const submitting = checkedUsername.update(attempt.model, usernameChecked(1))
    const change = checkedUsername.update(
      submitting.model,
      checkedUsername.changed('username', 'grace'),
    )
    const checked = checkedUsername.update(change.model, usernameChecked(2))

    expect(checked.commands ?? []).toEqual([])
    expect(checkedUsername.submission(checked.model)).toEqual(
      checkedUsername.submission(submitting.model),
    )
  })

  it('skips the check of an empty optional field', () => {
    const optional = Form.define({
      name: 'Optional',
      submit: { error: Schema.String, execute: () => Effect.void },
      fields: {
        handle: Form.field({
          schema: Schema.String,
          initial: '',
          validate: () => Effect.succeed([]),
        }),
      },
    })
    const attempt = optional.submit(optional.init())

    expect(attempt.commands?.map(command => command.name)).toEqual([
      'SubmitOptional',
    ])
    expect(optional.submission(attempt.model)._tag).toBe('Submitting')
  })
})

describe('submission results', () => {
  it('records success data and returns SucceededSubmit', () => {
    const attempt = profile.submit(profile.init())
    const settled = profile.update(
      attempt.model,
      completedSubmit(1, Result.succeed(SaveData.make({ id: 7 }))),
    )

    expect(profile.submission(settled.model)).toEqual(
      profile.Submission.Succeeded({ data: SaveData.make({ id: 7 }) }),
    )
    expect(settled.outMessage).toEqual(
      profile.OutMessage.SucceededSubmit({ data: SaveData.make({ id: 7 }) }),
    )
  })

  it('records the typed error and returns FailedSubmit', () => {
    const attempt = profile.submit(profile.init())
    const settled = profile.update(
      attempt.model,
      completedSubmit(1, Result.fail('Unavailable')),
    )

    expect(profile.submission(settled.model)).toEqual(
      profile.Submission.Failed({ error: 'Unavailable' }),
    )
    expect(settled.outMessage).toEqual(
      profile.OutMessage.FailedSubmit({ error: 'Unavailable' }),
    )
  })

  it('ignores a second result for an attempt that already settled', () => {
    const attempt = profile.submit(profile.init())
    const settled = profile.update(
      attempt.model,
      completedSubmit(1, Result.fail('Unavailable')),
    )
    const repeated = profile.update(
      settled.model,
      completedSubmit(1, Result.succeed(SaveData.make({ id: 7 }))),
    )

    expect(repeated.model).toBe(settled.model)
    expect(repeated.outMessage).toBeUndefined()
  })

  it.each(['reset', 'reinitialize'])(
    'ignores a result for an attempt made before %s',
    operation => {
      const first = profile.submit(profile.init())
      const cleared =
        operation === 'reset'
          ? profile.reset(first.model)
          : profile.reinitialize(first.model)
      const second = profile.submit(cleared.model)
      const stale = profile.update(
        second.model,
        completedSubmit(1, Result.fail('Unavailable')),
      )

      expect(stale.model).toBe(second.model)
      expect(stale.outMessage).toBeUndefined()
    },
  )

  it('returns a settled submission to Idle when a field changes', () => {
    const attempt = profile.submit(profile.init())
    const settled = profile.update(
      attempt.model,
      completedSubmit(1, Result.fail('Unavailable')),
    )
    const change = profile.update(settled.model, profile.changed('email', 'x'))

    expect(profile.submission(change.model)._tag).toBe('Idle')
    expect(profile.submitCount(change.model)).toBe(1)
  })
})

describe('submission context', () => {
  const RecordContext = Schema.Struct({ recordId: Schema.String })

  it('passes the context given to submit to execution', () => {
    const execute = vi.fn(
      (values: Readonly<{ name: string }>, record: typeof RecordContext.Type) =>
        Effect.succeed(`${record.recordId}:${values.name}`),
    )
    const editing = Form.define({
      name: 'Editing',
      fields: { name: Form.field({ schema: Schema.String, initial: 'Ada' }) },
      submit: { data: Schema.String, context: RecordContext, execute },
    })
    const attempt = editing.submit(editing.init(), { recordId: 'profile-1' })

    Effect.runSync(firstCommand(attempt.commands).effect)

    expect(execute).toHaveBeenCalledExactlyOnceWith(
      { name: 'Ada' },
      { recordId: 'profile-1' },
    )
  })

  it('keeps the context while field checks are pending', () => {
    const editing = Form.define({
      name: 'EditingChecked',
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: 'ada',
          validate: () => Effect.succeed([]),
        }),
      },
      submit: { context: RecordContext, execute: () => Effect.void },
    })
    const attempt = editing.submit(editing.init(), { recordId: 'profile-1' })
    const checked = editing.update(
      attempt.model,
      editing.Message.CompletedValidateField({
        name: 'username',
        generation: 1,
        result: Result.succeed([]),
      }),
    )

    expect(checked.commands?.map(command => command.args)).toEqual([
      {
        values: { username: 'ada' },
        context: { recordId: 'profile-1' },
        generation: 1,
      },
    ])
  })
})

describe('reset and reinitialize', () => {
  it('restores defaults and clears interaction, validation, submission, and attempts', () => {
    const edited = profile.update(profile.init(), profile.changed('email', ''))
    const attempt = profile.submit(
      profile.update(edited.model, profile.blurred('email')).model,
    )
    const reset = profile.reset(attempt.model)

    expect(profile.fieldView(reset.model, 'email')).toEqual({
      input: 'ada@example.com',
      maybeValue: Option.some('ada@example.com'),
      errors: [],
      meta: {
        isTouched: false,
        isBlurred: false,
        isEdited: false,
        isDefaultValue: true,
      },
    })
    expect(profile.submission(reset.model)._tag).toBe('Idle')
    expect(profile.submitCount(reset.model)).toBe(0)
  })

  it('replaces the defaults that reset restores', () => {
    const reinitialize = profile.reinitialize(profile.init(), {
      email: 'grace@example.com',
    })
    const edited = profile.update(
      reinitialize.model,
      profile.changed('email', 'x'),
    )

    expect(profile.inputs(profile.reset(edited.model).model).email).toBe(
      'grace@example.com',
    )
  })
})

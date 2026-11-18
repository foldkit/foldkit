import { Array, Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as FieldValidation from '../../fieldValidation/index.js'
import * as Form from './form.js'

const firstCommand = <Command>(commands: ReadonlyArray<Command> | undefined) =>
  Array.head(commands ?? []).pipe(Option.getOrThrow)

const SaveData = Schema.Struct({ id: Schema.Number })

const profileForm = Form.define({
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
) => profileForm.Message.CompletedSubmit({ generation, result })

const checkedUsernameForm = Form.define({
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

const completedValidateUsername = (generation: number) =>
  checkedUsernameForm.Message.CompletedValidateField({
    name: 'username',
    generation,
    result: Result.succeed([]),
  })

describe('submission attempts', () => {
  it('names the Submit Command after the Form', () => {
    expect(profileForm.Submit.name).toBe('SubmitProfile')
  })

  it('returns one Submit Command with the decoded values when every field passes', () => {
    const attempt = profileForm.submit(profileForm.init())

    expect(profileForm.submission(attempt.model)._tag).toBe('Submitting')
    expect(attempt.commands?.map(command => command.args)).toEqual([
      {
        values: { email: 'ada@example.com', accepted: true },
        context: undefined,
        generation: 1,
      },
    ])
  })

  it('shows every invalid field and returns to Idle without a Command', () => {
    const attempt = profileForm.submit(
      profileForm.init({ email: '', accepted: false }),
    )

    expect(profileForm.submission(attempt.model)._tag).toBe('Idle')
    expect(attempt.commands ?? []).toEqual([])
    expect(profileForm.fieldView(attempt.model, 'email').errors).toEqual([
      'Enter email',
    ])
    expect(profileForm.fieldView(attempt.model, 'accepted').errors).toEqual([
      'Accept terms',
    ])
  })

  it('counts every attempt since init', () => {
    const invalidSubmit = profileForm.submit(profileForm.init({ email: '' }))
    const validSubmit = profileForm.submit(
      profileForm.update(
        invalidSubmit.model,
        profileForm.changed('email', 'a@b.c'),
      ).model,
    )

    expect(profileForm.submitCount(validSubmit.model)).toBe(2)
  })

  it('ignores submit while an attempt is pending', () => {
    const attempt = profileForm.submit(profileForm.init())
    const repeated = profileForm.submit(attempt.model)

    expect(repeated.model).toBe(attempt.model)
    expect(repeated.commands ?? []).toEqual([])
  })

  it('ignores submit while field checks are pending', () => {
    const change = checkedUsernameForm.update(
      checkedUsernameForm.init(),
      checkedUsernameForm.changed('username', 'grace'),
    )
    const attempt = checkedUsernameForm.submit(change.model)
    const repeated = checkedUsernameForm.submit(attempt.model)

    expect(checkedUsernameForm.submission(attempt.model)._tag).toBe(
      'Validating',
    )
    expect(repeated.model).toBe(attempt.model)
    expect(repeated.commands ?? []).toEqual([])
    expect(checkedUsernameForm.submitCount(repeated.model)).toBe(1)
  })

  it('keeps Submitting and the sent values when a field changes during submission', () => {
    const attempt = profileForm.submit(profileForm.init())
    const change = profileForm.update(
      attempt.model,
      profileForm.changed('email', 'grace@example.com'),
    )

    expect(profileForm.submission(change.model)).toEqual(
      profileForm.Submission.Submitting({
        generation: 1,
        inputs: { email: 'ada@example.com', accepted: true },
      }),
    )
  })

  it('runs execution only when the Submit Command runs', () => {
    const execute = vi.fn((values: Readonly<{ name: string }>) =>
      Effect.succeed(values.name.length),
    )
    const deferredForm = Form.define({
      name: 'Deferred',
      fields: { name: Form.field({ schema: Schema.String, initial: 'Ada' }) },
      submit: { data: Schema.Number, execute },
    })
    const attempt = deferredForm.submit(deferredForm.init())

    expect(execute).not.toHaveBeenCalled()
    expect(Effect.runSync(firstCommand(attempt.commands).effect)).toEqual(
      deferredForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.succeed(3),
      }),
    )
  })
})

describe('attempts with asynchronous checks', () => {
  it('waits for a pending check before sending the Submit Command', () => {
    const change = checkedUsernameForm.update(
      checkedUsernameForm.init(),
      checkedUsernameForm.changed('username', 'grace'),
    )
    const attempt = checkedUsernameForm.submit(change.model)
    const validationCompletion = checkedUsernameForm.update(
      attempt.model,
      completedValidateUsername(1),
    )

    expect(checkedUsernameForm.submission(attempt.model)._tag).toBe(
      'Validating',
    )
    expect(attempt.commands ?? []).toEqual([])
    expect(validationCompletion.commands?.map(command => command.name)).toEqual(
      ['SubmitCheckedUsername'],
    )
  })

  it.each([{ errors: [] }, { errors: ['Taken'] }])(
    'settles the attempt only after every check completes, with errors $errors',
    ({ errors }) => {
      const pairForm = Form.define({
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
      const attempt = pairForm.submit(pairForm.init())
      const firstChecked = pairForm.update(
        attempt.model,
        pairForm.Message.CompletedValidateField({
          name: 'first',
          generation: 1,
          result: Result.succeed(errors),
        }),
      )
      const bothChecked = pairForm.update(
        firstChecked.model,
        pairForm.Message.CompletedValidateField({
          name: 'second',
          generation: 1,
          result: Result.succeed([]),
        }),
      )

      expect(pairForm.submission(firstChecked.model)._tag).toBe('Validating')
      expect(pairForm.submission(bothChecked.model)._tag).toBe(
        Array.isArrayEmpty(errors) ? 'Submitting' : 'Idle',
      )
      expect(bothChecked.commands ?? []).toHaveLength(
        Array.isArrayEmpty(errors) ? 1 : 0,
      )
    },
  )

  it('cancels a Validating attempt when a field changes', () => {
    const attempt = checkedUsernameForm.submit(checkedUsernameForm.init())
    const change = checkedUsernameForm.update(
      attempt.model,
      checkedUsernameForm.changed('username', 'grace'),
    )
    const validationCompletion = checkedUsernameForm.update(
      change.model,
      completedValidateUsername(2),
    )

    expect(
      checkedUsernameForm.submission(validationCompletion.model)._tag,
    ).toBe('Idle')
    expect(validationCompletion.commands ?? []).toEqual([])
  })

  it('sends no second Submit when a field check completes during submission', () => {
    const attempt = checkedUsernameForm.submit(checkedUsernameForm.init())
    const firstValidationCompletion = checkedUsernameForm.update(
      attempt.model,
      completedValidateUsername(1),
    )
    const change = checkedUsernameForm.update(
      firstValidationCompletion.model,
      checkedUsernameForm.changed('username', 'grace'),
    )
    const secondValidationCompletion = checkedUsernameForm.update(
      change.model,
      completedValidateUsername(2),
    )

    expect(secondValidationCompletion.commands ?? []).toEqual([])
    expect(
      checkedUsernameForm.submission(secondValidationCompletion.model),
    ).toEqual(checkedUsernameForm.submission(firstValidationCompletion.model))
  })

  it('skips the check of an empty optional field', () => {
    const optionalHandleForm = Form.define({
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
    const attempt = optionalHandleForm.submit(optionalHandleForm.init())

    expect(attempt.commands?.map(command => command.name)).toEqual([
      'SubmitOptional',
    ])
    expect(optionalHandleForm.submission(attempt.model)._tag).toBe('Submitting')
  })
})

describe('submission results', () => {
  it('records success data and returns SucceededSubmit', () => {
    const attempt = profileForm.submit(profileForm.init())
    const settled = profileForm.update(
      attempt.model,
      completedSubmit(1, Result.succeed(SaveData.make({ id: 7 }))),
    )

    expect(profileForm.submission(settled.model)).toEqual(
      profileForm.Submission.Succeeded({ data: SaveData.make({ id: 7 }) }),
    )
    expect(settled.outMessage).toEqual(
      profileForm.OutMessage.SucceededSubmit({
        data: SaveData.make({ id: 7 }),
      }),
    )
  })

  it('records the typed error and returns FailedSubmit', () => {
    const attempt = profileForm.submit(profileForm.init())
    const settled = profileForm.update(
      attempt.model,
      completedSubmit(1, Result.fail('Unavailable')),
    )

    expect(profileForm.submission(settled.model)).toEqual(
      profileForm.Submission.Failed({ error: 'Unavailable' }),
    )
    expect(settled.outMessage).toEqual(
      profileForm.OutMessage.FailedSubmit({ error: 'Unavailable' }),
    )
  })

  it('ignores a second result for an attempt that already settled', () => {
    const attempt = profileForm.submit(profileForm.init())
    const settled = profileForm.update(
      attempt.model,
      completedSubmit(1, Result.fail('Unavailable')),
    )
    const repeated = profileForm.update(
      settled.model,
      completedSubmit(1, Result.succeed(SaveData.make({ id: 7 }))),
    )

    expect(repeated.model).toBe(settled.model)
    expect(repeated.outMessage).toBeUndefined()
  })

  it.each(['reset', 'reinitialize'])(
    'ignores a result for an attempt made before %s',
    operation => {
      const firstSubmit = profileForm.submit(profileForm.init())
      const cleared =
        operation === 'reset'
          ? profileForm.reset(firstSubmit.model)
          : profileForm.reinitialize(firstSubmit.model)
      const secondSubmit = profileForm.submit(cleared.model)
      const stale = profileForm.update(
        secondSubmit.model,
        completedSubmit(1, Result.fail('Unavailable')),
      )

      expect(stale.model).toBe(secondSubmit.model)
      expect(stale.outMessage).toBeUndefined()
    },
  )

  it('returns a settled submission to Idle when a field changes', () => {
    const attempt = profileForm.submit(profileForm.init())
    const settled = profileForm.update(
      attempt.model,
      completedSubmit(1, Result.fail('Unavailable')),
    )
    const change = profileForm.update(
      settled.model,
      profileForm.changed('email', 'x'),
    )

    expect(profileForm.submission(change.model)._tag).toBe('Idle')
    expect(profileForm.submitCount(change.model)).toBe(1)
  })
})

describe('submission context', () => {
  const RecordContext = Schema.Struct({ recordId: Schema.String })

  it('passes the context given to submit to execution', () => {
    const execute = vi.fn(
      (
        values: Readonly<{ name: string }>,
        context: typeof RecordContext.Type,
      ) => Effect.succeed(`${context.recordId}:${values.name}`),
    )
    const editingForm = Form.define({
      name: 'Editing',
      fields: { name: Form.field({ schema: Schema.String, initial: 'Ada' }) },
      submit: { data: Schema.String, context: RecordContext, execute },
    })
    const attempt = editingForm.submit(editingForm.init(), {
      recordId: 'profile-1',
    })

    Effect.runSync(firstCommand(attempt.commands).effect)

    expect(execute).toHaveBeenCalledExactlyOnceWith(
      { name: 'Ada' },
      { recordId: 'profile-1' },
    )
  })

  it('keeps the context while field checks are pending', () => {
    const editingForm = Form.define({
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
    const attempt = editingForm.submit(editingForm.init(), {
      recordId: 'profile-1',
    })
    const validationCompletion = editingForm.update(
      attempt.model,
      editingForm.Message.CompletedValidateField({
        name: 'username',
        generation: 1,
        result: Result.succeed([]),
      }),
    )

    expect(validationCompletion.commands?.map(command => command.args)).toEqual(
      [
        {
          values: { username: 'ada' },
          context: { recordId: 'profile-1' },
          generation: 1,
        },
      ],
    )
  })
})

describe('reset and reinitialize', () => {
  it('restores defaults and clears interaction, validation, submission, and attempts', () => {
    const edited = profileForm.update(
      profileForm.init(),
      profileForm.changed('email', ''),
    )
    const attempt = profileForm.submit(
      profileForm.update(edited.model, profileForm.blurred('email')).model,
    )
    const reset = profileForm.reset(attempt.model)

    expect(profileForm.fieldView(reset.model, 'email')).toEqual({
      input: 'ada@example.com',
      maybeValue: Option.some('ada@example.com'),
      errors: [],
      meta: {
        isTouched: false,
        isBlurred: false,
        isEdited: false,
        isDefaultInput: true,
      },
    })
    expect(profileForm.submission(reset.model)._tag).toBe('Idle')
    expect(profileForm.submitCount(reset.model)).toBe(0)
  })

  it('replaces the defaults that reset restores', () => {
    const reinitialize = profileForm.reinitialize(profileForm.init(), {
      email: 'grace@example.com',
    })
    const edited = profileForm.update(
      reinitialize.model,
      profileForm.changed('email', 'x'),
    )

    expect(
      profileForm.inputs(profileForm.reset(edited.model).model).email,
    ).toBe('grace@example.com')
  })
})

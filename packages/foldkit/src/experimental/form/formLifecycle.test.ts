import { Array, Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import * as Story from '../../test/story.js'
import * as Form from './form.js'

const checked = Form.define({
  name: 'CheckedLifecycle',
  submit: { error: Schema.String, execute: () => Effect.void },
  fields: {
    username: Form.field({
      schema: Schema.String,
      initial: 'initial',
      validate: value => Effect.succeed(value === 'taken' ? ['Taken'] : []),
    }),
  },
})

const executeFirstCommand = <Message>(
  commands:
    | ReadonlyArray<{ readonly effect: Effect.Effect<Message> }>
    | undefined,
): Message => {
  const maybeCommand = Array.head(commands ?? [])
  if (Option.isNone(maybeCommand)) {
    throw new Error('Expected a Command')
  }
  return Effect.runSync(maybeCommand.value.effect)
}

describe('validation on blur', () => {
  it('reuses pending and successful checks on repeated blur and submit', () => {
    const validate = vi.fn((_value: string) => Effect.succeed([]))
    const form = Form.define({
      name: 'BlurValidation',
      submit: { error: Schema.String, execute: () => Effect.void },
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: '',
          validateOn: 'Blur',
          validate,
        }),
      },
    })
    const change = form.update(
      form.init(),
      form.changed('username', 'available'),
    )
    expect(change.commands ?? []).toEqual([])

    const blur = form.update(change.model, form.blurred('username'))
    expect(blur.commands).toHaveLength(1)
    const repeatedBlur = form.update(blur.model, form.blurred('username'))
    expect(repeatedBlur.model).toBe(blur.model)
    expect(repeatedBlur.commands ?? []).toEqual([])
    expect(validate).not.toHaveBeenCalled()

    const completed = form.update(
      blur.model,
      executeFirstCommand(blur.commands),
    )
    const validatedBlur = form.update(completed.model, form.blurred('username'))
    expect(validatedBlur.model).toBe(completed.model)
    expect(validatedBlur.commands ?? []).toEqual([])
    expect(validate).toHaveBeenCalledExactlyOnceWith('available')

    const submit = form.submit(validatedBlur.model)
    expect(form.submission(submit.model)._tag).toBe('Submitting')
    expect(submit.commands).toHaveLength(1)
    expect(
      Array.head(submit.commands ?? []).pipe(Option.getOrThrow).args,
    ).toEqual({ values: { username: 'available' }, token: { generation: 1 } })
    expect(validate).toHaveBeenCalledTimes(1)
  })

  it('retries an invalid blur check without changing the input', () => {
    const validate = vi.fn((_value: string) => Effect.succeed(['Taken']))
    const form = Form.define({
      name: 'RetryBlurValidation',
      submit: { error: Schema.String, execute: () => Effect.void },
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: 'taken',
          validateOn: 'Blur',
          validate,
        }),
      },
    })
    const blur = form.update(form.init(), form.blurred('username'))
    const invalid = form.update(blur.model, executeFirstCommand(blur.commands))
    expect(form.field(invalid.model, 'username').errors).toEqual(['Taken'])

    validate.mockImplementation(() => Effect.succeed([]))
    const retry = form.update(invalid.model, form.blurred('username'))
    expect(retry.commands).toHaveLength(1)
    const completed = form.update(
      retry.model,
      executeFirstCommand(retry.commands),
    )
    expect(form.field(completed.model, 'username').errors).toEqual([])
    expect(completed.model.fields.username.validation._tag).toBe('Valid')
    expect(validate).toHaveBeenCalledTimes(2)
  })
})

describe('field validation identity', () => {
  it('ignores a completion from the first occurrence of a repeated value', () => {
    const firstChange = checked.update(
      checked.init(),
      checked.changed('username', 'taken'),
    )
    const differentChange = checked.update(
      firstChange.model,
      checked.changed('username', 'open'),
    )
    const repeatedChange = checked.update(
      differentChange.model,
      checked.changed('username', 'taken'),
    )
    const ignored = checked.update(
      repeatedChange.model,
      executeFirstCommand(firstChange.commands),
    )
    expect(ignored.model).toBe(repeatedChange.model)
    expect(checked.field(ignored.model, 'username').errors).toEqual([])
    const completed = checked.update(
      repeatedChange.model,
      executeFirstCommand(repeatedChange.commands),
    )
    expect(checked.field(completed.model, 'username').errors).toEqual(['Taken'])
  })

  it.each(['reset', 'reinitialize'])(
    'ignores validation before %s and preserves identity for the next check',
    operation => {
      const firstChange = checked.update(
        checked.init(),
        checked.changed('username', 'initial'),
      )
      const cleared =
        operation === 'reset'
          ? checked.reset(firstChange.model)
          : checked.reinitialize(firstChange.model)
      expect(
        checked.update(cleared.model, executeFirstCommand(firstChange.commands))
          .model,
      ).toBe(cleared.model)
      const next = checked.update(
        cleared.model,
        checked.changed('username', 'initial'),
      )
      expect(
        checked.update(next.model, executeFirstCommand(firstChange.commands))
          .model,
      ).toBe(next.model)
      const completed = checked.update(
        next.model,
        executeFirstCommand(next.commands),
      )
      expect(completed.model.fields.username.validation._tag).toBe('Valid')
      expect(
        checked.update(completed.model, executeFirstCommand(next.commands))
          .model,
      ).toBe(completed.model)
    },
  )

  it('applies a validation completion decoded from JSON', () => {
    const change = checked.update(
      checked.init(),
      checked.changed('username', 'taken'),
    )
    const completion = executeFirstCommand(change.commands)
    const codec = Schema.toCodecJson(checked.Message)
    const decoded = Schema.decodeSync(codec)(
      Schema.encodeSync(codec)(completion),
    )
    const completed = checked.update(change.model, decoded)
    expect(checked.field(completed.model, 'username').errors).toEqual(['Taken'])
  })
})

const SaveData = Schema.Struct({ id: Schema.NumberFromString })
const SaveError = Schema.Struct({
  code: Schema.NumberFromString,
  message: Schema.String,
})
const saved = Form.define({
  name: 'SavedLifecycle',
  fields: {
    username: Form.field({ schema: Schema.String, initial: 'Ada' }),
  },
  submit: {
    data: SaveData,
    error: SaveError,
    execute: values =>
      Effect.succeed(SaveData.make({ id: values.username.length })),
  },
})

describe('submission Commands', () => {
  it('defers submission execution and captures values before edits', () => {
    const execute = vi.fn((values: Readonly<{ username: string }>) =>
      Effect.succeed(values.username.length),
    )
    const form = Form.define({
      name: 'DeferredSubmit',
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: 'Ada',
        }),
      },
      submit: { data: Schema.Number, execute },
    })
    const pending = form.submit(form.init())
    expect(execute).not.toHaveBeenCalled()
    const edited = form.update(pending.model, form.changed('username', 'Grace'))
    expect(form.submission(edited.model)._tag).toBe('Submitting')
    const duplicate = form.submit(edited.model)
    expect(duplicate.model).toBe(edited.model)
    expect(duplicate.commands ?? []).toEqual([])

    const completion = executeFirstCommand(pending.commands)
    expect(execute).toHaveBeenCalledExactlyOnceWith(
      { username: 'Ada' },
      undefined,
    )
    const settled = form.update(edited.model, completion)
    expect(form.submission(settled.model)).toEqual(
      form.Submission.Succeeded({ data: 3 }),
    )
    expect(settled.outMessage).toEqual(
      form.OutMessage.SucceededSubmit({ data: 3 }),
    )
    expect(form.inputs(settled.model).username).toBe('Grace')

    const repeated = form.update(settled.model, completion)
    expect(repeated.model).toBe(settled.model)
    expect(repeated.outMessage).toBeUndefined()
  })

  it('serializes omitted-data success Messages and Models through JSON', () => {
    const form = Form.define({
      name: 'VoidSubmission',
      fields: {
        name: Form.field({ schema: Schema.String, initial: 'Ada' }),
      },
      submit: { execute: () => Effect.void },
    })
    const pending = form.submit(form.init())
    const codec = Schema.toCodecJson(form.Message)
    const completion = Schema.decodeSync(codec)(
      Schema.encodeSync(codec)(executeFirstCommand(pending.commands)),
    )
    const settled = form.update(pending.model, completion)
    expect(form.submission(settled.model)).toEqual(
      form.Submission.Succeeded({ data: undefined }),
    )
    const modelCodec = Schema.toCodecJson(form.Model)
    expect(
      Schema.decodeSync(modelCodec)(
        Schema.encodeSync(modelCodec)(settled.model),
      ),
    ).toEqual(settled.model)
  })

  it('serializes transformed structured success data and error payloads', () => {
    const pending = saved.submit(saved.init())
    const completion = executeFirstCommand(pending.commands)
    const messageCodec = Schema.toCodecJson(saved.Message)
    const decoded = Schema.decodeSync(messageCodec)(
      Schema.encodeSync(messageCodec)(completion),
    )
    const success = saved.update(pending.model, decoded)
    expect(saved.submission(success.model)).toEqual(
      saved.Submission.Succeeded({ data: SaveData.make({ id: 3 }) }),
    )
    const modelCodec = Schema.toCodecJson(saved.Model)
    expect(
      Schema.decodeSync(modelCodec)(
        Schema.encodeSync(modelCodec)(success.model),
      ),
    ).toEqual(success.model)

    const error = SaveError.make({ code: 409, message: 'Username exists' })
    const failure = saved.Message.CompletedSubmit({
      token: { generation: 1 },
      result: Result.fail(error),
    })
    const failed = saved.update(
      pending.model,
      Schema.decodeSync(messageCodec)(Schema.encodeSync(messageCodec)(failure)),
    )
    expect(saved.submission(failed.model)).toEqual(
      saved.Submission.Failed({ error }),
    )
    expect(
      Schema.decodeSync(modelCodec)(
        Schema.encodeSync(modelCodec)(failed.model),
      ),
    ).toEqual(failed.model)
    expect(
      saved.Submission.match(failed.model.submission, {
        Idle: () => '',
        Validating: () => '',
        Submitting: () => '',
        Succeeded: ({ data }) => globalThis.String(data.id),
        Failed: ({ error }) => error.message,
      }),
    ).toBe('Username exists')
  })

  it('turns configured typed failures into its own completion Message', () => {
    const error = SaveError.make({ code: 503, message: 'Save unavailable' })
    const execute = vi.fn(() => Effect.fail(error))
    const form = Form.define({
      name: 'FailedSubmit',
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: 'Ada',
        }),
      },
      submit: { error: SaveError, execute },
    })
    const pending = form.submit(form.init())
    expect(execute).not.toHaveBeenCalled()
    const completion = executeFirstCommand(pending.commands)
    expect(completion).toEqual(
      form.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.fail(error),
      }),
    )
    const failed = form.update(pending.model, completion)
    expect(form.submission(failed.model)).toEqual(
      form.Submission.Failed({ error }),
    )
    expect(failed.outMessage).toEqual(form.OutMessage.FailedSubmit({ error }))
  })

  it.each(['reset', 'reinitialize'])(
    'rejects submission completions before %s and during the next attempt',
    operation => {
      const first = saved.submit(saved.init())
      const stale = executeFirstCommand(first.commands)
      const cleared =
        operation === 'reset'
          ? saved.reset(first.model)
          : saved.reinitialize(first.model)
      const ignoredAfterClear = saved.update(cleared.model, stale)
      expect(ignoredAfterClear.model).toBe(cleared.model)
      expect(ignoredAfterClear.outMessage).toBeUndefined()
      const next = saved.submit(cleared.model)
      expect(next.model.generation).toBe(2)
      const ignoredDuringNext = saved.update(next.model, stale)
      expect(ignoredDuringNext.model).toBe(next.model)
      expect(ignoredDuringNext.outMessage).toBeUndefined()
      const settled = saved.update(
        next.model,
        executeFirstCommand(next.commands),
      )
      expect(saved.submission(settled.model)._tag).toBe('Succeeded')
    },
  )
})

describe('submission validation', () => {
  it('reuses a pending check and returns one Submit Command from its completion', () => {
    const changed = checked.update(
      checked.init(),
      checked.changed('username', 'open'),
    )
    const pending = checked.submit(changed.model)
    expect(checked.submission(pending.model)._tag).toBe('Validating')
    expect(pending.commands ?? []).toEqual([])
    const completion = executeFirstCommand(changed.commands)
    const continued = checked.update(pending.model, completion)
    expect(checked.submission(continued.model)._tag).toBe('Submitting')
    expect(continued.commands).toHaveLength(1)
    expect(
      Array.head(continued.commands ?? []).pipe(Option.getOrThrow).name,
    ).toBe(checked.Submit.name)
    expect(checked.update(continued.model, completion).model).toBe(
      continued.model,
    )
    expect(checked.submit(continued.model).commands ?? []).toEqual([])
  })

  it.each([{ errors: [] }, { errors: ['Taken'] }])(
    'waits for every check before completing an attempt with errors $errors',
    ({ errors }) => {
      const execute = vi.fn(() => Effect.void)
      const form = Form.define({
        name: 'AllChecks',
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
        submit: { error: Schema.String, execute },
      })
      const pending = form.submit(form.init())
      const completions = Array.map(pending.commands ?? [], command =>
        Effect.runSync(command.effect),
      )
      const first = form.update(
        pending.model,
        Array.head(completions).pipe(Option.getOrThrow),
      )
      expect(form.submission(first.model)._tag).toBe('Validating')
      expect(first.commands ?? []).toEqual([])
      const last = form.update(
        first.model,
        Array.last(completions).pipe(Option.getOrThrow),
      )
      expect(form.submitCount(last.model)).toBe(1)
      if (Array.isArrayEmpty(errors)) {
        expect(form.submission(last.model)._tag).toBe('Submitting')
        expect(last.commands).toHaveLength(1)
        executeFirstCommand(last.commands)
        expect(execute).toHaveBeenCalledTimes(1)
      } else {
        expect(form.submission(last.model)._tag).toBe('Idle')
        expect(last.commands ?? []).toEqual([])
        expect(execute).not.toHaveBeenCalled()
        expect(form.field(last.model, 'first').errors).toEqual(errors)
      }
    },
  )

  it('returns validation failures as feedback and cancels the attempt', () => {
    const form = Form.define({
      name: 'FailedCheck',
      fields: {
        name: Form.field({
          schema: Schema.String,
          initial: 'Ada',
          validate: () => Effect.fail('Check unavailable'),
        }),
      },
      submit: { error: Schema.String, execute: () => Effect.void },
    })
    const pending = form.submit(form.init())
    const invalid = form.update(
      pending.model,
      executeFirstCommand(pending.commands),
    )
    expect(form.field(invalid.model, 'name').errors).toEqual([
      'Check unavailable',
    ])
    expect(form.submission(invalid.model)._tag).toBe('Idle')
    expect(invalid.commands ?? []).toEqual([])
  })

  it('abandons a validating attempt after a field edit', () => {
    const pending = checked.submit(checked.init())
    const changed = checked.update(
      pending.model,
      checked.changed('username', 'open'),
    )
    expect(checked.submission(changed.model)._tag).toBe('Idle')
    expect(
      checked.update(changed.model, executeFirstCommand(pending.commands))
        .model,
    ).toBe(changed.model)
    const completed = checked.update(
      changed.model,
      executeFirstCommand(changed.commands),
    )
    expect(checked.submission(completed.model)._tag).toBe('Idle')
    expect(completed.commands ?? []).toEqual([])
    const next = checked.submit(completed.model)
    expect(checked.submission(next.model)._tag).toBe('Submitting')
    expect(next.model.generation).toBe(2)
  })
})

it('matches and resolves a lifted Submit factory in a parent Story', () => {
  const Parent = Schema.Struct({ form: saved.Model })
  type Parent = typeof Parent.Type
  const Message = defineMessageUnion({
    ClickedSubmit: {},
    GotFormMessage: { message: saved.Message },
  })
  type Message = typeof Message.Type
  const lifted = saved.lift<Parent, Message>({
    parentField: 'form',
    toParentMessage: message => Message.GotFormMessage({ message }),
  })
  const update = (model: Parent, message: Message) =>
    Message.match(message, {
      ClickedSubmit: () => lifted.submit(model),
      GotFormMessage: ({ message }) => lifted.fold(model, message),
    })
  Story.story(
    update,
    Story.given(Parent.make({ form: saved.init() })),
    Story.message(Message.ClickedSubmit()),
    Story.Command.expectHas(
      saved.Submit({
        values: { username: 'Ada' },
        context: undefined,
        token: { generation: 1 },
      }),
    ),
    Story.Command.resolve(
      saved.Submit({
        values: { username: 'Ada' },
        context: undefined,
        token: { generation: 1 },
      }),
      saved.Message.CompletedSubmit({
        token: { generation: 1 },
        result: Result.succeed(SaveData.make({ id: 7 })),
      }),
    ),
    Story.model(model =>
      expect(saved.submission(model.form)).toEqual(
        saved.Submission.Succeeded({ data: SaveData.make({ id: 7 }) }),
      ),
    ),
  )
})

describe('submission context', () => {
  const Record = Schema.Struct({ recordId: Schema.String })

  it('passes the context given to submit to execution', () => {
    const execute = vi.fn(
      (values: Readonly<{ name: string }>, record: typeof Record.Type) =>
        Effect.succeed(`${record.recordId}:${values.name}`),
    )
    const form = Form.define({
      name: 'ContextSubmit',
      fields: { name: Form.field({ schema: Schema.String, initial: 'Ada' }) },
      submit: { data: Schema.String, context: Record, execute },
    })
    const pending = form.submit(form.init(), { recordId: 'profile-1' })
    const completion = executeFirstCommand(pending.commands)

    expect(execute).toHaveBeenCalledExactlyOnceWith(
      { name: 'Ada' },
      { recordId: 'profile-1' },
    )
    expect(form.update(pending.model, completion).outMessage).toEqual(
      form.OutMessage.SucceededSubmit({ data: 'profile-1:Ada' }),
    )
  })

  it('keeps the context while field checks are pending', () => {
    const form = Form.define({
      name: 'ContextValidation',
      fields: {
        username: Form.field({
          schema: Schema.String,
          initial: 'ada',
          validate: () => Effect.succeed([]),
        }),
      },
      submit: { context: Record, execute: () => Effect.void },
    })
    const validating = form.submit(form.init(), { recordId: 'profile-1' })

    expect(form.submission(validating.model)).toEqual(
      form.Submission.Validating({
        token: { generation: 1 },
        context: { recordId: 'profile-1' },
      }),
    )

    const checked = form.update(
      validating.model,
      executeFirstCommand(validating.commands),
    )

    expect(
      Array.head(checked.commands ?? []).pipe(Option.getOrThrow).args,
    ).toEqual({
      values: { username: 'ada' },
      context: { recordId: 'profile-1' },
      token: { generation: 1 },
    })

    const codec = Schema.toCodecJson(form.Model)
    expect(
      Schema.decodeSync(codec)(Schema.encodeSync(codec)(validating.model)),
    ).toEqual(validating.model)
  })

  it('passes the context through a lifted submit', () => {
    const form = Form.define({
      name: 'LiftedContext',
      fields: { name: Form.field({ schema: Schema.String, initial: 'Ada' }) },
      submit: { context: Record, execute: () => Effect.void },
    })
    const Parent = Schema.Struct({ form: form.Model })
    type Parent = typeof Parent.Type
    const Message = defineMessageUnion({
      ClickedSave: {},
      GotFormMessage: { message: form.Message },
    })
    type Message = typeof Message.Type
    const lifted = form.lift<Parent, Message>({
      parentField: 'form',
      toParentMessage: message => Message.GotFormMessage({ message }),
    })
    const update = (model: Parent, message: Message) =>
      Message.match(message, {
        ClickedSave: () => lifted.submit(model, { recordId: 'profile-1' }),
        GotFormMessage: ({ message }) => lifted.fold(model, message),
      })

    Story.story(
      update,
      Story.given(Parent.make({ form: form.init() })),
      Story.message(Message.ClickedSave()),
      Story.Command.expectHas(
        form.Submit({
          values: { name: 'Ada' },
          context: { recordId: 'profile-1' },
          token: { generation: 1 },
        }),
      ),
      Story.Command.resolve(
        form.Submit({
          values: { name: 'Ada' },
          context: { recordId: 'profile-1' },
          token: { generation: 1 },
        }),
        form.Message.CompletedSubmit({
          token: { generation: 1 },
          result: Result.succeed(undefined),
        }),
      ),
      Story.model(model =>
        expect(form.submission(model.form)._tag).toBe('Succeeded'),
      ),
    )
  })
})

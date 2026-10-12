import { Effect, Option, Schema } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Command from './index.js'
import { __CurrentRegistry, __makeRegistry } from './interruptible/index.js'

const Message = defineMessageUnion({
  CompletedRunTask: { taskId: Schema.Number },
  CompletedReadBrowserGlobal: {},
  CompletedMeasureElement: {},
  CompletedSaveDraft: { draftId: Schema.Number },
  CompletedDoWork: {},
})

if (false) {
  const LayerOnly = Command.define('LayerOnly', {
    messages: [Message.CompletedDoWork],
  })
  LayerOnly.toLayer<never, never, never>(
    // @ts-expect-error toLayer accepts an Effect that constructs the handler.
    () => Effect.succeed(Message.CompletedDoWork()),
  )
  // @ts-expect-error A host contract has no default handler Layer.
  void LayerOnly.layer

  Command.define('DirectHandler', {
    messages: [Message.CompletedDoWork],
    // @ts-expect-error handler is a generator constructor, not an invocation function.
    handler: () => Effect.succeed(Message.CompletedDoWork()),
  })

  Command.define('InvalidHandlerResult', {
    messages: [Message.CompletedDoWork],
    // @ts-expect-error Handler results must belong to the declared Messages.
    handler: function* () {
      return () => Effect.succeed(Message.CompletedRunTask({ taskId: 1 }))
    },
  })

  Command.define('ExactHandlerArgs', {
    args: {
      text: Schema.String,
      count: Schema.NumberFromString,
      maybeCount: Schema.Option(Schema.Number),
      label: Schema.optional(Schema.String),
    },
    messages: [Message.CompletedDoWork],
    handler: function* () {
      return ({ text, count, maybeCount, label }) => {
        const exactText: string = text
        const exactCount: number = count
        const exactMaybeCount: Option.Option<number> = maybeCount
        const exactLabel: string | undefined = label
        void exactText
        void exactCount
        void exactMaybeCount
        void exactLabel
        // @ts-expect-error Schema.String is decoded as string rather than any.
        text.doesNotExist()
        // @ts-expect-error Transformed Schema output is decoded as number.
        count.doesNotExist()
        // @ts-expect-error Schema.Option output is decoded as Option<number>.
        maybeCount.doesNotExist()
        // @ts-expect-error Optional Schema output is decoded as string | undefined.
        label?.doesNotExist()
        return Effect.succeed(Message.CompletedDoWork())
      }
    },
  })

  const narrowHandlerMessages: readonly [typeof Message.CompletedDoWork] = [
    Message.CompletedDoWork,
  ]
  const narrowHandlerConfig = {
    args: { text: Schema.String },
    messages: narrowHandlerMessages,
  }
  Command.define('NarrowHandlerArgs', {
    ...narrowHandlerConfig,
    // @ts-expect-error A handler must accept every value allowed by the args Schema.
    handler: function* () {
      return ({ text }: { readonly text: 'only' }) =>
        Effect.succeed(text).pipe(Effect.as(Message.CompletedDoWork()))
    },
  })

  const chooseCommandHandler = (isNarrow: boolean) => {
    if (isNarrow) {
      return ({ text }: { readonly text: 'only' }) =>
        Effect.succeed(text).pipe(Effect.as(Message.CompletedDoWork()))
    } else {
      return ({ text }: { readonly text: string }) =>
        Effect.succeed(text).pipe(Effect.as(Message.CompletedDoWork()))
    }
  }
  const unionHandlerConfig = {
    args: { text: Schema.String },
    messages: narrowHandlerMessages,
  }
  Command.define('UnionHandlerArgs', {
    ...unionHandlerConfig,
    // @ts-expect-error Every possible constructed handler must accept the full args Schema.
    handler: function* () {
      return yield* Effect.sync(() => chooseCommandHandler(true))
    },
  })

  const invalidArgsSchemaConfig = {
    args: { text: 1 },
    messages: [Message.CompletedDoWork],
  }
  // @ts-expect-error Declared args must be Schemas even when the config is a named value.
  Command.define('InvalidArgsSchema', invalidArgsSchemaConfig)

  const invalidArgsHandlerConfig = {
    ...invalidArgsSchemaConfig,
    handler: function* () {
      return () => Effect.succeed(Message.CompletedDoWork())
    },
  }
  // @ts-expect-error An attached handler cannot bypass validation of its args Schemas.
  Command.define('InvalidArgsHandler', invalidArgsHandlerConfig)

  const inlineConfig = {
    messages: [Message.CompletedDoWork],
    execute: () => Effect.succeed(Message.CompletedDoWork()),
  }
  // @ts-expect-error Command definitions cannot carry inline implementations.
  Command.define('InlineCommand', inlineConfig)

  const effectHandlerConfig = {
    messages: [Message.CompletedDoWork],
    handler: Effect.succeed(() => Effect.succeed(Message.CompletedDoWork())),
  }
  // @ts-expect-error handler accepts a generator function rather than a constructed Effect.
  Command.define('EffectHandler', effectHandlerConfig)
}

describe('Command.define defers its handler body', () => {
  it('supports heterogeneous declared Message results', () => {
    const CompleteTask = Command.define('CompleteTask', {
      args: {
        outcome: Schema.Literals(['Run', 'Save']),
        taskId: Schema.Number,
      },
      messages: [Message.CompletedRunTask, Message.CompletedSaveDraft],
      handler: function* () {
        return ({ outcome, taskId }) => {
          if (outcome === 'Run') {
            return Effect.succeed(Message.CompletedRunTask({ taskId }))
          } else {
            return Effect.succeed(
              Message.CompletedSaveDraft({ draftId: taskId }),
            )
          }
        }
      },
    })

    expect(
      Effect.runSync(
        Effect.provide(
          CompleteTask({ outcome: 'Save', taskId: 4 }).effect,
          CompleteTask.layer,
        ),
      ),
    ).toEqual(Message.CompletedSaveDraft({ draftId: 4 }))
  })

  it('does not run the body of an args Command until the effect runs', () => {
    let bodyRunCount = 0

    const RunTask = Command.define('RunTask', {
      args: { taskId: Schema.Number },
      messages: [Message.CompletedRunTask],
      handler: function* () {
        return ({ taskId }) => {
          bodyRunCount = bodyRunCount + 1
          return Effect.succeed(Message.CompletedRunTask({ taskId }))
        }
      },
    })

    const instance = RunTask({ taskId: 7 })
    expect(bodyRunCount).toBe(0)

    expect(
      Effect.runSync(Effect.provide(instance.effect, RunTask.layer)),
    ).toEqual(Message.CompletedRunTask({ taskId: 7 }))
    expect(bodyRunCount).toBe(1)
  })

  it('never runs the body of a Command that update constructs and discards', () => {
    let bodyRunCount = 0

    const ReadBrowserGlobal = Command.define('ReadBrowserGlobal', {
      args: { id: Schema.String },
      messages: [Message.CompletedReadBrowserGlobal],
    })
    void ReadBrowserGlobal.toLayer(
      Effect.succeed(() => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(Message.CompletedReadBrowserGlobal())
      }),
    )

    ReadBrowserGlobal({ id: 'discarded' })

    expect(bodyRunCount).toBe(0)
  })

  it('surfaces a throwing body as an effect failure rather than a construction throw', () => {
    const MeasureElement = Command.define('MeasureElement', {
      args: { id: Schema.String },
      messages: [Message.CompletedMeasureElement],
    })
    const MeasureElementLayer = MeasureElement.toLayer(
      Effect.succeed(
        (): Effect.Effect<typeof Message.CompletedMeasureElement.Type> => {
          throw new Error('reads a browser global')
        },
      ),
    )

    const instance = MeasureElement({ id: 'panel' })

    const exit = Effect.runSyncExit(
      Effect.provide(instance.effect, MeasureElementLayer),
    )
    expect(exit._tag).toBe('Failure')
  })

  it('defers the body of an interruptible args Command while keying at construction', () => {
    let bodyRunCount = 0

    const SaveDraft = Command.define('SaveDraft', {
      args: { draftId: Schema.Number },
      messages: [Message.CompletedSaveDraft],
      interrupt: {
        keyFields: ['draftId'],
        toKey: ({ draftId }) => draftId.toString(),
      },
      handler: function* () {
        return ({ draftId }) => {
          bodyRunCount = bodyRunCount + 1
          return Effect.succeed(Message.CompletedSaveDraft({ draftId }))
        }
      },
    })

    const instance = SaveDraft({ draftId: 3 })
    expect(instance.key).toBe('SaveDraft:3')
    expect(bodyRunCount).toBe(0)

    const result = Effect.runSync(
      Effect.provide(
        Effect.provideService(
          instance.effect,
          __CurrentRegistry,
          __makeRegistry(),
        ),
        SaveDraft.layer,
      ),
    )
    expect(result).toEqual(Message.CompletedSaveDraft({ draftId: 3 }))
    expect(bodyRunCount).toBe(1)
  })

  it('runs a no-args handler when the Command effect runs', () => {
    let effectRunCount = 0

    const DoWork = Command.define('DoWork', {
      messages: [Message.CompletedDoWork],
      handler: function* () {
        return () =>
          Effect.sync(() => {
            effectRunCount = effectRunCount + 1
            return Message.CompletedDoWork()
          })
      },
    })

    const instance = DoWork()
    expect(effectRunCount).toBe(0)

    expect(
      Effect.runSync(Effect.provide(instance.effect, DoWork.layer)),
    ).toEqual(Message.CompletedDoWork())
    expect(effectRunCount).toBe(1)
  })

  it('attaches a handler to an args Command keyed by its name', () => {
    const ReadTask = Command.define('ReadTask', {
      args: { taskId: Schema.Number },
      messages: [Message.CompletedRunTask],
      interrupt: true,
      handler: function* () {
        return ({ taskId }) =>
          Effect.succeed(Message.CompletedRunTask({ taskId }))
      },
    })
    const command = ReadTask({ taskId: 9 })

    expect(command.key).toBe('ReadTask')
    expect(
      Effect.runSync(Effect.provide(command.effect, ReadTask.layer)),
    ).toEqual(Message.CompletedRunTask({ taskId: 9 }))
  })
})

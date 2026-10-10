import { Effect, Schema } from 'effect'
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

  const inlineConfig = {
    messages: [Message.CompletedDoWork],
    execute: () => Effect.succeed(Message.CompletedDoWork()),
  }
  // @ts-expect-error Command definitions cannot carry inline implementations.
  Command.define('InlineCommand', inlineConfig)
}

describe('Command.define defers its handler body', () => {
  it('does not run the body of an args Command until the effect runs', () => {
    let bodyRunCount = 0

    const RunTask = Command.define('RunTask', {
      args: { taskId: Schema.Number },
      messages: [Message.CompletedRunTask],
    })
    const RunTaskLayer = RunTask.toLayer(
      Effect.succeed(({ taskId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(Message.CompletedRunTask({ taskId }))
      }),
    )

    const instance = RunTask({ taskId: 7 })
    expect(bodyRunCount).toBe(0)

    expect(
      Effect.runSync(Effect.provide(instance.effect, RunTaskLayer)),
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
    })
    const SaveDraftLayer = SaveDraft.toLayer(
      Effect.succeed(({ draftId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(Message.CompletedSaveDraft({ draftId }))
      }),
    )

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
        SaveDraftLayer,
      ),
    )
    expect(result).toEqual(Message.CompletedSaveDraft({ draftId: 3 }))
    expect(bodyRunCount).toBe(1)
  })

  it('runs a no-args handler when the Command effect runs', () => {
    let effectRunCount = 0

    const DoWork = Command.define('DoWork', {
      messages: [Message.CompletedDoWork],
    })
    const DoWorkLayer = DoWork.toLayer(
      Effect.succeed(() =>
        Effect.sync(() => {
          effectRunCount = effectRunCount + 1
          return Message.CompletedDoWork()
        }),
      ),
    )

    const instance = DoWork()
    expect(effectRunCount).toBe(0)

    expect(
      Effect.runSync(Effect.provide(instance.effect, DoWorkLayer)),
    ).toEqual(Message.CompletedDoWork())
    expect(effectRunCount).toBe(1)
  })
})

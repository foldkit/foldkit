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

describe('Command.define defers its execute body', () => {
  it('does not run the body of an args Command until the effect runs', () => {
    let bodyRunCount = 0

    const RunTask = Command.define('RunTask', {
      args: { taskId: Schema.Number },
      messages: [Message.CompletedRunTask],
      execute: ({ taskId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(Message.CompletedRunTask({ taskId }))
      },
    })

    const instance = RunTask({ taskId: 7 })
    expect(bodyRunCount).toBe(0)

    expect(Effect.runSync(instance.effect)).toEqual(
      Message.CompletedRunTask({ taskId: 7 }),
    )
    expect(bodyRunCount).toBe(1)
  })

  it('never runs the body of a Command that update constructs and discards', () => {
    let bodyRunCount = 0

    const ReadBrowserGlobal = Command.define('ReadBrowserGlobal', {
      args: { id: Schema.String },
      messages: [Message.CompletedReadBrowserGlobal],
      execute: () => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(Message.CompletedReadBrowserGlobal())
      },
    })

    ReadBrowserGlobal({ id: 'discarded' })

    expect(bodyRunCount).toBe(0)
  })

  it('surfaces a throwing body as an effect failure rather than a construction throw', () => {
    const MeasureElement = Command.define('MeasureElement', {
      args: { id: Schema.String },
      messages: [Message.CompletedMeasureElement],
      execute: () => {
        throw new Error('reads a browser global')
      },
    })

    const instance = MeasureElement({ id: 'panel' })

    const exit = Effect.runSyncExit(instance.effect)
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
      execute: ({ draftId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(Message.CompletedSaveDraft({ draftId }))
      },
    })

    const instance = SaveDraft({ draftId: 3 })
    expect(instance.key).toBe('SaveDraft:3')
    expect(bodyRunCount).toBe(0)

    const result = Effect.runSync(
      Effect.provideService(
        instance.effect,
        __CurrentRegistry,
        __makeRegistry(),
      ),
    )
    expect(result).toEqual(Message.CompletedSaveDraft({ draftId: 3 }))
    expect(bodyRunCount).toBe(1)
  })

  it('still runs a no-args Command effect, which is already a value', () => {
    let effectRunCount = 0

    const DoWork = Command.define('DoWork', {
      messages: [Message.CompletedDoWork],
      execute: Effect.sync(() => {
        effectRunCount = effectRunCount + 1
        return Message.CompletedDoWork()
      }),
    })

    const instance = DoWork()
    expect(effectRunCount).toBe(0)

    expect(Effect.runSync(instance.effect)).toEqual(Message.CompletedDoWork())
    expect(effectRunCount).toBe(1)
  })
})

import { Effect, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Application from './application.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import { embed } from './start.js'

const DEPENDENCY_FAILURE = 'Cannot derive Subscription dependencies'

let container: HTMLElement

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
  container = document.createElement('div')
  container.id = 'subscription-startup'
  document.body.append(container)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('Subscription startup supervision', () => {
  it('reports initial dependency defects and keeps the crash view until disposal', async () => {
    const Model = Schema.Struct({ count: Schema.Number })
    type Model = typeof Model.Type
    const Message = defineMessageUnion({ EmittedPulse: {} })
    type Message = typeof Message.Type
    const streamStarted = vi.fn()
    const report = vi.fn()

    const element = Application.__makeElementFromConfig({
      Model,
      init: () => ({ model: Model.make({ count: 0 }) }),
      update: (model: Model, _message: Message) => ({ model }),
      view: (_model, h) => h.div([], ['Running']),
      subscriptions: {
        pulses: {
          dependenciesSchema: Schema.Struct({ count: Schema.Number }),
          modelToDependencies: (): { count: number } => {
            throw new Error(DEPENDENCY_FAILURE)
          },
          dependenciesToStream: () => {
            streamStarted()
            return Stream.never
          },
        },
      },
      container,
      crash: {
        view: ({ error }, h) => h.div([], [error.message]),
        report,
      },
    })
    const handle = embed(element)

    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toBe(DEPENDENCY_FAILURE)
        expect(report).toHaveBeenCalledOnce()
      })
      expect(streamStarted).not.toHaveBeenCalled()
    } finally {
      handle.dispose()
      await vi.waitFor(() => {
        expect(document.getElementById(container.id)).toBe(container)
        expect(container.textContent).toBe('')
      })
    }
  })
})

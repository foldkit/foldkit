import { Effect, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { m } from '../message/index.js'
import {
  type Request,
  RequestDispatchMessage,
  RequestDispatchMessages,
} from './protocol.js'
import { type Bridge, createDevToolsStore } from './store.js'
import { dispatchRequest } from './webSocketBridge.js'

const initialModel = { count: 0 }

const ClickedIncrement = m('ClickedIncrement')
const ClickedDecrement = m('ClickedDecrement')

const CounterMessage = Schema.Union([ClickedIncrement, ClickedDecrement])

const clickedIncrement = ClickedIncrement()
const clickedDecrement = ClickedDecrement()

const run = <A>(effect: Effect.Effect<A>): A => Effect.runSync(effect)

const makeBridge = (): Bridge => ({
  replay: model => model,
  render: () => Effect.void,
  markRenderPending: Effect.void,
})

const makeHarness = (
  maybeMessageSchema: Option.Option<Schema.Codec<any, any>> = Option.some(
    CounterMessage,
  ),
) => {
  const store = run(createDevToolsStore(makeBridge()))
  run(store.recordInit(initialModel, []))
  run(
    store.recordMessage(clickedIncrement, { count: 0 }, { count: 1 }, [], true),
  )
  run(
    store.recordMessage(clickedIncrement, { count: 1 }, { count: 2 }, [], true),
  )

  const dispatched: Array<unknown> = []
  const dispatch = (message: unknown) =>
    Effect.sync(() => {
      dispatched.push(message)
    })

  const maybeDispatchSchema = Option.map(maybeMessageSchema, Schema.toCodecJson)

  const callBridge = (request: Request) =>
    run(
      dispatchRequest(
        store,
        dispatch,
        maybeDispatchSchema,
        Option.none(),
        request,
      ),
    )

  return { dispatched, callBridge }
}

describe('dispatchRequest', () => {
  describe('RequestDispatchMessage', () => {
    it('decodes the payload, dispatches it, and predicts the history index', () => {
      const { dispatched, callBridge } = makeHarness()

      const response = callBridge(
        RequestDispatchMessage({ message: { _tag: 'ClickedIncrement' } }),
      )

      if (response._tag !== 'ResponseDispatched') {
        throw new Error(`Expected ResponseDispatched, got ${response._tag}`)
      }
      expect(response.acceptedAtIndex).toBe(2)
      expect(dispatched).toEqual([clickedIncrement])
    })

    it('rejects a payload that does not match the Message Schema', () => {
      const { dispatched, callBridge } = makeHarness()

      const response = callBridge(
        RequestDispatchMessage({ message: { _tag: 'Nonsense' } }),
      )

      expect(response._tag).toBe('ResponseError')
      expect(dispatched).toEqual([])
    })
  })

  describe('RequestDispatchMessages', () => {
    it('dispatches every Message in order and predicts each history index', () => {
      const { dispatched, callBridge } = makeHarness()

      const response = callBridge(
        RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'ClickedDecrement' },
            { _tag: 'ClickedIncrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected ResponseDispatchedBatch, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndices).toEqual([2, 3, 4])
      expect(dispatched).toEqual([
        clickedIncrement,
        clickedDecrement,
        clickedIncrement,
      ])
    })

    it('rejects the whole batch when one entry is invalid and dispatches nothing', () => {
      const { dispatched, callBridge } = makeHarness()

      const response = callBridge(
        RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'Nonsense' },
            { _tag: 'ClickedIncrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected ResponseError, got ${response._tag}`)
      }
      expect(response.reason).toContain('batch position 1')
      expect(response.reason).toContain(
        'No Messages from the batch were dispatched.',
      )
      expect(dispatched).toEqual([])
    })

    it('accepts an empty batch and dispatches nothing', () => {
      const { dispatched, callBridge } = makeHarness()

      const response = callBridge(RequestDispatchMessages({ messages: [] }))

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected ResponseDispatchedBatch, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndices).toEqual([])
      expect(dispatched).toEqual([])
    })

    it('rejects dispatch when no Message Schema is configured', () => {
      const { dispatched, callBridge } = makeHarness(Option.none())

      const response = callBridge(
        RequestDispatchMessages({ messages: [{ _tag: 'ClickedIncrement' }] }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected ResponseError, got ${response._tag}`)
      }
      expect(response.reason).toContain('DevToolsConfig.Message not configured')
      expect(dispatched).toEqual([])
    })
  })
})

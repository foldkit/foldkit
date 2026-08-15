import {
  Array,
  Effect,
  Exit,
  Function,
  Match,
  Number,
  Option,
  Schema,
  Scope,
  SubscriptionRef,
} from 'effect'
import { describe, expect, it } from 'vitest'

import { m } from '../message/index.js'
import { evo } from '../struct/index.js'
import {
  EventFrame,
  MAX_DISPATCH_BATCH_SIZE,
  type Request,
  RequestDispatchMessage,
  RequestDispatchMessages,
} from './protocol.js'
import {
  type Bridge,
  type CreateDevToolsStoreOptions,
  createDevToolsStore,
} from './store.js'
import {
  EVENT_CHANNEL,
  dispatchRequest,
  startWebSocketBridge,
} from './webSocketBridge.js'

const CounterModel = Schema.Struct({ count: Schema.Number })
type CounterModel = typeof CounterModel.Type

const initialModel = CounterModel.make({ count: 0 })

const ClickedIncrement = m('ClickedIncrement')
const ClickedDecrement = m('ClickedDecrement')

const CounterMessage = Schema.Union([ClickedIncrement, ClickedDecrement])
type CounterMessage = typeof CounterMessage.Type

const clickedIncrement = ClickedIncrement()
const clickedDecrement = ClickedDecrement()

const update = (model: CounterModel, message: CounterMessage): CounterModel =>
  Match.value(message).pipe(
    Match.withReturnType<CounterModel>(),
    Match.tagsExhaustive({
      ClickedIncrement: () => evo(model, { count: Number.increment }),
      ClickedDecrement: () => evo(model, { count: Number.decrement }),
    }),
  )

const decodeCounterMessage = Schema.decodeUnknownSync(CounterMessage)

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
  storeOptions: CreateDevToolsStoreOptions = {},
) => {
  const store = run(createDevToolsStore(makeBridge(), storeOptions))
  run(store.recordInit(initialModel, []))

  const dispatched: Array<unknown> = []
  let liveModel = initialModel

  const dispatch = (message: unknown) =>
    Effect.gen(function* () {
      const counterMessage = decodeCounterMessage(message)
      dispatched.push(counterMessage)
      const modelBeforeUpdate = liveModel
      liveModel = update(modelBeforeUpdate, counterMessage)
      yield* store.recordMessage(
        counterMessage,
        modelBeforeUpdate,
        liveModel,
        [],
        true,
      )
    })

  run(dispatch(clickedIncrement))
  run(dispatch(clickedIncrement))
  dispatched.length = 0

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

  const recordedTags = (): ReadonlyArray<string> =>
    Array.map(
      run(SubscriptionRef.get(store.stateRef)).entries,
      ({ tag }) => tag,
    )

  const tagAt = (index: number): string => {
    const { entries, startIndex } = run(SubscriptionRef.get(store.stateRef))
    return Option.match(Array.get(entries, index - startIndex), {
      onNone: () => `no entry recorded at index ${index}`,
      onSome: ({ tag }) => tag,
    })
  }

  return { dispatched, callBridge, recordedTags, tagAt }
}

describe('dispatchRequest', () => {
  describe('RequestDispatchMessage', () => {
    it('decodes the payload, dispatches it, and predicts the history index', () => {
      const { dispatched, callBridge, tagAt } = makeHarness()

      const response = callBridge(
        RequestDispatchMessage({ message: { _tag: 'ClickedIncrement' } }),
      )

      if (response._tag !== 'ResponseDispatched') {
        throw new Error(`Expected ResponseDispatched, got ${response._tag}`)
      }
      expect(response.acceptedAtIndex).toBe(2)
      expect(dispatched).toEqual([clickedIncrement])
      expect(tagAt(response.acceptedAtIndex)).toBe('ClickedIncrement')
    })

    it('rejects a payload that does not match the Message Schema', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(
        RequestDispatchMessage({ message: { _tag: 'Nonsense' } }),
      )

      expect(response._tag).toBe('ResponseError')
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })
  })

  describe('RequestDispatchMessages', () => {
    it('dispatches every Message in order and predicts each history index', () => {
      const { dispatched, callBridge, tagAt } = makeHarness()

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
      expect(Array.map(response.acceptedAtIndices, tagAt)).toEqual([
        'ClickedIncrement',
        'ClickedDecrement',
        'ClickedIncrement',
      ])
    })

    it('predicts indices against a history that has evicted its oldest entries', () => {
      const { callBridge, tagAt } = makeHarness(Option.some(CounterMessage), {
        maxEntries: 3,
        keyframeInterval: 1,
      })

      const response = callBridge(
        RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'ClickedDecrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected ResponseDispatchedBatch, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndices).toEqual([2, 3])
      expect(Array.map(response.acceptedAtIndices, tagAt)).toEqual([
        'ClickedIncrement',
        'ClickedDecrement',
      ])
    })

    it('rejects the whole batch when one entry is invalid and dispatches nothing', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

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
      expect(response.reason).toContain('zero-based batch position 1')
      expect(response.reason).toContain(
        'No Messages from the batch were dispatched.',
      )
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })

    it('accepts an empty batch and dispatches nothing', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(RequestDispatchMessages({ messages: [] }))

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected ResponseDispatchedBatch, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndices).toEqual([])
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })

    it('rejects a batch larger than the supported size and dispatches nothing', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(
        RequestDispatchMessages({
          messages: Array.makeBy(MAX_DISPATCH_BATCH_SIZE + 1, () => ({
            _tag: 'ClickedIncrement',
          })),
        }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected ResponseError, got ${response._tag}`)
      }
      expect(response.reason).toContain('Batch too large')
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })

    it('rejects dispatch when no Message Schema is configured', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness(
        Option.none(),
      )

      const response = callBridge(
        RequestDispatchMessages({ messages: [{ _tag: 'ClickedIncrement' }] }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected ResponseError, got ${response._tag}`)
      }
      expect(response.reason).toContain('DevToolsConfig.Message not configured')
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })
  })
})

const makeHotStub = () => {
  const sentEventTags: Array<string> = []
  const decodeEventFrame = Schema.decodeUnknownSync(EventFrame)

  const hot: NonNullable<ImportMeta['hot']> = {
    data: {},
    accept: Function.constVoid,
    acceptExports: Function.constVoid,
    dispose: Function.constVoid,
    prune: Function.constVoid,
    invalidate: Function.constVoid,
    on: Function.constVoid,
    off: Function.constVoid,
    send: (channel: string, payload: unknown) => {
      if (channel === EVENT_CHANNEL) {
        sentEventTags.push(decodeEventFrame(payload).event._tag)
      }
    },
  }

  return { hot, sentEventTags }
}

// NOTE: happy-dom has no `PageTransitionEvent` constructor, so the restore
// flag goes onto a plain `pageshow` Event. Spreading the Event into an object
// literal loses it: the fields are prototype accessors rather than own
// properties, and `dispatchEvent` rejects anything that is not an Event.
// Defining the property keeps the Event and needs no type assertion for a
// field `Event` does not declare.
const dispatchPageShow = (isRestoredFromBfcache: boolean): void => {
  const event = new Event('pageshow')
  Object.defineProperty(event, 'persisted', {
    value: isRestoredFromBfcache,
    configurable: true,
  })
  window.dispatchEvent(event)
}

const startBridgeInScope = (hot: NonNullable<ImportMeta['hot']>) => {
  const scope = run(Scope.make())
  run(
    Effect.provideService(
      startWebSocketBridge(
        run(createDevToolsStore(makeBridge())),
        hot,
        () => Effect.void,
        Option.some(CounterMessage),
      ),
      Scope.Scope,
      scope,
    ),
  )
  return { closeScope: () => run(Scope.close(scope, Exit.void)) }
}

// NOTE: the relay learns a page really went away from its Vite HMR socket
// closing. `beforeunload` fires for events the document survives, so a bridge
// that announced a disconnect there reported a live app as gone.
describe('startWebSocketBridge', () => {
  it('stays connected through a beforeunload the document survives', () => {
    const { hot, sentEventTags } = makeHotStub()
    const { closeScope } = startBridgeInScope(hot)

    window.dispatchEvent(new Event('beforeunload'))

    expect(sentEventTags).toEqual(['EventConnected'])

    closeScope()
  })

  it('announces a disconnect when the runtime scope closes', () => {
    const { hot, sentEventTags } = makeHotStub()
    const { closeScope } = startBridgeInScope(hot)

    closeScope()

    expect(sentEventTags).toEqual(['EventConnected', 'EventDisconnected'])
  })

  // NOTE: the freeze into the back/forward cache closes the page's Vite HMR
  // socket, and the relay prunes a runtime whose socket closed. The runtime
  // outlives the freeze, so the restore has to reintroduce it.
  it('announces the connection again when the page is restored from the back/forward cache', () => {
    const { hot, sentEventTags } = makeHotStub()
    const { closeScope } = startBridgeInScope(hot)

    dispatchPageShow(false)

    expect(sentEventTags).toEqual(['EventConnected'])

    dispatchPageShow(true)

    expect(sentEventTags).toEqual(['EventConnected', 'EventConnected'])

    closeScope()
  })

  it('stops announcing once the runtime scope has closed', () => {
    const { hot, sentEventTags } = makeHotStub()
    const { closeScope } = startBridgeInScope(hot)

    closeScope()
    dispatchPageShow(true)

    expect(sentEventTags).toEqual(['EventConnected', 'EventDisconnected'])
  })
})

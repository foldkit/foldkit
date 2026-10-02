import {
  Array,
  Effect,
  Exit,
  Function,
  Number,
  Option,
  Redacted,
  Schema,
  Scope,
  SubscriptionRef,
} from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { EventFrame, MAX_DISPATCH_BATCH_SIZE, Request } from './protocol.js'
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

const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
  ClickedDecrement: {},
})
type CounterMessage = typeof CounterMessage.Type

const clickedIncrement = CounterMessage.ClickedIncrement()
const clickedDecrement = CounterMessage.ClickedDecrement()

const update = (model: CounterModel, message: CounterMessage): CounterModel =>
  CounterMessage.match<CounterModel>(message, {
    ClickedIncrement: () => modifyFields(model, { count: Number.increment }),
    ClickedDecrement: () => modifyFields(model, { count: Number.decrement }),
  })

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
        Request.RequestDispatchMessage({
          message: { _tag: 'ClickedIncrement' },
        }),
      )

      if (response._tag !== 'ResponseDispatched') {
        throw new Error(
          `Expected Response.ResponseDispatched, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndex).toBe(2)
      expect(dispatched).toEqual([clickedIncrement])
      expect(tagAt(response.acceptedAtIndex)).toBe('ClickedIncrement')
    })

    it('rejects a payload that does not match the Message Schema', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(
        Request.RequestDispatchMessage({ message: { _tag: 'Nonsense' } }),
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
        Request.RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'ClickedDecrement' },
            { _tag: 'ClickedIncrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected Response.ResponseDispatchedBatch, got ${response._tag}`,
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
        Request.RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'ClickedDecrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected Response.ResponseDispatchedBatch, got ${response._tag}`,
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
        Request.RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'Nonsense' },
            { _tag: 'ClickedIncrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected Response.ResponseError, got ${response._tag}`)
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

      const response = callBridge(
        Request.RequestDispatchMessages({ messages: [] }),
      )

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected Response.ResponseDispatchedBatch, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndices).toEqual([])
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })

    it('rejects a batch larger than the supported size and dispatches nothing', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(
        Request.RequestDispatchMessages({
          messages: Array.makeBy(MAX_DISPATCH_BATCH_SIZE + 1, () => ({
            _tag: 'ClickedIncrement',
          })),
        }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected Response.ResponseError, got ${response._tag}`)
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
        Request.RequestDispatchMessages({
          messages: [{ _tag: 'ClickedIncrement' }],
        }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected Response.ResponseError, got ${response._tag}`)
      }
      expect(response.reason).toContain('DevToolsConfig.Message not configured')
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })
  })

  it('replaces Redacted values in Models, Messages, diffs, Command args, and Mount args', () => {
    const initialApiKey = 'sk-live-initial-not-for-devtools'
    const currentApiKey = 'sk-live-current-not-for-devtools'
    const messageApiKey = 'sk-live-message-not-for-devtools'
    const commandApiKey = 'sk-live-command-not-for-devtools'
    const mountApiKey = 'sk-live-mount-not-for-devtools'
    const initialModel = {
      connection: {
        apiKey: Redacted.make(initialApiKey, { label: 'initial-api-key' }),
      },
    }
    const currentModel = {
      connection: {
        apiKey: Redacted.make(currentApiKey, { label: 'current-api-key' }),
      },
    }
    const submittedConnection = {
      _tag: 'SubmittedConnection',
      apiKey: Redacted.make(messageApiKey, { label: 'message-api-key' }),
    }
    const store = run(createDevToolsStore(makeBridge()))

    run(
      store.recordInit(
        initialModel,
        [
          {
            id: 0,
            name: 'Connect',
            args: {
              apiKey: Redacted.make(commandApiKey, {
                label: 'command-api-key',
              }),
            },
            maybeSubmodelPath: Option.none(),
          },
        ],
        [
          {
            name: 'ConnectForm',
            args: {
              apiKey: Redacted.make(mountApiKey, { label: 'mount-api-key' }),
            },
          },
        ],
      ),
    )
    run(
      store.recordMessage(
        submittedConnection,
        initialModel,
        currentModel,
        [
          {
            id: 1,
            name: 'Reconnect',
            args: {
              apiKey: Redacted.make(commandApiKey, {
                label: 'command-api-key',
              }),
            },
            maybeSubmodelPath: Option.none(),
          },
        ],
        true,
      ),
    )
    run(
      store.attachRenderedMounts(
        [
          {
            name: 'ConnectionStatus',
            args: {
              apiKey: Redacted.make(mountApiKey, {
                label: 'mount-api-key',
              }),
            },
          },
        ],
        [],
      ),
    )

    const callBridge = (request: Request) =>
      run(
        dispatchRequest(
          store,
          () => Effect.void,
          Option.none(),
          Option.none(),
          request,
        ),
      )
    const model = callBridge(
      Request.RequestGetModel({ maybePath: Option.none(), expand: true }),
    )
    const message = callBridge(Request.RequestGetMessage({ index: 0 }))
    const init = callBridge(Request.RequestGetInit())
    const diff = callBridge(
      Request.RequestDiffModels({
        fromIndex: -1,
        toIndex: 0,
        maybeChangedPathsMatch: Option.none(),
      }),
    )

    if (model._tag !== 'ResponseModel') {
      throw new Error(`Expected Response.ResponseModel, got ${model._tag}`)
    }
    if (message._tag !== 'ResponseMessage') {
      throw new Error(`Expected Response.ResponseMessage, got ${message._tag}`)
    }
    if (init._tag !== 'ResponseInit') {
      throw new Error(`Expected Response.ResponseInit, got ${init._tag}`)
    }
    if (diff._tag !== 'ResponseModelDiff') {
      throw new Error(`Expected Response.ResponseModelDiff, got ${diff._tag}`)
    }

    expect(model.value).toEqual({
      connection: { apiKey: '<redacted:current-api-key>' },
    })
    expect(message.entry.message).toEqual({
      _tag: 'SubmittedConnection',
      apiKey: '<redacted:message-api-key>',
    })
    expect(message.entry.commands).toEqual([
      {
        name: 'Reconnect',
        args: Option.some({ apiKey: '<redacted:command-api-key>' }),
        maybeSubmodelPath: Option.none(),
      },
    ])
    expect(message.entry.mountStarts).toEqual([
      {
        name: 'ConnectionStatus',
        args: Option.some({ apiKey: '<redacted:mount-api-key>' }),
      },
    ])
    expect(init.maybeModel).toEqual(
      Option.some({
        connection: { apiKey: '<redacted:initial-api-key>' },
      }),
    )
    expect(init.commands).toEqual([
      {
        name: 'Connect',
        args: Option.some({ apiKey: '<redacted:command-api-key>' }),
        maybeSubmodelPath: Option.none(),
      },
    ])
    expect(init.mountStarts).toEqual([
      {
        name: 'ConnectForm',
        args: Option.some({ apiKey: '<redacted:mount-api-key>' }),
      },
    ])
    expect(diff.changes).toEqual([
      {
        path: 'root.connection.apiKey',
        before: {
          _tag: 'Present',
          value: '<redacted:initial-api-key>',
        },
        after: {
          _tag: 'Present',
          value: '<redacted:current-api-key>',
        },
      },
    ])

    const serializedResponses = JSON.stringify({ model, message, init, diff })
    expect(serializedResponses).not.toContain(initialApiKey)
    expect(serializedResponses).not.toContain(currentApiKey)
    expect(serializedResponses).not.toContain(messageApiKey)
    expect(serializedResponses).not.toContain(commandApiKey)
    expect(serializedResponses).not.toContain(mountApiKey)
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

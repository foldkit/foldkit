import {
  Array,
  Cause,
  Deferred,
  Effect,
  Exit,
  Layer,
  Option,
  Queue,
} from 'effect'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/public.js'
import { Program, Runtime } from '../../index.js'
import {
  ApplicationBlock,
  Message,
  type Model,
  Observation,
  Quotes,
  RequestSource,
  type Snapshot,
  Windows,
  layer,
} from '../../test/apps/queryRuntime.js'

const makeRequest = (key: string) =>
  Effect.gen(function* () {
    const response = yield* Deferred.make<string, string>()
    const finished = yield* Deferred.make<Exit.Exit<string, string>>()
    return { key, response, finished }
  })
const makeHarness = Effect.gen(function* () {
  const messages = yield* Queue.unbounded<Message>()
  const snapshots = yield* Queue.unbounded<Snapshot>()
  const requests =
    yield* Queue.unbounded<Effect.Success<ReturnType<typeof makeRequest>>>()
  const execute = (key: string) =>
    Effect.gen(function* () {
      const request = yield* makeRequest(key)
      return yield* Queue.offer(requests, request).pipe(
        Effect.andThen(Deferred.await(request.response)),
        Effect.onExit(exit => Deferred.succeed(request.finished, exit)),
      )
    })
  const nextSnapshot = (
    predicate: (snapshot: Snapshot) => boolean,
  ): Effect.Effect<Snapshot> =>
    Effect.gen(function* () {
      const snapshot = yield* Queue.take(snapshots)
      return predicate(snapshot) ? snapshot : yield* nextSnapshot(predicate)
    })
  const send = (message: Message) =>
    Queue.offer(messages, message).pipe(
      Effect.andThen(nextSnapshot(snapshot => snapshot.tag === message._tag)),
    )
  return {
    requests,
    send,
    nextSnapshot,
    services: Layer.merge(
      Layer.succeed(RequestSource, { execute }),
      Layer.succeed(Observation, { messages, snapshots }),
    ),
  }
})

const quoteData = (model: Model, key = 'panel') =>
  Quotes.read(
    Option.getOrThrow(Array.findFirst(model.quotes, quote => quote.key === key))
      .model,
  )
const withRuntime = Effect.gen(function* () {
  const harness = yield* makeHarness
  const container = yield* Effect.acquireRelease(
    Effect.sync(() => {
      const container = document.createElement('div')
      document.body.append(container)
      return container
    }),
    container => Effect.sync(() => container.remove()),
  )
  const host = yield* Effect.sync(() => {
    const host = document.createElement('div')
    host.id = 'query-lifecycle'
    container.append(host)
    return host
  })
  const program = Program.makeElement({
    block: ApplicationBlock,
    layer,
    container: host,
  }).provide(harness.services)
  const handle = yield* Effect.acquireRelease(
    Effect.sync(() => Runtime.embed(program)),
    handle => Effect.promise(() => handle.dispose()),
  )
  yield* harness.nextSnapshot(snapshot => snapshot.tag === 'Init')
  const nextRequest = (key: string) =>
    Effect.gen(function* () {
      const request = yield* awaitHandshake(
        Queue.take(harness.requests),
        `${key} request started`,
      )
      expect(request.key).toBe(key)
      return request
    })
  return { ...harness, handle, container, nextRequest }
})
const handshakeTimeout = '3 seconds'
const awaitHandshake = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  name: string,
) =>
  effect.pipe(
    Effect.timeout(handshakeTimeout),
    Effect.catchTag('TimeoutError', () =>
      Effect.die(new Error(`Missing handshake: ${name}`)),
    ),
  )
const assertInterrupted = (exit: Exit.Exit<string, string>) => {
  expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
}

describe('Query public Runtime lifecycle', () => {
  it.live(
    'rejects superseded Query results and notifications while loading and after accepting newer data',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const runtime = yield* withRuntime
          yield* runtime.send(Message.CreatedQuote({ key: 'panel' }))
          yield* runtime.send(Message.ClickedLoadQuote({ key: 'panel' }))
          const obsolete = yield* runtime.nextRequest('quote')
          yield* runtime.send(Message.ClickedResetQuote({ key: 'panel' }))
          expect(yield* Deferred.isDone(obsolete.finished)).toBe(false)
          yield* runtime.send(Message.ClickedLoadQuote({ key: 'panel' }))
          const superseded = yield* runtime.nextRequest('quote')
          yield* runtime.send(Message.ClickedResetQuote({ key: 'panel' }))
          yield* runtime.send(Message.ClickedLoadQuote({ key: 'panel' }))
          const current = yield* runtime.nextRequest('quote')
          yield* Deferred.succeed(obsolete.response, 'obsolete-while-pending')
          const pending = yield* runtime.nextSnapshot(snapshot =>
            snapshot.tag.startsWith('Got'),
          )
          expect(quoteData(pending.model)).toEqual(AsyncData.Loading())
          expect(pending.model.accepted).toEqual([])
          yield* Deferred.succeed(current.response, 'current')
          const accepted = yield* runtime.nextSnapshot(
            snapshot => snapshot.model.accepted.length === 1,
          )
          expect(quoteData(accepted.model)).toEqual(
            AsyncData.Success({ data: 'current' }),
          )
          expect(accepted.model.accepted).toEqual(['quote:success:current'])
          expect(yield* Deferred.await(current.finished)).toEqual(
            Exit.succeed('current'),
          )
          yield* Deferred.succeed(
            superseded.response,
            'obsolete-after-accepted',
          )
          const late = yield* runtime.nextSnapshot(snapshot =>
            snapshot.tag.startsWith('Got'),
          )
          expect(quoteData(late.model)).toEqual(
            AsyncData.Success({ data: 'current' }),
          )
          expect(late.model.accepted).toEqual(['quote:success:current'])
        }).pipe(Effect.timeout('10 seconds')),
      ),
    15_000,
  )

  it.live(
    'isolates keyed cancellation from a sibling and the next request for the same key',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const runtime = yield* withRuntime
          yield* runtime.send(Message.ClickedLoadWindow({ id: 'a' }))
          const canceled = yield* runtime.nextRequest('a')
          yield* runtime.send(Message.ClickedLoadWindow({ id: 'b' }))
          const sibling = yield* runtime.nextRequest('b')
          yield* runtime.send(Message.ClickedRestartWindow({ id: 'a' }))
          const current = yield* runtime.nextRequest('a')
          assertInterrupted(
            yield* awaitHandshake(
              Deferred.await(canceled.finished),
              'canceled request exited',
            ),
          )
          expect(yield* Deferred.isDone(sibling.finished)).toBe(false)
          expect(yield* Deferred.isDone(current.finished)).toBe(false)
          yield* Deferred.succeed(canceled.response, 'obsolete')
          yield* Deferred.succeed(sibling.response, 'sibling')
          const first = yield* runtime.nextSnapshot(
            snapshot => snapshot.model.accepted.length === 1,
          )
          expect(Windows.read(first.model.windows, { id: 'a' })).toEqual(
            AsyncData.Loading(),
          )
          expect(Windows.read(first.model.windows, { id: 'b' })).toEqual(
            AsyncData.Success({ data: 'sibling' }),
          )
          yield* Deferred.succeed(current.response, 'replacement')
          const second = yield* runtime.nextSnapshot(
            snapshot => snapshot.model.accepted.length === 2,
          )
          expect(Windows.read(second.model.windows, { id: 'a' })).toEqual(
            AsyncData.Success({ data: 'replacement' }),
          )
          expect(yield* Deferred.await(sibling.finished)).toEqual(
            Exit.succeed('sibling'),
          )
          expect(yield* Deferred.await(current.finished)).toEqual(
            Exit.succeed('replacement'),
          )
          expect(second.model.accepted).toEqual([
            'b:success:sibling',
            'a:success:replacement',
          ])
        }).pipe(Effect.timeout('10 seconds')),
      ),
    15_000,
  )

  it.live(
    'stops removed Query work, recreates the same child key, and disposes all owned pending work',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const runtime = yield* withRuntime
          yield* runtime.send(Message.CreatedQuote({ key: 'panel' }))
          yield* runtime.send(Message.ClickedLoadQuote({ key: 'panel' }))
          const removed = yield* runtime.nextRequest('quote')
          const absent = yield* runtime.send(
            Message.RemovedQuote({ key: 'panel' }),
          )
          expect(absent.model.quotes).toEqual([])

          assertInterrupted(
            yield* awaitHandshake(
              Deferred.await(removed.finished),
              'removed request exited',
            ),
          )
          yield* runtime.send(Message.CreatedQuote({ key: 'panel' }))
          yield* runtime.send(Message.ClickedLoadQuote({ key: 'panel' }))
          const recreated = yield* runtime.nextRequest('quote')
          yield* Deferred.succeed(removed.response, 'obsolete')
          yield* Deferred.succeed(recreated.response, 'recreated')
          const accepted = yield* runtime.nextSnapshot(
            snapshot => snapshot.model.accepted.length === 1,
          )
          expect(quoteData(accepted.model)).toEqual(
            AsyncData.Success({ data: 'recreated' }),
          )
          expect(accepted.model.accepted).toEqual(['quote:success:recreated'])
          expect(yield* Deferred.await(recreated.finished)).toEqual(
            Exit.succeed('recreated'),
          )
          yield* runtime.send(Message.ClickedLoadQuote({ key: 'panel' }))
          const refresh = yield* runtime.nextRequest('quote')
          yield* runtime.send(Message.ClickedLoadWindow({ id: 'a' }))
          const keyed = yield* runtime.nextRequest('a')
          expect(runtime.container.textContent).toBe('quote:success:recreated')
          yield* Effect.promise(() => runtime.handle.dispose())
          expect(runtime.container.textContent).toBe('')
          assertInterrupted(
            yield* awaitHandshake(
              Deferred.await(refresh.finished),
              'refresh request exited',
            ),
          )
          assertInterrupted(
            yield* awaitHandshake(
              Deferred.await(keyed.finished),
              'keyed request exited',
            ),
          )
          yield* Deferred.succeed(refresh.response, 'after-dispose')
          yield* Deferred.succeed(keyed.response, 'after-dispose')
          expect(runtime.container.textContent).toBe('')
        }).pipe(Effect.timeout('10 seconds')),
      ),
    15_000,
  )
})

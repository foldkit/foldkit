import { Effect, Exit, Fiber, Layer, Option, Result, Schema } from 'effect'
import { TestClock } from 'effect/testing'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import { Block } from '../../blocks/public.js'
import { story } from '../../blocks/testing.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Story from '../../test/story.js'
import * as Query from './index.js'
import { makeQueryPolicy } from './query.js'

const finiteQuery = makeQueryPolicy({
  name: 'FinitePolicy',
  data: Schema.String,
  error: Schema.String,
  staleTime: '10 millis',
})

const infiniteQuery = makeQueryPolicy({
  name: 'InfinitePolicy',
  data: Schema.String,
  error: Schema.String,
})

const notifyingQuery = makeQueryPolicy({
  name: 'NotifyingPolicy',
  data: Schema.String,
  error: Schema.String,
  notifyOnCompletion: true,
})

describe('Query freshness and cancellation', () => {
  it.effect('runs stale loading through a parent Block story', () => {
    const FiniteQuery = Query.define({
      name: 'FinitePolicyBlock',
      data: Schema.String,
      error: Schema.String,
      staleTime: '10 millis',
      handler: function* () {
        return () => Effect.succeed('loaded')
      },
    })
    const Message = defineMessageUnion({
      RequestedLoad: { nowMillis: Schema.Number },
    })

    class Parent extends Block<Parent>()('FinitePolicyParent', {
      Model: Schema.Struct({ query: FiniteQuery }),
      Message,
    }) {}

    const ParentLive = Parent.make(
      Effect.fn(function* () {
        const query = yield* new FiniteQuery('query', {})

        return {
          model: { query },
          update: {
            RequestedLoad: (model, { nowMillis }) => ({
              model,
              messages: [
                model.query.send(
                  FiniteQuery.Message.RequestedLoadIfStale({ nowMillis }),
                ),
              ],
            }),
          },
        }
      }),
    ).pipe(Layer.provide(FiniteQuery.Live))

    return story(
      ParentLive,
      Story.message(Message.RequestedLoad({ nowMillis: 0 })),
      Story.Command.expectExact(FiniteQuery.Fetch),
      Story.Command.resolve(
        FiniteQuery.Fetch,
        FiniteQuery.Message.CompletedFetch({
          generation: 1,
          result: Result.succeed('story'),
          completedAtMillis: 10,
        }),
      ),
      Story.model(nextModel => {
        expect(FiniteQuery.read(nextModel.query)).toEqual(
          AsyncData.Success({ data: 'story' }),
        )
        expect(nextModel.query.maybeCompletedAtMillis).toEqual(Option.some(10))
      }),
      Story.message(Message.RequestedLoad({ nowMillis: 19 })),
      Story.Command.expectNone(),
      Story.message(Message.RequestedLoad({ nowMillis: 20 })),
      Story.Command.resolve(
        FiniteQuery.Fetch,
        FiniteQuery.Message.CompletedFetch({
          generation: 2,
          result: Result.succeed('refreshed'),
          completedAtMillis: 20,
        }),
      ),
      Story.model(nextModel => {
        expect(FiniteQuery.read(nextModel.query)).toEqual(
          AsyncData.Success({ data: 'refreshed' }),
        )
      }),
    )
  })

  it('uses the successful completion time and treats the expiry boundary as stale', () => {
    const initial = finiteQuery.init().model
    const firstLoad = finiteQuery.requestLoadIfStale(initial, 0)

    expect(finiteQuery.read(firstLoad.model)).toEqual(AsyncData.Loading())

    const success = finiteQuery.update(
      firstLoad.model,
      finiteQuery.Message.CompletedFetch({
        generation: firstLoad.model.generation,
        result: Result.succeed('loaded'),
        completedAtMillis: 5,
      }),
    )

    expect(finiteQuery.requestLoadIfStale(success.model, 14)).toEqual({
      model: success.model,
    })
    expect(finiteQuery.isFresh(success.model, 14)).toBe(true)
    expect(finiteQuery.isFresh(success.model, 15)).toBe(false)
    expect(() => finiteQuery.isFresh(initial, NaN)).toThrow(
      'finite Clock timestamp',
    )

    const expired = finiteQuery.requestLoadIfStale(success.model, 15)
    expect(finiteQuery.read(expired.model)).toEqual(
      AsyncData.Refreshing({ data: 'loaded' }),
    )
    expect(expired.commands).toHaveLength(1)
  })

  it('notifies only for a pending completion from the current generation', () => {
    const initial = notifyingQuery.init().model
    const started = notifyingQuery.requestRevalidationOrLoad(initial)
    const staleCompletion = notifyingQuery.update(
      started.model,
      notifyingQuery.Message.CompletedFetch({
        generation: 0,
        result: Result.succeed('stale'),
        completedAtMillis: 1,
      }),
    )

    expect(staleCompletion.model).toBe(started.model)
    expect(staleCompletion.outMessage).toBeUndefined()

    const accepted = notifyingQuery.update(
      started.model,
      notifyingQuery.Message.CompletedFetch({
        generation: started.model.generation,
        result: Result.fail('offline'),
      }),
    )

    expect(accepted.outMessage).toEqual(
      notifyingQuery.OutMessage.CompletedFetch({
        generation: started.model.generation,
        result: Result.fail('offline'),
      }),
    )
    expect(accepted.commands).toBeUndefined()

    const duplicate = notifyingQuery.update(
      accepted.model,
      notifyingQuery.Message.CompletedFetch({
        generation: started.model.generation,
        result: Result.succeed('duplicate'),
      }),
    )
    expect(duplicate.outMessage).toBeUndefined()
  })

  it('preserves freshness metadata after a failed refresh and expires missing completion times', () => {
    const initial = finiteQuery.init().model
    const firstLoad = finiteQuery.requestLoadIfStale(initial, 0)
    const success = finiteQuery.update(
      firstLoad.model,
      finiteQuery.Message.CompletedFetch({
        generation: firstLoad.model.generation,
        result: Result.succeed('loaded'),
        completedAtMillis: 5,
      }),
    )
    const refreshing = finiteQuery.requestRevalidation(success.model)
    const failure = finiteQuery.update(
      refreshing.model,
      finiteQuery.Message.CompletedFetch({
        generation: refreshing.model.generation,
        result: Result.fail('offline'),
        completedAtMillis: 100,
      }),
    )

    expect(failure.model.maybeCompletedAtMillis).toEqual(Option.some(5))
    expect(finiteQuery.read(failure.model)).toEqual(
      AsyncData.Stale({ data: 'loaded', error: 'offline' }),
    )
    expect(
      finiteQuery.requestLoadIfStale(failure.model, 15).commands,
    ).toHaveLength(1)

    const legacySuccess = finiteQuery.update(
      firstLoad.model,
      finiteQuery.Message.CompletedFetch({
        generation: firstLoad.model.generation,
        result: Result.succeed('legacy'),
      }),
    )
    expect(legacySuccess.model.maybeCompletedAtMillis).toEqual(Option.none())
    expect(
      finiteQuery.requestLoadIfStale(legacySuccess.model, 0).commands,
    ).toHaveLength(1)
    expect(
      infiniteQuery.requestLoadIfStale(
        infiniteQuery.update(
          infiniteQuery.requestLoadIfMissing(infiniteQuery.init().model).model,
          infiniteQuery.Message.CompletedFetch({
            generation: 1,
            result: Result.succeed('unbounded'),
          }),
        ).model,
        0,
      ).commands,
    ).toBeUndefined()
  })

  it('invalidates cancellation synchronously, preserves data, and ignores late completion', () => {
    const initial = finiteQuery.init().model
    const loading = finiteQuery.requestLoadIfStale(initial, 0)
    const cancelled = finiteQuery.requestCancel(loading.model)

    expect(finiteQuery.read(cancelled.model)).toEqual(AsyncData.Idle())
    expect(cancelled.model.generation).toBe(loading.model.generation + 1)
    expect(cancelled.commands).toHaveLength(1)

    const lateCompletion = finiteQuery.update(
      cancelled.model,
      finiteQuery.Message.CompletedFetch({
        generation: loading.model.generation,
        result: Result.succeed('late'),
        completedAtMillis: 10,
      }),
    )
    expect(lateCompletion.model).toBe(cancelled.model)

    const success = finiteQuery.update(
      loading.model,
      finiteQuery.Message.CompletedFetch({
        generation: loading.model.generation,
        result: Result.succeed('loaded'),
        completedAtMillis: 5,
      }),
    )
    const refreshing = finiteQuery.requestRevalidation(success.model)
    const cancelledRefresh = finiteQuery.requestCancel(refreshing.model)

    expect(finiteQuery.read(cancelledRefresh.model)).toEqual(
      AsyncData.Success({ data: 'loaded' }),
    )
    expect(cancelledRefresh.model.maybeCompletedAtMillis).toEqual(
      Option.some(5),
    )
    expect(finiteQuery.requestCancel(success.model)).toEqual({
      model: success.model,
    })
  })

  it.effect('timestamps each Fetch completion with the execution Clock', () =>
    Effect.gen(function* () {
      const handlers = finiteQuery.makeFetchHandlers(() =>
        Effect.sleep('25 millis').pipe(Effect.as('clocked')),
      )
      const fetch = yield* Effect.forkChild(handlers.fetch({ generation: 1 }))

      yield* TestClock.adjust('25 millis')
      const completed = yield* Fiber.join(fetch)

      expect(completed).toEqual(
        finiteQuery.Message.CompletedFetch({
          generation: 1,
          result: Result.succeed('clocked'),
          completedAtMillis: 25,
        }),
      )
    }).pipe(Effect.provide(TestClock.layer())),
  )

  it.effect('CancelFetch interrupts only the canceled generation', () =>
    Effect.gen(function* () {
      const handlers = infiniteQuery.makeFetchHandlers(() => Effect.never)
      const canceled = yield* Effect.forkChild(
        handlers.fetch({ generation: 31 }),
      )
      const running = yield* Effect.forkChild(
        handlers.fetch({ generation: 32 }),
      )

      yield* Effect.yieldNow
      const interrupted = yield* handlers.cancelFetch({ generation: 31 })
      const exit = yield* Fiber.await(canceled)

      expect(interrupted).toEqual(infiniteQuery.Message.CompletedCancelFetch())
      expect(Exit.isFailure(exit)).toBe(true)
      expect(running.pollUnsafe()).toBeUndefined()

      yield* Fiber.interrupt(running)
    }),
  )

  it.effect(
    'CancelFetch does not reach another instance of the same Query',
    () =>
      Effect.gen(function* () {
        const first = infiniteQuery.makeFetchHandlers(() => Effect.never)
        const second = infiniteQuery.makeFetchHandlers(() => Effect.never)
        const firstFetch = yield* Effect.forkChild(
          first.fetch({ generation: 1 }),
        )
        const secondFetch = yield* Effect.forkChild(
          second.fetch({ generation: 1 }),
        )

        yield* Effect.yieldNow
        yield* first.cancelFetch({ generation: 1 })
        const exit = yield* Fiber.await(firstFetch)

        expect(Exit.isFailure(exit)).toBe(true)
        expect(secondFetch.pollUnsafe()).toBeUndefined()

        yield* Fiber.interrupt(secondFetch)
      }),
  )
})

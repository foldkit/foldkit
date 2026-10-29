import { Effect, Exit, Fiber, Layer, Option, Result, Schema } from 'effect'
import { TestClock } from 'effect/testing'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Story from '../../test/story.js'
import * as Query from './index.js'

const finiteQuery = Query.define({
  name: 'FinitePolicy',
  data: Schema.String,
  error: Schema.String,
  staleTime: '10 millis',
})

const infiniteQuery = Query.define({
  name: 'InfinitePolicy',
  data: Schema.String,
  error: Schema.String,
})

const notifyingQuery = Query.define({
  name: 'NotifyingPolicy',
  data: Schema.String,
  error: Schema.String,
  notifyOnCompletion: true,
})

describe('Query freshness and cancellation', () => {
  it('runs stale loading through the ordinary Query update story', () => {
    const Model = Schema.Struct({ query: finiteQuery.Model })
    type Model = typeof Model.Type
    const Message = defineMessageUnion({
      RequestedLoad: { nowMillis: Schema.Number },
    })
    type Message = typeof Message.Type
    const Definition = Block.makeDefinition('FinitePolicyParent', {
      Model,
      Message,
    })
    const Binding = Definition.makeBinding(finiteQuery, {
      field: 'query',
      init: false,
    })
    const Composition = Definition.makeComposition({ bindings: [Binding] })
    const update = Composition.makeUpdate({
      RequestedLoad: (model, { nowMillis }) =>
        Binding.requestLoadIfStale(nowMillis)(model),
    })
    const prepare = () =>
      Composition.prepareBlock({
        init: Composition.makeInit(() => ({
          model: Model.make({ query: finiteQuery.init().model }),
        })),
        update,
        EffectsLayer: Layer.empty,
      })
    const Parent: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)

    Story.story(
      Parent.update,
      Story.given(Parent.init().model),
      Story.message(Message.RequestedLoad({ nowMillis: 0 })),
      Story.Command.expectHas(finiteQuery.Fetch({ generation: 1 })),
      Story.Command.resolve(
        finiteQuery.Fetch({ generation: 1 }),
        finiteQuery.Message.CompletedFetch({
          generation: 1,
          result: Result.succeed('story'),
          completedAtMillis: 10,
        }),
      ),
      Story.model(nextModel => {
        expect(finiteQuery.read(nextModel.query)).toEqual(
          AsyncData.Success({ data: 'story' }),
        )
        expect(nextModel.query.maybeCompletedAtMillis).toEqual(Option.some(10))
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
      const handlerLayer = finiteQuery.toLayer(
        Effect.succeed(() =>
          Effect.sleep('25 millis').pipe(Effect.as('clocked')),
        ),
      )
      const fetch = yield* Effect.forkChild(
        finiteQuery
          .Fetch({ generation: 1 })
          .effect.pipe(Effect.provide(handlerLayer)),
      )

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

  it.effect(
    'interrupts the active generation through its real Command key',
    () =>
      Effect.gen(function* () {
        const handlerLayer = infiniteQuery.toLayer(
          Effect.succeed(() => Effect.never),
        )
        const fetch = yield* Effect.forkChild(
          infiniteQuery
            .Fetch({ generation: 31 })
            .effect.pipe(Effect.provide(handlerLayer)),
        )

        yield* Effect.yieldNow
        const interrupted = yield* infiniteQuery.Fetch.Interrupt(
          { generation: 31 },
          () => infiniteQuery.Message.CompletedCancelFetch(),
        ).effect
        const exit = yield* Fiber.await(fetch)

        expect(interrupted).toEqual(
          infiniteQuery.Message.CompletedCancelFetch(),
        )
        expect(Exit.isFailure(exit)).toBe(true)
      }),
  )
})

import {
  Array,
  Deferred,
  Effect,
  Fiber,
  HashMap,
  Option,
  Ref,
  Result,
  Schema,
  pipe,
} from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import * as Block from '../../block/public.js'
import {
  __CurrentRegistry,
  type __Registry,
  __makeRegistry,
} from '../../command/interruptible/interruptible.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Story from '../../test/story.js'
import * as Update from '../../update/index.js'
import * as Query from './index.js'

const provideRegistry =
  (registry: __Registry) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.provideService(effect, __CurrentRegistry, registry)

const makeWindows = (maxSettledEntries = 2) =>
  Query.define({
    name: 'Windows',
    data: Schema.Array(Schema.String),
    error: Schema.String,
    args: { label: Schema.String, offset: Schema.Number, limit: Schema.Number },
    staleTime: '1 minute',
    maxSettledEntries,
  })

const windows = makeWindows()
const first = { label: 'devin', offset: 0, limit: 60 }
const second = { ...first, offset: 60 }
const anotherLabel = { ...first, label: 'devins' }
const key = (args: typeof first) =>
  JSON.stringify({ label: args.label, limit: args.limit, offset: args.offset })
type WindowModel = typeof windows.Model.Type

const completed = (
  model: WindowModel,
  args: typeof first,
  nowMillis = 0,
  result: Result.Result<ReadonlyArray<string>, string> = Result.succeed([
    `${args.label}.com`,
  ]),
) =>
  windows.Message.CompletedFetch({
    args,
    generation: Option.getOrThrow(HashMap.get(model.entries, key(args)))
      .generation,
    requestKey: key(args),
    result,
    completedAtMillis: nowMillis,
  })

const loadWindow = (model: WindowModel, args: typeof first, nowMillis = 0) => {
  const loading = windows.requestLoadIfMissing(model, args)
  return windows.update(
    loading.model,
    completed(loading.model, args, nowMillis),
  ).model
}

describe('KeyedQuery freshness', () => {
  it('rejects invalid Clock timestamps for both missing and retained keys', () => {
    const initial = windows.init().model
    const loaded = loadWindow(initial, first)

    for (const nowMillis of [NaN, Infinity, -Infinity]) {
      expect(() => windows.isFresh(initial, first, nowMillis)).toThrow(
        'finite Clock timestamp',
      )
      expect(() => windows.isFresh(loaded, first, nowMillis)).toThrow(
        'finite Clock timestamp',
      )
      expect(() =>
        windows.requestLoadIfStale(initial, first, nowMillis),
      ).toThrow('finite Clock timestamp')
    }
  })

  it('reuses a fresh window without extending its lifetime and retains expired display data', () => {
    const loaded = loadWindow(windows.init().model, first, 100)
    const hit = windows.requestLoadIfStale(loaded, first, 60_099)

    expect(hit.commands).toBeUndefined()
    expect(windows.isFresh(hit.model, first, 60_099)).toBe(true)
    expect(windows.isFresh(hit.model, first, 60_100)).toBe(false)
    expect(windows.read(hit.model, first)).toEqual(
      AsyncData.Success({ data: ['devin.com'] }),
    )

    const refresh = windows.requestLoadIfStale(hit.model, first, 60_100)

    expect(refresh.commands).toHaveLength(1)
    expect(windows.read(refresh.model, first)).toEqual(
      AsyncData.Refreshing({ data: ['devin.com'] }),
    )
    expect(
      windows.requestLoadIfStale(refresh.model, first, 60_101).commands,
    ).toBeUndefined()
  })

  it('preserves checked windows after a later-page failure and allows explicit retry', () => {
    Story.story(
      windows.update,
      Story.given(windows.init().model),
      Story.message(
        windows.Message.RequestedLoadIfStale({ args: first, nowMillis: 0 }),
      ),
      Story.Command.resolve(
        windows.Fetch({ args: first, generation: 1, requestKey: key(first) }),
        windows.Message.CompletedFetch({
          args: first,
          generation: 1,
          requestKey: key(first),
          result: Result.succeed(['devin.com']),
          completedAtMillis: 0,
        }),
      ),
      Story.message(
        windows.Message.RequestedLoadIfStale({ args: second, nowMillis: 1 }),
      ),
      Story.Command.resolve(
        windows.Fetch({ args: second, generation: 2, requestKey: key(second) }),
        windows.Message.CompletedFetch({
          args: second,
          generation: 2,
          requestKey: key(second),
          result: Result.fail('unavailable'),
          completedAtMillis: 1,
        }),
      ),
      Story.model(model => {
        expect(windows.read(model, first)).toEqual(
          AsyncData.Success({ data: ['devin.com'] }),
        )
        expect(windows.read(model, second)).toEqual(
          AsyncData.Failure({ error: 'unavailable' }),
        )
      }),
      Story.message(
        windows.Message.RequestedLoadIfStale({ args: second, nowMillis: 2 }),
      ),
      Story.Command.expectHas(
        windows.Fetch({ args: second, generation: 3, requestKey: key(second) }),
      ),
      Story.Command.resolve(
        windows.Fetch({ args: second, generation: 3, requestKey: key(second) }),
        windows.Message.CompletedFetch({
          args: second,
          generation: 3,
          requestKey: key(second),
          result: Result.succeed(['devin.net']),
          completedAtMillis: 2,
        }),
      ),
    )
  })

  it('does not renew freshness after a failed refresh', () => {
    const loaded = loadWindow(windows.init().model, first, 100)
    const refresh = windows.requestRevalidation(loaded, first)
    const failed = windows.update(
      refresh.model,
      completed(refresh.model, first, 200, Result.fail('offline')),
    )

    expect(windows.read(failed.model, first)).toEqual(
      AsyncData.Stale({ data: ['devin.com'], error: 'offline' }),
    )
    expect(windows.isFresh(failed.model, first, 201)).toBe(false)
    expect(
      Option.getOrThrow(HashMap.get(failed.model.entries, key(first)))
        .maybeCompletedAtMillis,
    ).toEqual(Option.some(100))
    expect(
      windows.requestLoadIfStale(failed.model, first, 201).commands,
    ).toHaveLength(1)
  })

  it('supports zero freshness and infinite default freshness without changing existing policies', () => {
    const immediate = Query.define({
      name: 'Immediate',
      args: { id: Schema.String },
      data: Schema.String,
      error: Schema.String,
      staleTime: 0,
    })
    const args = { id: 'a' }
    const pending = immediate.requestLoadIfMissing(immediate.init().model, args)
    const loaded = immediate.update(
      pending.model,
      immediate.Message.CompletedFetch({
        args,
        requestKey: '{"id":"a"}',
        generation: 1,
        result: Result.succeed('a'),
        completedAtMillis: 10,
      }),
    ).model

    expect(immediate.isFresh(loaded, args, 10)).toBe(false)
    expect(
      immediate.requestLoadIfMissing(loaded, args).commands,
    ).toBeUndefined()
    expect(
      immediate.requestLoadIfStale(args, 10)(loaded).commands,
    ).toHaveLength(1)

    const timeless = Query.define({
      name: 'Timeless',
      args: { id: Schema.String },
      data: Schema.String,
      error: Schema.String,
    })
    const timelessPending = timeless.requestLoadIfMissing(
      timeless.init().model,
      args,
    )
    const timelessLoaded = timeless.update(
      timelessPending.model,
      timeless.Message.CompletedFetch({
        args,
        requestKey: '{"id":"a"}',
        generation: 1,
        result: Result.succeed('a'),
      }),
    ).model

    expect(timeless.isFresh(timelessLoaded, args, 1e12)).toBe(true)
  })
})

describe('KeyedQuery retention', () => {
  it('touches cache hits, admits completions as recent, and leaves reads observational', () => {
    const loaded = pipe(
      windows.init().model,
      model => loadWindow(model, first),
      model => loadWindow(model, second),
    )
    const touched = windows.requestLoadIfMissing(loaded, first).model

    windows.read(touched, second)
    windows.isFresh(touched, second, 1)

    const admitted = loadWindow(touched, anotherLabel)

    expect(windows.read(admitted, first)._tag).toBe('Success')
    expect(windows.read(admitted, second)._tag).toBe('Idle')
    expect(windows.read(admitted, anotherLabel)._tag).toBe('Success')
    expect(HashMap.size(admitted.entries)).toBe(2)
  })

  it('protects every pending entry, then trims settled entries without recreating evicted data', () => {
    const bounded = makeWindows(1)
    const a = bounded.requestLoadIfMissing(bounded.init().model, first)
    const b = bounded.requestLoadIfMissing(a.model, second)
    const c = bounded.requestLoadIfMissing(b.model, anotherLabel)

    expect(HashMap.size(c.model.entries)).toBe(3)
    expect(bounded.pendingArgs(c.model)).toHaveLength(3)

    const completedA = completed(c.model, first)
    const acceptedA = bounded.update(c.model, completedA)
    const acceptedB = bounded.update(
      acceptedA.model,
      completed(acceptedA.model, second),
    )

    expect(HashMap.size(acceptedB.model.entries)).toBe(2)
    expect(bounded.read(acceptedB.model, first)._tag).toBe('Idle')
    expect(bounded.read(acceptedB.model, anotherLabel)._tag).toBe('Loading')
    expect(bounded.update(acceptedB.model, completedA).model).toBe(
      acceptedB.model,
    )

    const restarted = bounded.requestLoadIfMissing(acceptedB.model, first)
    expect(restarted.model.generation).toBeGreaterThan(completedA.generation)
    expect(bounded.update(restarted.model, completedA).model).toBe(
      restarted.model,
    )
  })

  it('requires a positive integral retention bound', () => {
    for (const bound of [0, -1, 1.5, Infinity, NaN]) {
      expect(() => makeWindows(bound)).toThrow('maxSettledEntries')
    }
  })
})

describe('KeyedQuery cancellation', () => {
  it('does not evict an unrelated cached value when canceling an initial load', () => {
    const bounded = makeWindows(1)
    const loaded = loadWindow(bounded.init().model, first)
    const pending = bounded.requestLoadIfMissing(loaded, anotherLabel)
    const canceled = bounded.requestCancel(pending.model, anotherLabel)

    expect(bounded.read(canceled.model, first)).toEqual(
      AsyncData.Success({ data: ['devin.com'] }),
    )
    expect(bounded.read(canceled.model, anotherLabel)._tag).toBe('Idle')
    expect(HashMap.size(canceled.model.entries)).toBe(1)
  })

  it('cancels selected work while retaining other windows and rejecting late results', () => {
    const loaded = loadWindow(windows.init().model, first)
    const refreshing = windows.requestRevalidation(loaded, first)
    const loading = windows.requestLoadIfMissing(refreshing.model, anotherLabel)
    const late = completed(loading.model, first, 1)
    const canceled = windows.requestCancel(loading.model, first)

    expect(windows.read(canceled.model, first)).toEqual(
      AsyncData.Success({ data: ['devin.com'] }),
    )
    expect(windows.read(canceled.model, anotherLabel)._tag).toBe('Loading')
    expect(windows.pendingArgs(canceled.model)).toEqual([anotherLabel])
    expect(windows.update(canceled.model, late).model).toBe(canceled.model)

    const restarted = windows.requestRevalidation(canceled.model, first)

    expect(windows.update(restarted.model, late).model).toBe(restarted.model)
    expect(windows.requestCancel(first)(restarted.model).commands).toHaveLength(
      1,
    )
  })

  it('returns detached pending argument snapshots', () => {
    const nested = Query.define({
      name: 'NestedPending',
      data: Schema.String,
      error: Schema.String,
      args: { filter: Schema.Struct({ label: Schema.String }) },
    })
    const pending = nested.requestLoadIfMissing(nested.init().model, {
      filter: { label: 'devin' },
    })
    const args = Option.getOrThrow(
      Array.head(nested.pendingArgs(pending.model)),
    )

    Object.assign(args.filter, { label: 'changed' })

    expect(nested.pendingArgs(pending.model)).toEqual([
      { filter: { label: 'devin' } },
    ])
  })

  it.effect(
    'interrupts the selected running generation and releases its resources',
    () =>
      Effect.gen(function* () {
        const registry = __makeRegistry()
        const started = yield* Deferred.make<void>()
        const released = yield* Ref.make(0)
        const layer = windows.toLayer(
          Effect.succeed(() =>
            Effect.acquireUseRelease(
              Deferred.succeed(started, undefined),
              () => Effect.never,
              () => Ref.update(released, count => count + 1),
            ),
          ),
        )
        const pending = windows.requestLoadIfMissing(
          windows.init().model,
          first,
        )
        const fetch = Option.getOrThrow(Array.head(pending.commands ?? []))
        const fiber = yield* Effect.forkChild(
          fetch.effect.pipe(provideRegistry(registry), Effect.provide(layer)),
        )

        yield* Deferred.await(started)

        const canceled = windows.requestCancel(pending.model, first)
        const interrupt = Option.getOrThrow(Array.head(canceled.commands ?? []))

        yield* interrupt.effect.pipe(provideRegistry(registry))

        expect((yield* Fiber.await(fiber))._tag).toBe('Failure')
        expect(yield* Ref.get(released)).toBe(1)
        expect(windows.read(canceled.model, first)._tag).toBe('Idle')
      }),
  )

  it.effect(
    'does not let an earlier cancellation interrupt a restarted generation',
    () =>
      Effect.gen(function* () {
        const registry = __makeRegistry()
        const started = yield* Deferred.make<void>()
        const released = yield* Ref.make(0)
        const pending = windows.requestLoadIfMissing(
          windows.init().model,
          first,
        )
        const canceled = windows.requestCancel(pending.model, first)
        const restarted = windows.requestLoadIfMissing(canceled.model, first)
        const layer = windows.toLayer(
          Effect.succeed(() =>
            Effect.acquireUseRelease(
              Deferred.succeed(started, undefined),
              () => Effect.never,
              () => Ref.update(released, count => count + 1),
            ),
          ),
        )
        const fetch = Option.getOrThrow(Array.head(restarted.commands ?? []))
        const fiber = yield* Effect.forkChild(
          fetch.effect.pipe(provideRegistry(registry), Effect.provide(layer)),
        )

        yield* Deferred.await(started)
        yield* Option.getOrThrow(
          Array.head(canceled.commands ?? []),
        ).effect.pipe(provideRegistry(registry))

        expect(yield* Ref.get(released)).toBe(0)

        const currentCancel = windows.requestCancel(restarted.model, first)
        yield* Option.getOrThrow(
          Array.head(currentCancel.commands ?? []),
        ).effect.pipe(provideRegistry(registry))

        expect((yield* Fiber.await(fiber))._tag).toBe('Failure')
        expect(yield* Ref.get(released)).toBe(1)
      }),
  )

  it.effect('leaves another running key untouched', () =>
    Effect.gen(function* () {
      const registry = __makeRegistry()
      const firstStarted = yield* Deferred.make<void>()
      const otherStarted = yield* Deferred.make<void>()
      const released = yield* Ref.make<ReadonlyArray<string>>([])
      const layer = windows.toLayer(
        Effect.succeed(args =>
          Effect.acquireUseRelease(
            Deferred.succeed(
              args.label === first.label ? firstStarted : otherStarted,
              undefined,
            ),
            () => Effect.never,
            () => Ref.update(released, Array.append(args.label)),
          ),
        ),
      )
      const a = windows.requestLoadIfMissing(windows.init().model, first)
      const b = windows.requestLoadIfMissing(a.model, anotherLabel)
      const aFiber = yield* Effect.forkChild(
        Option.getOrThrow(Array.head(a.commands ?? [])).effect.pipe(
          provideRegistry(registry),
          Effect.provide(layer),
        ),
      )
      const bFiber = yield* Effect.forkChild(
        Option.getOrThrow(Array.head(b.commands ?? [])).effect.pipe(
          provideRegistry(registry),
          Effect.provide(layer),
        ),
      )

      yield* Deferred.await(firstStarted)
      yield* Deferred.await(otherStarted)

      const canceled = windows.requestCancel(b.model, first)
      yield* Option.getOrThrow(Array.head(canceled.commands ?? [])).effect.pipe(
        provideRegistry(registry),
      )

      expect((yield* Fiber.await(aFiber))._tag).toBe('Failure')
      expect(yield* Ref.get(released)).toEqual(['devin'])

      const cancelOther = windows.requestCancel(canceled.model, anotherLabel)
      yield* Option.getOrThrow(
        Array.head(cancelOther.commands ?? []),
      ).effect.pipe(provideRegistry(registry))

      expect((yield* Fiber.await(bFiber))._tag).toBe('Failure')
      expect(yield* Ref.get(released)).toEqual(['devin', 'devins'])
    }),
  )
})

describe('KeyedQuery accepted completion notifications', () => {
  const reporting = Query.define({
    name: 'ReportingWindows',
    data: Schema.Array(Schema.String),
    error: Schema.String,
    args: { label: Schema.String, offset: Schema.Number, limit: Schema.Number },
    notifyOnCompletion: true,
    maxSettledEntries: 1,
  })

  it('notifies accepted successes and failures once, using the stored request arguments', () => {
    const pending = reporting.requestLoadIfMissing(
      reporting.init().model,
      first,
    )
    const message = reporting.Message.CompletedFetch({
      args: anotherLabel,
      requestKey: key(first),
      generation: 1,
      result: Result.succeed(['devin.com']),
      completedAtMillis: 10,
    })
    const accepted = reporting.update(pending.model, message)

    expect(accepted.outMessage).toEqual(
      reporting.OutMessage.CompletedFetch({
        args: first,
        generation: 1,
        result: Result.succeed(['devin.com']),
        completedAtMillis: 10,
      }),
    )
    expect(reporting.update(accepted.model, message).outMessage).toBeUndefined()

    const retry = reporting.requestRevalidation(accepted.model, first)
    const failure = reporting.update(
      retry.model,
      reporting.Message.CompletedFetch({
        args: first,
        requestKey: key(first),
        generation: retry.model.generation,
        result: Result.fail('offline'),
        completedAtMillis: 20,
      }),
    )

    expect(failure.outMessage?.result).toEqual(Result.fail('offline'))
    expect(reporting.read(failure.model, first)).toEqual(
      AsyncData.Stale({ data: ['devin.com'], error: 'offline' }),
    )
  })

  it('keeps canceled, reset, replaced, and evicted completions silent', () => {
    const pending = reporting.requestLoadIfMissing(
      reporting.init().model,
      first,
    )
    const message = reporting.Message.CompletedFetch({
      args: first,
      requestKey: key(first),
      generation: pending.model.generation,
      result: Result.succeed(['devin.com']),
      completedAtMillis: 10,
    })
    const canceled = reporting.requestCancel(pending.model, first)

    expect(reporting.update(canceled.model, message).outMessage).toBeUndefined()

    const restarted = reporting.requestLoadIfMissing(canceled.model, first)
    expect(
      reporting.update(restarted.model, message).outMessage,
    ).toBeUndefined()
    expect(
      reporting.update(reporting.requestReset(pending.model).model, message)
        .outMessage,
    ).toBeUndefined()

    const accepted = reporting.update(pending.model, message)
    const another = reporting.requestLoadIfMissing(accepted.model, anotherLabel)
    const admitted = reporting.update(
      another.model,
      reporting.Message.CompletedFetch({
        args: anotherLabel,
        requestKey: key(anotherLabel),
        generation: another.model.generation,
        result: Result.succeed(['devins.com']),
        completedAtMillis: 20,
      }),
    )

    expect(reporting.read(admitted.model, first)._tag).toBe('Idle')
    expect(reporting.update(admitted.model, message).outMessage).toBeUndefined()
  })

  it.effect(
    'rejects a completion when cancellation ran before fetch execution',
    () =>
      Effect.gen(function* () {
        const registry = __makeRegistry()
        const pending = reporting.requestLoadIfMissing(
          reporting.init().model,
          first,
        )
        const canceled = reporting.requestCancel(pending.model, first)

        yield* Option.getOrThrow(
          Array.head(canceled.commands ?? []),
        ).effect.pipe(provideRegistry(registry))

        const layer = reporting.toLayer(
          Effect.succeed(() => Effect.succeed(['late.com'])),
        )
        const completion = yield* Option.getOrThrow(
          Array.head(pending.commands ?? []),
        ).effect.pipe(provideRegistry(registry), Effect.provide(layer))
        const rejected = reporting.update(canceled.model, completion)

        expect(rejected.model).toBe(canceled.model)
        expect(rejected.outMessage).toBeUndefined()
        expect(reporting.read(rejected.model, first)._tag).toBe('Idle')
      }),
  )

  it('coordinates the next window through a registered parent OutMessage fold', () => {
    const ParentModel = Schema.Struct({
      windows: reporting.Model,
      acceptedCount: Schema.Number,
    })
    type ParentModel = typeof ParentModel.Type
    const ParentMessage = defineMessageUnion({
      RequestedWindow: {
        args: Schema.Struct({
          label: Schema.String,
          offset: Schema.Number,
          limit: Schema.Number,
        }),
      },
    })
    type ParentMessage = typeof ParentMessage.Type
    const ParentDefinition = Block.makeDefinition('ProgressiveWindows', {
      Model: ParentModel,
      Message: ParentMessage,
    })
    const BaseBinding = ParentDefinition.makeBinding(reporting, {
      field: 'windows',
    })
    const WindowsBinding = BaseBinding.withOutMessagePolicy({
      fold: ParentDefinition.makeOutMessageFold(reporting, {
        CompletedFetch: ({ args, result }) =>
          Update.combineSteps([
            ParentDefinition.makeFieldsStep(() => ({
              acceptedCount: count => count + 1,
            })),
            Result.isSuccess(result) && args.offset === 0
              ? BaseBinding.requestLoadIfMissing({
                  ...args,
                  offset: args.limit,
                })
              : ParentDefinition.makeNoopStep(),
          ]),
      }),
    })
    const ParentComposition = ParentDefinition.makeComposition({
      bindings: [WindowsBinding],
    })
    const init = ParentComposition.makeInit(() => ({
      model: { acceptedCount: 0 },
      steps: [WindowsBinding.requestLoadIfMissing(first)],
    }))
    const update = ParentComposition.makeUpdate({
      RequestedWindow: (model, { args }) =>
        WindowsBinding.requestLoadIfMissing(args)(model),
    })

    const initial = init()
    expect(initial.commands).toHaveLength(1)
    const passiveInit = ParentComposition.makeInit(() => ({
      model: { acceptedCount: 0 },
    }))

    Story.story(
      update,
      Story.given(passiveInit().model),
      Story.message(ParentMessage.RequestedWindow({ args: first })),
      Story.Command.resolve(
        reporting.Fetch({ args: first, requestKey: key(first), generation: 1 }),
        reporting.Message.CompletedFetch({
          args: first,
          requestKey: key(first),
          generation: 1,
          result: Result.succeed(['devin.com']),
          completedAtMillis: 10,
        }),
      ),
      Story.Command.expectHas(
        reporting.Fetch({
          args: second,
          requestKey: key(second),
          generation: 2,
        }),
      ),
      Story.Command.resolve(
        reporting.Fetch({
          args: second,
          requestKey: key(second),
          generation: 2,
        }),
        reporting.Message.CompletedFetch({
          args: second,
          requestKey: key(second),
          generation: 2,
          result: Result.fail('offline'),
          completedAtMillis: 20,
        }),
      ),
      Story.model(model => {
        expect(model.acceptedCount).toBe(2)
        expect(reporting.read(model.windows, second)).toEqual(
          AsyncData.Failure({ error: 'offline' }),
        )
      }),
    )
  })
})

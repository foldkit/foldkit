import { Array, Effect, Fiber, Schema } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineMessageUnion } from '../../message/index.js'
import * as Command from '../index.js'
import { __CurrentRegistry, type __Registry, __makeRegistry } from './index.js'

const Message = defineMessageUnion({
  CompletedWork: {},
  SucceededTask: { taskId: Schema.Number },
})

const provideRegistry =
  (registry: __Registry) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.provideService(effect, __CurrentRegistry, registry)

describe('interruptible Command.define', () => {
  it('derives the key from args at construction, prefixed by the Command name', () => {
    const RunTask = Command.define('RunTask', {
      args: { taskId: Schema.Number, label: Schema.String },
      messages: [Message.SucceededTask],
      interrupt: {
        keyFields: ['taskId'],
        toKey: ({ taskId }) => taskId.toString(),
      },
      execute: ({ taskId }) =>
        Effect.succeed(Message.SucceededTask({ taskId })),
    })

    const instance = RunTask({ taskId: 7, label: 'seven' })
    expect(instance.name).toBe('RunTask')
    expect(instance.args).toEqual({ taskId: 7, label: 'seven' })
    expect(instance.key).toBe('RunTask:7')

    const interrupt = RunTask.Interrupt({ taskId: 7 }, outcome => outcome)
    expect(interrupt.name).toBe('RunTask.Interrupt')
    expect(interrupt.args).toEqual({ taskId: 7 })
    expect(interrupt.interruptsKey).toBe('RunTask:7')

    if (false) {
      // @ts-expect-error taskId is required to derive the interrupt key
      RunTask.Interrupt({}, outcome => outcome)
      // @ts-expect-error label is not an interrupt key field
      RunTask.Interrupt({ label: 'seven' }, outcome => outcome)
    }
  })

  it('uses the Command name as the key on the no-args form', () => {
    const SyncLibrary = Command.define('SyncLibrary', {
      messages: [Message.CompletedWork],
      interrupt: true,
      execute: Effect.succeed(Message.CompletedWork()),
    })

    const instance = SyncLibrary()
    expect(instance.name).toBe('SyncLibrary')
    expect(instance.key).toBe('SyncLibrary')

    const interrupt = SyncLibrary.Interrupt(outcome => outcome)
    expect(interrupt.name).toBe('SyncLibrary.Interrupt')
    expect(interrupt.interruptsKey).toBe('SyncLibrary')
  })

  it('uses the Command name as the key on the with-args form when toKey is omitted', () => {
    const SaveDraft = Command.define('SaveDraft', {
      args: { taskId: Schema.Number },
      messages: [Message.SucceededTask],
      interrupt: true,
      execute: ({ taskId }) =>
        Effect.succeed(Message.SucceededTask({ taskId })),
    })

    const instance = SaveDraft({ taskId: 7 })
    expect(instance.name).toBe('SaveDraft')
    expect(instance.args).toEqual({ taskId: 7 })
    expect(instance.key).toBe('SaveDraft')

    const interrupt = SaveDraft.Interrupt(outcome => outcome)
    expect(interrupt.name).toBe('SaveDraft.Interrupt')
    expect(interrupt.interruptsKey).toBe('SaveDraft')
  })

  it.effect(
    'interrupts the in-flight holder on the with-args form when toKey is omitted',
    () =>
      Effect.gen(function* () {
        const registry = __makeRegistry()

        const SaveDraft = Command.define('SaveDraft', {
          args: { taskId: Schema.Number },
          messages: [Message.SucceededTask],
          interrupt: true,
          execute: ({ taskId }) =>
            Effect.as(Effect.never, Message.SucceededTask({ taskId })),
        })

        const fiber = yield* Effect.forkChild(
          SaveDraft({ taskId: 7 }).effect.pipe(provideRegistry(registry)),
        )
        yield* Effect.yieldNow

        expect(
          Array.isReadonlyArrayNonEmpty(registry.lookup('SaveDraft')),
        ).toBe(true)

        const outcome = yield* SaveDraft.Interrupt(
          outcome => outcome,
        ).effect.pipe(provideRegistry(registry))

        expect(outcome._tag).toBe('Interrupted')
        expect(Array.isReadonlyArrayEmpty(registry.lookup('SaveDraft'))).toBe(
          true,
        )

        const exit = yield* Fiber.await(fiber)
        expect(exit._tag).toBe('Failure')
      }),
  )

  it.effect(
    'reports NotFound after the holder completed on the with-args form when toKey is omitted',
    () =>
      Effect.gen(function* () {
        const registry = __makeRegistry()

        const SaveDraft = Command.define('SaveDraft', {
          args: { taskId: Schema.Number },
          messages: [Message.SucceededTask],
          interrupt: true,
          execute: ({ taskId }) =>
            Effect.succeed(Message.SucceededTask({ taskId })),
        })

        const message = yield* SaveDraft({ taskId: 7 }).effect.pipe(
          provideRegistry(registry),
        )
        expect(message).toEqual(Message.SucceededTask({ taskId: 7 }))

        const outcome = yield* SaveDraft.Interrupt(
          outcome => outcome,
        ).effect.pipe(provideRegistry(registry))

        expect(outcome._tag).toBe('NotFound')
      }),
  )

  it.effect(
    'releases the key when the Effect fails on the with-args form when toKey is omitted',
    () =>
      Effect.gen(function* () {
        const registry = __makeRegistry()

        const SaveDraft = Command.define('SaveDraft', {
          args: { taskId: Schema.Number },
          messages: [Message.SucceededTask],
          interrupt: true,
          execute: ({ taskId }) =>
            Effect.flatMap(Effect.fail('boom'), () =>
              Effect.succeed(Message.SucceededTask({ taskId })),
            ),
        })

        const exit = yield* Effect.exit(
          SaveDraft({ taskId: 7 }).effect.pipe(provideRegistry(registry)),
        )

        expect(exit._tag).toBe('Failure')
        expect(Array.isReadonlyArrayEmpty(registry.lookup('SaveDraft'))).toBe(
          true,
        )
      }),
  )

  it.effect('interrupts the in-flight holder and reports Interrupted', () =>
    Effect.gen(function* () {
      const registry = __makeRegistry()
      let didProduceResult = false

      const RunForever = Command.define('RunForever', {
        messages: [Message.CompletedWork],
        interrupt: true,
        execute: Effect.as(Effect.never, Message.CompletedWork()),
      })

      const fiber = yield* Effect.forkChild(
        RunForever().effect.pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              didProduceResult = true
            }),
          ),
          provideRegistry(registry),
        ),
      )
      yield* Effect.yieldNow

      expect(Array.isReadonlyArrayNonEmpty(registry.lookup('RunForever'))).toBe(
        true,
      )

      const outcome = yield* RunForever.Interrupt(
        outcome => outcome,
      ).effect.pipe(provideRegistry(registry))

      expect(outcome._tag).toBe('Interrupted')
      expect(didProduceResult).toBe(false)
      expect(Array.isReadonlyArrayEmpty(registry.lookup('RunForever'))).toBe(
        true,
      )

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Failure')
    }),
  )

  it.effect('reports NotFound when no Command holds the key', () =>
    Effect.gen(function* () {
      const registry = __makeRegistry()

      const RunForever = Command.define('RunForever', {
        messages: [Message.CompletedWork],
        interrupt: true,
        execute: Effect.as(Effect.never, Message.CompletedWork()),
      })

      const outcome = yield* RunForever.Interrupt(
        outcome => outcome,
      ).effect.pipe(provideRegistry(registry))

      expect(outcome._tag).toBe('NotFound')
    }),
  )

  it.effect('reports NotFound after the holder completed', () =>
    Effect.gen(function* () {
      const registry = __makeRegistry()

      const RunTask = Command.define('RunTask', {
        args: { taskId: Schema.Number },
        messages: [Message.SucceededTask],
        interrupt: {
          keyFields: ['taskId'],
          toKey: ({ taskId }) => String(taskId),
        },
        execute: ({ taskId }) =>
          Effect.succeed(Message.SucceededTask({ taskId })),
      })

      const message = yield* RunTask({ taskId: 1 }).effect.pipe(
        provideRegistry(registry),
      )
      expect(message).toEqual(Message.SucceededTask({ taskId: 1 }))

      const outcome = yield* RunTask.Interrupt(
        { taskId: 1 },
        outcome => outcome,
      ).effect.pipe(provideRegistry(registry))

      expect(outcome._tag).toBe('NotFound')
    }),
  )

  it.effect('only interrupts the holder of the derived key', () =>
    Effect.gen(function* () {
      const registry = __makeRegistry()
      const interruptedTaskIds: Array<number> = []

      const RunTask = Command.define('RunTask', {
        args: { taskId: Schema.Number },
        messages: [Message.SucceededTask],
        interrupt: {
          keyFields: ['taskId'],
          toKey: ({ taskId }) => String(taskId),
        },
        execute: ({ taskId }) =>
          Effect.onInterrupt(
            Effect.as(Effect.never, Message.SucceededTask({ taskId })),
            () =>
              Effect.sync(() => {
                interruptedTaskIds.push(taskId)
              }),
          ),
      })

      const firstFiber = yield* Effect.forkChild(
        RunTask({ taskId: 1 }).effect.pipe(provideRegistry(registry)),
      )
      const secondFiber = yield* Effect.forkChild(
        RunTask({ taskId: 2 }).effect.pipe(provideRegistry(registry)),
      )
      yield* Effect.yieldNow

      const outcome = yield* RunTask.Interrupt(
        { taskId: 2 },
        outcome => outcome,
      ).effect.pipe(provideRegistry(registry))

      expect(outcome._tag).toBe('Interrupted')
      expect(interruptedTaskIds).toEqual([2])
      expect(Array.isReadonlyArrayNonEmpty(registry.lookup('RunTask:1'))).toBe(
        true,
      )
      expect(Array.isReadonlyArrayEmpty(registry.lookup('RunTask:2'))).toBe(
        true,
      )

      yield* Fiber.interrupt(firstFiber)
      yield* Fiber.await(secondFiber)
    }),
  )

  it.effect(
    'same-key invocations run concurrently and Interrupt stops every holder',
    () =>
      Effect.gen(function* () {
        const registry = __makeRegistry()
        const events: Array<string> = []
        let runCount = 0

        const Watch = Command.define('Watch', {
          messages: [Message.CompletedWork],
          interrupt: true,
          execute: Effect.suspend(() => {
            runCount = runCount + 1
            const runId = runCount
            events.push(`started:${runId}`)
            return Effect.onInterrupt(
              Effect.as(Effect.never, Message.CompletedWork()),
              () =>
                Effect.sync(() => {
                  events.push(`interrupted:${runId}`)
                }),
            )
          }),
        })

        const firstFiber = yield* Effect.forkChild(
          Watch().effect.pipe(provideRegistry(registry)),
        )
        const secondFiber = yield* Effect.forkChild(
          Watch().effect.pipe(provideRegistry(registry)),
        )
        yield* Effect.yieldNow

        expect(events).toEqual(['started:1', 'started:2'])
        expect(registry.lookup('Watch')).toHaveLength(2)

        const outcome = yield* Watch.Interrupt(outcome => outcome).effect.pipe(
          provideRegistry(registry),
        )

        expect(outcome._tag).toBe('Interrupted')
        expect(events).toEqual([
          'started:1',
          'started:2',
          'interrupted:1',
          'interrupted:2',
        ])
        expect(Array.isReadonlyArrayEmpty(registry.lookup('Watch'))).toBe(true)

        yield* Fiber.await(firstFiber)
        yield* Fiber.await(secondFiber)
      }),
  )

  it.effect('releases the key when the Effect fails', () =>
    Effect.gen(function* () {
      const registry = __makeRegistry()

      const FailingTask = Command.define('FailingTask', {
        messages: [Message.CompletedWork],
        interrupt: true,
        execute: Effect.flatMap(Effect.fail('boom'), () =>
          Effect.succeed(Message.CompletedWork()),
        ),
      })

      const exit = yield* Effect.exit(
        FailingTask().effect.pipe(provideRegistry(registry)),
      )

      expect(exit._tag).toBe('Failure')
      expect(Array.isReadonlyArrayEmpty(registry.lookup('FailingTask'))).toBe(
        true,
      )
    }),
  )
})

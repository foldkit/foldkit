import { Array, Effect, Fiber, Layer, Schema } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Command from '../index.js'
import { __CurrentRegistry, type __Registry, __makeRegistry } from './index.js'

const Message = defineMessageUnion({
  CompletedWork: {},
  SucceededTask: { taskId: Schema.Number },
})
type Message = typeof Message.Type

const provideRegistry =
  (registry: __Registry) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.provideService(effect, __CurrentRegistry, registry)

describe('interruptible Command.define', () => {
  it.effect(
    'selects the same key fields for owned and unowned invocation and interruption',
    () =>
      Effect.gen(function* () {
        const registry = __makeRegistry()
        const Definition = Block.makeDefinition('SelectedTaskFields', {
          Model: Schema.Struct({}),
          Message,
        })
        const Args = Schema.Struct({
          taskId: Schema.NumberFromString,
          label: Schema.String,
          revision: Schema.Number,
        })
        type Args = typeof Args.Type
        const KeyArgs = Schema.Struct({
          taskId: Args.fields.taskId,
          label: Args.fields.label,
        })
        type KeyArgs = typeof KeyArgs.Type
        const OwnedHost = Definition.makeCommand('OwnedHost', {
          args: Args.fields,
          messages: [Message.SucceededTask],
          interrupt: {
            keyFields: ['label', 'taskId'],
            toKey: keyArgs => JSON.stringify(keyArgs),
          },
        })
        const OwnedAttached = Definition.makeCommand('OwnedAttached', {
          args: Args.fields,
          messages: [Message.SucceededTask],
          handler: function* () {
            return ({ taskId }) =>
              Effect.as(Effect.never, Message.SucceededTask({ taskId }))
          },
          interrupt: {
            keyFields: ['label', 'taskId'],
            toKey: keyArgs => JSON.stringify(keyArgs),
          },
        })
        const UnownedHost = Command.define('SelectedFieldsHost', {
          args: Args.fields,
          messages: [Message.SucceededTask],
          interrupt: {
            keyFields: ['label', 'taskId'],
            toKey: keyArgs => JSON.stringify(keyArgs),
          },
        })
        const UnownedAttached = Command.define('SelectedFieldsAttached', {
          args: Args.fields,
          messages: [Message.SucceededTask],
          handler: function* () {
            return ({ taskId }) =>
              Effect.as(Effect.never, Message.SucceededTask({ taskId }))
          },
          interrupt: {
            keyFields: ['label', 'taskId'],
            toKey: keyArgs => JSON.stringify(keyArgs),
          },
        })
        const EffectsLayer = Layer.mergeAll(
          OwnedHost.toLayer(
            Effect.succeed(({ taskId }) =>
              Effect.as(Effect.never, Message.SucceededTask({ taskId })),
            ),
          ),
          OwnedAttached.layer,
          UnownedHost.toLayer(
            Effect.succeed(({ taskId }) =>
              Effect.as(Effect.never, Message.SucceededTask({ taskId })),
            ),
          ),
          UnownedAttached.layer,
        )
        const args = { taskId: 7, revision: 3, label: 'seven' }
        const keyArgs = { taskId: 7, label: 'seven' }
        const decodedKeyArgs = yield* Schema.decodeUnknownEffect(KeyArgs)({
          taskId: '7',
          label: 'seven',
          revision: 3,
        })
        expect(decodedKeyArgs).toEqual(keyArgs)

        for (const definition of [
          OwnedHost,
          OwnedAttached,
          UnownedHost,
          UnownedAttached,
        ]) {
          const instance = definition(args)
          const interrupt = definition.Interrupt(keyArgs, outcome => outcome)
          const decodedInterrupt = definition.Interrupt(
            decodedKeyArgs,
            outcome => outcome,
          )
          expect(instance.args).toBe(args)
          expect(interrupt.args).toBe(keyArgs)
          expect(decodedInterrupt.args).toBe(decodedKeyArgs)
          expect(instance.key).toBe(
            `${definition.name}:{"label":"seven","taskId":7}`,
          )
          expect(interrupt.interruptsKey).toBe(instance.key)
          expect(decodedInterrupt.interruptsKey).toBe(instance.key)

          const execution: Effect.Effect<
            typeof Message.SucceededTask.Type,
            never,
            Layer.Success<typeof EffectsLayer>
          > = instance.effect
          const fiber = yield* Effect.forkChild(
            execution.pipe(
              Effect.provide(EffectsLayer),
              provideRegistry(registry),
            ),
          )
          yield* Effect.yieldNow
          const outcome = yield* decodedInterrupt.effect.pipe(
            provideRegistry(registry),
          )
          expect(outcome._tag).toBe('Interrupted')
          expect((yield* Fiber.await(fiber))._tag).toBe('Failure')
        }
      }),
  )

  it('omits unselected optional properties before deriving either key', () => {
    const Args = Schema.Struct({
      taskId: Schema.Number,
      revision: Schema.Number,
    })
    type Args = typeof Args.Type
    const OptionalRevision = Schema.Struct({
      taskId: Schema.Number,
      revision: Schema.optionalKey(Schema.Number),
    })
    type OptionalRevision = typeof OptionalRevision.Type
    const RunTask = Command.define('OptionalSelectedTask', {
      args: Args.fields,
      messages: [Message.SucceededTask],
      interrupt: {
        keyFields: ['taskId'],
        toKey: (keyArgs: OptionalRevision) =>
          `${keyArgs.taskId}:${keyArgs.revision}`,
      },
    })
    const args = { taskId: 7, revision: 3 }
    const instance = RunTask(args)
    const interrupt = RunTask.Interrupt(args, outcome => outcome)
    expect(instance.key).toBe('OptionalSelectedTask:7:undefined')
    expect(interrupt.interruptsKey).toBe(instance.key)
  })

  it('omits inherited selected fields from ordinary and null-prototype args', () => {
    const Args = Schema.Struct({
      taskId: Schema.Number,
      constructor: Schema.optionalKey(Schema.String),
      toString: Schema.optionalKey(Schema.String),
    })
    type Args = typeof Args.Type
    const RunTask = Command.define('OwnSelectedTask', {
      args: Args.fields,
      messages: [Message.SucceededTask],
      interrupt: {
        keyFields: ['taskId', 'constructor', 'toString'],
        toKey: keyArgs => {
          expect(Object.getPrototypeOf(keyArgs)).toBeNull()
          return `${keyArgs.taskId}:${keyArgs.constructor ?? 'Missing'}:${keyArgs.toString ?? 'Missing'}`
        },
      },
    })
    const decodeArgs = () => {
      const input = { taskId: 7 }
      Object.setPrototypeOf(input, null)
      return Schema.decodeUnknownSync(Args)(input)
    }
    const ordinaryArgs = decodeArgs()
    Object.setPrototypeOf(ordinaryArgs, Object.prototype)
    const nullPrototypeArgs = decodeArgs()
    Object.setPrototypeOf(nullPrototypeArgs, null)
    const inheritedArgs = decodeArgs()
    Object.setPrototypeOf(inheritedArgs, {
      constructor: 'InheritedConstructor',
      toString: 'InheritedToString',
    })

    for (const args of [ordinaryArgs, nullPrototypeArgs, inheritedArgs]) {
      const instance = RunTask(args)
      const interrupt = RunTask.Interrupt(args, outcome => outcome)
      expect(instance.args).toBe(args)
      expect(interrupt.args).toBe(args)
      expect(instance.key).toBe('OwnSelectedTask:7:Missing:Missing')
      expect(interrupt.interruptsKey).toBe(instance.key)
    }

    const ownArgs = {
      taskId: 7,
      constructor: 'OwnConstructor',
      toString: 'OwnToString',
    }
    const instance = RunTask(ownArgs)
    const interrupt = RunTask.Interrupt(ownArgs, outcome => outcome)
    expect(instance.key).toBe('OwnSelectedTask:7:OwnConstructor:OwnToString')
    expect(interrupt.interruptsKey).toBe(instance.key)
  })

  it('derives the key from args at construction, prefixed by the Command name', () => {
    const RunTask = Command.define('RunTask', {
      args: { taskId: Schema.Number, label: Schema.String },
      messages: [Message.SucceededTask],
      interrupt: {
        keyFields: ['taskId'],
        toKey: ({ taskId }) => taskId.toString(),
      },
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
          handler: function* () {
            return ({ taskId }) =>
              Effect.as(Effect.never, Message.SucceededTask({ taskId }))
          },
        })

        const fiber = yield* Effect.forkChild(
          SaveDraft({ taskId: 7 }).effect.pipe(
            provideRegistry(registry),
            Effect.provide(SaveDraft.layer),
          ),
        )
        yield* Effect.yieldNow

        expect(
          Array.isReadonlyArrayNonEmpty(registry.lookup('SaveDraft')),
        ).toBe(true)

        const outcome = yield* SaveDraft.Interrupt(
          outcome => outcome,
        ).effect.pipe(
          provideRegistry(registry),
          Effect.provide(SaveDraft.layer),
        )

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
          handler: function* () {
            return ({ taskId }) =>
              Effect.succeed(Message.SucceededTask({ taskId }))
          },
        })

        const message = yield* SaveDraft({ taskId: 7 }).effect.pipe(
          provideRegistry(registry),
          Effect.provide(SaveDraft.layer),
        )
        expect(message).toEqual(Message.SucceededTask({ taskId: 7 }))

        const outcome = yield* SaveDraft.Interrupt(
          outcome => outcome,
        ).effect.pipe(
          provideRegistry(registry),
          Effect.provide(SaveDraft.layer),
        )

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
          handler: function* () {
            return () => Effect.die('boom')
          },
        })

        const exit = yield* Effect.exit(
          SaveDraft({ taskId: 7 }).effect.pipe(
            provideRegistry(registry),
            Effect.provide(SaveDraft.layer),
          ),
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
        handler: function* () {
          return () => Effect.as(Effect.never, Message.CompletedWork())
        },
      })

      const fiber = yield* Effect.forkChild(
        RunForever().effect.pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              didProduceResult = true
            }),
          ),
          provideRegistry(registry),
          Effect.provide(RunForever.layer),
        ),
      )
      yield* Effect.yieldNow

      expect(Array.isReadonlyArrayNonEmpty(registry.lookup('RunForever'))).toBe(
        true,
      )

      const outcome = yield* RunForever.Interrupt(
        outcome => outcome,
      ).effect.pipe(provideRegistry(registry), Effect.provide(RunForever.layer))

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
        handler: function* () {
          return () => Effect.as(Effect.never, Message.CompletedWork())
        },
      })

      const outcome = yield* RunForever.Interrupt(
        outcome => outcome,
      ).effect.pipe(provideRegistry(registry), Effect.provide(RunForever.layer))

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
        handler: function* () {
          return ({ taskId }) =>
            Effect.succeed(Message.SucceededTask({ taskId }))
        },
      })

      const message = yield* RunTask({ taskId: 1 }).effect.pipe(
        provideRegistry(registry),
        Effect.provide(RunTask.layer),
      )
      expect(message).toEqual(Message.SucceededTask({ taskId: 1 }))

      const outcome = yield* RunTask.Interrupt(
        { taskId: 1 },
        outcome => outcome,
      ).effect.pipe(provideRegistry(registry), Effect.provide(RunTask.layer))

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
        handler: function* () {
          return ({ taskId }) =>
            Effect.onInterrupt(
              Effect.as(Effect.never, Message.SucceededTask({ taskId })),
              () =>
                Effect.sync(() => {
                  interruptedTaskIds.push(taskId)
                }),
            )
        },
      })

      const firstFiber = yield* Effect.forkChild(
        RunTask({ taskId: 1 }).effect.pipe(
          provideRegistry(registry),
          Effect.provide(RunTask.layer),
        ),
      )
      const secondFiber = yield* Effect.forkChild(
        RunTask({ taskId: 2 }).effect.pipe(
          provideRegistry(registry),
          Effect.provide(RunTask.layer),
        ),
      )
      yield* Effect.yieldNow

      const outcome = yield* RunTask.Interrupt(
        { taskId: 2 },
        outcome => outcome,
      ).effect.pipe(provideRegistry(registry), Effect.provide(RunTask.layer))

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
          handler: function* () {
            return () =>
              Effect.suspend(() => {
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
              })
          },
        })

        const firstFiber = yield* Effect.forkChild(
          Watch().effect.pipe(
            provideRegistry(registry),
            Effect.provide(Watch.layer),
          ),
        )
        const secondFiber = yield* Effect.forkChild(
          Watch().effect.pipe(
            provideRegistry(registry),
            Effect.provide(Watch.layer),
          ),
        )
        yield* Effect.yieldNow

        expect(events).toEqual(['started:1', 'started:2'])
        expect(registry.lookup('Watch')).toHaveLength(2)

        const outcome = yield* Watch.Interrupt(outcome => outcome).effect.pipe(
          provideRegistry(registry),
          Effect.provide(Watch.layer),
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
        handler: function* () {
          return () => Effect.die('boom')
        },
      })

      const exit = yield* Effect.exit(
        FailingTask().effect.pipe(
          provideRegistry(registry),
          Effect.provide(FailingTask.layer),
        ),
      )

      expect(exit._tag).toBe('Failure')
      expect(Array.isReadonlyArrayEmpty(registry.lookup('FailingTask'))).toBe(
        true,
      )
    }),
  )
})

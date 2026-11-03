import {
  Array,
  Cause,
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  Scope,
  Stream,
} from 'effect'
import { expect, vi } from 'vitest'

import { it } from '@effect/vitest'

import { qualifyLayer } from '../../../block/scope.js'
import { acquisitionOf } from '../../../experimental/constructed/symbolic.js'
import { makeCompositionRuntime } from '../../../runtime/compositionRuntime.js'
import * as Scene from '../../../scene/public.js'
import * as Story from '../../../story/public.js'
import { ApplicationBlock } from './block.js'
import {
  Message as CounterMessage,
  CounterSource,
  ReadCount,
  initializationCounts,
} from './counter.js'
import { Message, Model } from './definition.js'

it.effect(
  'initializes a created child before later operations and ready Model reads',
  () =>
    Story.withBlock(ApplicationBlock, executable => {
      initializationCounts.length = 0
      const initial = executable.init([])
      expect(initializationCounts).toEqual([])

      const added = executable.update(
        initial.model,
        Message.ClickedAddAndIncrement({ key: 'first', count: 4 }),
      )

      expect(initializationCounts).toEqual([4])
      expect(added.model.summary).toBe(5)
      expect(added.model.lastChangedCount).toBe(5)
      expect(added.model.counters).toEqual([
        { key: 'first', model: { count: 5 } },
      ])
      expect(Schema.is(Model)(added.model)).toBe(true)
      expect(added.commands).toMatchObject([
        { name: 'OccurrenceCounter["first"]/ReadCount' },
      ])
      expect(Option.isSome(Array.head(added.model.counters))).toBe(true)
    }),
)

it.effect(
  'renders a ready created child through the registered view graph',
  () =>
    Story.withBlock(ApplicationBlock, executable => {
      const initial = executable.init([])
      const added = executable.update(
        initial.model,
        Message.ClickedAddAndIncrement({ key: 'first', count: 4 }),
      )

      Scene.scene(
        { update: executable.update, view: executable.view },
        Scene.given(added.model),
        Scene.expect(Scene.role('status')).toHaveText('Count: 5'),
      )
    }),
)

it.effect(
  'routes an initialization Command result to the created occurrence',
  () =>
    Story.story(
      ApplicationBlock,
      Story.init([]),
      Story.message(Message.ClickedAddCounter({ key: 'first', count: 4 })),
      Story.Command.resolve(
        ReadCount,
        CounterMessage.CompletedReadCount({ count: 9 }),
      ),
      Story.model(model =>
        expect(model.counters).toEqual([{ key: 'first', model: { count: 9 } }]),
      ),
      Story.Command.expectNone(),
    ),
)

it.effect(
  'starts and retires occurrence Subscriptions and rejects retired Command origins',
  () =>
    Effect.gen(function* () {
      const events: Array<string> = []
      const crashes: Array<string> = []
      const services = Layer.succeed(CounterSource, {
        read: (count: number) => Effect.succeed(count),
        changes: Stream.callback<number>(() =>
          Effect.acquireRelease(
            Effect.sync(() => events.push('started')),
            () => Effect.sync(() => events.push('stopped')),
          ).pipe(Effect.andThen(Effect.never)),
        ),
      })

      yield* Effect.scoped(
        Effect.gen(function* () {
          const executable = yield* ApplicationBlock.get
          const implementation = acquisitionOf(executable).block
          const EffectsLayer: typeof executable.EffectsLayer =
            implementation.EffectsLayer
          const runtimeScope = yield* Scope.Scope
          const built = yield* Layer.build(
            qualifyLayer(implementation.owner.id, EffectsLayer).pipe(
              Layer.provideMerge(services),
            ),
          )
          const initial = executable.init([])
          const runtime = yield* makeCompositionRuntime<
            Model,
            typeof executable.Message.Type
          >({
            block: implementation,
            initModel: initial.model,
            context: Context.makeUnsafe<never>(built.mapUnsafe),
            runtimeScope,
            enqueueMessage: () => {},
            crashWith: cause =>
              Effect.sync(() => crashes.push(Cause.pretty(cause))),
            maybeSlowSubscriptionDependencies: Option.none(),
          })
          yield* runtime.start

          const added = executable.update(
            initial.model,
            Message.ClickedAddCounter({ key: 'first', count: 4 }),
          )
          expect(events).toEqual([])
          runtime.synchronize(added.model)
          yield* Effect.promise(() =>
            vi.waitFor(() => {
              expect(crashes).toEqual([])
              expect(events).toEqual(['started'])
            }),
          )

          const pending = Option.getOrThrow(Array.head(added.commands ?? []))
          const captured = runtime.capture(pending)

          if (captured === undefined) {
            throw new Error(
              'The initialized child Command lost its occurrence origin.',
            )
          }

          expect(captured.isCurrent()).toBe(true)
          const removed = executable.update(
            added.model,
            Message.ClickedRemoveCounter({ key: 'first' }),
          )
          runtime.synchronize(removed.model)
          expect(captured.isCurrent()).toBe(false)
          yield* Effect.promise(() =>
            vi.waitFor(() => expect(events).toEqual(['started', 'stopped'])),
          )

          const replacement = executable.update(
            removed.model,
            Message.ClickedAddCounter({ key: 'first', count: 7 }),
          )
          runtime.synchronize(replacement.model)
          yield* Effect.promise(() =>
            vi.waitFor(() =>
              expect(events).toEqual(['started', 'stopped', 'started']),
            ),
          )
          expect(captured.isCurrent()).toBe(false)
        }).pipe(Effect.provide(ApplicationBlock.layer)),
      )

      expect(events).toEqual(['started', 'stopped', 'started', 'stopped'])
    }),
)

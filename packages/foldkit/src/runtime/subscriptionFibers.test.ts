import {
  Array,
  Cause,
  Effect,
  Equivalence,
  Option,
  PubSub,
  Schema,
  Stream,
} from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import { forkSubscriptionFibers } from './subscriptionFibers.js'

const dependencyFields = { value: Schema.Number, label: Schema.String }
const Model = Schema.Struct(dependencyFields)
type Model = typeof Model.Type
const Dependencies = Schema.Struct(dependencyFields)
type Dependencies = typeof Dependencies.Type

const Message = defineMessageUnion({
  ObservedValue: { value: Schema.Number },
})
type Message = typeof Message.Type

const initialModel: Model = { value: 0, label: 'Initial' }

const runSubscriptions = (
  subscriptions: Subscription.Subscriptions<Model, Message>,
  run: (
    publishModel: (model: Model) => void,
    crashes: ReadonlyArray<Cause.Cause<never>>,
  ) => Promise<void>,
): Promise<Array<Cause.Cause<never>>> =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const runtimeScope = yield* Effect.scope
        const modelPubSub = yield* PubSub.unbounded<Model>()
        const crashes: Array<Cause.Cause<never>> = []

        yield* forkSubscriptionFibers<Model, Message, never>({
          subscriptions,
          initModel: initialModel,
          modelPubSub,
          runtimeScope,
          maybeSlowSubscriptionDependencies: Option.none(),
          enqueueMessageEffect: () => Effect.void,
          provideAllResources: effect => effect,
          crashWith: cause =>
            Effect.sync(() => {
              crashes.push(cause)
            }),
        })

        yield* Effect.promise(() =>
          run(model => {
            PubSub.publishUnsafe(modelPubSub, model)
          }, crashes),
        )

        return crashes
      }),
    ),
  )

const DefectPhase = Schema.Literals(['Projection', 'Equivalence'])
type DefectPhase = typeof DefectPhase.Type
const defectPhases: ReadonlyArray<DefectPhase> = ['Projection', 'Equivalence']
const RESTART_DISTANCE = 3

describe('Subscription dependency following', () => {
  it('compares against emitted dependencies while exposing every projected value', async () => {
    const startedValues: Array<number> = []
    const releasedValues: Array<number> = []
    let readLatest: (() => Dependencies) | undefined
    const subscriptions = Subscription.make<Model, Message>()(entry => ({
      observed: entry(dependencyFields, {
        modelToDependencies: model => model,
        keepAliveEquivalence: Equivalence.make<Dependencies>(
          (next, previous) =>
            Math.abs(next.value - previous.value) < RESTART_DISTANCE,
        ),
        dependenciesToStream: ({ value }, readDependencies) => {
          readLatest = readDependencies
          return Stream.fromEffect(
            Effect.sync(() => {
              startedValues.push(value)
              return Message.ObservedValue({ value })
            }),
          ).pipe(
            Stream.concat(Stream.never),
            Stream.ensuring(
              Effect.sync(() => {
                releasedValues.push(value)
              }),
            ),
          )
        },
      }),
    }))

    const crashes = await runSubscriptions(
      subscriptions,
      async publishModel => {
        await vi.waitFor(() => {
          expect(startedValues).toEqual([0])
        })

        const firstModel = modifyFields(initialModel, {
          value: () => 1,
          label: () => 'First',
        })
        publishModel(firstModel)
        await vi.waitFor(() => {
          expect(readLatest?.()).toEqual(firstModel)
        })
        expect(startedValues).toEqual([0])

        const secondModel = modifyFields(firstModel, {
          value: () => 2,
          label: () => 'Second',
        })
        publishModel(secondModel)
        await vi.waitFor(() => {
          expect(readLatest?.()).toEqual(secondModel)
        })
        expect(startedValues).toEqual([0])

        const thirdModel = modifyFields(secondModel, {
          value: () => RESTART_DISTANCE,
          label: () => 'Third',
        })
        publishModel(thirdModel)
        await vi.waitFor(() => {
          expect(startedValues).toEqual([0, RESTART_DISTANCE])
          expect(readLatest?.()).toEqual(thirdModel)
          expect(releasedValues).toEqual([0])
        })
      },
    )

    expect(crashes).toEqual([])
    expect(releasedValues).toEqual([0, RESTART_DISTANCE])
  })

  it('passes new dependencies before the last emitted dependencies to equivalence', async () => {
    const startedValues: Array<number> = []
    let readLatest: (() => Dependencies) | undefined
    const subscriptions = Subscription.make<Model, Message>()(entry => ({
      observed: entry(dependencyFields, {
        modelToDependencies: model => model,
        keepAliveEquivalence: Equivalence.make<Dependencies>(
          (next, previous) => next.value <= previous.value,
        ),
        dependenciesToStream: ({ value }, readDependencies) => {
          readLatest = readDependencies
          startedValues.push(value)
          return Stream.never
        },
      }),
    }))

    const crashes = await runSubscriptions(
      subscriptions,
      async publishModel => {
        await vi.waitFor(() => {
          expect(startedValues).toEqual([0])
        })

        publishModel(modifyFields(initialModel, { value: () => 1 }))
        await vi.waitFor(() => {
          expect(startedValues).toEqual([0, 1])
        })

        publishModel(initialModel)
        await vi.waitFor(() => {
          expect(readLatest?.()).toEqual(initialModel)
        })
        expect(startedValues).toEqual([0, 1])
      },
    )

    expect(crashes).toEqual([])
  })

  it.each(defectPhases)('reports a defect in %s', async phase => {
    const defect = new Error(`${phase} failed`)
    let isStreamStarted = false
    const subscriptions = Subscription.make<Model, Message>()(entry => ({
      observed: entry(dependencyFields, {
        modelToDependencies: model => {
          if (phase === 'Projection' && model.value !== 0) {
            throw defect
          }

          return model
        },
        keepAliveEquivalence: Equivalence.make<Dependencies>(
          (next, previous) => {
            if (phase === 'Equivalence') {
              throw defect
            }

            return next.value === previous.value
          },
        ),
        dependenciesToStream: () => {
          isStreamStarted = true
          return Stream.never
        },
      }),
    }))

    const crashes = await runSubscriptions(
      subscriptions,
      async (publishModel, crashes) => {
        await vi.waitFor(() => {
          expect(isStreamStarted).toBe(true)
        })

        publishModel(modifyFields(initialModel, { value: () => 1 }))
        await vi.waitFor(() => {
          expect(Cause.squash(Option.getOrThrow(Array.head(crashes)))).toBe(
            defect,
          )
        })
      },
    )

    expect(crashes).toHaveLength(1)
  })
})

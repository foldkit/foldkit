import { Context, Effect, Layer, Schema, Stream } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import { Block, runtimeBlockOf } from './block.js'
import { constructSync, makeGraph, update } from './engine.js'

class Inspected extends Block<Inspected>()('Application', {
  Model: Schema.Struct({ route: Schema.String }),
}) {}

const InspectedLive = Inspected.make(
  Effect.fn(function* () {
    return { model: { route: 'home' } }
  }),
)

const InspectorMessage = defineMessageUnion({
  ReceivedInspectedModel: { inspected: Schema.Unknown },
})

class Inspector extends Block<Inspector>()('Application', {
  Model: Schema.Struct({ isPaused: Schema.Boolean, inspected: Schema.Unknown }),
  Message: InspectorMessage,
}) {}

const dependencyInputs: Array<unknown> = []

const InspectorLive = Inspector.make(
  Effect.fn(function* () {
    return {
      model: { isPaused: false, inspected: undefined },
      update: {
        ReceivedInspectedModel: (model, { inspected }) => ({
          model: { ...model, inspected },
        }),
      },
      subscriptions: {
        frames: {
          dependencies: model => {
            dependencyInputs.push(model)
            return model.isPaused
          },
          stream: () => Stream.empty,
        },
      },
    }
  }),
)

const contextOf = <A>(layer: Layer.Layer<A>): Context.Context<never> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  Effect.runSync(Effect.scoped(Layer.build(layer))) as Context.Context<never>

describe('a Model holding another program instance', () => {
  it('reconciles only its own instances', () => {
    const inspectedGraph = makeGraph({ isSimulation: true })
    const inspectedBlock = runtimeBlockOf(Inspected)
    const inspectedRoot = constructSync(
      inspectedGraph,
      inspectedBlock,
      [],
      inspectedBlock.id,
      undefined,
      contextOf(InspectedLive),
    )

    const inspectorGraph = makeGraph({ isSimulation: false })
    const inspectorBlock = runtimeBlockOf(Inspector)
    const inspectorRoot = constructSync(
      inspectorGraph,
      inspectorBlock,
      [],
      inspectorBlock.id,
      undefined,
      contextOf(InspectorLive),
    )

    dependencyInputs.length = 0
    const result = update(
      inspectorGraph,
      inspectorRoot,
      Inspector.Message.ReceivedInspectedModel({ inspected: inspectedRoot }),
    )

    expect(result.instance.model).toMatchObject({ inspected: inspectedRoot })
    expect(dependencyInputs).toEqual([result.instance.model])
  })
})

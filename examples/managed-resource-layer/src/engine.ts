import {
  Cause,
  Context,
  Crypto,
  Effect,
  Exit,
  Layer,
  RcMap,
  Schema,
  Stream,
} from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export interface ComputeEngine {
  readonly engineId: string
  readonly square: (value: number) => number
}

export class ComputeEngineService extends Context.Service<
  ComputeEngineService,
  ComputeEngine
>()('ComputeEngineService') {}

export const ComputeEngineLayer: Layer.Layer<
  ComputeEngineService,
  never,
  Crypto.Crypto
> = Layer.effect(
  ComputeEngineService,
  Effect.acquireRelease(
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const id = yield* Effect.orDie(crypto.randomUUIDv4)
      const engineId = `engine-${id.slice(0, 8)}`
      return { engineId, square: value => value * value }
    }),
    ({ engineId }) => Effect.log(`Tore down ${engineId}`),
  ),
)

export class ComputeEngines extends Context.Service<
  ComputeEngines,
  RcMap.RcMap<string, ComputeEngine>
>()('ComputeEngines') {}

export const makeComputeEnginesLayer = <R>(
  engineLayer: Layer.Layer<ComputeEngineService, never, R>,
): Layer.Layer<ComputeEngines, never, R> =>
  Layer.effect(
    ComputeEngines,
    RcMap.make({
      lookup: (_engineKey: string) =>
        Layer.build(engineLayer).pipe(
          Effect.map(context => Context.get(context, ComputeEngineService)),
        ),
    }),
  )

export const ComputeEnginesLive = makeComputeEnginesLayer(ComputeEngineLayer)

const Model = Schema.Struct({
  engineKey: Schema.String,
})

const Message = defineMessageUnion({
  SucceededBootEngine: { engineId: Schema.String },
  FailedBootEngine: { reason: Schema.String },
})

const OutMessage = defineMessageUnion({
  Started: { engineId: Schema.String },
  FailedStart: { reason: Schema.String },
})

export class Engine extends Block<Engine>()('Engine', {
  Model,
  Message,
  OutMessage,
}) {}

export const EngineLive = Engine.toLayer(
  Effect.gen(function* () {
    const engines = yield* ComputeEngines

    return {
      init: (_, { id }) => ({ engineKey: id }),

      update: {
        SucceededBootEngine: (model, { engineId }) => ({
          model,
          outMessage: Engine.OutMessage.Started({ engineId }),
        }),
        FailedBootEngine: (model, { reason }) => ({
          model,
          outMessage: Engine.OutMessage.FailedStart({ reason }),
        }),
      },

      subscriptions: {
        engine: {
          dependencies: model => model.engineKey,
          stream: (engineKey: string) =>
            Stream.fromEffect(
              RcMap.get(engines, engineKey).pipe(
                Effect.exit,
                Effect.map(
                  Exit.match({
                    onSuccess: ({ engineId }) =>
                      Engine.Message.SucceededBootEngine({ engineId }),
                    onFailure: cause =>
                      Engine.Message.FailedBootEngine({
                        reason: String(Cause.squash(cause)),
                      }),
                  }),
                ),
              ),
            ).pipe(Stream.concat(Stream.never), Stream.scoped),
        },
      },
    }
  }),
)

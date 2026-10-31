import { Cause, Context, Crypto, Effect, Exit, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
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

const Message = defineMessageUnion({
  SucceededBootEngine: { engineId: Schema.String },
  FailedBootEngine: { reason: Schema.String },
})

const OutMessage = defineMessageUnion({
  Started: { engineId: Schema.String },
  FailedStart: { reason: Schema.String },
})

export const BootEngine = Command.define('BootEngine', {
  messages: [Message.SucceededBootEngine, Message.FailedBootEngine],
})

export class Engine extends Block<
  Engine,
  void,
  void,
  Effect.Effect<ComputeEngine>
>()('Engine', {
  Message,
  OutMessage,
  Command: [BootEngine],
}) {}

export const makeEngineLive = <R>(
  engineLayer: Layer.Layer<ComputeEngineService, never, R>,
) =>
  Engine.make(
    Effect.fn(function* () {
      const engineExit = yield* Layer.build(engineLayer).pipe(
        Effect.map(context => Context.get(context, ComputeEngineService)),
        Effect.exit,
      )

      return {
        start: [BootEngine()],

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

        commands: {
          BootEngine: () =>
            Effect.succeed(
              Exit.match(engineExit, {
                onSuccess: ({ engineId }) =>
                  Engine.Message.SucceededBootEngine({ engineId }),
                onFailure: cause =>
                  Engine.Message.FailedBootEngine({
                    reason: String(Cause.squash(cause)),
                  }),
              }),
            ),
        },

        expose: engineExit,
      }
    }),
  )

export const EngineLive = makeEngineLive(ComputeEngineLayer)

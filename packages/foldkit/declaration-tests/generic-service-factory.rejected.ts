import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'

import { LoaderBlock, loader } from './generic-service-factory.accepted.js'

const Message = defineMessageUnion({
  CompletedLoad: { value: Schema.String },
})
const Definition = Block.makeDefinition('RejectedGenericServiceLoader', {
  Model: Schema.Struct({}),
  Message,
})
const Forbidden = Definition.makeCommand('Forbidden', {
  messages: [Message.CompletedLoad],
})

loader.Load.toLayer(
  // @ts-expect-error Command handlers are unavailable while another handler is constructed.
  Effect.gen(function* () {
    yield* Forbidden().effect

    return () =>
      Effect.succeed(loader.Message.CompletedLoad({ value: 'Ready' }))
  }),
)

export const makeHiddenGenericLoader = <
  Id,
  Client extends Readonly<{ load: Effect.Effect<string> }>,
>(
  Client: Context.Key<Id, Client>,
) =>
  Definition.makeCommand('Load', {
    messages: [Message.CompletedLoad],
    // @ts-expect-error An unresolved Service identifier cannot prove that it excludes placement capabilities.
    handler: function* () {
      const client = yield* Client

      return () =>
        Effect.map(client.load, value => Message.CompletedLoad({ value }))
    },
  })

const GenericMessage = defineMessageUnion({
  RequestedLoad: {},
  CompletedLoad: {},
})
const GenericDefinition = Block.makeDefinition('GenericBlockRequirement', {
  Model: Schema.Struct({}),
  Message: GenericMessage,
})
const GenericLoad = GenericDefinition.makeCommand('Load', {
  messages: [GenericMessage.CompletedLoad],
})
const GenericComposition = GenericDefinition.makeComposition()
const genericInit = GenericComposition.makeInit(() => ({ model: {} }))
const genericUpdate = GenericComposition.makeUpdate({
  RequestedLoad: model => ({ model, commands: [GenericLoad()] }),
  CompletedLoad: model => ({ model }),
})

export const assembleWithUnresolvedRequirements = <Id>(
  EffectsLayer: Layer.Layer<Command.HandlerOf<typeof GenericLoad>, never, Id>,
) => {
  const prepare = () =>
    // @ts-expect-error Unresolved generic requirements cannot prove a precise completed Block.
    GenericComposition.prepareBlock({
      init: genericInit,
      update: genericUpdate,
      EffectsLayer,
    })

  // @ts-expect-error A rejected generic preparation cannot be assembled as a completed Block.
  return Block.assemble(prepare)
}

// @ts-expect-error The exact StatusClient requirement must be provided before the Layer can run.
Effect.runPromise(Effect.scoped(Layer.build(LoaderBlock.EffectsLayer)))

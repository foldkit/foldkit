import { Effect, Layer, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const PinsModel = Schema.Struct({ count: Schema.Number })
type PinsModel = typeof PinsModel.Type

const PinsMessage = defineMessageUnion({
  CompletedReadPins: { count: Schema.Number },
  ObservedPins: { count: Schema.Number },
})
type PinsMessage = typeof PinsMessage.Type

const PinsInMessage = defineMessageUnion({ RequestedReadPins: {} })
type PinsInMessage = typeof PinsInMessage.Type

const PinsKey = Symbol('Pins')

const PinsDefinition = Block.makeDefinition('Pins', {
  key: PinsKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },

  Model: PinsModel,
  Message: PinsMessage,
  InMessage: PinsInMessage,
})

export const ReadPins = PinsDefinition.makeCommand('ReadPins', {
  messages: [PinsMessage.CompletedReadPins],
  handler: function* () {
    return () => Effect.succeed(PinsMessage.CompletedReadPins({ count: 0 }))
  },
})

export const pinsSubscriptions = PinsDefinition.makeSubscriptions(entry => ({
  observations: entry('Observations', {
    messages: [PinsMessage.ObservedPins],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))

const PinsComposition = PinsDefinition.makeComposition()
export const PinsBlock = PinsDefinition.contract

export const PinsImplementation = PinsDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init: PinsComposition.makeInit(() => ({ model: { count: 0 } })),
      update: PinsComposition.makeUpdate({
        CompletedReadPins: (model, { count }) => ({
          model: modifyFields(model, { count: () => count }),
        }),
        ObservedPins: (model, { count }) => ({
          model: modifyFields(model, { count: () => count }),
        }),
      }),
      receive: PinsComposition.makeReceive({
        RequestedReadPins: model => ({ model, commands: [ReadPins()] }),
      }),
      view: PinsComposition.makeView((model, h) =>
        h.output([], [globalThis.String(model.count)]),
      ),
      subscriptions: pinsSubscriptions,
      EffectsLayer: Layer.merge(
        ReadPins.layer,
        pinsSubscriptions.observations.layer,
      ),
    }
  }),
)

export const layer = PinsImplementation.layer

const Model = Schema.Struct({ pins: PinsBlock.Model })
type Model = typeof Model.Type

export const Message = defineMessageUnion({ RequestedRefreshPins: {} })
export type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Document' },
  Model,
  Message,
})
const PinsBinding = ApplicationDefinition.makeBinding(PinsBlock, {
  field: 'pins',
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [PinsBinding],
})
export const init = ApplicationComposition.makeInit(() => ({ model: {} }))
export const update = ApplicationComposition.makeUpdate({
  RequestedRefreshPins: PinsBinding.requestReadPins(),
})
export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Pins',
  body: h.main(
    [],
    [h.block(PinsBinding.embedView({ slotId: 'pins', model: model.pins }))],
  ),
}))

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const pins = yield* PinsBinding

    return {
      children: [pins],
      init,
      update,
      view,
    }
  }),
).provide(layer)

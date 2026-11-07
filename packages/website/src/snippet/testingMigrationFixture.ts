import { Effect, Layer, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const PinsModel = Schema.Struct({ count: Schema.Number })
type PinsModel = typeof PinsModel.Type

const PinsMessage = defineMessageUnion({
  CompletedReadPins: { count: Schema.Number },
  ObservedPins: { count: Schema.Number },
})
type PinsMessage = typeof PinsMessage.Type

const PinsInMessage = defineInMessageUnion({ RequestedReadPins: {} })
type PinsInMessage = typeof PinsInMessage.Type

export const PinsKey = Symbol('Pins')
export const PinsBlock = Block.make('Pins', {
  key: PinsKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },

  Model: PinsModel,
  Message: PinsMessage,
  InMessage: PinsInMessage,
})

export const ReadPins = PinsBlock.makeCommand('ReadPins', {
  messages: [PinsMessage.CompletedReadPins],
  handler: function* () {
    return () => Effect.succeed(PinsMessage.CompletedReadPins({ count: 0 }))
  },
})

export const pinsSubscriptions = PinsBlock.makeSubscriptions(entry => ({
  observations: entry('Observations', {
    messages: [PinsMessage.ObservedPins],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))

const PinsComposition = PinsBlock.makeComposition()

export const PinsLayer = PinsBlock.makeLayer({
  init: PinsComposition.makeInit(() => ({ model: { count: 0 } })),
  update: PinsComposition.makeUpdate({
    CompletedReadPins: (model, { count }) => ({
      model: modifyFields(model, { count: () => count }),
    }),
    ObservedPins: (model, { count }) => ({
      model: modifyFields(model, { count: () => count }),
    }),
  }),
  inMessageUpdate: PinsComposition.makeInMessageUpdate({
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
})

const Model = Schema.Struct({ pins: PinsBlock.Model })
type Model = typeof Model.Type

export const Message = defineMessageUnion({ RequestedRefreshPins: {} })
export type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  Model,
  Message,
})
const PinsBinding = ApplicationBlock.makeRequiredFieldBinding(PinsBlock, {
  field: 'pins',
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
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

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(PinsLayer))

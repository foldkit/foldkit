import { Effect, Layer, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const PinsModel = Schema.Struct({ count: Schema.Number })
const PinsMessage = defineMessageUnion({
  RequestedReadPins: {},
  CompletedReadPins: { count: Schema.Number },
  ObservedPins: { count: Schema.Number },
})
const PinsDefinition = Block.makeDefinition('Pins', {
  Model: PinsModel,
  Message: PinsMessage,
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
const prepare = () =>
  PinsComposition.prepareBlock({
    init: PinsComposition.makeInit(() => ({ model: { count: 0 } })),
    update: PinsComposition.makeUpdate({
      RequestedReadPins: model => ({ model, commands: [ReadPins()] }),
      CompletedReadPins: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      ObservedPins: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
    }),
    view: PinsComposition.makeView((model, h) =>
      h.output([], [globalThis.String(model.count)]),
    ),
    subscriptions: pinsSubscriptions,
    operations: { requestReadPins: PinsMessage.RequestedReadPins },
    EffectsLayer: Layer.merge(
      ReadPins.layer,
      pinsSubscriptions.observations.layer,
    ),
  })
export const PinsBlock: Block.FromAssemblyWithView<
  typeof PinsModel,
  typeof prepare
> = Block.assemble(prepare)

const Model = Schema.Struct({ pins: PinsBlock.Model })
export const Message = defineMessageUnion({ RequestedRefreshPins: {} })
const ApplicationDefinition = Block.makeDefinition('Application', {
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

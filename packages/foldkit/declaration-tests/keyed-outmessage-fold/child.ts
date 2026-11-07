import { Effect, Schema } from 'effect'
import { Block, Message } from 'foldkit'

export const Choice = Schema.Literals(['Apple', 'Pear'])
export type Choice = typeof Choice.Type
export const ChildModel = Schema.Struct({ count: Schema.Number })
export type ChildModel = typeof ChildModel.Type
export const ChildMessage = Message.defineMessageUnion({
  ClickedChoose: { value: Choice },
  ClickedClose: {},
  CompletedObserve: {},
})
export type ChildMessage = typeof ChildMessage.Type
export const ChildOutMessage = Message.defineMessageUnion({
  Selected: { value: Choice },
  Closed: {},
})
export type ChildOutMessage = typeof ChildOutMessage.Type
export const ChildInMessage = Message.defineInMessageUnion({
  RequestedChoose: { value: Choice },
})
export type ChildInMessage = typeof ChildInMessage.Type
export const ChildKey = Symbol('KeyedFoldChild')
export const ChildBlock = Block.make('KeyedFoldChild', {
  key: ChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
  InMessage: ChildInMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedChoose: { outMessage: ChildOutMessage.Selected },
  },
})
export const Observe = ChildBlock.makeCommand('Observe', {
  messages: [ChildMessage.CompletedObserve],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedObserve())
  },
})
const composition = ChildBlock.makeComposition()
const choose = ChildBlock.makeStep(
  (model, { value }: typeof ChildMessage.ClickedChoose.Type) => ({
    model: { count: model.count + 1 },
    outMessage: ChildOutMessage.Selected({ value }),
  }),
)
export const childLayer = ChildBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: composition.makeInit(() => ({ model: { count: 0 } })),
    update: composition.makeUpdate({
      ClickedChoose: choose,
      ClickedClose: ChildBlock.makeOutMessageStep(() =>
        ChildOutMessage.Closed(),
      ),
      CompletedObserve: ChildBlock.makeNoopStep(),
    }),
    inMessageUpdate: composition.makeInMessageUpdate({
      RequestedChoose: (model, { value }) => ({
        model: { count: model.count + 1 },
        outMessage: ChildOutMessage.Selected({ value }),
      }),
    }),
    EffectsLayer: Observe.layer,
  }),
)

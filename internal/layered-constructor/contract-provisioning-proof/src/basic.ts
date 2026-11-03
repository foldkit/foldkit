import { Context, Effect, Layer, Schema } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class Send extends Context.Service<
  Send,
  Readonly<{ send: (text: string) => Effect.Effect<void> }>
>()('ContractedSend') {}

const Model = Schema.Struct({ text: Schema.String })
export const Message = defineMessageUnion({
  UpdatedText: { text: Schema.String },
  RequestedClear: {},
  SubmittedText: {},
  CompletedSend: {},
})
const OutMessage = defineMessageUnion({ Submitted: { text: Schema.String } })

export const ContractProofKey = Symbol('ContractProof')
export const Definition = Contracted.makeDefinition('ContractProof', {
  key: ContractProofKey,
  Model,
  Message,
  OutMessage,
  Init: Schema.Tuple([Schema.String]),
  view: { kind: 'Element' },
  operations: {
    clear: Message.RequestedClear,
    submit: {
      message: Message.SubmittedText,
      outMessage: OutMessage.Submitted,
    },
  },
})
export const Contract = Definition.contract
const Composition = Definition.makeComposition()
export const init = Composition.makeInit(text => ({ model: { text } }))
export const update = Composition.makeUpdate({
  UpdatedText: (model, { text }) => ({
    model: modifyFields(model, { text: () => text }),
  }),
  RequestedClear: Definition.makeFieldsStep(() => ({ text: () => '' })),
  SubmittedText: model => ({
    model,
    outMessage: OutMessage.Submitted({ text: model.text }),
  }),
  CompletedSend: Definition.makeNoopStep(),
})
export const view = Composition.makeView((model, h) => h.p([], [model.text]))
export const Block = Definition.makeBlock(
  Effect.succeed({ children: [], init, update, view }),
)

const ParentModel = Schema.Struct({
  child: Contract.Model,
  lastSubmitted: Schema.String,
})
export const ParentMessage = defineMessageUnion({
  ClickedClear: {},
  ClickedSend: { text: Schema.String },
  CompletedSend: {},
})
export const ContractProofParentKey = Symbol('ContractProofParent')
export const ParentDefinition = Contracted.makeDefinition(
  'ContractProofParent',
  {
    key: ContractProofParentKey,
    Model: ParentModel,
    Message: ParentMessage,
    Init: Schema.Tuple([]),
    view: { kind: 'Element' },
    effects: { services: [Send] },
  },
)
export const SendText = ParentDefinition.makeCommand('SendText', {
  args: { text: Schema.String },
  messages: [ParentMessage.CompletedSend],
  handler: function* () {
    const service = yield* Send

    return ({ text }) =>
      service.send(text).pipe(Effect.as(ParentMessage.CompletedSend()))
  },
})
export const ChildBinding = ParentDefinition.makeBinding(Contract, {
  field: 'child',
  init: { contextToArgs: () => ['Initial'] },
}).withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(Contract, {
    Submitted: ({ text }) =>
      ParentDefinition.makeCommandsStep(() => [SendText({ text })]),
  }),
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const clear = ChildBinding.clear()
export const parentInit = ParentComposition.makeInit(() => ({
  model: { lastSubmitted: '' },
}))
export const parentUpdate = ParentComposition.makeUpdate({
  ClickedClear: clear,
  ClickedSend: ParentDefinition.makeCommandsStep.fromMessage(({ text }) => [
    SendText({ text }),
  ]),
  CompletedSend: ParentDefinition.makeNoopStep(),
})
export const parentView = ParentComposition.makeView((model, h) =>
  h.section(
    [],
    [
      h.block(ChildBinding.embedView({ slotId: 'child', model: model.child })),
      h.button(
        [h.OnClick(ParentMessage.ClickedSend({ text: model.child.text }))],
        ['Send'],
      ),
    ],
  ),
)
export const ParentBlock = ParentDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* ChildBinding

    return {
      children: [child],
      init: parentInit,
      update: parentUpdate,
      view: parentView,
      EffectsLayer: SendText.layer,
    }
  }),
)
export const ProvidedParent = ParentBlock.provide(Block.layer)
export const ParentLayer = ParentBlock.layer.pipe(Layer.provide(Block.layer))

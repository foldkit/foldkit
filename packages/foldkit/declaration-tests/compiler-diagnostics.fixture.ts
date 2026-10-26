import { Effect, Schema } from 'effect'
import { Block, Message, Update } from 'foldkit'

export const ChildModel = Schema.Struct({ count: Schema.Number })
export const ChildMessage = Message.defineMessageUnion({
  RequestedIncrement: {},
})
const ChildComposition = Block.makeDefinition('DiagnosticChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({
      RequestedIncrement: model => ({
        model: { count: model.count + 1 },
      }),
    }),
    operations: { requestIncrement: ChildMessage.RequestedIncrement },
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

export const Model = Schema.Struct({ child: ChildBlock.Model })
export const ParentMessage = Message.defineMessageUnion({
  Clicked: {},
  CompletedSave: {},
})
export const OutMessage = Message.defineMessageUnion({ Changed: {} })
export const Definition = Block.makeDefinition('DiagnosticParent', {
  Model,
  Message: ParentMessage,
  OutMessage,
})
export const Binding = Definition.makeBinding(ChildBlock, { field: 'child' })
export const Composition = Definition.makeComposition({ bindings: [Binding] })
export const model = Model.make({ child: { count: 0 } })
export const init = Composition.makeInit(() => ({ model: {} }))
export const update = Composition.makeUpdate({
  CompletedSave: model => ({ model }),
  Clicked: model => ({ model }),
})
export const view = Composition.makeView((_model, h) => h.empty)

export const Save = Definition.makeCommand('Save', {
  messages: [ParentMessage.CompletedSave],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedSave())
  },
})
export const saveUpdate = Composition.makeUpdate({
  Clicked: Definition.makeCommandsStep(() => [Save()]),
  CompletedSave: Definition.makeNoopStep(),
})

export const connectedSteps = [
  Definition.makeNoopStep(),
  Binding.requestIncrement(),
]
export const outMessageSteps = [
  Definition.makeNoopStep(),
  Definition.makeOutMessageStep(() => OutMessage.Changed()),
]

export const deferredConnectedStep = Definition.makeStep(() =>
  Update.combineSteps(connectedSteps),
)

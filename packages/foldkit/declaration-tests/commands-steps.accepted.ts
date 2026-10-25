import { Context, Effect, Layer, Number, Schema } from 'effect'
import { Block, Command, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({
  RequestedSave: {},
  CompletedSave: {},
})
export const CommandsDefinition = Block.makeDefinition('CommandsStep', {
  Model,
  Message,
})
export class Store extends Context.Service<
  Store,
  { save: Effect.Effect<void> }
>()('CommandsStep/Store') {}
export const Save = CommandsDefinition.makeCommand('Save', {
  messages: [Message.CompletedSave],
  handler: function* () {
    return () =>
      Effect.gen(function* () {
        const store = yield* Store
        yield* store.save
        return Message.CompletedSave()
      })
  },
})
export const commands = [Save()]
export const save = CommandsDefinition.makeCommandsStep(() => commands)
export const saveFromCurrentModel = CommandsDefinition.makeCommandsStep(
  ({ count }) => (count > 0 ? commands : []),
)
export const combined = Update.combineSteps([
  CommandsDefinition.makeFieldsStep(() => ({ count: Number.increment })),
  save,
])
export const CommandsComposition = CommandsDefinition.makeComposition()
export const init = CommandsComposition.makeInit(() => ({
  model: { count: 0 },
}))
export const update = CommandsComposition.makeUpdate({
  RequestedSave: model => save(model),
  CompletedSave: model => ({ model }),
})
const prepareCommandsBlock = () =>
  CommandsComposition.prepareBlock({
    init,
    update,
    view: CommandsComposition.makeView((_model, h) => ({
      title: 'Commands',
      body: h.div([]),
    })),
    EffectsLayer: Save.layer,
  })
export const CommandsBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareCommandsBlock
> = Block.assemble(prepareCommandsBlock)
export const program = Program.make({
  block: CommandsBlock,
  container: document.createElement('div'),
})

Runtime.run(program.provide(Layer.succeed(Store, { save: Effect.void })))

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type ExactCommands = Expect<
  Equal<
    ReturnType<typeof save>['commands'],
    ReadonlyArray<(typeof commands)[number]>
  >
>
export type Requirements = Expect<
  Equal<Update.RequirementsOf<typeof save>, Command.HandlerOf<typeof Save>>
>
export type CombinedRequirements = Expect<
  Equal<Update.RequirementsOf<typeof combined>, Command.HandlerOf<typeof Save>>
>
export type ModelDependentCommands = Expect<
  Equal<
    ReturnType<typeof saveFromCurrentModel>['commands'],
    ReadonlyArray<(typeof commands)[number]>
  >
>
export type ModelDependentRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof saveFromCurrentModel>,
    Command.HandlerOf<typeof Save>
  >
>
export type NoOutMessage = Expect<
  Equal<ReturnType<typeof save>['outMessage'], undefined>
>

export const ChildComposition = Block.makeDefinition('CommandsStepChild', {
  Model,
  Message: Schema.Never,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({}),
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
export const ParentModel = Schema.Struct({ child: Model })
export const ParentDefinition = Block.makeDefinition('CommandsStepParent', {
  Model: ParentModel,
  Message,
})
export const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})

export const withChildCommands = (
  childCommands: NonNullable<
    Update.ReturnWithRegistrationEvidence<
      typeof ParentModel.Type,
      typeof Message.Type,
      never,
      Command.HandlerOf<typeof Save>,
      Block.RequirementOfBinding<typeof ChildBinding>
    >['commands']
  >,
) => ParentDefinition.makeCommandsStep(() => childCommands)
export const updateWithChildCommands = (
  childCommands: Parameters<typeof withChildCommands>[0],
) =>
  ParentComposition.makeUpdate({
    RequestedSave: model => withChildCommands(childCommands)(model),
    CompletedSave: model => withChildCommands(childCommands)(model),
  })
export type PreservedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof withChildCommands>>
    >,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>

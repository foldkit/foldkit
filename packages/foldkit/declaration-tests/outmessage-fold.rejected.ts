import { Effect, Schema } from 'effect'
import { Block, Command, Message, Runtime, Struct, Update } from 'foldkit'

import {
  ChildBinding,
  ChildBlock,
  ChildMessage,
  ChildOutMessage,
  CoordinatedChildBinding,
  DeclarationCoordinatedComposition,
  DeclarationFoldParentDefinition,
  DeclarationFoldRootComposition,
  DeclarationLiteralFoldDefinition,
  Model,
  ParentMessage,
  RecordChoice,
  RootModel,
  SiblingBinding,
  program,
  rootInit,
  rootUpdate,
  rootView,
} from './outmessage-fold.accepted.js'

declare const requiresExtraParentField: (
  model: typeof Model.Type &
    Update.GraphCapability<typeof Model.Type, unknown> &
    Readonly<{ required: string }>,
) => Readonly<{ model: typeof Model.Type }>

// @ts-expect-error Parent fold authoring has one home on the Definition, not the Composition.
DeclarationCoordinatedComposition.makeOutMessageFold(ChildBlock, {})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Normalizing a Step cannot erase additional parent input requirements.
  Chose: () => requiresExtraParentField,
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

declare const foreignMessageRecipe: (
  model: typeof Model.Type &
    Update.GraphCapability<typeof Model.Type, 'ForeignBinding'>,
) => Update.ResultRecipe<
  typeof Model.Type,
  typeof ChildMessage.Type,
  never,
  never,
  'ForeignBinding'
>

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Opaque results must preserve the owning parent's Message contract.
  Chose: () => foreignMessageRecipe,
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

declare const unknownRequirementsRecipe: (
  model: typeof Model.Type &
    Update.GraphCapability<typeof Model.Type, 'UnknownBinding'>,
) => Update.ResultRecipe<
  typeof Model.Type,
  typeof ParentMessage.Type,
  never,
  unknown,
  'UnknownBinding'
>

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Fold requirements must stay concrete instead of widening to unknown.
  Chose: () => unknownRequirementsRecipe,
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationCoordinatedComposition.makeUpdate({
  // @ts-expect-error A result handler cannot return an unapplied connected Step.
  RequestedChoose: (_model, { value }) => ChildBinding.requestChoose({ value }),
  CompletedRecordChoice: model => ({ model }),
})

// @ts-expect-error All named child variants must be handled.
DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  Chose: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  Chose: ({ value }) => {
    // @ts-expect-error The generic payload remains the exact Choice union.
    const _wrong: 'Banana' = value
    return DeclarationFoldParentDefinition.makeNoopStep()
  },
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
  // @ts-expect-error Undeclared child variants are rejected.
  Unexpected: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Every branch must preserve the owning parent Model.
  Chose: () => () => ({ model: { wrong: true } }),
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error A child OutMessage is not the declared parent OutMessage.
  Chose: () => model => ({ model, outMessage: ChildOutMessage.Closed() }),
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

const ForeignCommand = Command.define('DeclarationForeignFoldCommand', {
  messages: [ChildMessage.RequestedClose],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.RequestedClose())
  },
})
DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Command results must belong to the parent Message contract.
  Chose: () => model => ({ model, commands: [ForeignCommand()] }),
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error A valid conditional branch cannot hide a foreign Command result.
  Chose:
    ({ value }) =>
    model =>
      value === 'Apple' ? { model } : { model, commands: [ForeignCommand()] },
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error A valid conditional branch cannot hide an undeclared parent OutMessage.
  Chose:
    ({ value }) =>
    model =>
      value === 'Apple'
        ? { model }
        : { model, outMessage: ChildOutMessage.Closed() },
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Every conditional branch must return the parent Model.
  Chose:
    ({ value }) =>
    model =>
      value === 'Apple' ? { model } : { model: { wrong: true } },
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Every returned Step must accept exactly the parent Model and its graph.
  Chose: ({ value }) =>
    value === 'Apple'
      ? DeclarationFoldParentDefinition.makeNoopStep()
      : requiresExtraParentField,
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error The Binding applies one Step; that Step must return a result, not another Step.
  Chose: () => _model => DeclarationFoldParentDefinition.makeNoopStep(),
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  Chose: (_outMessage, { liftCommand }) => {
    // @ts-expect-error The inferred child lifter cannot accept a parent-only Command Message.
    const _wrong = liftCommand(RecordChoice({ value: 'Apple' }))
    return DeclarationFoldParentDefinition.makeNoopStep()
  },
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Definition.makeStep must normalize a Binding init recipe into a connected result.
  Chose: () => model =>
    SiblingBinding.init({
      args: [],
      toParentModel: sibling =>
        Struct.modifyFields(model, { sibling: () => sibling }),
    }),
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error An exhaustive handler must return a Step instead of dropping a never return.
  Chose: () => {
    throw new Error('Missing transition')
  },
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationCoordinatedComposition.makeUpdate({
  // @ts-expect-error A handler cannot return a foreign Command result Message.
  RequestedChoose: model => ({ model, commands: [ForeignCommand()] }),
  CompletedRecordChoice: model => ({ model }),
})

DeclarationCoordinatedComposition.makeUpdate({
  // @ts-expect-error A handler cannot return an undeclared parent OutMessage.
  RequestedChoose: model => ({
    model,
    outMessage: ChildOutMessage.Closed(),
  }),
  CompletedRecordChoice: model => ({ model }),
})

DeclarationCoordinatedComposition.makeUpdate({
  // @ts-expect-error Every handler must return the owning parent Model.
  RequestedChoose: () => ({ model: { wrong: true } }),
  CompletedRecordChoice: DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationCoordinatedComposition.makeUpdate({
  // @ts-expect-error A record handler must validate every conditional Command result Message.
  RequestedChoose: (model, message) =>
    message.value === 'Apple'
      ? { model, commands: [ForeignCommand()] }
      : { model },
  CompletedRecordChoice: model => ({ model }),
})

DeclarationCoordinatedComposition.makeUpdate({
  // @ts-expect-error A record handler must validate every conditional parent OutMessage.
  RequestedChoose: (model, message) =>
    message.value === 'Apple'
      ? { model, outMessage: ChildOutMessage.Closed() }
      : { model },
  CompletedRecordChoice: model => ({ model }),
})

// @ts-expect-error Connected Steps in a fold keep their sibling registration obligation.
DeclarationFoldParentDefinition.makeComposition({
  bindings: [CoordinatedChildBinding],
})

// @ts-expect-error Fold-produced Commands require their implementation at assembly.
DeclarationFoldRootComposition.prepareBlock({
  init: rootInit,
  update: rootUpdate,
  view: rootView,
})

// @ts-expect-error The fold's handler constructor still requires its ordinary Service.
Runtime.run(program)

const DeclarationMessageFreeFoldDefinition = Block.makeDefinition(
  'DeclarationMessageFreeFold',
  {
    Model: RootModel,
    Message: Schema.Never,
  },
)
DeclarationMessageFreeFoldDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error A message-free parent cannot return another parent's Command.
  Chose: () => model => ({
    model,
    commands: [RecordChoice({ value: 'Apple' })],
  }),
  Closed: () => DeclarationMessageFreeFoldDefinition.makeNoopStep(),
})

const DeclarationNoFoldDefinition = Block.makeDefinition('DeclarationNoFold', {
  Model: Schema.Struct({ count: Schema.Number }),
  Message: Message.defineMessageUnion({ CompletedWork: {} }),
})
const DeclarationNoFoldComposition =
  DeclarationNoFoldDefinition.makeComposition()
const prepareNoOutMessageBlock = () =>
  DeclarationNoFoldComposition.prepareBlock({
    init: () => ({ model: { count: 0 } }),
    update: DeclarationNoFoldComposition.makeUpdate({
      CompletedWork: model => ({ model }),
    }),
  })
const NoOutMessageBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof DeclarationNoFoldComposition.Model,
  typeof prepareNoOutMessageBlock
> = Block.assemble(prepareNoOutMessageBlock)
// @ts-expect-error A fold source must declare a tagged OutMessage contract.
DeclarationFoldParentDefinition.makeOutMessageFold(NoOutMessageBlock, {})

const DeclarationTaggedFoldDefinition = Block.makeDefinition(
  'DeclarationTaggedFold',
  {
    Model: RootModel,
    Message: Schema.Never,
    OutMessage: Schema.TaggedStruct('Closed', {}),
  },
)
const DeclarationTaggedFoldComposition =
  DeclarationTaggedFoldDefinition.makeComposition()
const prepareTaggedOutMessageBlock = () =>
  DeclarationTaggedFoldComposition.prepareBlock({
    init: () => ({
      model: RootModel.make({ child: { count: 0 }, choice: 'Apple' }),
    }),
    update: DeclarationTaggedFoldComposition.makeUpdate({}),
  })
const TaggedOutMessageBlock: Block.FromAssemblyWithOutMessage<
  typeof RootModel,
  typeof prepareTaggedOutMessageBlock
> = Block.assemble(prepareTaggedOutMessageBlock)
// @ts-expect-error Named folds require an exhaustive union matcher, including for a single variant.
DeclarationFoldParentDefinition.makeOutMessageFold(TaggedOutMessageBlock, {
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationFoldParentDefinition.makeOutMessageFold(
  // @ts-expect-error A Definition is not a completed child Block.
  DeclarationLiteralFoldDefinition,
  {},
)

declare const unknownCommands: unknown

DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error Command collections cannot widen to unknown.
  Chose: () => model => ({ model, commands: unknownCommands }),
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})
DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error A Command collection must be an array of Commands.
  Chose: () => model => ({ model, commands: { unexpected: true } }),
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})
DeclarationCoordinatedComposition.makeUpdate({
  // @ts-expect-error Authored update Command collections cannot widen to unknown.
  RequestedChoose: model => ({ model, commands: unknownCommands }),
  CompletedRecordChoice: model => ({ model }),
})
DeclarationCoordinatedComposition.makeUpdate({
  // @ts-expect-error Authored update Command collections must be arrays of Commands.
  RequestedChoose: model => ({
    model,
    commands: { unexpected: true },
  }),
  CompletedRecordChoice: model => ({ model }),
})

declare const anyInputStep: (
  // oxlint-disable-next-line typescript/no-explicit-any -- This rejection fixture deliberately erases the Step input.
  model: any,
) => Readonly<{ model: typeof Model.Type }>
declare const unknownInputStep: (
  model: unknown,
) => Readonly<{ model: typeof Model.Type }>
DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error A Step cannot erase its parent Model input with any.
  Chose: () => anyInputStep,
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})
DeclarationFoldParentDefinition.makeOutMessageFold(ChildBlock, {
  // @ts-expect-error A Step cannot erase its parent Model input with unknown.
  Chose: () => unknownInputStep,
  Closed: () => DeclarationFoldParentDefinition.makeNoopStep(),
})

DeclarationLiteralFoldDefinition.makeComposition().makeUpdate({
  // @ts-expect-error A contextual Model literal must belong to its declared Schema.
  RequestedReset: () => ({ model: { phase: 'Unknown' } }),
  RequestedFinish: DeclarationLiteralFoldDefinition.makeNoopStep(),
})

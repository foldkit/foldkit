import { Schema } from 'effect'
import { Block, Struct, Update } from 'foldkit'

import {
  ChildBlock,
  ChildMessage,
  ChildModel,
  ChildOutMessage,
  DeclarationFoldParentDefinition,
  LiteralModel,
  LiteralMessage,
  Model,
  ObserveChoice,
  ParentMessage,
  ParentOutMessage,
  RecordChoice,
} from './outmessage-fold.accepted.js'

type Expect<Value extends true> = Value
type Assignable<Left, Right> = [Left] extends [Right] ? true : false
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Callable<Value> = Value extends (...args: infer Args) => infer Output
  ? (...args: Args) => Output
  : never
type OldFold<
  ParentModel,
  Cases,
  Context extends ReadonlyArray<unknown> = readonly [],
> = Block.OutMessageFold<
  typeof ChildOutMessage.Type,
  Block.DefinedCaseSteps<ParentModel, Cases>,
  Context
>
type Restored<ParentModel, Fold> =
  Fold extends Block.NormalizedFoldEvidence<
    infer ChildOut,
    infer ContextData,
    infer Data
  >
    ? Block.NormalizedOutMessageFold<
        ParentModel,
        ChildOut,
        Block.RestoredFoldContext<ParentModel, ContextData>,
        Data
      >
    : never
type Both<Left, Right> = readonly [
  Assignable<Callable<Left>, Callable<Right>>,
  Assignable<Callable<Right>, Callable<Left>>,
]

export const ChildKey = Symbol('FoldParityChild')
const ChildDefinition = Block.makeDefinition('FoldParityChild', {
  key: ChildKey,
  Init: Schema.Tuple([]),
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
  operations: {
    requestChoose: ChildMessage.RequestedChoose,
    requestClose: ChildMessage.RequestedClose,
  },
})
export const ParentKey = Symbol('FoldParityParent')
const ParentDefinition = Block.makeDefinition('FoldParityParent', {
  key: ParentKey,
  Init: Schema.Tuple([]),
  Model,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})
const SiblingBinding = ParentDefinition.makeBinding(ChildDefinition.contract, {
  field: 'sibling',
}).withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(ChildDefinition.contract, {
    Chose: ({ value }) =>
      ParentDefinition.makeStep(model => ({
        model,
        outMessage: ParentOutMessage.Chose({ value }),
      })),
    Closed: () => ParentDefinition.makeNoopStep(),
  }),
})

const conditionalCases = {
  Chose:
    ({ value }: typeof ChildOutMessage.Chose.Type) =>
    (model: typeof Model.Type) =>
      value === 'Apple'
        ? { model }
        : {
            model: Struct.modifyFields(model, { choice: () => value }),
            commands: [RecordChoice({ value })],
            outMessage: ParentOutMessage.Chose({ value }),
          },
  Closed: () => ParentDefinition.makeNoopStep(),
}
export const conditionalFold = ParentDefinition.makeOutMessageFold(
  ChildDefinition.contract,
  conditionalCases,
)

const connectedCases = {
  Chose: ({ value }: typeof ChildOutMessage.Chose.Type) =>
    SiblingBinding.requestChoose({ value }),
  Closed: () => ParentDefinition.makeNoopStep(),
}
export const connectedFold = ParentDefinition.makeOutMessageFold(
  ChildDefinition.contract,
  connectedCases,
)

const unionStepCases = {
  Chose: ({ value }: typeof ChildOutMessage.Chose.Type) =>
    value === 'Apple'
      ? SiblingBinding.requestChoose({ value })
      : ParentDefinition.makeNoopStep(),
  Closed: () => ParentDefinition.makeNoopStep(),
}
export const unionStepFold = ParentDefinition.makeOutMessageFold(
  ChildDefinition.contract,
  unionStepCases,
)

const contextCases = {
  Chose:
    (
      _outMessage: typeof ChildOutMessage.Chose.Type,
      {
        liftCommand,
        modelBeforeUpdate,
      }: Update.FoldContext<
        typeof ChildMessage.Type,
        typeof ParentMessage.Type,
        typeof Model.Type
      >,
    ) =>
    (model: typeof Model.Type) => ({
      model: Struct.modifyFields(model, {
        choice: () => modelBeforeUpdate.choice,
      }),
      commands: [liftCommand(ObserveChoice())],
    }),
  Closed: () => ParentDefinition.makeNoopStep(),
}
export const contextFold = ParentDefinition.makeOutMessageFold(
  ChildDefinition.contract,
  contextCases,
)

export const LiteralKey = Symbol('FoldParityLiteral')
const LiteralDefinition = Block.makeDefinition('FoldParityLiteral', {
  key: LiteralKey,
  Init: Schema.Tuple([]),
  Model: LiteralModel,
  Message: LiteralMessage,
})
const literalCases = {
  Chose:
    () =>
    (
      _model: typeof LiteralModel.Type,
    ): Readonly<{
      model: Readonly<{ phase: 'Done' }>
      detail?: 'Chosen'
    }> => ({ model: { phase: 'Done' } }),
  Closed:
    () =>
    (
      _model: typeof LiteralModel.Type,
    ): Readonly<{
      model: Readonly<{ phase: 'Idle' }>
      detail?: 'Closed'
    }> => ({ model: { phase: 'Idle' } }),
}
export const literalFold = LiteralDefinition.makeOutMessageFold(
  ChildDefinition.contract,
  literalCases,
)

type Context = readonly [
  Update.FoldContext<
    Block.CoreContract<typeof ChildDefinition.contract>['Message']['Type'],
    typeof ParentMessage.Type,
    typeof Model.Type
  >,
]
export type CallableParity = readonly [
  Expect<
    Equal<
      Both<
        typeof unionStepFold,
        OldFold<typeof Model.Type, typeof unionStepCases>
      >,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Both<
        typeof conditionalFold,
        OldFold<typeof Model.Type, typeof conditionalCases>
      >,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Both<
        typeof connectedFold,
        OldFold<typeof Model.Type, typeof connectedCases>
      >,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Both<
        typeof contextFold,
        OldFold<typeof Model.Type, typeof contextCases, Context>
      >,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Both<
        typeof literalFold,
        OldFold<typeof LiteralModel.Type, typeof literalCases>
      >,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Parameters<typeof contextFold>,
      Parameters<OldFold<typeof Model.Type, typeof contextCases, Context>>
    >
  >,
  Expect<
    Equal<
      Both<
        typeof conditionalFold,
        Restored<typeof Model.Type, typeof conditionalFold>
      >,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Both<
        typeof connectedFold,
        Restored<typeof Model.Type, typeof connectedFold>
      >,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Both<typeof contextFold, Restored<typeof Model.Type, typeof contextFold>>,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Both<
        typeof unionStepFold,
        Restored<typeof Model.Type, typeof unionStepFold>
      >,
      readonly [true, true]
    >
  >,
  Expect<
    Equal<
      Both<
        typeof literalFold,
        Restored<typeof LiteralModel.Type, typeof literalFold>
      >,
      readonly [true, true]
    >
  >,
]

type RegistrationKey = keyof Update.RegistrationEvidence<unknown>
type NativeCommands = Update.Commands<typeof ParentMessage.Type>
type Collection = readonly [ReturnType<typeof RecordChoice>] & {
  readonly [Key in RegistrationKey]?: never
}
type UnusualOutput = Readonly<{
  model: typeof Model.Type
  commands?: Collection | undefined
  detail?: 'Extra' | undefined
}> & { [Key in RegistrationKey]: () => 'Registered' }
type UnusualCases = Readonly<{
  Chose: () => (model: typeof Model.Type) => UnusualOutput
}>
type RoundTripOutput<Output> = ReturnType<
  Block.NormalizedFoldStep<
    typeof Model.Type,
    Block.NormalizedFoldCaseData<
      typeof Model.Type,
      Readonly<{
        Chose: () => (model: typeof Model.Type) => Output
      }>
    >
  >
>
type BroadReadonlyOutput = Readonly<{
  model: typeof Model.Type
  commands: NativeCommands & { readonly [Key in RegistrationKey]?: never }
}> & { readonly [Key in RegistrationKey]?: never }
type BroadMutableOutput = {
  model: typeof Model.Type
  commands: Array<ReturnType<typeof RecordChoice>> & {
    [Key in RegistrationKey]?: () => 'Registered'
  }
} & { [Key in RegistrationKey]?: () => 'Registered' }
type OptionalCommandsOutput = Readonly<{
  model: typeof Model.Type
  commands?: NativeCommands & { readonly [Key in RegistrationKey]?: never }
  detail?: 'Extra'
}>
type OptionalNeverCommandsOutput = Readonly<{
  model: typeof Model.Type
  commands?: never
}>
export type ResidualParity = readonly [
  Expect<
    Equal<
      Pick<RoundTripOutput<BroadReadonlyOutput>, 'model'>,
      Pick<BroadReadonlyOutput, 'model'>
    >
  >,
  Expect<
    Equal<
      Pick<RoundTripOutput<BroadMutableOutput>, 'model'>,
      Pick<BroadMutableOutput, 'model'>
    >
  >,
  Expect<
    Equal<
      Pick<RoundTripOutput<OptionalCommandsOutput>, 'commands' | 'detail'>,
      Pick<OptionalCommandsOutput, 'commands' | 'detail'>
    >
  >,
  Expect<
    Equal<
      Pick<RoundTripOutput<OptionalNeverCommandsOutput>, 'commands'>,
      Pick<OptionalNeverCommandsOutput, 'commands'>
    >
  >,
  Expect<
    Assignable<
      RoundTripOutput<UnusualOutput>,
      ReturnType<Block.DefinedCaseSteps<typeof Model.Type, UnusualCases>>
    >
  >,
  Expect<
    Assignable<
      ReturnType<Block.DefinedCaseSteps<typeof Model.Type, UnusualCases>>,
      RoundTripOutput<UnusualOutput>
    >
  >,
  Expect<
    Equal<
      RoundTripOutput<BroadReadonlyOutput>['commands'],
      BroadReadonlyOutput['commands']
    >
  >,
  Expect<
    Equal<
      RoundTripOutput<BroadMutableOutput>['commands'],
      BroadMutableOutput['commands']
    >
  >,
  Expect<
    Equal<
      Pick<RoundTripOutput<BroadReadonlyOutput>, RegistrationKey>,
      Pick<BroadReadonlyOutput, RegistrationKey>
    >
  >,
  Expect<
    Equal<
      Pick<RoundTripOutput<BroadMutableOutput>, RegistrationKey>,
      Pick<BroadMutableOutput, RegistrationKey>
    >
  >,
]

export const oldNativeFold = DeclarationFoldParentDefinition.makeOutMessageFold(
  ChildBlock,
  conditionalCases,
)

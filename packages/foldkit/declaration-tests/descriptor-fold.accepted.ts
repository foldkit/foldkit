import { Schema } from 'effect'
import { Block, Command, Struct, Update } from 'foldkit'

import {
  ChildBlock,
  ChildMessage,
  ChildModel,
  ChildOutMessage,
  DeclarationFoldParentDefinition,
  LiteralMessage,
  LiteralModel,
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
export const FoldParityChildDefinition = Block.makeDefinition(
  'FoldParityChild',
  {
    key: ChildKey,
    InitArgs: Schema.Tuple([]),
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
    operations: {
      requestChoose: ChildMessage.RequestedChoose,
      requestClose: ChildMessage.RequestedClose,
    },
  },
)
export const ParentKey = Symbol('FoldParityParent')
export const FoldParityParentDefinition = Block.makeDefinition(
  'FoldParityParent',
  {
    key: ParentKey,
    InitArgs: Schema.Tuple([]),
    Model,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  },
)
export const FoldParitySiblingBinding =
  FoldParityParentDefinition.makeRequiredFieldBinding(
    FoldParityChildDefinition.contract,
    {
      field: 'sibling',
    },
  ).withOutMessagePolicy({
    fold: FoldParityParentDefinition.makeOutMessageFold(
      FoldParityChildDefinition.contract,
      {
        Chose: ({ value }) =>
          FoldParityParentDefinition.makeStep(model => ({
            model,
            outMessage: ParentOutMessage.Chose({ value }),
          })),
        Closed: () => FoldParityParentDefinition.makeNoopStep(),
      },
    ),
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
  Closed: () => FoldParityParentDefinition.makeNoopStep(),
}
export const conditionalFold = FoldParityParentDefinition.makeOutMessageFold(
  FoldParityChildDefinition.contract,
  conditionalCases,
)

const connectedCases = {
  Chose: ({ value }: typeof ChildOutMessage.Chose.Type) =>
    FoldParitySiblingBinding.requestChoose({ value }),
  Closed: () => FoldParityParentDefinition.makeNoopStep(),
}
export const connectedFold = FoldParityParentDefinition.makeOutMessageFold(
  FoldParityChildDefinition.contract,
  connectedCases,
)

const unionStepCases = {
  Chose: ({ value }: typeof ChildOutMessage.Chose.Type) =>
    value === 'Apple'
      ? FoldParitySiblingBinding.requestChoose({ value })
      : FoldParityParentDefinition.makeNoopStep(),
  Closed: () => FoldParityParentDefinition.makeNoopStep(),
}
export const unionStepFold = FoldParityParentDefinition.makeOutMessageFold(
  FoldParityChildDefinition.contract,
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
  Closed: () => FoldParityParentDefinition.makeNoopStep(),
}
export const contextFold = FoldParityParentDefinition.makeOutMessageFold(
  FoldParityChildDefinition.contract,
  contextCases,
)

export const LiteralKey = Symbol('FoldParityLiteral')
export const FoldParityLiteralDefinition = Block.makeDefinition(
  'FoldParityLiteral',
  {
    key: LiteralKey,
    InitArgs: Schema.Tuple([]),
    Model: LiteralModel,
    Message: LiteralMessage,
  },
)
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
export const literalFold = FoldParityLiteralDefinition.makeOutMessageFold(
  FoldParityChildDefinition.contract,
  literalCases,
)

type Context = readonly [
  Update.FoldContext<
    Block.CoreContract<
      typeof FoldParityChildDefinition.contract
    >['Message']['Type'],
    typeof ParentMessage.Type,
    typeof Model.Type
  >,
]
export type CallableParity = readonly [
  Expect<
    Equal<
      Both<typeof conditionalFold, typeof oldNativeFold>,
      readonly [true, true]
    >
  >,
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

export const plainBinding = FoldParityParentDefinition.makeRequiredFieldBinding(
  FoldParityChildDefinition.contract,
  { field: 'child' },
).withOutMessagePolicy({ fold: conditionalFold })
const augmentedFold = Object.assign(conditionalFold, { label: 'Tracked' })
export const augmentedBinding =
  FoldParityParentDefinition.makeRequiredFieldBinding(
    FoldParityChildDefinition.contract,
    { field: 'child' },
  ).withOutMessagePolicy({ fold: augmentedFold })
const mutablePolicy: { fold: typeof conditionalFold } = {
  fold: conditionalFold,
}
export const mutableBinding =
  FoldParityParentDefinition.makeRequiredFieldBinding(
    FoldParityChildDefinition.contract,
    { field: 'child' },
  ).withOutMessagePolicy(mutablePolicy)
const forward = FoldParityParentDefinition.makeOutMessageForward(
  FoldParityChildDefinition.contract,
  {
    Chose: ({ value }) => ParentOutMessage.Chose({ value }),
    Closed: () => undefined,
  },
)
export const forwardingBinding =
  FoldParityParentDefinition.makeRequiredFieldBinding(
    FoldParityChildDefinition.contract,
    { field: 'child' },
  ).withOutMessagePolicy({ fold: conditionalFold, forward })

type PolicyOf<Binding> =
  Binding extends Block.BindingPolicyEvidence<infer Policy> ? Policy : never
export const plainComposition = FoldParityParentDefinition.makeComposition({
  bindings: [plainBinding],
})
export const augmentedComposition = FoldParityParentDefinition.makeComposition({
  bindings: [augmentedBinding],
})
export const mutableComposition = FoldParityParentDefinition.makeComposition({
  bindings: [mutableBinding],
})
export const forwardingComposition = FoldParityParentDefinition.makeComposition(
  {
    bindings: [forwardingBinding],
  },
)
export const connectedBinding =
  FoldParityParentDefinition.makeRequiredFieldBinding(
    FoldParityChildDefinition.contract,
    { field: 'child' },
  ).withOutMessagePolicy({ fold: connectedFold })
export const connectedComposition = FoldParityParentDefinition.makeComposition({
  bindings: [connectedBinding, FoldParitySiblingBinding],
})

type PlainRegisteredBinding = (typeof plainComposition.bindings)[0]
type AugmentedRegisteredBinding = (typeof augmentedComposition.bindings)[0]
type MutableRegisteredBinding = (typeof mutableComposition.bindings)[0]
type ForwardingRegisteredBinding = (typeof forwardingComposition.bindings)[0]
type ConnectedRegisteredBinding = (typeof connectedComposition.bindings)[0]
type OutMessageOf<Output> = Output extends unknown
  ? 'outMessage' extends keyof Output
    ? Exclude<Output['outMessage'], undefined>
    : never
  : never

type FoldGraphOf<Fold, Tag extends PropertyKey> =
  Fold extends Block.NormalizedFoldEvidence<
    infer _OutMessage,
    infer _Context,
    infer Cases
  >
    ? Extract<
        Cases,
        readonly [Tag, unknown, ...ReadonlyArray<unknown>]
      > extends readonly [Tag, infer Graph, ...ReadonlyArray<unknown>]
      ? Graph
      : never
    : never

export type PolicyInventoryParity = readonly [
  Expect<
    Equal<typeof plainComposition.bindings, readonly [typeof plainBinding]>
  >,
  Expect<
    Equal<PolicyOf<PlainRegisteredBinding>, PolicyOf<typeof plainBinding>>
  >,
  Expect<
    Equal<
      PolicyOf<AugmentedRegisteredBinding>,
      PolicyOf<typeof augmentedBinding>
    >
  >,
  Expect<Equal<PolicyOf<MutableRegisteredBinding>, typeof mutablePolicy>>,
  Expect<
    Equal<
      PolicyOf<ForwardingRegisteredBinding>,
      PolicyOf<typeof forwardingBinding>
    >
  >,
  Expect<
    Equal<PolicyOf<PlainRegisteredBinding>['fold'], typeof conditionalFold>
  >,
  Expect<
    Equal<PolicyOf<AugmentedRegisteredBinding>['fold'], typeof augmentedFold>
  >,
  Expect<
    Equal<PolicyOf<ForwardingRegisteredBinding>['forward'], typeof forward>
  >,
  Expect<Equal<PlainRegisteredBinding['placement'], 'child'>>,
  Expect<
    Equal<
      PlainRegisteredBinding['requestChoose'],
      typeof plainBinding.requestChoose
    >
  >,
  Expect<
    Equal<
      Update.RequirementsOf<
        ReturnType<PolicyOf<PlainRegisteredBinding>['fold']>
      >,
      Command.HandlerOf<typeof RecordChoice>
    >
  >,
  Expect<
    Equal<
      OutMessageOf<
        ReturnType<ReturnType<PolicyOf<PlainRegisteredBinding>['fold']>>
      >,
      typeof ParentOutMessage.Chose.Type
    >
  >,
  Expect<
    Equal<
      typeof connectedComposition.bindings,
      readonly [typeof connectedBinding, typeof FoldParitySiblingBinding]
    >
  >,
  Expect<
    Equal<PolicyOf<ConnectedRegisteredBinding>['fold'], typeof connectedFold>
  >,
  Expect<
    Equal<
      FoldGraphOf<PolicyOf<ConnectedRegisteredBinding>['fold'], 'Chose'>,
      Block.RequirementOfBinding<typeof FoldParitySiblingBinding>
    >
  >,
]

type SpecPolicyOf<Binding> =
  Block.BindingSpecs<readonly [Binding]> extends readonly [
    Block.DescriptorBindingSpec<
      infer _Child,
      infer _Config,
      infer _InitSchema,
      infer _Kind,
      infer _Owner,
      infer Policy
    >,
  ]
    ? Policy
    : never
type RestoredBinding<Binding> = Block.BindingsFromSpecs<
  Block.BindingSpecs<readonly [Binding]>,
  typeof Model,
  typeof ParentMessage,
  typeof ParentOutMessage
>[0]
export type PolicySpecParity = readonly [
  Expect<
    SpecPolicyOf<typeof plainBinding> extends Block.FoldOnlyPolicySpec<
      infer _Message,
      infer _Out,
      infer _Context,
      infer _Data
    >
      ? true
      : false
  >,
  Expect<
    Equal<
      PolicyOf<RestoredBinding<typeof plainBinding>>,
      PolicyOf<typeof plainBinding>
    >
  >,
  Expect<
    Equal<
      SpecPolicyOf<typeof augmentedBinding>,
      PolicyOf<typeof augmentedBinding>
    >
  >,
  Expect<
    Equal<
      PolicyOf<RestoredBinding<typeof augmentedBinding>>,
      PolicyOf<typeof augmentedBinding>
    >
  >,
  Expect<Equal<SpecPolicyOf<typeof mutableBinding>, typeof mutablePolicy>>,
  Expect<
    Equal<
      PolicyOf<RestoredBinding<typeof mutableBinding>>,
      typeof mutablePolicy
    >
  >,
  Expect<
    Equal<
      SpecPolicyOf<typeof forwardingBinding>,
      PolicyOf<typeof forwardingBinding>
    >
  >,
  Expect<
    Equal<
      PolicyOf<RestoredBinding<typeof forwardingBinding>>,
      PolicyOf<typeof forwardingBinding>
    >
  >,
]

export type SpecInventoryParity = readonly [
  Expect<
    Equal<
      Block.BindingsFromSpecs<
        Block.BindingSpecs<[typeof plainBinding]>,
        typeof Model,
        typeof ParentMessage,
        typeof ParentOutMessage
      >,
      [typeof plainBinding]
    >
  >,
  Expect<
    Equal<
      Block.BindingsFromSpecs<
        Block.BindingSpecs<
          [typeof plainBinding] | readonly [typeof augmentedBinding]
        >,
        typeof Model,
        typeof ParentMessage,
        typeof ParentOutMessage
      >,
      [typeof plainBinding] | readonly [typeof augmentedBinding]
    >
  >,
]

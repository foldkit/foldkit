import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Block, Message, Struct } from 'foldkit'

export class StartupClient extends Context.Service<
  StartupClient,
  Readonly<{ value: number }>
>()('DeclarationStartupDefaults/StartupClient') {}

export const ChildModel = Schema.Struct({ count: Schema.Number })
export const ChildMessage = Message.defineMessageUnion({
  CompletedInitialization: { count: Schema.Number },
})
const DeclarationStartupDefaultChildDefinition = Block.makeDefinition(
  'DeclarationStartupDefaultChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
)
export const FinishInitialization =
  DeclarationStartupDefaultChildDefinition.makeCommand('FinishInitialization', {
    args: { count: Schema.Number },
    messages: [ChildMessage.CompletedInitialization],
    handler: function* () {
      yield* StartupClient
      return ({ count }) =>
        Effect.succeed(ChildMessage.CompletedInitialization({ count }))
    },
  })
const FailConstruction = DeclarationStartupDefaultChildDefinition.makeCommand(
  'FailConstruction',
  {
    messages: [ChildMessage.CompletedInitialization],
  },
)
const FailChildConstructionLayer = FailConstruction.toLayer<
  never,
  'StartupUnavailable',
  never
>(Effect.fail<'StartupUnavailable'>('StartupUnavailable'))
const DeclarationStartupDefaultChildComposition =
  DeclarationStartupDefaultChildDefinition.makeComposition()
const prepareChildBlock = () =>
  DeclarationStartupDefaultChildComposition.prepareBlock({
    init: DeclarationStartupDefaultChildComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
      commands: [FinishInitialization({ count: 0 })],
    })),
    update: DeclarationStartupDefaultChildComposition.makeUpdate({
      CompletedInitialization: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
    }),
    EffectsLayer: Layer.merge(
      FinishInitialization.layer,
      FailChildConstructionLayer,
    ),
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const DeclarationStartupDefaultArgumentChildComposition = Block.makeDefinition(
  'DeclarationStartupDefaultArgumentChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareDefaultChildBlock = () =>
  DeclarationStartupDefaultArgumentChildComposition.prepareBlock({
    init: DeclarationStartupDefaultArgumentChildComposition.makeInit(
      (count = 1) => ({
        model: ChildModel.make({ count }),
      }),
    ),
    update: DeclarationStartupDefaultArgumentChildComposition.makeUpdate({
      CompletedInitialization: model => ({
        model,
      }),
    }),
  })
export const DefaultChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareDefaultChildBlock
> = Block.assemble(prepareDefaultChildBlock)

const DeclarationStartupOptionalArgumentChildComposition = Block.makeDefinition(
  'DeclarationStartupOptionalArgumentChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareOptionalChildBlock = () =>
  DeclarationStartupOptionalArgumentChildComposition.prepareBlock({
    init: DeclarationStartupOptionalArgumentChildComposition.makeInit(
      (count?: number) => ({
        model: ChildModel.make({ count: count ?? 2 }),
      }),
    ),
    update: DeclarationStartupOptionalArgumentChildComposition.makeUpdate({
      CompletedInitialization: model => ({ model }),
    }),
  })
export const OptionalChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareOptionalChildBlock
> = Block.assemble(prepareOptionalChildBlock)

const DeclarationStartupRequiredRestChildComposition = Block.makeDefinition(
  'DeclarationStartupRequiredRestChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareRestChildBlock = () =>
  DeclarationStartupRequiredRestChildComposition.prepareBlock({
    init: DeclarationStartupRequiredRestChildComposition.makeInit(
      (first: number, ...rest: Array<number>) => ({
        model: ChildModel.make({ count: first + rest.length }),
      }),
    ),
    update: DeclarationStartupRequiredRestChildComposition.makeUpdate({
      CompletedInitialization: model => ({
        model,
      }),
    }),
  })
export const RestChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareRestChildBlock
> = Block.assemble(prepareRestChildBlock)

const DeclarationStartupRequiredChildComposition = Block.makeDefinition(
  'DeclarationStartupRequiredChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareRequiredChildBlock = () =>
  DeclarationStartupRequiredChildComposition.prepareBlock({
    init: DeclarationStartupRequiredChildComposition.makeInit(
      (count: number) => ({
        model: ChildModel.make({ count }),
      }),
    ),
    update: DeclarationStartupRequiredChildComposition.makeUpdate({
      CompletedInitialization: model => ({
        model,
      }),
    }),
  })
export const RequiredChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareRequiredChildBlock
> = Block.assemble(prepareRequiredChildBlock)

export const Entry = Schema.Struct({ id: Schema.String, child: ChildModel })
export const ChildInitContext = Schema.Struct({
  count: Schema.Number,
  includeOptional: Schema.Boolean,
  entryIds: Schema.Array(Schema.String),
})
export const ParentModel = Schema.Struct({
  automatic: ChildModel,
  defaultArgument: ChildModel,
  optionalArgument: ChildModel,
  requiredRest: ChildModel,
  optedOut: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  entries: Schema.Array(Entry),
  status: Schema.Literals(['Ready', 'Stepped']),
})
export const ParentMessage = Message.defineMessageUnion({
  CompletedParentInitialization: {},
  CompletedParentStep: {},
})
export const DeclarationStartupDefaultsParentDefinition = Block.makeDefinition(
  'DeclarationStartupDefaultsParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
    ChildInitContext,
  },
)
// oxlint-disable-next-line foldkit/command-binding-matches-name -- Two owners intentionally declare the same local Command name.
export const FinishParentInitialization =
  DeclarationStartupDefaultsParentDefinition.makeCommand(
    'FinishInitialization',
    {
      messages: [ParentMessage.CompletedParentInitialization],
      handler: function* () {
        return () =>
          Effect.succeed(ParentMessage.CompletedParentInitialization())
      },
    },
  )
export const FinishStep =
  DeclarationStartupDefaultsParentDefinition.makeCommand('FinishStep', {
    messages: [ParentMessage.CompletedParentStep],
    handler: function* () {
      return () => Effect.succeed(ParentMessage.CompletedParentStep())
    },
  })
export const AutomaticBinding =
  DeclarationStartupDefaultsParentDefinition.makeBinding(ChildBlock, {
    field: 'automatic',
  })
export const DefaultArgumentBinding =
  DeclarationStartupDefaultsParentDefinition.makeBinding(DefaultChildBlock, {
    field: 'defaultArgument',
  })
export const OptionalArgumentBinding =
  DeclarationStartupDefaultsParentDefinition.makeBinding(OptionalChildBlock, {
    field: 'optionalArgument',
  })
export const RequiredRestBinding =
  DeclarationStartupDefaultsParentDefinition.makeBinding(RestChildBlock, {
    field: 'requiredRest',

    init: { contextToArgs: childInitContext => [childInitContext.count] },
  })
export const OptedOutBinding =
  DeclarationStartupDefaultsParentDefinition.makeBinding(ChildBlock, {
    field: 'optedOut',

    init: false,
  })
export const OptionalBinding =
  DeclarationStartupDefaultsParentDefinition.makeBinding(ChildBlock, {
    field: 'maybeChild',

    init: {
      contextToArgs: childInitContext =>
        childInitContext.includeOptional ? Option.some([]) : Option.none(),
    },
  })
export const EntriesBinding =
  DeclarationStartupDefaultsParentDefinition.makeBinding(ChildBlock, {
    field: 'entries',
    placement: 'entries',
    key: 'id',
    childField: 'child',
    init: {
      instances: childInitContext =>
        childInitContext.entryIds.map(id => ({ key: id, args: [] })),
      toItem: ({ key }, child) => ({ id: key, child }),
    },
  })
export const DeclarationStartupDefaultsParentComposition =
  DeclarationStartupDefaultsParentDefinition.makeComposition({
    bindings: [
      AutomaticBinding,
      DefaultArgumentBinding,
      OptionalArgumentBinding,
      RequiredRestBinding,
      OptedOutBinding,
      OptionalBinding,
      EntriesBinding,
    ],
  })
const applyParentStep = DeclarationStartupDefaultsParentDefinition.makeStep(
  model => ({
    model: Struct.modifyFields(model, { status: () => 'Stepped' }),
    commands: [FinishStep()],
  }),
)
export const init = DeclarationStartupDefaultsParentComposition.makeInit(
  (childInitContext: typeof ChildInitContext.Type) => ({
    childInitContext,
    model: {
      optedOut: ChildModel.make({ count: 9 }),
      status: 'Ready',
    },
    commands: [FinishParentInitialization()],
    steps: [applyParentStep],
  }),
)
const prepareParentBlock = () =>
  DeclarationStartupDefaultsParentComposition.prepareBlock({
    init,
    update: DeclarationStartupDefaultsParentComposition.makeUpdate({
      CompletedParentInitialization: model => ({
        model,
      }),
      CompletedParentStep: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.merge(
      FinishParentInitialization.layer,
      FinishStep.layer,
    ),
  })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

const SingleChildParentMessage = Schema.Never

// oxlint-disable-next-line foldkit/block-name-matches-variable -- The early identity and its specialized contracts coexist in this fixture.
export const GenericOwnerNamespace = Block.makeNamespace(
  'DeclarationStartupGenericParent',
)
export const DeclarationStartupGenericParentDefinition =
  GenericOwnerNamespace.makeDefinition({
    Model: Schema.Struct({ child: ChildModel }),
    Message: SingleChildParentMessage,
    ChildInitContext,
  })
export const GenericBinding =
  DeclarationStartupGenericParentDefinition.makeBinding(ChildBlock, {
    field: 'child',

    init: { contextToArgs: _childInitContext => [] },
  })
export const WiderBinding =
  DeclarationStartupGenericParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'wider',

    init: { contextToArgs: (_childInitContext: object) => [] },
  })
export const DeclarationStartupGenericParentComposition =
  DeclarationStartupGenericParentDefinition.makeComposition({
    bindings: [WiderBinding],
  })
export const initWithoutSelectorStartup =
  DeclarationStartupGenericParentDefinition.makeComposition({
    bindings: [
      DeclarationStartupGenericParentDefinition.makeBinding(ChildBlock, {
        field: 'child',

        init: { contextToArgs: () => [] },
      }),
    ],
  }).makeInit(() => ({ model: {} }))

export const ForeignChildInitContext = Schema.Struct({ token: Schema.String })
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture compares two ChildInitContext contracts under the same Block identity.
export const ForeignGenericParentDefinition =
  GenericOwnerNamespace.makeDefinition({
    Model: DeclarationStartupGenericParentDefinition.Model,
    Message: SingleChildParentMessage,
    ChildInitContext: ForeignChildInitContext,
  })
export const ForeignGenericBinding = ForeignGenericParentDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',

    init: { contextToArgs: _childInitContext => [] },
  },
)

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: Schema.Struct({ child: ChildModel }),
  Message: SingleChildParentMessage,
  ChildInitContext,
})
export const ApplicationBinding = ApplicationDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',

    init: { contextToArgs: _childInitContext => [] },
  },
)

export const DeclarationStartupOrdinaryParentDefinition = Block.makeDefinition(
  'DeclarationStartupOrdinaryParent',
  {
    Model: Schema.Struct({ child: ChildModel }),
    Message: SingleChildParentMessage,
  },
)
export const OrdinaryBinding =
  DeclarationStartupOrdinaryParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  })

const SharedStartupModel = Schema.Struct({
  first: ChildModel,
  second: ChildModel,
})
const CompatibleParentMessage = Schema.Never
const DeclarationCompatibleStartupParentDefinition = Block.makeDefinition(
  'DeclarationCompatibleStartupParent',
  {
    Model: SharedStartupModel,
    Message: CompatibleParentMessage,
  },
)
const CountStartupBinding =
  DeclarationCompatibleStartupParentDefinition.makeBinding(ChildBlock, {
    field: 'first',

    init: {
      contextToArgs: (_childInitContext: Readonly<{ count: number }>) => [],
    },
  })
const LabelStartupBinding =
  DeclarationCompatibleStartupParentDefinition.makeBinding(ChildBlock, {
    field: 'second',

    init: {
      contextToArgs: (_childInitContext: Readonly<{ label: string }>) => [],
    },
  })
export const DeclarationCompatibleStartupParentComposition =
  DeclarationCompatibleStartupParentDefinition.makeComposition({
    bindings: [CountStartupBinding, LabelStartupBinding],
  })
export const initCompatibleStartup =
  DeclarationCompatibleStartupParentComposition.makeInit(
    (childInitContext: Readonly<{ count: number; label: string }>) => ({
      childInitContext,
      model: {},
    }),
  )

const DeclarationMixedStartupParentDefinition = Block.makeDefinition(
  'DeclarationMixedStartupParent',
  {
    Model: SharedStartupModel,
    Message: CompatibleParentMessage,
  },
)
const NoInputBinding = DeclarationMixedStartupParentDefinition.makeBinding(
  ChildBlock,
  {
    field: 'first',

    init: { contextToArgs: () => [] },
  },
)
const ContextInputBinding = DeclarationMixedStartupParentDefinition.makeBinding(
  ChildBlock,
  {
    field: 'second',

    init: {
      contextToArgs: (_childInitContext: Readonly<{ count: number }>) => [],
    },
  },
)
export const DeclarationMixedStartupParentComposition =
  DeclarationMixedStartupParentDefinition.makeComposition({
    bindings: [NoInputBinding, ContextInputBinding],
  })
export const initMixedStartup =
  DeclarationMixedStartupParentComposition.makeInit(
    (childInitContext: Readonly<{ count: number }>) => ({
      childInitContext,
      model: {},
    }),
  )

import { Layer, Option, Schema } from 'effect'
import { Block, Message, Struct } from 'foldkit'
import { taggedStruct } from 'foldkit/schema'

export const ChildModel = Schema.Struct({ count: Schema.Number })
export const ChildMessage = Message.defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})
// eslint-disable-next-line foldkit/block-name-matches-variable
const ChildDefinition = Block.makeDefinition('DeclaredDirectFieldChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const setCount = ChildDefinition.makeStep((model, count: number) => ({
  model: Struct.modifyFields(model, { count: () => count }),
}))
const DeclaredDirectFieldChildComposition = ChildDefinition.makeComposition()
const childUpdate = DeclaredDirectFieldChildComposition.makeUpdate({
  UpdatedCount: (model, { count }) => setCount(model, count),
})
const prepareChildBlock = () =>
  DeclaredDirectFieldChildComposition.prepareBlock({
    init: DeclaredDirectFieldChildComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: childUpdate,
    operations: {
      setCount: (count: number) => [ChildMessage.UpdatedCount({ count })],
    },
    EffectsLayer: Layer.empty,
  })
export const childBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
const prepareArgumentChildBlock = () =>
  DeclaredDirectFieldChildComposition.prepareBlock({
    init: DeclaredDirectFieldChildComposition.makeInit((count: number) => ({
      model: ChildModel.make({ count }),
    })),
    update: childUpdate,
    operations: {
      setCount: (count: number) => [ChildMessage.UpdatedCount({ count })],
    },
    EffectsLayer: Layer.empty,
  })
export const argumentChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareArgumentChildBlock
> = Block.assemble(prepareArgumentChildBlock)
export const NestedOptionChildModel = Schema.Option(ChildModel)
// eslint-disable-next-line foldkit/block-name-matches-variable

const DeclaredNestedOptionChildComposition = Block.makeDefinition(
  'DeclaredNestedOptionChild',
  {
    Model: NestedOptionChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareNestedOptionChildBlock = () =>
  DeclaredNestedOptionChildComposition.prepareBlock({
    init: DeclaredNestedOptionChildComposition.makeInit(() => ({
      model: Option.none(),
    })),
    update: DeclaredNestedOptionChildComposition.makeUpdate({
      UpdatedCount: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.empty,
  })
export const nestedOptionChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof NestedOptionChildModel,
  typeof prepareNestedOptionChildBlock
> = Block.assemble(prepareNestedOptionChildBlock)
export const ArrayChildModel = Schema.Array(Schema.String)
// eslint-disable-next-line foldkit/block-name-matches-variable

const DeclaredArrayChildComposition = Block.makeDefinition(
  'DeclaredArrayChild',
  {
    Model: ArrayChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareArrayChildBlock = () =>
  DeclaredArrayChildComposition.prepareBlock({
    init: DeclaredArrayChildComposition.makeInit(() => ({
      model: ArrayChildModel.make([]),
    })),
    update: DeclaredArrayChildComposition.makeUpdate({
      UpdatedCount: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
export const arrayChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ArrayChildModel,
  typeof prepareArrayChildBlock
> = Block.assemble(prepareArrayChildBlock)
export const Model = Schema.Struct({
  child: ChildModel,
  argumentChild: ChildModel,
  maybeArgumentChild: Schema.Option(ChildModel),
  maybeChild: Schema.Option(ChildModel),
  suspendedMaybeChild: Schema.suspend(() => Schema.Option(ChildModel)),
  nestedChild: NestedOptionChildModel,
  maybeNestedChild: Schema.Option(NestedOptionChildModel),
  arrayChild: ArrayChildModel,
  route: Schema.Literals(['Home', 'Away']),
})
export const ParentMessage = Message.defineMessageUnion({
  IgnoredChildMessage: {},
})
// eslint-disable-next-line foldkit/block-name-matches-variable
export const ParentDefinition = Block.makeDefinition(
  'DeclaredDirectFieldParent',
  {
    Model,
    Message: ParentMessage,
  },
)
export const RequiredBinding = ParentDefinition.makeBinding(childBlock, {
  field: 'child',
})
export const OptionalBinding = ParentDefinition.makeBinding(childBlock, {
  field: 'maybeChild',
  presentWhen: model => model.route === 'Home',
})
export const SuspendedOptionalBinding = ParentDefinition.makeBinding(
  childBlock,
  {
    field: 'suspendedMaybeChild',
  },
)
export const NestedRequiredBinding = ParentDefinition.makeBinding(
  nestedOptionChildBlock,
  {
    field: 'nestedChild',
  },
)
export const NestedOptionalBinding = ParentDefinition.makeBinding(
  nestedOptionChildBlock,
  {
    field: 'maybeNestedChild',
  },
)
export const ArrayChildBinding = ParentDefinition.makeBinding(arrayChildBlock, {
  field: 'arrayChild',
})
export const CustomIgnoredMessageBinding = ParentDefinition.makeBinding(
  childBlock,
  {
    placement: 'customIgnoredMessage',
    field: 'suspendedMaybeChild',
  },
)
export const InitializedRequiredBinding = ParentDefinition.makeBinding(
  childBlock,
  {
    field: 'child',
    placement: 'initializedRequired',
    init: true,
  },
)
export const InitializedArgumentBinding = ParentDefinition.makeBinding(
  argumentChildBlock,
  {
    field: 'argumentChild',
    init: {
      contextToArgs: (context: InitializationContext) => [context.count],
    },
  },
)
export const InitializedOptionalBinding = ParentDefinition.makeBinding(
  argumentChildBlock,
  {
    field: 'maybeArgumentChild',
    init: {
      contextToArgs: (context: InitializationContext) => {
        if (Option.isSome(context.maybeCount)) {
          return Option.some([context.maybeCount.value])
        }

        return Option.none()
      },
    },
  },
)
export const NativeTupleOptionalBinding = ParentDefinition.makeBinding(
  argumentChildBlock,
  {
    field: 'maybeArgumentChild',
    placement: 'nativeTupleOptional',
    init: {
      contextToArgs: (context: Readonly<{ count: number }>) =>
        Option.some([context.count]),
    },
  },
)
export const InitializedCustomBinding = ParentDefinition.makeBinding(
  argumentChildBlock,
  {
    placement: 'initializedCustom',
    read: model => Option.some(model.argumentChild),
    write: (model, nextChild) =>
      Struct.modifyFields(model, { argumentChild: () => nextChild }),
    init: {
      contextToArgs: (context: InitializationContext) => [context.count],
      toParentFields: childModel => ({ argumentChild: childModel }),
    },
  },
)
// eslint-disable-next-line foldkit/block-name-matches-variable
export const initialComposition = ParentDefinition.makeComposition({
  bindings: [
    InitializedRequiredBinding,
    InitializedArgumentBinding,
    InitializedOptionalBinding,
    CustomIgnoredMessageBinding,
  ],
})
export type InitializationContext = Readonly<{
  count: number
  maybeCount: Option.Option<number>
}>
export const initialize = initialComposition.makeInit(
  (context: InitializationContext) => ({
    childInitContext: context,
    model: {
      maybeChild: Option.none(),
      suspendedMaybeChild: Option.none(),
      nestedChild: Option.none(),
      maybeNestedChild: Option.none(),
      arrayChild: [],
      route: 'Home',
    },
  }),
)
const prepareInitializedBlock = () =>
  initialComposition.prepareBlock({
    init: initialize,
    update: initialComposition.makeUpdate({
      IgnoredChildMessage: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
export const initializedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareInitializedBlock
> = Block.assemble(prepareInitializedBlock)
// eslint-disable-next-line foldkit/block-name-matches-variable
export const composition = ParentDefinition.makeComposition({
  bindings: [
    RequiredBinding,
    InitializedArgumentBinding,
    InitializedOptionalBinding,
    CustomIgnoredMessageBinding,
  ],
})
export const initial = Model.make({
  child: ChildModel.make({ count: 1 }),
  argumentChild: ChildModel.make({ count: 2 }),
  maybeArgumentChild: Option.none(),
  maybeChild: Option.none(),
  suspendedMaybeChild: Option.none(),
  nestedChild: Option.none(),
  maybeNestedChild: Option.none(),
  arrayChild: [],
  route: 'Home',
})
const DeclaredDirectFieldParentComposition = ParentDefinition.makeComposition({
  bindings: [
    OptionalBinding,
    InitializedArgumentBinding,
    InitializedOptionalBinding,
    CustomIgnoredMessageBinding,
  ],
})
export const setOptionalCount =
  DeclaredDirectFieldParentComposition.makeUpdate.withContext(
    (count: number) => ({
      IgnoredChildMessage: (model, _message) =>
        OptionalBinding.setCount(count)(model),
    }),
  )
export const foldOptional =
  DeclaredDirectFieldParentComposition.makeUpdate.withContext(
    (childMessage: typeof ChildMessage.Type) => ({
      IgnoredChildMessage: (model, _message) =>
        OptionalBinding.fold(model, childMessage),
    }),
  )
const result = setOptionalCount(initial, ParentMessage.IgnoredChildMessage(), 2)
const folded = foldOptional(
  initial,
  ParentMessage.IgnoredChildMessage(),
  ChildMessage.UpdatedCount({ count: 2 }),
)
void result
void folded
export const CustomBinding = ParentDefinition.makeBinding(childBlock, {
  placement: 'custom',
  read: model =>
    model.route === 'Home' ? Option.some(model.child) : Option.none(),
  write: (model, nextChild) =>
    Struct.modifyFields(model, { child: () => nextChild }),
})

export const GeneratedParentMessage = Message.defineMessageUnion({
  ClickedParent: {},
})
// eslint-disable-next-line foldkit/block-name-matches-variable
const GeneratedParentDefinition = Block.makeDefinition(
  'GeneratedDirectFieldParent',
  {
    Model,
    Message: GeneratedParentMessage,
  },
)
export const GeneratedChildBinding = GeneratedParentDefinition.makeBinding(
  childBlock,
  { field: 'child' },
)
export const GeneratedDirectFieldParentComposition =
  GeneratedParentDefinition.makeComposition({
    bindings: [GeneratedChildBinding],
  })
export const generatedUpdate = GeneratedDirectFieldParentComposition.makeUpdate(
  {
    ClickedParent: model => ({ model }),
  },
)

export const CallableModel = taggedStruct('DeclaredCallableParent', {
  child: ChildModel,
  maybeChild: Schema.Option(ChildModel),
})
const CallableParentMessage = Message.defineMessageUnion({
  IgnoredChildMessage: {},
})
// eslint-disable-next-line foldkit/block-name-matches-variable
const CallableParentDefinition = Block.makeDefinition(
  'DeclaredCallableFieldParent',
  {
    Model: CallableModel,
    Message: CallableParentMessage,
  },
)
export const CallableRequiredBinding = CallableParentDefinition.makeBinding(
  childBlock,
  {
    field: 'child',
  },
)
export const CallableOptionalBinding = CallableParentDefinition.makeBinding(
  childBlock,
  {
    field: 'maybeChild',
  },
)
// eslint-disable-next-line foldkit/block-name-matches-variable
export const callableComposition = CallableParentDefinition.makeComposition({
  bindings: [CallableRequiredBinding],
})
export const setCallableCount = callableComposition.makeUpdate.withContext(
  (count: number) => ({
    IgnoredChildMessage: (model, _message) =>
      CallableRequiredBinding.setCount(count)(model),
  }),
)

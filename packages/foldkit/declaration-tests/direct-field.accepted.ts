import { Layer, Option, Schema } from 'effect'
import { Block, Message, Struct } from 'foldkit'
import { taggedStruct } from 'foldkit/schema'

export const ChildModel = Schema.Struct({ count: Schema.Number })
export const ChildMessage = Message.defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})
// eslint-disable-next-line foldkit/block-name-matches-variable
const Child = Block.define('DeclaredDirectFieldChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const setCount = Child.step((model, count: number) => ({
  model: Struct.modifyFields(model, { count: () => count }),
}))
const DeclaredDirectFieldChildComposition = Child.makeComposition()
const childUpdate = DeclaredDirectFieldChildComposition.makeUpdate(
  (model, { count }) => setCount(model, count),
)
export const childBlock = DeclaredDirectFieldChildComposition.makeBlock({
  init: DeclaredDirectFieldChildComposition.makeInit(() => ({
    model: ChildModel.make({ count: 0 }),
  })),
  update: childUpdate,
  expose: { setCount },
  EffectsLayer: Layer.empty,
})
export const argumentChildBlock = DeclaredDirectFieldChildComposition.makeBlock(
  {
    init: DeclaredDirectFieldChildComposition.makeInit((count: number) => ({
      model: ChildModel.make({ count }),
    })),
    update: childUpdate,
    expose: { setCount },
    EffectsLayer: Layer.empty,
  },
)
export const NestedOptionChildModel = Schema.Option(ChildModel)
// eslint-disable-next-line foldkit/block-name-matches-variable
const NestedOptionChild = Block.define('DeclaredNestedOptionChild', {
  Model: NestedOptionChildModel,
  Message: ChildMessage,
})
const DeclaredNestedOptionChildComposition = NestedOptionChild.makeComposition()
export const nestedOptionChildBlock =
  DeclaredNestedOptionChildComposition.makeBlock({
    init: DeclaredNestedOptionChildComposition.makeInit(() => ({
      model: Option.none(),
    })),
    update: DeclaredNestedOptionChildComposition.makeUpdate(model => ({
      model,
    })),
    EffectsLayer: Layer.empty,
  })
export const ArrayChildModel = Schema.Array(Schema.String)
// eslint-disable-next-line foldkit/block-name-matches-variable
const ArrayChild = Block.define('DeclaredArrayChild', {
  Model: ArrayChildModel,
  Message: ChildMessage,
})
const DeclaredArrayChildComposition = ArrayChild.makeComposition()
export const arrayChildBlock = DeclaredArrayChildComposition.makeBlock({
  init: DeclaredArrayChildComposition.makeInit(() => ({
    model: ArrayChildModel.make([]),
  })),
  update: DeclaredArrayChildComposition.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.empty,
})
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
  // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
  GotChildMessage: { message: ChildMessage },
  // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
  GotArgumentChildMessage: { message: ChildMessage },
  // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
  GotOptionalArgumentChildMessage: { message: ChildMessage },
  IgnoredChildMessage: {},
  // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
  GotOptionalExtraMessage: {
    message: ChildMessage,
    requestId: Schema.optionalKey(Schema.String),
  },
})
// eslint-disable-next-line foldkit/block-name-matches-variable
export const Parent = Block.define('DeclaredDirectFieldParent', {
  Model,
  Message: ParentMessage,
})
export const RequiredBinding = Parent.bindChild(childBlock, {
  field: 'child',
  parentMessage: ParentMessage.GotChildMessage,
})
export const OptionalBinding = Parent.bindChild(childBlock, {
  field: 'maybeChild',
  presentWhen: model => model.route === 'Home',
  parentMessage: ParentMessage.GotChildMessage,
})
export const SuspendedOptionalBinding = Parent.bindChild(childBlock, {
  field: 'suspendedMaybeChild',
  parentMessage: ParentMessage.GotChildMessage,
})
export const NestedRequiredBinding = Parent.bindChild(nestedOptionChildBlock, {
  field: 'nestedChild',
  parentMessage: ParentMessage.GotChildMessage,
})
export const NestedOptionalBinding = Parent.bindChild(nestedOptionChildBlock, {
  field: 'maybeNestedChild',
  parentMessage: ParentMessage.GotChildMessage,
})
export const ArrayChildBinding = Parent.bindChild(arrayChildBlock, {
  field: 'arrayChild',
  parentMessage: ParentMessage.GotChildMessage,
})
export const CustomIgnoredMessageBinding = Parent.bindChild(childBlock, {
  placement: 'customIgnoredMessage',
  field: 'child',
  toParentMessage: () => ParentMessage.IgnoredChildMessage(),
  fromParentMessage: false,
})
export const InitializedRequiredBinding = Parent.bindChild(childBlock, {
  field: 'child',
  placement: 'initializedRequired',
  parentMessage: ParentMessage.GotChildMessage,
  init: true,
})
export const InitializedArgumentBinding = Parent.bindChild(argumentChildBlock, {
  field: 'argumentChild',
  parentMessage: ParentMessage.GotArgumentChildMessage,
  init: {
    args: (context: InitializationContext) => [context.count],
  },
})
export const InitializedOptionalBinding = Parent.bindChild(argumentChildBlock, {
  field: 'maybeArgumentChild',
  parentMessage: ParentMessage.GotOptionalArgumentChildMessage,
  init: {
    args: (context: InitializationContext) => {
      if (Option.isSome(context.maybeCount)) {
        return Option.some([context.maybeCount.value])
      }

      return Option.none()
    },
  },
})
export const NativeTupleOptionalBinding = Parent.bindChild(argumentChildBlock, {
  field: 'maybeArgumentChild',
  placement: 'nativeTupleOptional',
  parentMessage: ParentMessage.GotChildMessage,
  init: {
    args: (context: Readonly<{ count: number }>) =>
      Option.some([context.count]),
  },
})
export const InitializedCustomBinding = Parent.bindChild(argumentChildBlock, {
  placement: 'initializedCustom',
  read: model => Option.some(model.argumentChild),
  write: (model, nextChild) =>
    Struct.modifyFields(model, { argumentChild: () => nextChild }),
  parentMessage: ParentMessage.GotChildMessage,
  init: {
    args: (context: InitializationContext) => [context.count],
    model: childModel => ({ argumentChild: childModel }),
  },
})
// eslint-disable-next-line foldkit/block-name-matches-variable
export const initialComposition = Parent.makeComposition({
  childBindings: [
    InitializedRequiredBinding,
    InitializedArgumentBinding,
    InitializedOptionalBinding,
  ],
})
export type InitializationContext = Readonly<{
  count: number
  maybeCount: Option.Option<number>
}>
export const initialize = initialComposition.makeInit(
  (context: InitializationContext) => ({
    startup: context,
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
export const initializedBlock = initialComposition.makeBlock({
  init: initialize,
  update: initialComposition.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.empty,
})
// eslint-disable-next-line foldkit/block-name-matches-variable
export const composition = Parent.makeComposition({
  childBindings: [RequiredBinding],
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
const DeclaredDirectFieldParentComposition = Parent.makeComposition({
  childBindings: [OptionalBinding],
})
export const setOptionalCount = DeclaredDirectFieldParentComposition.makeUpdate(
  (model, _message, count: number) => OptionalBinding.setCount(count)(model),
)
export const foldOptional = DeclaredDirectFieldParentComposition.makeUpdate(
  (model, _message, childMessage: typeof ChildMessage.Type) =>
    OptionalBinding.fold(model, childMessage),
)
const result = setOptionalCount(initial, ParentMessage.IgnoredChildMessage(), 2)
const folded = foldOptional(
  initial,
  ParentMessage.IgnoredChildMessage(),
  ChildMessage.UpdatedCount({ count: 2 }),
)
void result
void folded
export const CustomBinding = Parent.bindChild(childBlock, {
  placement: 'custom',
  read: model =>
    model.route === 'Home' ? Option.some(model.child) : Option.none(),
  write: (model, nextChild) =>
    Struct.modifyFields(model, { child: () => nextChild }),
  parentMessage: ParentMessage.GotChildMessage,
})

export const CallableModel = taggedStruct('DeclaredCallableParent', {
  child: ChildModel,
  maybeChild: Schema.Option(ChildModel),
})
// eslint-disable-next-line foldkit/block-name-matches-variable
const CallableParent = Block.define('DeclaredCallableFieldParent', {
  Model: CallableModel,
  Message: ParentMessage,
})
export const CallableRequiredBinding = CallableParent.bindChild(childBlock, {
  field: 'child',
  parentMessage: ParentMessage.GotChildMessage,
})
export const CallableOptionalBinding = CallableParent.bindChild(childBlock, {
  field: 'maybeChild',
  parentMessage: ParentMessage.GotChildMessage,
})
// eslint-disable-next-line foldkit/block-name-matches-variable
export const callableComposition = CallableParent.makeComposition({
  childBindings: [CallableRequiredBinding],
})
export const setCallableCount = callableComposition.makeUpdate(
  (model, _message, count: number) =>
    CallableRequiredBinding.setCount(count)(model),
)

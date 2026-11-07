import { Context, Data, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'

export class FirstBuild extends Context.Service<
  FirstBuild,
  Readonly<{ isAvailable: boolean }>
>()('BulkChildAcquisition/FirstBuild') {}

export class SecondBuild extends Context.Service<
  SecondBuild,
  Readonly<{ isAvailable: boolean }>
>()('BulkChildAcquisition/SecondBuild') {}

export class FirstBuildFailure extends Data.TaggedError('FirstBuildFailure') {}

export class SecondBuildFailure extends Data.TaggedError(
  'SecondBuildFailure',
) {}

const FirstKey = Symbol('BulkChildAcquisitionFirst')
export const First = Block.make('BulkChildAcquisitionFirst', {
  key: FirstKey,
  Model: Schema.Struct({ first: Schema.String }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const FirstComposition = First.makeComposition()
export const firstInit = FirstComposition.makeInit(() => ({
  model: { first: 'first' },
}))
export const firstUpdate = FirstComposition.makeUpdate({})
export const firstLayer = First.makeLayer(
  Effect.gen(function* () {
    const build = yield* FirstBuild
    if (!build.isAvailable) {
      return yield* new FirstBuildFailure()
    }

    return { children: [], init: firstInit, update: firstUpdate }
  }),
)

const SecondKey = Symbol('BulkChildAcquisitionSecond')
export const Second = Block.make('BulkChildAcquisitionSecond', {
  key: SecondKey,
  Model: Schema.Struct({ second: Schema.Number }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const SecondComposition = Second.makeComposition()
export const secondInit = SecondComposition.makeInit(() => ({
  model: { second: 2 },
}))
export const secondUpdate = SecondComposition.makeUpdate({})
export const secondLayer = Second.makeLayer(
  Effect.gen(function* () {
    const build = yield* SecondBuild
    if (!build.isAvailable) {
      return yield* new SecondBuildFailure()
    }

    return { children: [], init: secondInit, update: secondUpdate }
  }),
)

const ParentKey = Symbol('BulkChildAcquisitionParent')
export const Parent = Block.make('BulkChildAcquisitionParent', {
  key: ParentKey,
  Model: Schema.Struct({ first: First.Model, second: Second.Model }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
export const FirstBinding = Parent.makeRequiredFieldBinding(First, {
  field: 'first',
})
export const SecondBinding = Parent.makeRequiredFieldBinding(Second, {
  field: 'second',
})
export const ParentComposition = Parent.makeComposition({
  bindings: [FirstBinding, SecondBinding],
})
export const parentInit = ParentComposition.makeInit(() => ({ model: {} }))
export const parentUpdate = ParentComposition.makeUpdate({})
export const acquireParentChildren = ParentComposition.acquireChildren

export const inlineParentLayer = Parent.makeLayer(
  Effect.gen(function* () {
    return {
      children: yield* ParentComposition.acquireChildren(),
      init: parentInit,
      update: parentUpdate,
    }
  }),
)

export const localParentLayer = Parent.makeLayer(
  Effect.gen(function* () {
    const acquireChildren = ParentComposition.acquireChildren
    const children = yield* acquireChildren()

    return { children, init: parentInit, update: parentUpdate }
  }),
)

export const individualParentLayer = Parent.makeLayer(
  Effect.gen(function* () {
    const first = yield* FirstBinding
    const second = yield* SecondBinding

    return {
      children: [first, second],
      init: parentInit,
      update: parentUpdate,
    }
  }),
)

export const selectedParentLayer = Layer.provide(
  inlineParentLayer,
  Layer.merge(firstLayer, secondLayer),
)
export const fullyProvidedParentLayer = Layer.provide(
  selectedParentLayer,
  Layer.merge(
    Layer.succeed(FirstBuild, { isAvailable: true }),
    Layer.succeed(SecondBuild, { isAvailable: true }),
  ),
)

const ChildlessKey = Symbol('BulkChildAcquisitionChildless')
export const Childless = Block.make('BulkChildAcquisitionChildless', {
  key: ChildlessKey,
  Model: Schema.Null,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
export const ChildlessComposition = Childless.makeComposition()
export const childlessLayer = Childless.makeLayer(
  Effect.gen(function* () {
    const children = yield* ChildlessComposition.acquireChildren()

    return {
      children,
      init: ChildlessComposition.makeInit(() => ({ model: null })),
      update: ChildlessComposition.makeUpdate({}),
    }
  }),
)

const ForeignParentKey = Symbol('BulkChildAcquisitionForeignParent')
const ForeignChildKey = Symbol('BulkChildAcquisitionForeignChild')
export const ForeignChild = Block.make('BulkChildAcquisitionForeignChild', {
  key: ForeignChildKey,
  Model: Schema.Struct({ foreign: Schema.Boolean }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
export const ForeignParent = Block.make('BulkChildAcquisitionForeignParent', {
  key: ForeignParentKey,
  Model: Schema.Struct({ foreign: ForeignChild.Model }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
export const ForeignFirstBinding = ForeignParent.makeRequiredFieldBinding(
  ForeignChild,
  { field: 'foreign' },
)
export const ForeignComposition = ForeignParent.makeComposition({
  bindings: [ForeignFirstBinding],
})

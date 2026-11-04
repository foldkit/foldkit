import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { withBlock } from 'foldkit/story'
import { makeVariantBinding } from 'foldkit/variantBinding'

const Active = Schema.Struct({
  _tag: Schema.Literal('Active'),
  count: Schema.Number,
})
const Inactive = Schema.Struct({
  _tag: Schema.Literal('Inactive'),
  reason: Schema.String,
})
const Model = Schema.Union([Active, Inactive])
const Message = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})
export const ChildKey = Symbol('UnifiedVariantChild')
export const ChildBlock = Block.make('UnifiedVariantChild', {
  key: ChildKey,
  Model: Active,
  Message,
  Init: Schema.Tuple([Schema.Number]),
})
const ChildComposition = ChildBlock.makeComposition()
const childLayer = ChildBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init: ChildComposition.makeInit(count => ({
        model: Active.make({ _tag: 'Active', count }),
      })),
      update: ChildComposition.makeUpdate({
        UpdatedCount: ChildBlock.makeFieldsStep.fromMessage(({ count }) => ({
          count: () => count,
        })),
      }),
    }
  }),
)
export const ParentKey = Symbol('UnifiedVariantParent')
export const ParentBlock = Block.make('UnifiedVariantParent', {
  key: ParentKey,
  Model,
  Message: Schema.Never,
  Init: Schema.Tuple([Schema.Number]),
})
export const ActiveBinding = makeVariantBinding(ParentBlock, ChildBlock)
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ActiveBinding],
})
export const layer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const active = yield* ActiveBinding

    return {
      children: [active],
      init: ParentComposition.makeInit(count =>
        ActiveBinding.init({
          args: [count],
          toParentModel: child => child,
        }),
      ),
      update: ParentComposition.makeUpdate({}),
    }
  }),
).pipe(Layer.provide(childLayer))

export const check = withBlock({ block: ParentBlock, layer }, executable => {
  const parentInit = executable.init(2)
  return parentInit.model
})

const OtherKey = Symbol('OtherUnifiedVariantParent')
const OtherBlock = Block.make('OtherUnifiedVariantParent', {
  key: OtherKey,
  Model,
  Message: Schema.Never,
  Init: Schema.Tuple([Schema.Number]),
})
const WrongKey = Symbol('WrongUnifiedVariantChild')
const WrongBlock = Block.make('WrongUnifiedVariantChild', {
  key: WrongKey,
  Model: Schema.Struct({ _tag: Schema.Literal('Active'), count: Schema.String }),
  Message,
  Init: Schema.Tuple([]),
})

if (false) {
  // @ts-expect-error The child Model must equal the entire parent variant.
  makeVariantBinding(ParentBlock, WrongBlock)
  // @ts-expect-error Whole-variant storage has no field selector.
  makeVariantBinding(ParentBlock, ChildBlock, { field: 'count' })
  // @ts-expect-error The relationship retains its parent owner.
  OtherBlock.makeComposition({ bindings: [ActiveBinding] })
  // @ts-expect-error Startup arguments retain their exact types.
  ActiveBinding.init({ args: ['2'], toParentModel: child => child })
}

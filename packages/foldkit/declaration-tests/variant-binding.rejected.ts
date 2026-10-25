import { Schema } from 'effect'
import { Block } from 'foldkit'
import { makeVariantBinding } from 'foldkit/variantBinding'

import {
  Active,
  ChildBinding,
  ChildBlock,
  ContextChild,
  DefaultContextChild,
  Inactive,
  OptionalContextChild,
  ParentDefinition,
  ParentModel,
  RestContextChild,
  SilentChild,
  UnselectedBinding,
} from './variant-binding.accepted.js'

const MissingTag = Block.makeDefinition('MissingTag', {
  Model: Schema.Union([Schema.Struct({ count: Schema.Number }), Inactive]),
  Message: Schema.Never,
})
// @ts-expect-error MissingTag does not declare the exact complete child variant.
makeVariantBinding(MissingTag, ChildBlock)

const WrongTag = Block.makeDefinition('WrongTag', {
  Model: Schema.Union([
    Schema.Struct({ _tag: Schema.Literal('Other'), count: Schema.Number }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error WrongTag does not declare the exact complete child variant.
makeVariantBinding(WrongTag, ChildBlock)

const OptionalTag = Block.makeDefinition('OptionalTag', {
  Model: Schema.Union([
    Schema.Struct({
      _tag: Schema.optionalKey(Schema.Literal('Active')),
      count: Schema.Number,
    }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error OptionalTag does not declare the exact complete child variant.
makeVariantBinding(OptionalTag, ChildBlock)

const WideTag = Block.makeDefinition('WideTag', {
  Model: Schema.Union([
    Schema.Struct({ _tag: Schema.String, count: Schema.Number }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error WideTag does not declare the exact complete child variant.
makeVariantBinding(WideTag, ChildBlock)

const TemplateTag = Block.makeDefinition('TemplateTag', {
  Model: Schema.Union([
    Schema.Struct({
      _tag: Schema.TemplateLiteral(['Active', Schema.String]),
      count: Schema.Number,
    }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error TemplateTag does not declare the exact complete child variant.
makeVariantBinding(TemplateTag, ChildBlock)

const WrongCount = Block.makeDefinition('WrongCount', {
  Model: Schema.Union([
    Schema.Struct({ _tag: Schema.Literal('Active'), count: Schema.String }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error WrongCount does not declare the exact complete child variant.
makeVariantBinding(WrongCount, ChildBlock)

const WiderCount = Block.makeDefinition('WiderCount', {
  Model: Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal('Active'),
      count: Schema.Union([Schema.Number, Schema.String]),
    }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error WiderCount does not declare the exact complete child variant.
makeVariantBinding(WiderCount, ChildBlock)

const ExtraParentField = Block.makeDefinition('ExtraParentField', {
  Model: Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal('Active'),
      count: Schema.Number,
      session: Schema.String,
    }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error ExtraParentField does not declare the exact complete child variant.
makeVariantBinding(ExtraParentField, ChildBlock)

const OptionalParentField = Block.makeDefinition('OptionalParentField', {
  Model: Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal('Active'),
      count: Schema.Number,
      session: Schema.optionalKey(Schema.String),
    }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error OptionalParentField does not declare the exact complete child variant.
makeVariantBinding(OptionalParentField, ChildBlock)

const Wrapper = Block.makeDefinition('Wrapper', {
  Model: Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal('Active'),
      child: Active,
      session: Schema.String,
    }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error Wrapper does not declare the exact complete child variant.
makeVariantBinding(Wrapper, ChildBlock)

const Ambiguous = Block.makeDefinition('Ambiguous', {
  Model: Schema.Union([
    Active,
    Schema.Struct({
      _tag: Schema.Literal('Active'),
      count: Schema.Number,
      extra: Schema.String,
    }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error The same tag cannot select two distinct members.
makeVariantBinding(Ambiguous, ChildBlock)
const Duplicate = Block.makeDefinition('Duplicate', {
  Model: Schema.Union([Active, Active, Inactive]),
  Message: Schema.Never,
})
// @ts-expect-error Duplicate member tags are rejected even if their Types match.
makeVariantBinding(Duplicate, ChildBlock)
const Nested = Block.makeDefinition('Nested', {
  Model: Schema.Struct({ slot: ParentModel }),
  Message: Schema.Never,
})
// @ts-expect-error Wrapped/nested storage requires the native accessor Binding.
makeVariantBinding(Nested, ChildBlock)
const UnionComposition = Block.makeDefinition('UnionChild', {
  Model: ParentModel,
  Message: Schema.Never,
}).makeComposition()
const prepareUnion = () =>
  UnionComposition.prepareBlock({
    init: UnionComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: UnionComposition.makeUpdate({}),
  })
const UnionChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareUnion
> = Block.assemble(prepareUnion)
// @ts-expect-error A child must occupy exactly one literal tag.
makeVariantBinding(ParentDefinition, UnionChild)
const customReader = { read: () => undefined }
// @ts-expect-error A derived variant Binding cannot mix in custom accessors.
makeVariantBinding(ParentDefinition, ChildBlock, customReader)
const customWriter = { write: (model: typeof ParentModel.Type) => model }
// @ts-expect-error Writing is determined by exact whole-member storage.
makeVariantBinding(ParentDefinition, ChildBlock, customWriter)
// @ts-expect-error A variant tag determines membership, not a separate presence switch.
makeVariantBinding(ParentDefinition, ChildBlock, { presentWhen: () => true })
// @ts-expect-error This helper does not invent collection or keyed identity.
makeVariantBinding(ParentDefinition, ChildBlock, { key: 'count' })
// @ts-expect-error Parent initialization remains explicit.
makeVariantBinding(ParentDefinition, ChildBlock, { init: { args: [0] } })
// @ts-expect-error Contextful child delivery must select exact update context.
makeVariantBinding(ParentDefinition, ContextChild)
const missingContext = { delivery: { when: () => true } }
// @ts-expect-error Contextful child delivery cannot omit toUpdateContext.
makeVariantBinding(ParentDefinition, ContextChild, missingContext)
const wrongContext = { delivery: { toUpdateContext: () => ['wrong'] } }
// @ts-expect-error The child context is one number.
makeVariantBinding(ParentDefinition, ContextChild, wrongContext)
// @ts-expect-error Message-free children cannot configure delivery.
makeVariantBinding(ParentDefinition, SilentChild, missingContext)
// @ts-expect-error Only actual child Subscription keys can be gated.
makeVariantBinding(ParentDefinition, ChildBlock, {
  subscriptions: { when: { missing: () => true } },
})
// @ts-expect-error Every emitting child still needs an explicit OutMessage policy.
ParentDefinition.makeComposition({ bindings: [UnselectedBinding] })
const MissingComposition = ParentDefinition.makeComposition()
MissingComposition.makeUpdate({
  // @ts-expect-error Connected operations retain exact registration evidence.
  RequestedSetCount: (model, { count }) => ChildBinding.setCount(count)(model),
  RequestedNotify: model => ({ model }),
})
// @ts-expect-error A child operation cannot run on a plain unregistered parent Model.
ChildBinding.setCount(1)(Active.make({ _tag: 'Active', count: 0 }))
// @ts-expect-error Wrong init arguments are not widened by the helper.
ChildBinding.init({ args: ['wrong'], toParentModel: child => child })
// @ts-expect-error The full parent Model is required from dynamic initialization.
ChildBinding.init({ args: [0], toParentModel: () => ({ count: 0 }) })

const BrandedCount = Block.makeDefinition('BrandedVariantCount', {
  Model: Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal('Active'),
      count: Schema.Number.pipe(Schema.brand('Count')),
    }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error A child with ordinary numbers cannot replace a branded parent field.
makeVariantBinding(BrandedCount, ChildBlock)
const NarrowCount = Block.makeDefinition('NarrowVariantCount', {
  Model: Schema.Union([
    Schema.Struct({ _tag: Schema.Literal('Active'), count: Schema.Literal(0) }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error A child with ordinary numbers cannot replace a literal parent field.
makeVariantBinding(NarrowCount, ChildBlock)
const OpenMember = Block.makeDefinition('OpenVariantMember', {
  Model: Schema.Union([
    Schema.StructWithRest(Active, [
      Schema.Record(Schema.String, Schema.Unknown),
    ]),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error Open members have parent-owned properties outside the complete child Model.
makeVariantBinding(OpenMember, ChildBlock)

const subscriptionsExtra = { subscriptions: { extra: true } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsExtra)

const subscriptionsNumber = { subscriptions: 1 }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsNumber)

const subscriptionsNull = { subscriptions: null }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsNull)

const subscriptionsArray = { subscriptions: [] }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsArray)

const subscriptionsFunction = { subscriptions: () => true }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsFunction)

const subscriptionsLayer = { subscriptions: { when: { layer: () => true } } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsLayer)

const subscriptionsNarrow = {
  subscriptions: { when: (model: typeof Active.Type) => model.count > 0 },
}
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsNarrow)

const subscriptionsNonBoolean = { subscriptions: { when: () => 1 } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsNonBoolean)

const subscriptionsEntryNarrow = {
  subscriptions: {
    when: { activity: (model: typeof Active.Type) => model.count > 0 },
  },
}
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsEntryNarrow)

const subscriptionsEntryNumber = {
  subscriptions: { when: { activity: () => 1 } },
}
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsEntryNumber)

const subscriptionsGateNull = { subscriptions: { when: null } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsGateNull)

const subscriptionsGateArray = { subscriptions: { when: [] } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, subscriptionsGateArray)

const deliveryExtra = { delivery: { extra: true } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, deliveryExtra)

const deliveryNumber = { delivery: 1 }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, deliveryNumber)

const deliveryNull = { delivery: null }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, deliveryNull)

const deliveryArray = { delivery: [] }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, deliveryArray)

const deliveryFunction = { delivery: () => true }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, deliveryFunction)

const deliveryNarrow = {
  delivery: { when: (model: typeof Active.Type) => model.count > 0 },
}
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, deliveryNarrow)

const deliveryNonBoolean = { delivery: { when: () => 1 } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
makeVariantBinding(ParentDefinition, ChildBlock, deliveryNonBoolean)

const narrowContext = {
  delivery: { toUpdateContext: (model: typeof Active.Type) => [model.count] },
}
// @ts-expect-error Context selection receives the whole parent union.
makeVariantBinding(ParentDefinition, ContextChild, narrowContext)
const extraContext = { delivery: { toUpdateContext: () => [1, 2] } }
// @ts-expect-error The required context is exactly one argument.
makeVariantBinding(ParentDefinition, ContextChild, extraContext)
// @ts-expect-error The outer options container is an object record.
makeVariantBinding(ParentDefinition, ChildBlock, [])
// @ts-expect-error The outer options container is an object record.
makeVariantBinding(ParentDefinition, ChildBlock, () => ({}))

// @ts-expect-error Every contextful child needs an explicit context selector.
makeVariantBinding(ParentDefinition, OptionalContextChild)
// @ts-expect-error Context tuple element types remain exact.
makeVariantBinding(ParentDefinition, OptionalContextChild, wrongContext)

// @ts-expect-error Every contextful child needs an explicit context selector.
makeVariantBinding(ParentDefinition, DefaultContextChild)
// @ts-expect-error Context tuple element types remain exact.
makeVariantBinding(ParentDefinition, DefaultContextChild, wrongContext)

// @ts-expect-error Every contextful child needs an explicit context selector.
makeVariantBinding(ParentDefinition, RestContextChild)
// @ts-expect-error Context tuple element types remain exact.
makeVariantBinding(ParentDefinition, RestContextChild, wrongContext)

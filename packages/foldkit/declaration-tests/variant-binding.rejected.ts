import { Schema } from 'effect'
import { Block } from 'foldkit'
// @ts-expect-error Variant relationships are authored through the owning parent Block.
import { makeVariantBinding as legacyMakeVariantBinding } from 'foldkit/variantBinding'

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

void legacyMakeVariantBinding

const MissingTag = Block.makeDefinition('MissingTag', {
  Model: Schema.Union([Schema.Struct({ count: Schema.Number }), Inactive]),
  Message: Schema.Never,
})
// @ts-expect-error MissingTag does not declare the exact complete child variant.
MissingTag.makeVariantBinding(ChildBlock)

const WrongTag = Block.makeDefinition('WrongTag', {
  Model: Schema.Union([
    Schema.Struct({ _tag: Schema.Literal('Other'), count: Schema.Number }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error WrongTag does not declare the exact complete child variant.
WrongTag.makeVariantBinding(ChildBlock)

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
OptionalTag.makeVariantBinding(ChildBlock)

const WideTag = Block.makeDefinition('WideTag', {
  Model: Schema.Union([
    Schema.Struct({ _tag: Schema.String, count: Schema.Number }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error WideTag does not declare the exact complete child variant.
WideTag.makeVariantBinding(ChildBlock)

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
TemplateTag.makeVariantBinding(ChildBlock)

const WrongCount = Block.makeDefinition('WrongCount', {
  Model: Schema.Union([
    Schema.Struct({ _tag: Schema.Literal('Active'), count: Schema.String }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error WrongCount does not declare the exact complete child variant.
WrongCount.makeVariantBinding(ChildBlock)

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
WiderCount.makeVariantBinding(ChildBlock)

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
ExtraParentField.makeVariantBinding(ChildBlock)

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
OptionalParentField.makeVariantBinding(ChildBlock)

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
Wrapper.makeVariantBinding(ChildBlock)

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
Ambiguous.makeVariantBinding(ChildBlock)
const Duplicate = Block.makeDefinition('Duplicate', {
  Model: Schema.Union([Active, Active, Inactive]),
  Message: Schema.Never,
})
// @ts-expect-error Duplicate member tags are rejected even if their Types match.
Duplicate.makeVariantBinding(ChildBlock)
const Nested = Block.makeDefinition('Nested', {
  Model: Schema.Struct({ slot: ParentModel }),
  Message: Schema.Never,
})
// @ts-expect-error Wrapped/nested storage requires the native accessor Binding.
Nested.makeVariantBinding(ChildBlock)
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
ParentDefinition.makeVariantBinding(UnionChild)
const customReader = { read: () => undefined }
// @ts-expect-error A derived variant Binding cannot mix in custom accessors.
ParentDefinition.makeVariantBinding(ChildBlock, customReader)
const customWriter = { write: (model: typeof ParentModel.Type) => model }
// @ts-expect-error Writing is determined by exact whole-member storage.
ParentDefinition.makeVariantBinding(ChildBlock, customWriter)
// @ts-expect-error Variant membership is determined by the active tag, not activeWhen.
ParentDefinition.makeVariantBinding(ChildBlock, { activeWhen: () => true })
// @ts-expect-error This helper does not invent collection or keyed identity.
ParentDefinition.makeVariantBinding(ChildBlock, { key: 'count' })
// @ts-expect-error Parent initialization remains explicit.
ParentDefinition.makeVariantBinding(ChildBlock, { init: { args: [0] } })
// @ts-expect-error Contextful child delivery must select exact update context.
ParentDefinition.makeVariantBinding(ContextChild)
const missingContext = { delivery: { when: () => true } }
// @ts-expect-error Contextful child delivery cannot omit toUpdateContext.
ParentDefinition.makeVariantBinding(ContextChild, missingContext)
const wrongContext = { delivery: { toUpdateContext: () => ['wrong'] } }
// @ts-expect-error The child context is one number.
ParentDefinition.makeVariantBinding(ContextChild, wrongContext)
// @ts-expect-error Message-free children cannot configure delivery.
ParentDefinition.makeVariantBinding(SilentChild, missingContext)
// @ts-expect-error Only actual child Subscription keys can be gated.
ParentDefinition.makeVariantBinding(ChildBlock, {
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
BrandedCount.makeVariantBinding(ChildBlock)
const NarrowCount = Block.makeDefinition('NarrowVariantCount', {
  Model: Schema.Union([
    Schema.Struct({ _tag: Schema.Literal('Active'), count: Schema.Literal(0) }),
    Inactive,
  ]),
  Message: Schema.Never,
})
// @ts-expect-error A child with ordinary numbers cannot replace a literal parent field.
NarrowCount.makeVariantBinding(ChildBlock)
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
OpenMember.makeVariantBinding(ChildBlock)

const subscriptionsExtra = { subscriptions: { extra: true } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsExtra)

const subscriptionsNumber = { subscriptions: 1 }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsNumber)

const subscriptionsNull = { subscriptions: null }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsNull)

const subscriptionsArray = { subscriptions: [] }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsArray)

const subscriptionsFunction = { subscriptions: () => true }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsFunction)

const subscriptionsLayer = { subscriptions: { when: { layer: () => true } } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsLayer)

const subscriptionsNarrow = {
  subscriptions: { when: (model: typeof Active.Type) => model.count > 0 },
}
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsNarrow)

const subscriptionsNonBoolean = { subscriptions: { when: () => 1 } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsNonBoolean)

const subscriptionsEntryNarrow = {
  subscriptions: {
    when: { activity: (model: typeof Active.Type) => model.count > 0 },
  },
}
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsEntryNarrow)

const subscriptionsEntryNumber = {
  subscriptions: { when: { activity: () => 1 } },
}
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsEntryNumber)

const subscriptionsGateNull = { subscriptions: { when: null } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsGateNull)

const subscriptionsGateArray = { subscriptions: { when: [] } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, subscriptionsGateArray)

const deliveryExtra = { delivery: { extra: true } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, deliveryExtra)

const deliveryNumber = { delivery: 1 }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, deliveryNumber)

const deliveryNull = { delivery: null }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, deliveryNull)

const deliveryArray = { delivery: [] }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, deliveryArray)

const deliveryFunction = { delivery: () => true }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, deliveryFunction)

const deliveryNarrow = {
  delivery: { when: (model: typeof Active.Type) => model.count > 0 },
}
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, deliveryNarrow)

const deliveryNonBoolean = { delivery: { when: () => 1 } }
// @ts-expect-error Nested options preserve their complete object and callback contracts.
ParentDefinition.makeVariantBinding(ChildBlock, deliveryNonBoolean)

const narrowContext = {
  delivery: { toUpdateContext: (model: typeof Active.Type) => [model.count] },
}
// @ts-expect-error Context selection receives the whole parent union.
ParentDefinition.makeVariantBinding(ContextChild, narrowContext)
const extraContext = { delivery: { toUpdateContext: () => [1, 2] } }
// @ts-expect-error The required context is exactly one argument.
ParentDefinition.makeVariantBinding(ContextChild, extraContext)
// @ts-expect-error The outer options container is an object record.
ParentDefinition.makeVariantBinding(ChildBlock, [])
// @ts-expect-error The outer options container is an object record.
ParentDefinition.makeVariantBinding(ChildBlock, () => ({}))

// @ts-expect-error Every contextful child needs an explicit context selector.
ParentDefinition.makeVariantBinding(OptionalContextChild)
// @ts-expect-error Context tuple element types remain exact.
ParentDefinition.makeVariantBinding(OptionalContextChild, wrongContext)

// @ts-expect-error Every contextful child needs an explicit context selector.
ParentDefinition.makeVariantBinding(DefaultContextChild)
// @ts-expect-error Context tuple element types remain exact.
ParentDefinition.makeVariantBinding(DefaultContextChild, wrongContext)

// @ts-expect-error Every contextful child needs an explicit context selector.
ParentDefinition.makeVariantBinding(RestContextChild)
// @ts-expect-error Context tuple element types remain exact.
ParentDefinition.makeVariantBinding(RestContextChild, wrongContext)

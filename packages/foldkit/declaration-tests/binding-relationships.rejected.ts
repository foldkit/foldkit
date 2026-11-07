import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Struct } from 'foldkit'

import {
  ArrayModelBlock,
  ChildBlock,
  ChildId,
  ChildModel,
  ContextChildBlock,
  OptionModelBlock,
  ParentBlock,
  type ParentModel,
  VariantChildBlock,
  childLayer,
  makeCustomBinding,
  makeDetachedCustomKeyedBinding as makeCustomKeyedBinding,
  makeHashMapBinding,
  makeKeyedArrayBinding,
  makeOptionalFieldBinding,
  makeOptionalKeyedFieldBinding,
  makeDetachedRecordBinding as makeRecordBinding,
  makeDetachedRequiredBinding as makeRequiredFieldBinding,
} from './binding-relationships.accepted.js'

// @ts-expect-error Relationship authoring requires an explicit constructor.
ParentBlock.makeBinding(ChildBlock, { field: 'requiredChild' })
// @ts-expect-error Record and HashMap relationships require distinct constructors.
ParentBlock.makeMapBinding(ChildBlock, { field: 'childrenById' })

// @ts-expect-error A required-field constructor rejects parent-owned Option storage.
makeRequiredFieldBinding(ChildBlock, { field: 'maybeChild' })
// @ts-expect-error An optional-field constructor rejects a required child field.
makeOptionalFieldBinding(ChildBlock, { field: 'requiredChild' })
// @ts-expect-error activeWhen replaces the retired presentWhen gate.
makeRequiredFieldBinding(ChildBlock, {
  field: 'requiredChild',
  presentWhen: () => true,
})
// @ts-expect-error A required child whose own Model is Option is not an optional relationship.
makeOptionalFieldBinding(OptionModelBlock, { field: 'optionModelChild' })
// @ts-expect-error A required child whose own Model is Array is not a keyed-array relationship.
makeKeyedArrayBinding(ArrayModelBlock, {
  field: 'arrayModelChild',
  key: 'length',
})
// @ts-expect-error Direct keyed initialization still requires array storage in the parent Model.
makeKeyedArrayBinding(ChildBlock, {
  field: 'requiredChild',
  key: 'id',
  init: { instances: () => [] },
})

// @ts-expect-error Optional-keyed storage must be an Option wrapper.
makeOptionalKeyedFieldBinding(ChildBlock, {
  field: 'wrappedChildren',
  key: 'id',
  childField: 'child',
})
// @ts-expect-error The key must name the wrapper's exact occurrence key.
makeOptionalKeyedFieldBinding(ChildBlock, {
  field: 'maybeKeyedChild',
  key: 'missing',
  childField: 'child',
})
// @ts-expect-error The child field must contain the exact child Model.
makeOptionalKeyedFieldBinding(ChildBlock, {
  field: 'maybeKeyedChild',
  key: 'id',
  childField: 'id',
})

// @ts-expect-error Keyed-array storage rejects an Option wrapper.
makeKeyedArrayBinding(ChildBlock, {
  field: 'maybeKeyedChild',
  key: 'id',
  childField: 'child',
})
// @ts-expect-error The key must name a required child field.
makeKeyedArrayBinding(ChildBlock, {
  field: 'children',
  key: 'missing',
})
// @ts-expect-error A wrapped array child field must contain the exact child Model.
makeKeyedArrayBinding(ChildBlock, {
  field: 'wrappedChildren',
  key: 'id',
  childField: 'note',
})

makeKeyedArrayBinding(ChildBlock, {
  field: 'children',
  key: 'id',
  // @ts-expect-error Direct keyed field storage cannot add an accessor enumerator.
  readAll: (model: ParentModel) => model.children,
})
makeKeyedArrayBinding(ChildBlock, {
  field: 'children',
  key: 'id',
  // @ts-expect-error Direct keyed field storage cannot add an accessor writer.
  writeAt: (model: ParentModel) => model,
})
// @ts-expect-error Wrapped keyed field storage cannot add an accessor enumerator.
makeKeyedArrayBinding(ChildBlock, {
  field: 'wrappedChildren',
  key: 'id',
  childField: 'child',
  readAll: (model: ParentModel) => model.wrappedChildren,
})
// @ts-expect-error Wrapped keyed field storage cannot add an accessor writer.
makeKeyedArrayBinding(ChildBlock, {
  field: 'wrappedChildren',
  key: 'id',
  childField: 'child',
  writeAt: (model: ParentModel) => model,
})

// @ts-expect-error Wrapped keyed startup initialization requires a parent-owned item adapter.
makeKeyedArrayBinding(ChildBlock, {
  field: 'wrappedChildren',
  key: 'id',
  childField: 'child',
  init: {
    instances: () => [
      {
        key: ChildId.make('wrapped'),
        args: [ChildId.make('wrapped'), 'wrapped'],
      },
    ],
  },
})

makeRecordBinding(ChildBlock, {
  // @ts-expect-error Record Bindings reject HashMap storage.
  field: 'childrenByNumber',
})
makeHashMapBinding(ChildBlock, {
  // @ts-expect-error HashMap Bindings reject Record storage.
  field: 'childrenById',
})
makeRecordBinding(ChildBlock, {
  // @ts-expect-error Record Bindings reject arrays even when their item is the child Model.
  field: 'children',
})

makeCustomBinding(ChildBlock, {
  placement: 'badCustom',
  read: () =>
    ChildModel.make({ id: ChildId.make('bad-custom'), label: 'bad-custom' }),
  write: (model, child) =>
    Struct.modifyFields(model, {
      maybeCustomChild: () => Option.some(child),
    }),
  // @ts-expect-error Unkeyed custom Bindings do not accept keyed enumeration.
  readAll: () => [],
})
makeCustomKeyedBinding(ChildBlock, {
  placement: 'badCustomKeyed',
  readAll: model => model.customChildren,
  key: entry => entry.id,
  keySchema: ChildId,
  read: entry => entry.child,
  writeAt: model => model,
  // @ts-expect-error Keyed custom Bindings do not accept an unkeyed writer.
  write: model => model,
})
makeCustomKeyedBinding(ChildBlock, {
  placement: 'missingKeySchema',
  readAll: model => model.customChildren,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  // @ts-expect-error Generated custom-keyed delivery requires an exact key Schema.
  keySchema: undefined,
})
makeCustomKeyedBinding(ContextChildBlock, {
  placement: 'missingContext',
  readAll: model => model.customChildren,
  key: entry => entry.id,
  keySchema: ChildId,
  read: entry => entry.child,
  writeAt: model => model,
  delivery: {
    // @ts-expect-error Contextful custom-keyed children retain their required update context.
    toUpdateContext: () => [],
  },
})

const ForeignVariantParentModel = Schema.Union([
  Schema.TaggedStruct('Child', { value: Schema.String }),
  Schema.TaggedStruct('Empty', {}),
])
const ForeignVariantParentKey = Symbol(
  'BindingRelationshipsForeignVariantParent',
)
const ForeignVariantParentBlock = Block.make(
  'BindingRelationshipsForeignVariantParent',
  {
    key: ForeignVariantParentKey,
    Model: ForeignVariantParentModel,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  },
)
// @ts-expect-error Variant Bindings require the exact child Model Schema member.
ForeignVariantParentBlock.makeVariantBinding(VariantChildBlock)

// @ts-expect-error Relationship constructors remain owned by their exact parent Block.
ParentBlock.makeRequiredFieldBinding(VariantChildBlock, {
  field: 'requiredChild',
})

const MissingEffectsParentModel = Schema.Struct({ child: ChildModel })
const MissingEffectsParentKey = Symbol(
  'BindingRelationshipsMissingEffectsParent',
)
const MissingEffectsParentBlock = Block.make(
  'BindingRelationshipsMissingEffectsParent',
  {
    key: MissingEffectsParentKey,
    Model: MissingEffectsParentModel,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  },
)
const MissingEffectsChildBinding =
  MissingEffectsParentBlock.makeRequiredFieldBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
const MissingEffectsParentComposition =
  MissingEffectsParentBlock.makeComposition({
    bindings: [MissingEffectsChildBinding],
  })
const missingEffectsParentInit = MissingEffectsParentComposition.makeInit(
  () => ({
    model: MissingEffectsParentModel.make({
      child: ChildModel.make({
        id: ChildId.make('missing-effects'),
        label: 'missing-effects',
      }),
    }),
    steps: [MissingEffectsChildBinding.requestRead()],
  }),
)
// @ts-expect-error Completion rejects child Command Services and errors omitted by the parent contract.
MissingEffectsParentBlock.makeLayer(
  Effect.gen(function* () {
    const child = yield* MissingEffectsChildBinding

    return {
      children: [child],
      init: missingEffectsParentInit,
      update: MissingEffectsParentComposition.makeUpdate({}),
    }
  }),
).pipe(Layer.provide(childLayer))

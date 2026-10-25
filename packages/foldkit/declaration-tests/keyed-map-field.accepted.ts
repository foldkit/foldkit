import { HashMap, Layer, Schema } from 'effect'
import { Block, Message, Struct } from 'foldkit'
import { makeMapBinding } from 'foldkit/mapBinding'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = Message.defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})

const ChildComposition = Block.makeDefinition('DeclarationKeyedMapChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: ChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
    }),
    EffectsLayer: Layer.empty,
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const Wrapper = Schema.Struct({
  child: ChildBlock.Model,
  label: Schema.String,
})
const Pair = Schema.Struct({
  lower: ChildBlock.Model,
  upper: ChildBlock.Model,
})
export const ParentModel = Schema.Struct({
  childrenById: Schema.Record(Schema.String, ChildBlock.Model),
  finiteChildren: Schema.Record(
    Schema.Literals(['Start', 'End']),
    ChildBlock.Model,
  ),
  rowsById: Schema.Record(Schema.String, Wrapper),
  childrenByNumber: Schema.HashMap(Schema.Finite, ChildBlock.Model),
  broadNumberChildren: Schema.HashMap(Schema.Number, ChildBlock.Model),
  hashRowsById: Schema.HashMap(Schema.String, Wrapper),
  pairsById: Schema.Record(Schema.String, Pair),
})
export const ParentDefinition = Block.makeDefinition(
  'DeclarationKeyedMapParent',
  {
    Model: ParentModel,
    Message: Schema.Never,
  },
)

export const ChildrenByIdBinding = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  {
    field: 'childrenById',
  },
)
export const FiniteChildrenBinding = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  {
    field: 'finiteChildren',
  },
)
export const RowsByIdBinding = makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'rowsById',
  childField: 'child',
})
export const ChildrenByNumberBinding = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  {
    field: 'childrenByNumber',
    subscriptions: {
      when: (model, key) =>
        HashMap.has(model.childrenByNumber, key) &&
        globalThis.Number.isFinite(key),
    },
  },
)
export const HashRowsByIdBinding = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  {
    field: 'hashRowsById',
    childField: 'child',
    placement: 'hashRows',
  },
)
export const BroadNumberChildrenBinding = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  { field: 'broadNumberChildren' },
)
export const LowerChildrenBinding = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  {
    field: 'pairsById',
    childField: 'lower',
    placement: 'lowerChildren',
  },
)
export const UpperChildrenBinding = makeMapBinding(
  ParentDefinition,
  ChildBlock,
  {
    field: 'pairsById',
    childField: 'upper',
    placement: 'upperChildren',
  },
)

export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [
    ChildrenByIdBinding,
    FiniteChildrenBinding,
    RowsByIdBinding,
    ChildrenByNumberBinding,
    BroadNumberChildrenBinding,
    HashRowsByIdBinding,
    LowerChildrenBinding,
    UpperChildrenBinding,
  ],
})
export const update = ParentComposition.makeUpdate({})
export const initialize = ParentComposition.makeInit(() =>
  ChildrenByIdBinding.init({
    key: 'created',
    args: [],
    toParentModel: child =>
      ParentModel.make({
        childrenById: { created: child },
        finiteChildren: {
          Start: ChildModel.make({ count: 0 }),
          End: ChildModel.make({ count: 0 }),
        },
        rowsById: {},
        childrenByNumber: HashMap.empty(),
        broadNumberChildren: HashMap.empty(),
        hashRowsById: HashMap.empty(),
        pairsById: {},
      }),
  }),
)

export const initialModel = initialize().model

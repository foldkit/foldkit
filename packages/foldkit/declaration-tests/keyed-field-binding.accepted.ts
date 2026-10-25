import { Array, Context, Effect, Layer, Option, Schema } from 'effect'
import {
  Block,
  Schema as FoldkitSchema,
  Message,
  Struct,
  Update,
} from 'foldkit'

const ChildModel = Schema.Struct({ id: Schema.String, count: Schema.Number })
const ChildMessage = Message.defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
  CompletedReadCount: { count: Schema.Number },
  RequestedRefresh: {},
  RequestedSelect: {},
})

const DeclarationKeyedFieldChildComposition = Block.makeDefinition(
  'DeclarationKeyedFieldChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareChildBlock = () =>
  DeclarationKeyedFieldChildComposition.prepareBlock({
    init: DeclarationKeyedFieldChildComposition.makeInit(() => ({
      model: ChildModel.make({ id: 'initial', count: 0 }),
    })),
    update: DeclarationKeyedFieldChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
      RequestedRefresh: model => ({ model }),
      RequestedSelect: model => ({ model }),
      CompletedReadCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
    }),
    EffectsLayer: Layer.empty,
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

export const CallableChildModel = FoldkitSchema.taggedStruct(
  'DeclarationCallableKeyedFieldChild',
  { id: Schema.String, count: Schema.Number },
)

const DeclarationCallableKeyedFieldChildComposition = Block.makeDefinition(
  'DeclarationCallableKeyedFieldChild',
  {
    Model: CallableChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareCallableChildBlock = () =>
  DeclarationCallableKeyedFieldChildComposition.prepareBlock({
    init: DeclarationCallableKeyedFieldChildComposition.makeInit(() => ({
      model: CallableChildModel({ id: 'initial', count: 0 }),
    })),
    update: DeclarationCallableKeyedFieldChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
      RequestedRefresh: model => ({ model }),
      RequestedSelect: model => ({ model }),
      CompletedReadCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
    }),
    EffectsLayer: Layer.empty,
  })
export const CallableChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof CallableChildModel,
  typeof prepareCallableChildBlock
> = Block.assemble(prepareCallableChildBlock)

export const RefinedId = Schema.String.pipe(
  Schema.brand('DeclarationKeyedFieldRefinedId'),
)
const RefinedKeyModel = Schema.Struct({
  id: RefinedId,
  kind: Schema.Literal('Child'),
  count: Schema.Number,
})
const RefinedKeyMessage = Message.defineMessageUnion({ UpdatedCount: {} })

const DeclarationRefinedKeyChildComposition = Block.makeDefinition(
  'DeclarationRefinedKeyChild',
  {
    Model: RefinedKeyModel,
    Message: RefinedKeyMessage,
  },
).makeComposition()
const prepareRefinedKeyBlock = () =>
  DeclarationRefinedKeyChildComposition.prepareBlock({
    init: DeclarationRefinedKeyChildComposition.makeInit(() => ({
      model: RefinedKeyModel.make({
        id: Schema.decodeSync(RefinedId)('initial'),
        kind: 'Child',
        count: 0,
      }),
    })),
    update: DeclarationRefinedKeyChildComposition.makeUpdate({
      UpdatedCount: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.empty,
  })
export const RefinedKeyBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof RefinedKeyModel,
  typeof prepareRefinedKeyBlock
> = Block.assemble(prepareRefinedKeyBlock)

const ArrayChildModel = Schema.Array(Schema.String)
const ArrayChildMessage = Message.defineMessageUnion({ IgnoredValue: {} })

const DeclarationArrayModelChildComposition = Block.makeDefinition(
  'DeclarationArrayModelChild',
  {
    Model: ArrayChildModel,
    Message: ArrayChildMessage,
  },
).makeComposition()
const prepareArrayChildBlock = () =>
  DeclarationArrayModelChildComposition.prepareBlock({
    init: DeclarationArrayModelChildComposition.makeInit(() => ({
      model: ArrayChildModel.make(['initial']),
    })),
    update: DeclarationArrayModelChildComposition.makeUpdate({
      IgnoredValue: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.empty,
  })
export const ArrayChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ArrayChildModel,
  typeof prepareArrayChildBlock
> = Block.assemble(prepareArrayChildBlock)

export class ChildCounter extends Context.Service<
  ChildCounter,
  Readonly<{ count: Effect.Effect<number> }>
>()('DeclarationKeyedFieldChildCounter') {}
export const ChildOutMessage = Message.defineMessageUnion({
  RequestedSelection: {},
})
const DeclarationKeyedFieldOutChildDefinition = Block.makeDefinition(
  'DeclarationKeyedFieldOutChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  },
)
export const ReadChildCount =
  DeclarationKeyedFieldOutChildDefinition.makeCommand('ReadChildCount', {
    messages: [ChildMessage.CompletedReadCount],
    handler: function* () {
      const counter = yield* ChildCounter

      return () =>
        counter.count.pipe(
          Effect.map(count => ChildMessage.CompletedReadCount({ count })),
        )
    },
  })
const DeclarationKeyedFieldOutChildComposition =
  DeclarationKeyedFieldOutChildDefinition.makeComposition()
const prepareOutChildBlock = () =>
  DeclarationKeyedFieldOutChildComposition.prepareBlock({
    init: DeclarationKeyedFieldOutChildComposition.makeInit(() => ({
      model: ChildModel.make({ id: 'initial', count: 0 }),
    })),
    update: DeclarationKeyedFieldOutChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
      RequestedRefresh: model => ({ model, commands: [ReadChildCount()] }),
      RequestedSelect: model => ({
        model,
        outMessage: ChildOutMessage.RequestedSelection(),
      }),
      CompletedReadCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
    }),
    operations: {
      refresh: () => [ChildMessage.RequestedRefresh()],
      select: () => [ChildMessage.RequestedSelect()],
    },
    EffectsLayer: ReadChildCount.layer,
  })
export const OutChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareOutChildBlock
> = Block.assemble(prepareOutChildBlock)

const WrappedRow = Schema.Struct({
  rowId: Schema.String,
  child: ChildModel,
})
const EquivalentChildModel = Schema.Struct({
  count: Schema.Number,
  id: Schema.String,
})
type Expect<Value extends true> = Value
type MutuallyAssignable<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false
type IsAny<Value> = 0 extends 1 & Value ? true : false
type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false
type NotAnyOrUnknownProof<Value> =
  IsAny<Value> extends true
    ? [error: never]
    : IsUnknown<Value> extends true
      ? [error: never]
      : []
declare const expectNotAnyOrUnknown: <Value>(
  value: Value,
  ...proof: NotAnyOrUnknownProof<Value>
) => void

const ParentModel = Schema.Struct({
  entries: Schema.Array(ChildModel),
  equivalentEntries: Schema.Array(EquivalentChildModel),
  suspendedEntries: Schema.suspend(() => Schema.Array(ChildModel)),
  brandedEntries: Schema.Array(RefinedKeyModel),
  literalEntries: Schema.Array(RefinedKeyModel),
  arrayChild: ArrayChildModel,
  outEntries: Schema.Array(ChildModel),
  wrappedRows: Schema.Array(WrappedRow),
  maybeRoom: Schema.Option(ChildModel),
})
export const ParentMessage = Message.defineMessageUnion({
  IgnoredChildMessage: {},
})
export const DeclarationKeyedFieldParentDefinition = Block.makeDefinition(
  'DeclarationKeyedFieldParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

export const CallableParentModel = FoldkitSchema.taggedStruct(
  'DeclarationCallableKeyedFieldParentModel',
  { entries: Schema.Array(CallableChildModel) },
)
export const CallableParentMessage = Message.defineMessageUnion({
  IgnoredChildMessage: {},
})
export const DeclarationCallableKeyedFieldParentDefinition =
  Block.makeDefinition('DeclarationCallableKeyedFieldParent', {
    Model: CallableParentModel,
    Message: CallableParentMessage,
  })
export const CallableEntriesBinding =
  DeclarationCallableKeyedFieldParentDefinition.makeBinding(
    CallableChildBlock,
    {
      field: 'entries',
      key: 'id',
    },
  )
const DeclarationCallableKeyedFieldParentComposition =
  DeclarationCallableKeyedFieldParentDefinition.makeComposition({
    bindings: [CallableEntriesBinding],
  })
export const foldCallableEntry =
  DeclarationCallableKeyedFieldParentComposition.makeUpdate.withContext(
    (id: string, childMessage: typeof ChildMessage.Type) => ({
      IgnoredChildMessage: (model, _message) =>
        CallableEntriesBinding.fold(model, id, childMessage),
    }),
  )
export const callableInitialParentModel = CallableParentModel({
  entries: [CallableChildModel({ id: 'first', count: 1 })],
})

export const EntriesBinding = DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  {
    field: 'entries',
    key: 'id',
    subscriptions: {
      when: (model, id) => {
        expectNotAnyOrUnknown(model)
        expectNotAnyOrUnknown(id)
        type ParentModelContextIsExact = Expect<
          MutuallyAssignable<typeof model, typeof ParentModel.Type>
        >
        type KeyContextIsExact = Expect<MutuallyAssignable<typeof id, string>>
        const parentModelContextIsExact: ParentModelContextIsExact = true
        const keyContextIsExact: KeyContextIsExact = true
        void parentModelContextIsExact
        void keyContextIsExact

        return id !== ''
      },
    },
  },
)

const InitializedParentModel = Schema.Struct({
  entries: Schema.Array(ChildModel),
  status: Schema.Literal('Ready'),
})
const DeclarationInitializedKeyedFieldParentDefinition = Block.makeDefinition(
  'DeclarationInitializedKeyedFieldParent',
  {
    Model: InitializedParentModel,
    Message: Schema.Never,
  },
)
export const InitializedEntriesBinding =
  DeclarationInitializedKeyedFieldParentDefinition.makeBinding(ChildBlock, {
    field: 'entries',
    key: 'id',
    init: {
      instances: (_status: 'Ready') => [{ key: 'initial', args: [] }],
      toItem: (_occurrence, child) => child,
    },
  })
const DeclarationInitializedKeyedFieldParentComposition =
  DeclarationInitializedKeyedFieldParentDefinition.makeComposition({
    bindings: [InitializedEntriesBinding],
  })
export const initializeKeyedParent =
  DeclarationInitializedKeyedFieldParentComposition.makeInit(
    (status: 'Ready') => ({
      childInitContext: status,
      model: { status },
    }),
  )

export const EquivalentEntriesBinding =
  DeclarationKeyedFieldParentDefinition.makeBinding(ChildBlock, {
    field: 'equivalentEntries',
    key: 'id',
  })

export const SuspendedEntriesBinding =
  DeclarationKeyedFieldParentDefinition.makeBinding(ChildBlock, {
    field: 'suspendedEntries',
    key: 'id',
  })

export const BrandedEntriesBinding =
  DeclarationKeyedFieldParentDefinition.makeBinding(RefinedKeyBlock, {
    field: 'brandedEntries',
    key: 'id',
  })

export const LiteralEntriesBinding =
  DeclarationKeyedFieldParentDefinition.makeBinding(RefinedKeyBlock, {
    placement: 'literalEntries',
    field: 'literalEntries',
    key: 'kind',
  })

export const ArrayChildBinding =
  DeclarationKeyedFieldParentDefinition.makeBinding(ArrayChildBlock, {
    field: 'arrayChild',
  })

export const OutEntriesBinding =
  DeclarationKeyedFieldParentDefinition.makeBinding(OutChildBlock, {
    field: 'outEntries',
    key: 'id',
  }).withOutMessagePolicy({
    fold: (id, outMessage, context) => {
      const exactId: string = id
      const exactOutMessage: typeof ChildOutMessage.Type = outMessage
      const exactContext: Update.FoldContext<
        typeof ChildMessage.Type,
        typeof ParentMessage.Type,
        typeof ParentModel.Type
      > = context
      void exactId
      void exactOutMessage
      void exactContext

      return DeclarationKeyedFieldParentDefinition.makeStep(model => ({
        model,
      }))
    },
  })
export const outEntriesInspection = Block.inspectBinding(OutEntriesBinding)

export const WrappedRowsBinding =
  DeclarationKeyedFieldParentDefinition.makeBinding(ChildBlock, {
    placement: 'wrappedRows',
    readAll: model => model.wrappedRows,
    key: row => row.rowId,
    keySchema: WrappedRow.fields.rowId,
    read: row => row.child,
    writeAt: (model, rowId, nextChild) =>
      Struct.modifyFields(model, {
        wrappedRows: Array.map(row =>
          row.rowId === rowId
            ? Struct.modifyFields(row, { child: () => nextChild })
            : row,
        ),
      }),
  })

export const RoomBinding = DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  {
    placement: 'room',
    readAll: model => Option.toArray(model.maybeRoom),
    key: child => child.id,
    keySchema: ChildModel.fields.id,
    read: child => child,
    writeAt: (model, _roomId, nextRoom) =>
      Struct.modifyFields(model, { maybeRoom: () => Option.some(nextRoom) }),
  },
)

export const DeclarationKeyedFieldParentComposition =
  DeclarationKeyedFieldParentDefinition.makeComposition({
    bindings: [
      EntriesBinding,
      BrandedEntriesBinding,
      LiteralEntriesBinding,
      ArrayChildBinding,
      WrappedRowsBinding,
      RoomBinding,
    ],
  })

export const initialParentModel = ParentModel.make({
  entries: [ChildModel.make({ id: 'first', count: 1 })],
  equivalentEntries: [
    EquivalentChildModel.make({ id: 'equivalent', count: 1 }),
  ],
  suspendedEntries: [ChildModel.make({ id: 'suspended', count: 1 })],
  brandedEntries: [
    RefinedKeyModel.make({
      id: Schema.decodeSync(RefinedId)('branded'),
      kind: 'Child',
      count: 1,
    }),
  ],
  literalEntries: [
    RefinedKeyModel.make({
      id: Schema.decodeSync(RefinedId)('literal'),
      kind: 'Child',
      count: 1,
    }),
  ],
  arrayChild: ['initial'],
  outEntries: [ChildModel.make({ id: 'out', count: 1 })],
  wrappedRows: [],
  maybeRoom: Option.none(),
})
export const foldEntry =
  DeclarationKeyedFieldParentComposition.makeUpdate.withContext(
    (id: string, childMessage: typeof ChildMessage.Type) => ({
      IgnoredChildMessage: (model, _message) =>
        EntriesBinding.fold(model, id, childMessage),
    }),
  )
export const foldArrayChild =
  DeclarationKeyedFieldParentComposition.makeUpdate.withContext(
    (childMessage: typeof ArrayChildMessage.Type) => ({
      IgnoredChildMessage: (model, _message) =>
        ArrayChildBinding.fold(model, childMessage),
    }),
  )
export const foldWrappedRow =
  DeclarationKeyedFieldParentComposition.makeUpdate.withContext(
    (rowId: string, childMessage: typeof ChildMessage.Type) => ({
      IgnoredChildMessage: (model, _message) =>
        WrappedRowsBinding.fold(model, rowId, childMessage),
    }),
  )
export const foldRoom =
  DeclarationKeyedFieldParentComposition.makeUpdate.withContext(
    (roomId: string, childMessage: typeof ChildMessage.Type) => ({
      IgnoredChildMessage: (model, _message) =>
        RoomBinding.fold(model, roomId, childMessage),
    }),
  )

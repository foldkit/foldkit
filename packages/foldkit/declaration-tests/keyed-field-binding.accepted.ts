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
})
const DeclarationKeyedFieldChild = Block.define('DeclarationKeyedFieldChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const DeclarationKeyedFieldChildComposition =
  DeclarationKeyedFieldChild.makeComposition()
export const ChildBlock = DeclarationKeyedFieldChildComposition.makeBlock({
  init: DeclarationKeyedFieldChildComposition.makeInit(() => ({
    model: ChildModel.make({ id: 'initial', count: 0 }),
  })),
  update: DeclarationKeyedFieldChildComposition.makeUpdate((model, message) =>
    ChildMessage.match(message, {
      UpdatedCount: ({ count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
      CompletedReadCount: ({ count }) => ({
        model: Struct.modifyFields(model, { count: () => count }),
      }),
    }),
  ),
  EffectsLayer: Layer.empty,
})

export const CallableChildModel = FoldkitSchema.taggedStruct(
  'DeclarationCallableKeyedFieldChild',
  { id: Schema.String, count: Schema.Number },
)
const DeclarationCallableKeyedFieldChild = Block.define(
  'DeclarationCallableKeyedFieldChild',
  {
    Model: CallableChildModel,
    Message: ChildMessage,
  },
)
const DeclarationCallableKeyedFieldChildComposition =
  DeclarationCallableKeyedFieldChild.makeComposition()
export const CallableChildBlock =
  DeclarationCallableKeyedFieldChildComposition.makeBlock({
    init: DeclarationCallableKeyedFieldChildComposition.makeInit(() => ({
      model: CallableChildModel({ id: 'initial', count: 0 }),
    })),
    update: DeclarationCallableKeyedFieldChildComposition.makeUpdate(
      (model, message) =>
        ChildMessage.match(message, {
          UpdatedCount: ({ count }) => ({
            model: Struct.modifyFields(model, { count: () => count }),
          }),
          CompletedReadCount: ({ count }) => ({
            model: Struct.modifyFields(model, { count: () => count }),
          }),
        }),
    ),
    EffectsLayer: Layer.empty,
  })

export const RefinedId = Schema.String.pipe(
  Schema.brand('DeclarationKeyedFieldRefinedId'),
)
const RefinedKeyModel = Schema.Struct({
  id: RefinedId,
  kind: Schema.Literal('Child'),
  count: Schema.Number,
})
const RefinedKeyMessage = Message.defineMessageUnion({ UpdatedCount: {} })
const DeclarationRefinedKeyChild = Block.define('DeclarationRefinedKeyChild', {
  Model: RefinedKeyModel,
  Message: RefinedKeyMessage,
})
const DeclarationRefinedKeyChildComposition =
  DeclarationRefinedKeyChild.makeComposition()
export const RefinedKeyBlock = DeclarationRefinedKeyChildComposition.makeBlock({
  init: DeclarationRefinedKeyChildComposition.makeInit(() => ({
    model: RefinedKeyModel.make({
      id: Schema.decodeSync(RefinedId)('initial'),
      kind: 'Child',
      count: 0,
    }),
  })),
  update: DeclarationRefinedKeyChildComposition.makeUpdate(model => ({
    model,
  })),
  EffectsLayer: Layer.empty,
})

const ArrayChildModel = Schema.Array(Schema.String)
const ArrayChildMessage = Message.defineMessageUnion({ IgnoredValue: {} })
const DeclarationArrayModelChild = Block.define('DeclarationArrayModelChild', {
  Model: ArrayChildModel,
  Message: ArrayChildMessage,
})
const DeclarationArrayModelChildComposition =
  DeclarationArrayModelChild.makeComposition()
export const ArrayChildBlock = DeclarationArrayModelChildComposition.makeBlock({
  init: DeclarationArrayModelChildComposition.makeInit(() => ({
    model: ArrayChildModel.make(['initial']),
  })),
  update: DeclarationArrayModelChildComposition.makeUpdate(model => ({
    model,
  })),
  EffectsLayer: Layer.empty,
})

export class ChildCounter extends Context.Service<
  ChildCounter,
  Readonly<{ count: Effect.Effect<number> }>
>()('DeclarationKeyedFieldChildCounter') {}
export const ChildOutMessage = Message.defineMessageUnion({
  RequestedSelection: {},
})
const DeclarationKeyedFieldOutChild = Block.define(
  'DeclarationKeyedFieldOutChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  },
)
export const ReadChildCount = DeclarationKeyedFieldOutChild.command(
  'ReadChildCount',
  {
    messages: [ChildMessage.CompletedReadCount],
    handler: function* () {
      const counter = yield* ChildCounter

      return () =>
        counter.count.pipe(
          Effect.map(count => ChildMessage.CompletedReadCount({ count })),
        )
    },
  },
)
const DeclarationKeyedFieldOutChildComposition =
  DeclarationKeyedFieldOutChild.makeComposition()
export const OutChildBlock = DeclarationKeyedFieldOutChildComposition.makeBlock(
  {
    init: DeclarationKeyedFieldOutChildComposition.makeInit(() => ({
      model: ChildModel.make({ id: 'initial', count: 0 }),
    })),
    update: DeclarationKeyedFieldOutChildComposition.makeUpdate(
      (model, message) =>
        ChildMessage.match(message, {
          UpdatedCount: ({ count }) => ({
            model: Struct.modifyFields(model, { count: () => count }),
          }),
          CompletedReadCount: ({ count }) => ({
            model: Struct.modifyFields(model, { count: () => count }),
          }),
        }),
    ),
    expose: {
      refresh: DeclarationKeyedFieldOutChild.step(model => ({
        model,
        commands: [ReadChildCount()],
      })),
      select: DeclarationKeyedFieldOutChild.step(model => ({
        model,
        outMessage: ChildOutMessage.RequestedSelection(),
      })),
    },
    EffectsLayer: ReadChildCount.layer,
  },
)

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
  GotEntryMessage: { id: Schema.String, message: ChildBlock.Message },
  GotWrappedMessage: { rowId: Schema.String, message: ChildBlock.Message },
  GotRoomMessage: { roomId: Schema.String, message: ChildBlock.Message },
  GotRefinedMessage: { id: Schema.String, message: RefinedKeyBlock.Message },
  GotArrayChildMessage: { message: ArrayChildBlock.Message },
})
export const DeclarationKeyedFieldParent = Block.define(
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
export const DeclarationCallableKeyedFieldParent = Block.define(
  'DeclarationCallableKeyedFieldParent',
  {
    Model: CallableParentModel,
    Message: ParentMessage,
  },
)
export const CallableEntriesBinding =
  DeclarationCallableKeyedFieldParent.bindChild(CallableChildBlock, {
    field: 'entries',
    key: 'id',
    toParentMessage: (id, message) =>
      ParentMessage.GotEntryMessage({ id, message }),
    fromParentMessage: false,
  })
const DeclarationCallableKeyedFieldParentComposition =
  DeclarationCallableKeyedFieldParent.makeComposition({
    childBindings: [CallableEntriesBinding],
  })
export const foldCallableEntry =
  DeclarationCallableKeyedFieldParentComposition.makeUpdate(
    (model, _message, id: string, childMessage: typeof ChildMessage.Type) =>
      CallableEntriesBinding.fold(model, id, childMessage),
  )
export const callableInitialParentModel = CallableParentModel({
  entries: [CallableChildModel({ id: 'first', count: 1 })],
})

export const EntriesBinding = DeclarationKeyedFieldParent.bindChild(
  ChildBlock,
  {
    field: 'entries',
    key: 'id',
    toParentMessage: (id, message) =>
      ParentMessage.GotEntryMessage({ id, message }),
    fromParentMessage: false,
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
const DeclarationInitializedKeyedFieldParent = Block.define(
  'DeclarationInitializedKeyedFieldParent',
  {
    Model: InitializedParentModel,
    Message: ParentMessage,
  },
)
export const InitializedEntriesBinding =
  DeclarationInitializedKeyedFieldParent.bindChild(ChildBlock, {
    field: 'entries',
    key: 'id',
    toParentMessage: (id, message) =>
      ParentMessage.GotEntryMessage({ id, message }),
    fromParentMessage: false,
    init: {
      occurrences: (_status: 'Ready') => [{ key: 'initial', args: [] }],
      toItem: (_occurrence, child) => child,
    },
  })
const DeclarationInitializedKeyedFieldParentComposition =
  DeclarationInitializedKeyedFieldParent.makeComposition({
    childBindings: [InitializedEntriesBinding],
  })
export const initializeKeyedParent =
  DeclarationInitializedKeyedFieldParentComposition.makeInit(
    (status: 'Ready') => ({
      startup: status,
      model: { status },
    }),
  )

export const EquivalentEntriesBinding = DeclarationKeyedFieldParent.bindChild(
  ChildBlock,
  {
    field: 'equivalentEntries',
    key: 'id',
    toParentMessage: (id, message) =>
      ParentMessage.GotEntryMessage({ id, message }),
    fromParentMessage: false,
  },
)

export const SuspendedEntriesBinding = DeclarationKeyedFieldParent.bindChild(
  ChildBlock,
  {
    field: 'suspendedEntries',
    key: 'id',
    toParentMessage: (id, message) =>
      ParentMessage.GotEntryMessage({ id, message }),
    fromParentMessage: false,
  },
)

export const BrandedEntriesBinding = DeclarationKeyedFieldParent.bindChild(
  RefinedKeyBlock,
  {
    field: 'brandedEntries',
    key: 'id',
    toParentMessage: (id, message) =>
      ParentMessage.GotRefinedMessage({ id, message }),
    fromParentMessage: false,
  },
)

export const LiteralEntriesBinding = DeclarationKeyedFieldParent.bindChild(
  RefinedKeyBlock,
  {
    field: 'literalEntries',
    key: 'kind',
    toParentMessage: (id, message) =>
      ParentMessage.GotRefinedMessage({ id, message }),
    fromParentMessage: false,
  },
)

export const ArrayChildBinding = DeclarationKeyedFieldParent.bindChild(
  ArrayChildBlock,
  {
    field: 'arrayChild',
    toParentMessage: message => ParentMessage.GotArrayChildMessage({ message }),
    fromParentMessage: false,
  },
)

export const OutEntriesBinding = DeclarationKeyedFieldParent.bindChild(
  OutChildBlock,
  {
    field: 'outEntries',
    key: 'id',
    toParentMessage: (id, message) =>
      ParentMessage.GotEntryMessage({ id, message }),
    fromParentMessage: false,
    outMessage: {
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

        return DeclarationKeyedFieldParent.step(model => ({ model }))
      },
    },
  },
)
export const outEntriesInspection = Block.inspectBinding(OutEntriesBinding)

export const WrappedRowsBinding = DeclarationKeyedFieldParent.bindChild(
  ChildBlock,
  {
    placement: 'wrappedRows',
    readAll: model => model.wrappedRows,
    key: row => row.rowId,
    read: row => row.child,
    writeAt: (model, rowId, nextChild) =>
      Struct.modifyFields(model, {
        wrappedRows: Array.map(row =>
          row.rowId === rowId
            ? Struct.modifyFields(row, { child: () => nextChild })
            : row,
        ),
      }),
    toParentMessage: (rowId, message) =>
      ParentMessage.GotWrappedMessage({ rowId, message }),
    fromParentMessage: false,
  },
)

export const RoomBinding = DeclarationKeyedFieldParent.bindChild(ChildBlock, {
  readAll: model => Option.toArray(model.maybeRoom),
  key: child => child.id,
  read: child => child,
  writeAt: (model, _roomId, nextRoom) =>
    Struct.modifyFields(model, { maybeRoom: () => Option.some(nextRoom) }),
  toParentMessage: (roomId, message) =>
    ParentMessage.GotRoomMessage({ roomId, message }),
  fromParentMessage: false,
})

export const DeclarationKeyedFieldParentComposition =
  DeclarationKeyedFieldParent.makeComposition({
    childBindings: [
      EntriesBinding,
      EquivalentEntriesBinding,
      SuspendedEntriesBinding,
      BrandedEntriesBinding,
      LiteralEntriesBinding,
      ArrayChildBinding,
      OutEntriesBinding,
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
export const foldEntry = DeclarationKeyedFieldParentComposition.makeUpdate(
  (model, _message, id: string, childMessage: typeof ChildMessage.Type) =>
    EntriesBinding.fold(model, id, childMessage),
)
export const foldArrayChild = DeclarationKeyedFieldParentComposition.makeUpdate(
  (model, _message, childMessage: typeof ArrayChildMessage.Type) =>
    ArrayChildBinding.fold(model, childMessage),
)
export const foldWrappedRow = DeclarationKeyedFieldParentComposition.makeUpdate(
  (model, _message, rowId: string, childMessage: typeof ChildMessage.Type) =>
    WrappedRowsBinding.fold(model, rowId, childMessage),
)
export const foldRoom = DeclarationKeyedFieldParentComposition.makeUpdate(
  (model, _message, roomId: string, childMessage: typeof ChildMessage.Type) =>
    RoomBinding.fold(model, roomId, childMessage),
)

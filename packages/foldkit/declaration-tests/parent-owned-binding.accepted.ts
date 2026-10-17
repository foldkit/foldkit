import { Array, Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import { Block, Message, Struct, Update, defineApplication } from 'foldkit'

export class ChildClock extends Context.Service<
  ChildClock,
  Readonly<{ now: Effect.Effect<number> }>
>()('ParentOwnedBindingChildClock') {}

const ChildModel = Schema.Struct({ value: Schema.String })
const ChildMessage = Message.defineMessageUnion({
  UpdatedValue: { value: Schema.String },
  CompletedReadChildValue: { value: Schema.Number },
})
const ChildOutMessage = Message.defineMessageUnion({
  SelectedValue: { value: Schema.String },
})
const DeclarationParentOwnedChild = Block.define(
  'DeclarationParentOwnedChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  },
)
const handlerConstruction: Effect.Effect<void, 'HandlerUnavailable'> =
  Effect.void
export const ReadChildValue = DeclarationParentOwnedChild.command(
  'ReadChildValue',
  {
    messages: [ChildMessage.CompletedReadChildValue],
    handler: function* () {
      const clock = yield* ChildClock
      yield* handlerConstruction

      return () =>
        clock.now.pipe(
          Effect.map(value => ChildMessage.CompletedReadChildValue({ value })),
        )
    },
  },
)
const DeclarationParentOwnedChildComposition =
  DeclarationParentOwnedChild.makeComposition()
export const ChildBlock = DeclarationParentOwnedChildComposition.makeBlock({
  init: DeclarationParentOwnedChildComposition.makeInit(() => ({
    model: ChildModel.make({ value: 'initial' }),
  })),
  update: DeclarationParentOwnedChildComposition.makeUpdate((model, message) =>
    ChildMessage.match(message, {
      UpdatedValue: ({ value }) => ({
        model: Struct.modifyFields(model, { value: () => value }),
      }),
      CompletedReadChildValue: () => ({ model }),
    }),
  ),
  expose: {
    select: DeclarationParentOwnedChild.step(model => ({
      model,
      outMessage: ChildOutMessage.SelectedValue({ value: model.value }),
    })),
    refresh: DeclarationParentOwnedChild.step(model => ({
      model,
      commands: [ReadChildValue()],
    })),
  },
  EffectsLayer: ReadChildValue.layer,
})

const DeclarationParentOwnedPlainChild = Block.define(
  'DeclarationParentOwnedPlainChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
)
const PlainChildSubscriptions = DeclarationParentOwnedPlainChild.subscriptions(
  entry => ({
    values: entry('ObservePlainChildValues', {
      messages: [ChildMessage.UpdatedValue],
      handler: function* () {
        return () => Stream.never
      },
    }),
  }),
)
const DeclarationParentOwnedPlainChildComposition =
  DeclarationParentOwnedPlainChild.makeComposition()
export const PlainChildBlock =
  DeclarationParentOwnedPlainChildComposition.makeBlock({
    init: DeclarationParentOwnedPlainChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: 'initial' }),
    })),
    update: DeclarationParentOwnedPlainChildComposition.makeUpdate(model => ({
      model,
    })),
    subscriptions: PlainChildSubscriptions,
    EffectsLayer: PlainChildSubscriptions.values.layer,
  })

const Entry = Schema.Struct({ id: Schema.Number, child: ChildModel })
const NamedEntry = Schema.Struct({ id: Schema.String, child: ChildModel })
const ChildSlot = Schema.TaggedStruct('Child', { child: ChildModel })
const EmptySlot = Schema.TaggedStruct('Empty', {})
const Slot = Schema.Union([ChildSlot, EmptySlot])
const ParentModel = Schema.Struct({
  child: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  slot: Slot,
  entries: Schema.Array(Entry),
  namedEntries: Schema.Array(NamedEntry),
})
export const ParentMessage = Message.defineMessageUnion({
  GotChildMessage: { message: ChildBlock.Message },
  GotEntryMessage: { id: Schema.Number, message: ChildBlock.Message },
  GotNamedEntryMessage: { id: Schema.String, message: ChildBlock.Message },
})
export const ParentOutMessage = Message.defineMessageUnion({
  ForwardedSelectedValue: { value: Schema.String },
})
export const DeclarationParentOwnedParent = Block.define(
  'DeclarationParentOwnedParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  },
)

const foldChildOutMessage = ChildOutMessage.match<
  Update.Step<typeof ParentModel.Type, typeof ParentMessage.Type>
>({
  SelectedValue: () => model => ({ model }),
})

export const DirectChildBinding = DeclarationParentOwnedParent.bindChild(
  ChildBlock,
  {
    field: 'child',
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
    init: false,
    outMessage: { fold: foldChildOutMessage },
  },
)
export const directChildInspection = Block.inspectBinding(DirectChildBinding)
export const ForwardingChildBinding = DeclarationParentOwnedParent.bindChild(
  ChildBlock,
  {
    field: 'child',
    placement: 'forwardingChild',
    parentMessage: ParentMessage.GotChildMessage,
    outMessage: {
      forward: outMessage =>
        ChildOutMessage.match<typeof ParentOutMessage.Type>(outMessage, {
          SelectedValue: ({ value }) =>
            ParentOutMessage.ForwardedSelectedValue({ value }),
        }),
    },
  },
)

export const OptionalChildBinding = DeclarationParentOwnedParent.bindChild(
  ChildBlock,
  {
    placement: 'optionalChild',
    field: 'maybeChild',
    toParentMessage: message => ParentMessage.GotChildMessage({ message }),
    fromParentMessage: false,
    outMessage: {
      fold: (outMessage, context) => {
        const exactOutMessage: typeof ChildOutMessage.Type = outMessage
        const exactContext: Update.FoldContext<
          typeof ChildMessage.Type,
          typeof ParentMessage.Type,
          typeof ParentModel.Type
        > = context
        void exactOutMessage
        void exactContext

        return foldChildOutMessage(outMessage)
      },
    },
  },
)

export const TaggedChildBinding = DeclarationParentOwnedParent.bindChild(
  ChildBlock,
  {
    placement: 'taggedChild',
    read: model =>
      model.slot._tag === 'Child'
        ? Option.some(model.slot.child)
        : Option.none(),
    write: (model, nextChild) =>
      Struct.modifyFields(model, {
        slot: () => ChildSlot.make({ child: nextChild }),
      }),
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
    outMessage: { fold: foldChildOutMessage },
  },
)

export const KeyedChildBinding = DeclarationParentOwnedParent.bindChild(
  ChildBlock,
  {
    placement: 'entries',
    readAll: model => model.entries,
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
    toParentMessage: (id, message) =>
      ParentMessage.GotEntryMessage({ id, message }),
    fromParentMessage: false,
    outMessage: {
      fold: (id, outMessage, context) => {
        const exactId: number = id
        const exactOutMessage: typeof ChildOutMessage.Type = outMessage
        const exactContext: Update.FoldContext<
          typeof ChildMessage.Type,
          typeof ParentMessage.Type,
          typeof ParentModel.Type
        > = context
        void exactId
        void exactOutMessage
        void exactContext

        return foldChildOutMessage(outMessage)
      },
    },
  },
)

const readNamedEntries = (model: typeof ParentModel.Type) => model.namedEntries

export const KeyedChildWithoutOutMessageBinding =
  DeclarationParentOwnedParent.bindChild(PlainChildBlock, {
    placement: 'namedEntries',
    readAll: readNamedEntries,
    key: entry => {
      const exactEntry: typeof NamedEntry.Type = entry
      void exactEntry

      return entry.id
    },
    read: entry => {
      const exactEntry: typeof NamedEntry.Type = entry
      void exactEntry

      return entry.child
    },
    writeAt: (model, id, nextChild) => {
      const exactModel: typeof ParentModel.Type = model
      const exactId: string = id
      const exactChild: typeof ChildModel.Type = nextChild
      void exactModel
      void exactId
      void exactChild

      return model
    },
    toParentMessage: (id, message) => {
      const exactId: string = id
      const exactMessage: typeof ChildMessage.Type = message
      void exactId
      void exactMessage

      return ParentMessage.GotNamedEntryMessage({ id, message })
    },
    fromParentMessage: false,
    subscriptions: {
      when: (model, id) => {
        const exactModel: typeof ParentModel.Type = model
        const exactId: string = id
        void exactModel
        void exactId

        return true
      },
    },
  })

export const InlineKeyedChildWithoutOutMessageBinding =
  DeclarationParentOwnedParent.bindChild(PlainChildBlock, {
    placement: 'inlineNamedEntries',
    readAll: model => {
      const exactModel: typeof ParentModel.Type = model
      void exactModel

      return model.namedEntries
    },
    key: entry => entry.id,
    read: entry => entry.child,
    writeAt: model => model,
    toParentMessage: (id, message) =>
      ParentMessage.GotNamedEntryMessage({ id, message }),
    fromParentMessage: false,
    subscriptions: {
      when: {
        values: (model, id) => {
          const exactModel: typeof ParentModel.Type = model
          const exactId: string = id
          void exactModel
          void exactId

          return true
        },
      },
    },
  })

const DeclarationParentOwnedParentComposition =
  DeclarationParentOwnedParent.makeComposition({
    childBindings: [
      DirectChildBinding,
      OptionalChildBinding,
      TaggedChildBinding,
      KeyedChildBinding,
      KeyedChildWithoutOutMessageBinding,
    ],
  })
export const ParentBlock = DeclarationParentOwnedParentComposition.makeBlock({
  init: DeclarationParentOwnedParentComposition.makeInit(() => ({
    model: ParentModel.make({
      child: ChildModel.make({ value: 'initial' }),
      maybeChild: Option.none(),
      slot: EmptySlot.make({}),
      entries: [],
      namedEntries: [],
    }),
  })),
  update: DeclarationParentOwnedParentComposition.makeUpdate((model, message) =>
    ParentMessage.match(message, {
      GotChildMessage: ({ message }) => DirectChildBinding.fold(model, message),
      GotEntryMessage: ({ id, message }) =>
        KeyedChildBinding.fold(model, id, message),
      GotNamedEntryMessage: ({ id, message }) =>
        KeyedChildWithoutOutMessageBinding.fold(model, id, message),
    }),
  ),
})

const Application = defineApplication({
  Model: ParentModel,
  Message: ParentMessage,
})
export const ApplicationChildBinding = Application.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ParentMessage.GotChildMessage,
  outMessage: { fold: foldChildOutMessage },
})
export const ApplicationComposition = Application.makeComposition({
  childBindings: [ApplicationChildBinding],
})

export const DeclarationPureCompositionComposition = Block.define(
  'DeclarationPureComposition',
  {
    Model: Schema.Null,
    Message: Schema.Never,
  },
).makeComposition()
export const pureBlock = DeclarationPureCompositionComposition.makeBlock({
  init: DeclarationPureCompositionComposition.makeInit(() => ({ model: null })),
  update: DeclarationPureCompositionComposition.makeUpdate(),
})

export const emptyLayer = Layer.empty

export const makeGenericKeyedBinding = <const Value extends string>(
  Value: Schema.Schema<Value>,
) => {
  const Entry = Schema.Struct({
    id: Schema.Literals(['first', 'second']),
    child: ChildModel,
    payload: Value,
  })
  const Model = Schema.Struct({ entries: Schema.Array(Entry) })
  const ParentMessage = Message.defineMessageUnion({
    GotChildMessage: { id: Schema.String, message: ChildBlock.Message },
  })
  const DeclarationGenericKeyedParent = Block.define(
    'DeclarationGenericKeyedParent',
    {
      Model,
      Message: ParentMessage,
    },
  )
  const foldOutMessage = (
    id: string,
    outMessage: typeof ChildOutMessage.Type,
    {
      liftCommand,
    }: Update.FoldContext<typeof ChildMessage.Type, typeof ParentMessage.Type>,
  ) => {
    void id
    return ChildOutMessage.match(outMessage, {
      SelectedValue: () =>
        DeclarationGenericKeyedParent.step(model => ({
          model,
          commands: [liftCommand(ReadChildValue())],
        })),
    })
  }
  const ChildBinding = DeclarationGenericKeyedParent.bindChild(ChildBlock, {
    readAll: model => model.entries,
    key: entry => {
      const payload: Value = entry.payload
      void payload
      return entry.id
    },
    read: entry => entry.child,
    writeAt: (model, id, nextChild) =>
      Struct.modifyFields(model, {
        entries: Array.map(entry =>
          entry.id === id
            ? Struct.modifyFields(entry, { child: () => nextChild })
            : entry,
        ),
      }),
    toParentMessage: (id, message) =>
      ParentMessage.GotChildMessage({ id, message }),
    fromParentMessage: false,
    outMessage: { fold: foldOutMessage },
  })

  return { ChildBinding, Model, Message: ParentMessage }
}

export const genericKeyedBinding = makeGenericKeyedBinding(
  Schema.Literals(['One', 'Two']),
)
export const genericKeyedInspection = Block.inspectBinding(
  genericKeyedBinding.ChildBinding,
)

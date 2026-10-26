import { Array, Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import { Block, Message, Struct, Update } from 'foldkit'

export class ChildClock extends Context.Service<
  ChildClock,
  Readonly<{ now: Effect.Effect<number> }>
>()('ParentOwnedBindingChildClock') {}

const ChildModel = Schema.Struct({ value: Schema.String })
const ChildMessage = Message.defineMessageUnion({
  UpdatedValue: { value: Schema.String },
  RequestedSelect: {},
  RequestedReadChildValue: {},
  CompletedReadChildValue: { value: Schema.Number },
})
const ChildOutMessage = Message.defineMessageUnion({
  SelectedValue: { value: Schema.String },
})
const DeclarationParentOwnedChildDefinition = Block.makeDefinition(
  'DeclarationParentOwnedChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  },
)
const handlerConstruction: Effect.Effect<void, 'HandlerUnavailable'> =
  Effect.void
export const ReadChildValue = DeclarationParentOwnedChildDefinition.makeCommand(
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
  DeclarationParentOwnedChildDefinition.makeComposition()
const prepareChildBlock = () =>
  DeclarationParentOwnedChildComposition.prepareBlock({
    init: DeclarationParentOwnedChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: 'initial' }),
    })),
    update: DeclarationParentOwnedChildComposition.makeUpdate({
      UpdatedValue: (model, { value }) => ({
        model: Struct.modifyFields(model, { value: () => value }),
      }),
      RequestedSelect: model => ({
        model,
        outMessage: ChildOutMessage.SelectedValue({ value: model.value }),
      }),
      RequestedReadChildValue: model => ({
        model,
        commands: [ReadChildValue()],
      }),
      CompletedReadChildValue: model => ({ model }),
    }),
    operations: {
      select: () => [ChildMessage.RequestedSelect()],
      refresh: () => [ChildMessage.RequestedReadChildValue()],
    },
    EffectsLayer: ReadChildValue.layer,
  })
export const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const DeclarationParentOwnedPlainChildDefinition = Block.makeDefinition(
  'DeclarationParentOwnedPlainChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
)
const PlainChildSubscriptions =
  DeclarationParentOwnedPlainChildDefinition.makeSubscriptions(entry => ({
    values: entry('ObservePlainChildValues', {
      messages: [ChildMessage.UpdatedValue],
      handler: function* () {
        return () => Stream.never
      },
    }),
  }))
const DeclarationParentOwnedPlainChildComposition =
  DeclarationParentOwnedPlainChildDefinition.makeComposition()
const preparePlainChildBlock = () =>
  DeclarationParentOwnedPlainChildComposition.prepareBlock({
    init: DeclarationParentOwnedPlainChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: 'initial' }),
    })),
    update: DeclarationParentOwnedPlainChildComposition.makeUpdate({
      UpdatedValue: model => ({
        model,
      }),
      RequestedSelect: model => ({
        model,
      }),
      RequestedReadChildValue: model => ({
        model,
      }),
      CompletedReadChildValue: model => ({
        model,
      }),
    }),
    subscriptions: PlainChildSubscriptions,
    EffectsLayer: PlainChildSubscriptions.values.layer,
  })
export const PlainChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof preparePlainChildBlock
> = Block.assemble(preparePlainChildBlock)

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
  ClickedParent: {},
})
export const ParentOutMessage = Message.defineMessageUnion({
  ForwardedSelectedValue: { value: Schema.String },
})
export const DeclarationParentOwnedParentDefinition = Block.makeDefinition(
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

export const DirectChildBinding =
  DeclarationParentOwnedParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  }).withOutMessagePolicy({ fold: foldChildOutMessage })
export const directChildInspection = Block.inspectBinding(DirectChildBinding)
export const ForwardingChildBinding =
  DeclarationParentOwnedParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'forwardingChild',
  }).withOutMessagePolicy({
    forward: outMessage =>
      ChildOutMessage.match<typeof ParentOutMessage.Type>(outMessage, {
        SelectedValue: ({ value }) =>
          ParentOutMessage.ForwardedSelectedValue({ value }),
      }),
  })

export const OptionalChildBinding =
  DeclarationParentOwnedParentDefinition.makeBinding(ChildBlock, {
    placement: 'optionalChild',
    field: 'maybeChild',
  }).withOutMessagePolicy({
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
  })

export const TaggedChildBinding =
  DeclarationParentOwnedParentDefinition.makeBinding(ChildBlock, {
    placement: 'taggedChild',
    read: model =>
      model.slot._tag === 'Child'
        ? Option.some(model.slot.child)
        : Option.none(),
    write: (model, nextChild) =>
      Struct.modifyFields(model, {
        slot: () => ChildSlot.make({ child: nextChild }),
      }),
  }).withOutMessagePolicy({ fold: foldChildOutMessage })

export const KeyedChildBinding =
  DeclarationParentOwnedParentDefinition.makeBinding(ChildBlock, {
    placement: 'entries',
    readAll: model => model.entries,
    key: entry => entry.id,
    keySchema: Entry.fields.id,
    read: entry => entry.child,
    writeAt: model => model,
  }).withOutMessagePolicy({
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
  })

const readNamedEntries = (model: typeof ParentModel.Type) => model.namedEntries

export const KeyedChildWithoutOutMessageBinding =
  DeclarationParentOwnedParentDefinition.makeBinding(PlainChildBlock, {
    placement: 'namedEntries',
    readAll: readNamedEntries,
    key: entry => {
      const exactEntry: typeof NamedEntry.Type = entry
      void exactEntry

      return entry.id
    },
    keySchema: NamedEntry.fields.id,
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
  DeclarationParentOwnedParentDefinition.makeBinding(PlainChildBlock, {
    placement: 'inlineNamedEntries',
    readAll: model => {
      const exactModel: typeof ParentModel.Type = model
      void exactModel

      return model.namedEntries
    },
    key: entry => entry.id,
    keySchema: NamedEntry.fields.id,
    read: entry => entry.child,
    writeAt: model => model,
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

export const DeclarationParentOwnedParentComposition =
  DeclarationParentOwnedParentDefinition.makeComposition({
    bindings: [
      DirectChildBinding,
      OptionalChildBinding,
      TaggedChildBinding,
      KeyedChildBinding,
      KeyedChildWithoutOutMessageBinding,
    ],
  })
const prepareParentBlock = () =>
  DeclarationParentOwnedParentComposition.prepareBlock({
    init: DeclarationParentOwnedParentComposition.makeInit(() => ({
      model: ParentModel.make({
        child: ChildModel.make({ value: 'initial' }),
        maybeChild: Option.none(),
        slot: EmptySlot.make({}),
        entries: [],
        namedEntries: [],
      }),
    })),
    update: DeclarationParentOwnedParentComposition.makeUpdate({
      ClickedParent: model => ({ model }),
    }),
  })
export const ParentBlock: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

const ApplicationMessage = Message.defineMessageUnion({
  ClickedApplication: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: ParentModel,
  Message: ApplicationMessage,
})
export const ApplicationChildBinding = ApplicationDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',
  },
).withOutMessagePolicy({
  fold: ChildOutMessage.match<
    Update.Step<typeof ParentModel.Type, typeof ApplicationMessage.Type>
  >({ SelectedValue: () => model => ({ model }) }),
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ApplicationChildBinding],
})

export const DeclarationPureCompositionComposition = Block.makeDefinition(
  'DeclarationPureComposition',
  {
    Model: Schema.Null,
    Message: Schema.Never,
  },
).makeComposition()
const preparePureBlock = () =>
  DeclarationPureCompositionComposition.prepareBlock({
    init: DeclarationPureCompositionComposition.makeInit(() => ({
      model: null,
    })),
    update: DeclarationPureCompositionComposition.makeUpdate({}),
  })
export const pureBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Schema.Null,
  typeof preparePureBlock
> = Block.assemble(preparePureBlock)

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
    ClickedParent: {},
    RequestedSelectChild: { id: Entry.fields.id },
  })
  const DeclarationGenericKeyedParentDefinition = Block.makeDefinition(
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
        DeclarationGenericKeyedParentDefinition.makeStep(model => ({
          model,
          commands: [liftCommand(ReadChildValue())],
        })),
    })
  }
  const ChildBinding = DeclarationGenericKeyedParentDefinition.makeBinding(
    ChildBlock,
    {
      readAll: model => model.entries,
      key: entry => {
        const payload: Value = entry.payload
        void payload
        return entry.id
      },
      read: entry => entry.child,
      keySchema: Entry.fields.id,
      writeAt: (model, id, nextChild) =>
        Struct.modifyFields(model, {
          entries: Array.map(entry =>
            entry.id === id
              ? Struct.modifyFields(entry, { child: () => nextChild })
              : entry,
          ),
        }),
    },
  ).withOutMessagePolicy({ fold: foldOutMessage })

  const Composition = DeclarationGenericKeyedParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const update = Composition.makeUpdate({
    ClickedParent: DeclarationGenericKeyedParentDefinition.makeNoopStep(),
    RequestedSelectChild: (model, { id }) => ChildBinding.select(id)(model),
  })
  const prepareBlock = () =>
    Composition.prepareBlock({
      init: Composition.makeInit(() => ({
        model: Model.make({ entries: [] }),
      })),
      update,
      operations: {
        select: (id: typeof Entry.fields.id.Type) => [
          ParentMessage.RequestedSelectChild({ id }),
        ],
      },
    })
  const GenericBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)

  return { Block: GenericBlock, ChildBinding, Model, Message: ParentMessage }
}

export const genericKeyedBinding = makeGenericKeyedBinding(
  Schema.Literals(['One', 'Two']),
)
export const genericKeyedInspection = Block.inspectBinding(
  genericKeyedBinding.ChildBinding,
)

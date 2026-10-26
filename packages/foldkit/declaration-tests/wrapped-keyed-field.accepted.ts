import { Context, Effect, Layer, Schema } from 'effect'
import { Block, Message, Struct, Update } from 'foldkit'

export class ChoiceService extends Context.Service<
  ChoiceService,
  Readonly<{ refresh: Effect.Effect<void> }>
>()('DeclarationWrappedKeyedFieldChoiceService') {}

export class ChoiceBuildFailure extends Error {}

const choiceHandlerConstruction: Effect.Effect<void, ChoiceBuildFailure> =
  Effect.void

const makeChoice = <const Values extends ReadonlyArray<string>>(
  Value: Schema.Literals<Values>,
) => {
  type Value = Values[number]

  const Model = Schema.Struct({ value: Value })
  const ChoiceMessage = Message.defineMessageUnion({
    UpdatedValue: { value: Value },
    RequestedRefresh: {},
    RequestedSelect: {},
    CompletedRefresh: {},
  })
  const ChoiceOutMessage = Message.defineMessageUnion({
    SelectedValue: { value: Value },
  })
  const DeclarationWrappedKeyedFieldChoiceDefinition = Block.makeDefinition(
    'DeclarationWrappedKeyedFieldChoice',
    {
      Model,
      Message: ChoiceMessage,
      OutMessage: ChoiceOutMessage,
    },
  )
  const ReadChoice = DeclarationWrappedKeyedFieldChoiceDefinition.makeCommand(
    'ReadChoice',
    {
      messages: [ChoiceMessage.CompletedRefresh],
      handler: function* () {
        const service = yield* ChoiceService
        yield* choiceHandlerConstruction

        return () =>
          service.refresh.pipe(Effect.as(ChoiceMessage.CompletedRefresh()))
      },
    },
  )
  const setValueStep = DeclarationWrappedKeyedFieldChoiceDefinition.makeStep(
    (model, value: Value) => ({
      model: Struct.modifyFields(model, { value: () => value }),
    }),
  )
  const refreshStep = DeclarationWrappedKeyedFieldChoiceDefinition.makeStep(
    model => ({
      model,
      commands: [ReadChoice()],
    }),
  )
  const selectStep = DeclarationWrappedKeyedFieldChoiceDefinition.makeStep(
    model => ({
      model,
      outMessage: ChoiceOutMessage.SelectedValue({ value: model.value }),
    }),
  )
  const DeclarationWrappedKeyedFieldChoiceComposition =
    DeclarationWrappedKeyedFieldChoiceDefinition.makeComposition()
  const prepareBlock = () =>
    DeclarationWrappedKeyedFieldChoiceComposition.prepareBlock({
      init: DeclarationWrappedKeyedFieldChoiceComposition.makeInit(
        (value: Value) => ({
          model: Model.make({ value }),
          commands: [ReadChoice()],
        }),
      ),
      update: DeclarationWrappedKeyedFieldChoiceComposition.makeUpdate({
        UpdatedValue: (model, { value }) => setValueStep(model, value),
        RequestedRefresh: model => refreshStep(model),
        RequestedSelect: model => selectStep(model),
        CompletedRefresh: model => ({ model }),
      }),
      operations: {
        setValue: (value: Value) => [ChoiceMessage.UpdatedValue({ value })],
        refresh: () => [ChoiceMessage.RequestedRefresh()],
        select: () => [ChoiceMessage.RequestedSelect()],
      },
      EffectsLayer: ReadChoice.layer,
    })
  const block: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)

  return {
    block,
    Message: ChoiceMessage,
    OutMessage: ChoiceOutMessage,
    ReadChoice,
  }
}

export const Choice = makeChoice(Schema.Literals(['One', 'Two']))

const DeclarationWrappedKeyedFieldPlainChoiceComposition = Block.makeDefinition(
  'DeclarationWrappedKeyedFieldPlainChoice',
  {
    Model: Choice.block.Model,
    Message: Choice.Message,
  },
).makeComposition()
const preparePlainChoiceBlock = () =>
  DeclarationWrappedKeyedFieldPlainChoiceComposition.prepareBlock({
    init: DeclarationWrappedKeyedFieldPlainChoiceComposition.makeInit(() => ({
      model: Choice.block.Model.make({ value: 'One' }),
    })),
    update: DeclarationWrappedKeyedFieldPlainChoiceComposition.makeUpdate({
      UpdatedValue: (model, { value }) => ({
        model: Struct.modifyFields(model, { value: () => value }),
      }),
      RequestedRefresh: model => ({ model }),
      RequestedSelect: model => ({ model }),
      CompletedRefresh: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
export const PlainChoiceBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Choice.block.Model,
  typeof preparePlainChoiceBlock
> = Block.assemble(preparePlainChoiceBlock)

export const ChoiceId = Schema.String.pipe(
  Schema.brand('DeclarationWrappedKeyedFieldChoiceId'),
)
export const ChoiceEntry = Schema.Struct({
  id: ChoiceId,
  choice: Choice.block.Model,
  note: Schema.optionalKey(Schema.String),
})
export const LiteralChoiceEntry = Schema.Struct({
  kind: Schema.Literals(['Primary', 'Secondary']),
  choice: Choice.block.Model,
})

export const TextMessage = Message.defineMessageUnion({
  ReplacedText: { value: Schema.String },
})

const DeclarationWrappedKeyedFieldTextComposition = Block.makeDefinition(
  'DeclarationWrappedKeyedFieldText',
  {
    Model: Schema.String,
    Message: TextMessage,
  },
).makeComposition()
const prepareTextBlock = () =>
  DeclarationWrappedKeyedFieldTextComposition.prepareBlock({
    init: DeclarationWrappedKeyedFieldTextComposition.makeInit(() => ({
      model: '',
    })),
    update: DeclarationWrappedKeyedFieldTextComposition.makeUpdate({
      ReplacedText: (_model, { value }) => ({ model: value }),
    }),
    EffectsLayer: Layer.empty,
  })
export const TextBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Schema.String,
  typeof prepareTextBlock
> = Block.assemble(prepareTextBlock)
export const TextEntry = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
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

export const ParentModel = Schema.Struct({
  choices: Schema.Array(ChoiceEntry),
  plainChoices: Schema.Array(ChoiceEntry),
  literalChoices: Schema.Array(LiteralChoiceEntry),
  textEntries: Schema.Array(TextEntry),
})
export const ParentMessage = Message.defineMessageUnion({
  IgnoredChildMessage: {},
})
export const DeclarationWrappedKeyedFieldParentDefinition =
  Block.makeDefinition('DeclarationWrappedKeyedFieldParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })

export const makePayloadParent = <A, I>(payloadSchema: Schema.Codec<A, I>) => {
  const Entry = Schema.Struct({
    id: ChoiceId,
    choice: Choice.block.Model,
    payload: payloadSchema,
  })
  const Model = Schema.Struct({ entries: Schema.Array(Entry) })
  const DeclarationWrappedKeyedFieldPayloadParentDefinition =
    Block.makeDefinition('DeclarationWrappedKeyedFieldPayloadParent', {
      Model,
      Message: ParentMessage,
    })
  const Binding =
    DeclarationWrappedKeyedFieldPayloadParentDefinition.makeBinding(
      PlainChoiceBlock,
      {
        field: 'entries',
        key: 'id',
        childField: 'choice',
      },
    )

  return { Binding, Model }
}

export const payloadParent = makePayloadParent(
  Schema.Struct({ label: Schema.String }),
)

export const firstChoiceId = Schema.decodeSync(ChoiceId)('first')

const foldChoiceOutMessage =
  DeclarationWrappedKeyedFieldParentDefinition.makeOutMessageFold(
    Choice.block,
    {
      SelectedValue:
        ({ value }, { liftCommand }) =>
        model => {
          const exactValue: 'One' | 'Two' = value
          void exactValue

          return {
            model,
            commands: [liftCommand(Choice.ReadChoice())],
          }
        },
    },
  )

export const choiceOutMessagePolicy = {
  fold: (
    id: typeof ChoiceId.Type,
    outMessage: typeof Choice.OutMessage.Type,
    context: Update.FoldContext<
      typeof Choice.Message.Type,
      typeof ParentMessage.Type,
      typeof ParentModel.Type
    >,
  ) => {
    const exactId: typeof ChoiceId.Type = id
    void exactId

    return foldChoiceOutMessage(outMessage, context)
  },
}

export const ChoicesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, {
    field: 'choices',
    key: 'id',
    childField: 'choice',
    subscriptions: {
      when: (model, id) => {
        expectNotAnyOrUnknown(model)
        expectNotAnyOrUnknown(id)
        type ParentModelContextIsExact = Expect<
          MutuallyAssignable<typeof model, typeof ParentModel.Type>
        >
        type KeyContextIsExact = Expect<
          MutuallyAssignable<typeof id, typeof ChoiceId.Type>
        >
        const parentModelContextIsExact: ParentModelContextIsExact = true
        const keyContextIsExact: KeyContextIsExact = true
        void parentModelContextIsExact
        void keyContextIsExact

        return true
      },
    },
  }).withOutMessagePolicy(choiceOutMessagePolicy)

export type InitializationContext = Readonly<{
  id: typeof ChoiceId.Type
  value: 'One' | 'Two'
}>

export const InitializedChoicesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, {
    field: 'choices',
    key: 'id',
    childField: 'choice',
    init: {
      instances: (context: InitializationContext) => {
        expectNotAnyOrUnknown(context)
        type ContextIsExact = Expect<
          MutuallyAssignable<typeof context, InitializationContext>
        >
        const contextIsExact: ContextIsExact = true
        void contextIsExact

        return [{ key: context.id, args: [context.value] }]
      },
      toItem: ({ key }, choice) => {
        expectNotAnyOrUnknown(key)
        expectNotAnyOrUnknown(choice)
        type KeyContextIsExact = Expect<
          MutuallyAssignable<typeof key, typeof ChoiceId.Type>
        >
        type ChildModelContextIsExact = Expect<
          MutuallyAssignable<typeof choice, typeof Choice.block.Model.Type>
        >
        const keyContextIsExact: KeyContextIsExact = true
        const childModelContextIsExact: ChildModelContextIsExact = true
        void keyContextIsExact
        void childModelContextIsExact

        return ChoiceEntry.make({ id: key, choice })
      },
    },
  }).withOutMessagePolicy(choiceOutMessagePolicy)

export const LiteralInitializedChoicesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, {
    field: 'choices',
    key: 'id',
    childField: 'choice',
    placement: 'literalInitializedChoices',
    init: {
      instances: () => [{ key: firstChoiceId, args: ['One'] }],
      toItem: ({ key, args }, choice) => {
        expectNotAnyOrUnknown(key)
        expectNotAnyOrUnknown(args)
        expectNotAnyOrUnknown(choice)
        type ArgumentsAreExact = Expect<
          MutuallyAssignable<typeof args, readonly [value: 'One' | 'Two']>
        >
        const argumentsAreExact: ArgumentsAreExact = true
        void argumentsAreExact

        return ChoiceEntry.make({ id: key, choice })
      },
    },
  }).withOutMessagePolicy(choiceOutMessagePolicy)

export const GeneralChoicesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, {
    placement: 'generalChoices',
    readAll: model => model.choices,
    key: item => item.id,
    keySchema: ChoiceEntry.fields.id,
    read: item => item.choice,
    writeAt: model => model,
    subscriptions: {
      when: (model, key) => {
        expectNotAnyOrUnknown(model)
        expectNotAnyOrUnknown(key)
        type ModelIsExact = Expect<
          MutuallyAssignable<typeof model, typeof ParentModel.Type>
        >
        type KeyIsExact = Expect<
          MutuallyAssignable<typeof key, typeof ChoiceId.Type>
        >
        const modelIsExact: ModelIsExact = true
        const keyIsExact: KeyIsExact = true
        void modelIsExact
        void keyIsExact

        return true
      },
    },
  }).withOutMessagePolicy({
    fold: (key, outMessage, context) => {
      expectNotAnyOrUnknown(key)
      expectNotAnyOrUnknown(outMessage)
      expectNotAnyOrUnknown(context)
      type KeyIsExact = Expect<
        MutuallyAssignable<typeof key, typeof ChoiceId.Type>
      >
      type OutMessageIsExact = Expect<
        MutuallyAssignable<typeof outMessage, typeof Choice.OutMessage.Type>
      >
      const keyIsExact: KeyIsExact = true
      const outMessageIsExact: OutMessageIsExact = true
      void keyIsExact
      void outMessageIsExact

      return DeclarationWrappedKeyedFieldParentDefinition.makeStep(model => ({
        model,
        commands: [context.liftCommand(Choice.ReadChoice())],
      }))
    },
  })

export const GeneralExtractedPolicyChoicesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, {
    placement: 'generalExtractedPolicyChoices',
    readAll: model => model.choices,
    key: item => item.id,
    keySchema: ChoiceEntry.fields.id,
    read: item => item.choice,
    writeAt: model => model,
  }).withOutMessagePolicy(choiceOutMessagePolicy)

export const PlainChoicesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(PlainChoiceBlock, {
    field: 'plainChoices',
    key: 'id',
    childField: 'choice',
  })

export const LiteralChoicesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, {
    placement: 'literalChoices',
    field: 'literalChoices',
    key: 'kind',
    childField: 'choice',
  }).withOutMessagePolicy({
    fold: (kind, outMessage) => {
      const exactKind: 'Primary' | 'Secondary' = kind
      const exactOutMessage: typeof Choice.OutMessage.Type = outMessage
      void exactKind
      void exactOutMessage

      return DeclarationWrappedKeyedFieldParentDefinition.makeStep(model => ({
        model,
      }))
    },
  })

export const TextEntriesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(TextBlock, {
    field: 'textEntries',
    key: 'id',
    childField: 'text',
  })

export const choiceInspection = Block.inspectBinding(ChoicesBinding)

export const DeclarationWrappedKeyedFieldParentComposition =
  DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
    bindings: [ChoicesBinding, LiteralChoicesBinding, TextEntriesBinding],
  })

// eslint-disable-next-line foldkit/block-name-matches-variable
export const initialComposition =
  DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
    bindings: [
      InitializedChoicesBinding,
      LiteralChoicesBinding,
      TextEntriesBinding,
    ],
  })

export const initialize = initialComposition.makeInit(
  (context: InitializationContext) => ({
    childInitContext: context,
    model: {
      plainChoices: [],
      literalChoices: [],
      textEntries: [],
    },
  }),
)

const prepareInitializedBlock = () =>
  initialComposition.prepareBlock({
    init: initialize,
    update: initialComposition.makeUpdate({
      IgnoredChildMessage: model => ({ model }),
    }),
    EffectsLayer: Layer.empty,
  })
export const initializedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareInitializedBlock
> = Block.assemble(prepareInitializedBlock)

export const initialParentModel = ParentModel.make({
  choices: [
    ChoiceEntry.make({
      id: firstChoiceId,
      choice: Choice.block.Model.make({ value: 'One' }),
    }),
  ],
  plainChoices: [],
  literalChoices: [
    LiteralChoiceEntry.make({
      kind: 'Primary',
      choice: Choice.block.Model.make({ value: 'Two' }),
    }),
  ],
  textEntries: [TextEntry.make({ id: 'text', text: 'initial' })],
})

// eslint-disable-next-line foldkit/block-name-matches-variable
const choicesExecutionComposition =
  DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
    bindings: [ChoicesBinding, LiteralChoicesBinding, TextEntriesBinding],
  })
// eslint-disable-next-line foldkit/block-name-matches-variable
const literalChoicesExecutionComposition =
  DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
    bindings: [ChoicesBinding, LiteralChoicesBinding, TextEntriesBinding],
  })
// eslint-disable-next-line foldkit/block-name-matches-variable
const textEntriesExecutionComposition =
  DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
    bindings: [ChoicesBinding, LiteralChoicesBinding, TextEntriesBinding],
  })

export const foldChoice = choicesExecutionComposition.makeUpdate.withContext(
  (id: typeof ChoiceId.Type, childMessage: typeof Choice.Message.Type) => ({
    IgnoredChildMessage: (model, _message) =>
      ChoicesBinding.fold(model, id, childMessage),
  }),
)
export const setChoiceValue =
  choicesExecutionComposition.makeUpdate.withContext(
    (id: typeof ChoiceId.Type, value: 'One' | 'Two') => ({
      IgnoredChildMessage: (model, _message) =>
        ChoicesBinding.setValue(id, value)(model),
    }),
  )
export const refreshChoice = choicesExecutionComposition.makeUpdate.withContext(
  (id: typeof ChoiceId.Type) => ({
    IgnoredChildMessage: (model, _message) => ChoicesBinding.refresh(id)(model),
  }),
)
export const selectChoice = choicesExecutionComposition.makeUpdate.withContext(
  (id: typeof ChoiceId.Type) => ({
    IgnoredChildMessage: (model, _message) => ChoicesBinding.select(id)(model),
  }),
)
export const setLiteralChoiceValue =
  literalChoicesExecutionComposition.makeUpdate.withContext(
    (kind: 'Primary' | 'Secondary', value: 'One' | 'Two') => ({
      IgnoredChildMessage: (model, _message) =>
        LiteralChoicesBinding.setValue(kind, value)(model),
    }),
  )
export const selectLiteralChoice =
  literalChoicesExecutionComposition.makeUpdate.withContext(
    (kind: 'Primary' | 'Secondary') => ({
      IgnoredChildMessage: (model, _message) =>
        LiteralChoicesBinding.select(kind)(model),
    }),
  )
export const foldTextEntry =
  textEntriesExecutionComposition.makeUpdate.withContext(
    (id: string, childMessage: typeof TextMessage.Type) => ({
      IgnoredChildMessage: (model, _message) =>
        TextEntriesBinding.fold(model, id, childMessage),
    }),
  )

const choiceExecutionMessage = ParentMessage.IgnoredChildMessage()
const otherExecutionMessage = ParentMessage.IgnoredChildMessage()

foldChoice(
  initialParentModel,
  choiceExecutionMessage,
  firstChoiceId,
  Choice.Message.UpdatedValue({ value: 'Two' }),
)
setChoiceValue(initialParentModel, choiceExecutionMessage, firstChoiceId, 'One')
selectLiteralChoice(initialParentModel, otherExecutionMessage, 'Primary')
foldTextEntry(
  initialParentModel,
  otherExecutionMessage,
  'text',
  TextMessage.ReplacedText({ value: 'next' }),
)

const initializedModel = initialize({ id: firstChoiceId, value: 'Two' }).model
type InitializedModelIsExact = Expect<
  MutuallyAssignable<typeof initializedModel, typeof ParentModel.Type>
>
const initializedModelIsExact: InitializedModelIsExact = true
void initializedModelIsExact

const UnassembledMessage = Schema.Never

export const unassembledInitialize = Block.makeDefinition(
  'DeclarationUnassembledWrappedKeyedFieldParent',
  {
    Model: ParentModel,
    Message: UnassembledMessage,
  },
)
  .makeComposition()
  .makeInit(() => ({
    model: {
      choices: [],
      plainChoices: [],
      literalChoices: [],
      textEntries: [],
    },
  }))
type UnassembledModelRemainsExact = Expect<
  MutuallyAssignable<
    ReturnType<typeof unassembledInitialize>['model']['choices'],
    Array<never>
  >
>
const unassembledModelRemainsExact: UnassembledModelRemainsExact = true
void unassembledModelRemainsExact

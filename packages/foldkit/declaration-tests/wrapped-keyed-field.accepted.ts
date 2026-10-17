import { Context, Effect, Layer, Option, Schema } from 'effect'
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
    CompletedRefresh: {},
  })
  const ChoiceOutMessage = Message.defineMessageUnion({
    SelectedValue: { value: Value },
  })
  const DeclarationWrappedKeyedFieldChoice = Block.define(
    'DeclarationWrappedKeyedFieldChoice',
    {
      Model,
      Message: ChoiceMessage,
      OutMessage: ChoiceOutMessage,
    },
  )
  const ReadChoice = DeclarationWrappedKeyedFieldChoice.command('ReadChoice', {
    messages: [ChoiceMessage.CompletedRefresh],
    handler: function* () {
      const service = yield* ChoiceService
      yield* choiceHandlerConstruction

      return () =>
        service.refresh.pipe(Effect.as(ChoiceMessage.CompletedRefresh()))
    },
  })
  const setValue = DeclarationWrappedKeyedFieldChoice.step(
    (model, value: Value) => ({
      model: Struct.modifyFields(model, { value: () => value }),
    }),
  )
  const refresh = DeclarationWrappedKeyedFieldChoice.step(model => ({
    model,
    commands: [ReadChoice()],
  }))
  const select = DeclarationWrappedKeyedFieldChoice.step(model => ({
    model,
    outMessage: ChoiceOutMessage.SelectedValue({ value: model.value }),
  }))
  const DeclarationWrappedKeyedFieldChoiceComposition =
    DeclarationWrappedKeyedFieldChoice.makeComposition()
  const block = DeclarationWrappedKeyedFieldChoiceComposition.makeBlock({
    init: DeclarationWrappedKeyedFieldChoiceComposition.makeInit(
      (value: Value) => ({
        model: Model.make({ value }),
        commands: [ReadChoice()],
      }),
    ),
    update: DeclarationWrappedKeyedFieldChoiceComposition.makeUpdate(
      (model, message) =>
        ChoiceMessage.match(message, {
          UpdatedValue: ({ value }) => setValue(model, value),
          CompletedRefresh: () => ({ model }),
        }),
    ),
    expose: { setValue, refresh, select },
    EffectsLayer: ReadChoice.layer,
  })

  return {
    block,
    Message: ChoiceMessage,
    OutMessage: ChoiceOutMessage,
    ReadChoice,
  }
}

export const Choice = makeChoice(Schema.Literals(['One', 'Two']))

const DeclarationWrappedKeyedFieldPlainChoice = Block.define(
  'DeclarationWrappedKeyedFieldPlainChoice',
  {
    Model: Choice.block.Model,
    Message: Choice.Message,
  },
)
const DeclarationWrappedKeyedFieldPlainChoiceComposition =
  DeclarationWrappedKeyedFieldPlainChoice.makeComposition()
export const PlainChoiceBlock =
  DeclarationWrappedKeyedFieldPlainChoiceComposition.makeBlock({
    init: DeclarationWrappedKeyedFieldPlainChoiceComposition.makeInit(() => ({
      model: Choice.block.Model.make({ value: 'One' }),
    })),
    update: DeclarationWrappedKeyedFieldPlainChoiceComposition.makeUpdate(
      (model, message) =>
        Choice.Message.match(message, {
          UpdatedValue: ({ value }) => ({
            model: Struct.modifyFields(model, { value: () => value }),
          }),
          CompletedRefresh: () => ({ model }),
        }),
    ),
    EffectsLayer: Layer.empty,
  })

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
const DeclarationWrappedKeyedFieldText = Block.define(
  'DeclarationWrappedKeyedFieldText',
  {
    Model: Schema.String,
    Message: TextMessage,
  },
)
const DeclarationWrappedKeyedFieldTextComposition =
  DeclarationWrappedKeyedFieldText.makeComposition()
export const TextBlock = DeclarationWrappedKeyedFieldTextComposition.makeBlock({
  init: DeclarationWrappedKeyedFieldTextComposition.makeInit(() => ({
    model: '',
  })),
  update: DeclarationWrappedKeyedFieldTextComposition.makeUpdate(
    (_model, { value }) => ({ model: value }),
  ),
  EffectsLayer: Layer.empty,
})
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
  GotChoiceMessage: { id: ChoiceId, message: Choice.Message },
  GotLiteralChoiceMessage: {
    kind: Schema.Literals(['Primary', 'Secondary']),
    message: Choice.Message,
  },
  GotTextMessage: { id: Schema.String, message: TextBlock.Message },
})
export const DeclarationWrappedKeyedFieldParent = Block.define(
  'DeclarationWrappedKeyedFieldParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

export const makePayloadParent = <A, I>(payloadSchema: Schema.Codec<A, I>) => {
  const Entry = Schema.Struct({
    id: ChoiceId,
    choice: Choice.block.Model,
    payload: payloadSchema,
  })
  const Model = Schema.Struct({ entries: Schema.Array(Entry) })
  const DeclarationWrappedKeyedFieldPayloadParent = Block.define(
    'DeclarationWrappedKeyedFieldPayloadParent',
    {
      Model,
      Message: ParentMessage,
    },
  )
  const Binding = DeclarationWrappedKeyedFieldPayloadParent.bindChild(
    PlainChoiceBlock,
    {
      field: 'entries',
      key: 'id',
      childField: 'choice',
      toParentMessage: (id, message) =>
        ParentMessage.GotChoiceMessage({ id, message }),
      fromParentMessage: {
        parentMessage: ParentMessage.GotChoiceMessage,
        args: (_model, { id, message }) => Option.some([id, message]),
      },
    },
  )

  return { Binding, Model }
}

export const payloadParent = makePayloadParent(
  Schema.Struct({ label: Schema.String }),
)

export const firstChoiceId = Schema.decodeSync(ChoiceId)('first')

export const toChoiceMessage = (
  id: typeof ChoiceId.Type,
  message: typeof Choice.Message.Type,
) => ParentMessage.GotChoiceMessage({ id, message })

export const choiceOutMessagePolicy = {
  fold: (
    id: typeof ChoiceId.Type,
    outMessage: typeof Choice.OutMessage.Type,
    {
      liftCommand,
    }: Update.FoldContext<
      typeof Choice.Message.Type,
      typeof ParentMessage.Type,
      typeof ParentModel.Type
    >,
  ) => {
    const exactId: typeof ChoiceId.Type = id
    void exactId

    return Choice.OutMessage.match(outMessage, {
      SelectedValue: ({ value }) =>
        DeclarationWrappedKeyedFieldParent.step(model => {
          const exactValue: 'One' | 'Two' = value
          void exactValue

          return {
            model,
            commands: [liftCommand(Choice.ReadChoice())],
          }
        }),
    })
  },
}

export const ChoicesBinding = DeclarationWrappedKeyedFieldParent.bindChild(
  Choice.block,
  {
    field: 'choices',
    key: 'id',
    childField: 'choice',
    toParentMessage: toChoiceMessage,
    fromParentMessage: {
      parentMessage: ParentMessage.GotChoiceMessage,
      args: (model, { id, message }) => {
        expectNotAnyOrUnknown(model)
        expectNotAnyOrUnknown(id)
        expectNotAnyOrUnknown(message)
        type ParentModelContextIsExact = Expect<
          MutuallyAssignable<typeof model, typeof ParentModel.Type>
        >
        type KeyContextIsExact = Expect<
          MutuallyAssignable<typeof id, typeof ChoiceId.Type>
        >
        type MessageContextIsExact = Expect<
          MutuallyAssignable<typeof message, typeof Choice.Message.Type>
        >
        const parentModelContextIsExact: ParentModelContextIsExact = true
        const keyContextIsExact: KeyContextIsExact = true
        const messageContextIsExact: MessageContextIsExact = true
        void parentModelContextIsExact
        void keyContextIsExact
        void messageContextIsExact

        return Option.some([id, message])
      },
    },
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
    outMessage: choiceOutMessagePolicy,
  },
)

export type InitializationContext = Readonly<{
  id: typeof ChoiceId.Type
  value: 'One' | 'Two'
}>

export const InitializedChoicesBinding =
  DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, {
    field: 'choices',
    key: 'id',
    childField: 'choice',
    toParentMessage: toChoiceMessage,
    fromParentMessage: {
      parentMessage: ParentMessage.GotChoiceMessage,
      args: (_model, { id, message }) => Option.some([id, message]),
    },
    outMessage: choiceOutMessagePolicy,
    init: {
      occurrences: (context: InitializationContext) => {
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
  })

export const LiteralInitializedChoicesBinding =
  DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, {
    field: 'choices',
    key: 'id',
    childField: 'choice',
    placement: 'literalInitializedChoices',
    toParentMessage: toChoiceMessage,
    fromParentMessage: false,
    outMessage: choiceOutMessagePolicy,
    init: {
      occurrences: () => [{ key: firstChoiceId, args: ['One'] }],
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
  })

export const GeneralChoicesBinding =
  DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, {
    placement: 'generalChoices',
    readAll: model => model.choices,
    key: item => item.id,
    read: item => item.choice,
    writeAt: model => model,
    toParentMessage: (id, message) =>
      ParentMessage.GotChoiceMessage({ id, message }),
    fromParentMessage: {
      parentMessage: ParentMessage.GotChoiceMessage,
      args: (_model, { id, message }) => Option.some([id, message]),
    },
    outMessage: {
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

        return DeclarationWrappedKeyedFieldParent.step(model => ({
          model,
          commands: [context.liftCommand(Choice.ReadChoice())],
        }))
      },
    },
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
  })

export const GeneralExtractedPolicyChoicesBinding =
  DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, {
    placement: 'generalExtractedPolicyChoices',
    readAll: model => model.choices,
    key: item => item.id,
    read: item => item.choice,
    writeAt: model => model,
    toParentMessage: (id, message) =>
      ParentMessage.GotChoiceMessage({ id, message }),
    fromParentMessage: false,
    outMessage: choiceOutMessagePolicy,
  })

export const PlainChoicesBinding = DeclarationWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  {
    field: 'plainChoices',
    key: 'id',
    childField: 'choice',
    toParentMessage: toChoiceMessage,
    fromParentMessage: {
      parentMessage: ParentMessage.GotChoiceMessage,
      args: (_model, { id, message }) => Option.some([id, message]),
    },
  },
)

export const LiteralChoicesBinding =
  DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, {
    field: 'literalChoices',
    key: 'kind',
    childField: 'choice',
    toParentMessage: (kind, message) =>
      ParentMessage.GotLiteralChoiceMessage({ kind, message }),
    fromParentMessage: {
      parentMessage: ParentMessage.GotLiteralChoiceMessage,
      args: (_model, { kind, message }) => Option.some([kind, message]),
    },
    outMessage: {
      fold: (kind, outMessage) => {
        const exactKind: 'Primary' | 'Secondary' = kind
        const exactOutMessage: typeof Choice.OutMessage.Type = outMessage
        void exactKind
        void exactOutMessage

        return DeclarationWrappedKeyedFieldParent.step(model => ({ model }))
      },
    },
  })

export const TextEntriesBinding = DeclarationWrappedKeyedFieldParent.bindChild(
  TextBlock,
  {
    field: 'textEntries',
    key: 'id',
    childField: 'text',
    toParentMessage: (id, message) =>
      ParentMessage.GotTextMessage({ id, message }),
    fromParentMessage: {
      parentMessage: ParentMessage.GotTextMessage,
      args: (_model, { id, message }) => Option.some([id, message]),
    },
  },
)

export const choiceInspection = Block.inspectBinding(ChoicesBinding)

export const DeclarationWrappedKeyedFieldParentComposition =
  DeclarationWrappedKeyedFieldParent.makeComposition({
    childBindings: [ChoicesBinding, LiteralChoicesBinding, TextEntriesBinding],
  })

// eslint-disable-next-line foldkit/block-name-matches-variable
export const initialComposition =
  DeclarationWrappedKeyedFieldParent.makeComposition({
    childBindings: [InitializedChoicesBinding],
  })

export const initialize = initialComposition.makeInit(
  (context: InitializationContext) => ({
    startup: context,
    model: {
      plainChoices: [],
      literalChoices: [],
      textEntries: [],
    },
  }),
)

export const initializedBlock = initialComposition.makeBlock({
  init: initialize,
  update: initialComposition.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.empty,
})

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
  DeclarationWrappedKeyedFieldParent.makeComposition({
    childBindings: [ChoicesBinding],
  })
// eslint-disable-next-line foldkit/block-name-matches-variable
const literalChoicesExecutionComposition =
  DeclarationWrappedKeyedFieldParent.makeComposition({
    childBindings: [LiteralChoicesBinding],
  })
// eslint-disable-next-line foldkit/block-name-matches-variable
const textEntriesExecutionComposition =
  DeclarationWrappedKeyedFieldParent.makeComposition({
    childBindings: [TextEntriesBinding],
  })

export const foldChoice = choicesExecutionComposition.makeUpdate(
  (
    model,
    _message,
    id: typeof ChoiceId.Type,
    childMessage: typeof Choice.Message.Type,
  ) => ChoicesBinding.fold(model, id, childMessage),
)
export const setChoiceValue = choicesExecutionComposition.makeUpdate(
  (model, _message, id: typeof ChoiceId.Type, value: 'One' | 'Two') =>
    ChoicesBinding.setValue(id, value)(model),
)
export const refreshChoice = choicesExecutionComposition.makeUpdate(
  (model, _message, id: typeof ChoiceId.Type) =>
    ChoicesBinding.refresh(id)(model),
)
export const selectChoice = choicesExecutionComposition.makeUpdate(
  (model, _message, id: typeof ChoiceId.Type) =>
    ChoicesBinding.select(id)(model),
)
export const setLiteralChoiceValue =
  literalChoicesExecutionComposition.makeUpdate(
    (model, _message, kind: 'Primary' | 'Secondary', value: 'One' | 'Two') =>
      LiteralChoicesBinding.setValue(kind, value)(model),
  )
export const selectLiteralChoice =
  literalChoicesExecutionComposition.makeUpdate(
    (model, _message, kind: 'Primary' | 'Secondary') =>
      LiteralChoicesBinding.select(kind)(model),
  )
export const foldTextEntry = textEntriesExecutionComposition.makeUpdate(
  (model, _message, id: string, childMessage: typeof TextMessage.Type) =>
    TextEntriesBinding.fold(model, id, childMessage),
)

const choiceExecutionMessage = ParentMessage.GotTextMessage({
  id: 'text',
  message: TextMessage.ReplacedText({ value: 'unchanged' }),
})
const otherExecutionMessage = ParentMessage.GotChoiceMessage({
  id: firstChoiceId,
  message: Choice.Message.UpdatedValue({ value: 'One' }),
})

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

export const unassembledInitialize =
  DeclarationWrappedKeyedFieldParent.makeComposition().makeInit(() => ({
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

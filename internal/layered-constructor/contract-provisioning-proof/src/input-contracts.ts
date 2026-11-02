import { Effect, Option, Schema, Tuple } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'
import { defineMessageUnion } from 'foldkit/message'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

export type ItemInputs<Item> = Readonly<{
  items: ReadonlyArray<Item>
  itemToKey: (item: Item) => string
  itemToText: (item: Item) => string
}>
type Startup = Readonly<{ initialCount: number }>
export const InputContractProofKey = Symbol('InputContractProof')

export const makeItemBlock = <Item>() => {
  const Model = Schema.Struct({
    count: Schema.Number,
    maybeSelectedKey: Schema.Option(Schema.String),
  })
  const Message = defineMessageUnion({
    RequestedIncrement: { amount: Schema.Number },
    RequestedClear: {},
    RequestedSelection: { key: Schema.String },
  })
  const Definition = Contracted.makeDefinition('InputContractProof', {
    key: InputContractProofKey,
    Model,
    Message,
    Init: Contracted.makeInputContract<readonly [startup: Startup]>(),
    view: {
      kind: 'Element',
      Inputs: Contracted.makeInputContract<ItemInputs<Item>>(),
    },
    operations: {
      increment: (amount = 1) =>
        Tuple.make(Message.RequestedIncrement({ amount })),
      clear: Message.RequestedClear,
      select: (item: Item, itemToKey: (item: Item) => string) =>
        Tuple.make(Message.RequestedSelection({ key: itemToKey(item) })),
    },
  })
  const Composition = Definition.makeComposition()
  const init = Composition.makeInit(({ initialCount }) => ({
    model: { count: initialCount, maybeSelectedKey: Option.none() },
  }))
  const update = Composition.makeUpdate({
    RequestedIncrement: Definition.makeFieldsStep.fromMessage(({ amount }) => ({
      count: count => count + amount,
    })),
    RequestedClear: Definition.makeFieldsStep(() => ({ count: () => 0 })),
    RequestedSelection: Definition.makeFieldsStep.fromMessage(({ key }) => ({
      maybeSelectedKey: () => Option.some(key),
    })),
  })
  const view = Composition.makeView.withInputs((model, inputs, h) =>
    h.div(
      [],
      [
        globalThis.String(model.count),
        ...inputs.items.map(item =>
          h.keyed('span')(
            inputs.itemToKey(item),
            [h.Role('status')],
            [inputs.itemToText(item)],
          ),
        ),
      ],
    ),
  )

  return Definition.makeBlock(
    Effect.succeed({ children: [], init, update, view }),
  )
}

export const StringItemBlock = makeItemBlock<string>()

export type StringItemBlock = ReturnType<typeof makeItemBlock<string>>
export type StringItemsStayExact = Assert<
  Equal<
    Contracted.FactsOf<StringItemBlock>['view'],
    Contracted.ViewContract<ItemInputs<string>, 'Element'>
  >
>
export type DefaultOperationInputIsOptional = Assert<
  Equal<
    Contracted.FactsOf<StringItemBlock>['operations']['increment']['args'],
    [amount?: number | undefined]
  >
>

export const validateGenericOperation = () =>
  Effect.gen(function* () {
    const block = yield* StringItemBlock.get
    const initial = block.init({ initialCount: 0 })

    block.operations.select(initial.model, 'alpha', item => item.toUpperCase())
    // @ts-expect-error The generic operation retains the selected Item type.
    block.operations.select(initial.model, 1, item => globalThis.String(item))
    // @ts-expect-error The generic callback remains correlated with Item.
    block.operations.select(initial.model, 'alpha', (item: number) =>
      globalThis.String(item),
    )
  })

const Model = Schema.Struct({ text: Schema.String })
const Message = defineMessageUnion({
  RequestedFormatting: { count: Schema.Number },
})
type FormatContext = Readonly<{ format: (count: number) => string }>
export const InputContextProofKey = Symbol('InputContextProof')
const Definition = Contracted.makeDefinition('InputContextProof', {
  key: InputContextProofKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  Context: Contracted.makeInputContract<readonly [context: FormatContext]>(),
  operations: {
    format: (count: number, context: FormatContext) =>
      Tuple.make(Message.RequestedFormatting({ count }), context),
  },
})
const Composition = Definition.makeComposition()
export const FormattedBlock = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init: Composition.makeInit(() => ({ model: { text: '' } })),
    update: Composition.makeUpdate.withContext(context => ({
      RequestedFormatting: Definition.makeFieldsStep.fromMessage(
        ({ count }) => ({
          text: () => context.format(count),
        }),
      ),
    })),
  }),
)

export const validateMappedContext = () =>
  Effect.gen(function* () {
    const block = yield* FormattedBlock.get
    const initial = block.init()

    block.operations.format(initial.model, 3, {
      format: count => globalThis.String(count),
    })
    block.operations.format(initial.model, 3, {
      // @ts-expect-error A mapped operation retains the Context callback input.
      format: (text: string) => text,
    })
    // @ts-expect-error A mapped operation retains required Context arguments.
    block.operations.format(initial.model, 3)
  })

const ForeignMessage = defineMessageUnion({ RequestedForeignFormatting: {} })
export const ForeignOperationProofKey = Symbol('ForeignOperationProof')
const ForeignDefinition = Contracted.makeDefinition('ForeignOperationProof', {
  key: ForeignOperationProofKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  operations: {
    format: () => Tuple.make(ForeignMessage.RequestedForeignFormatting()),
  },
})
const ForeignComposition = ForeignDefinition.makeComposition()
const foreignConstructor = Effect.succeed({
  children: [],
  init: ForeignComposition.makeInit(() => ({ model: { text: '' } })),
  update: ForeignComposition.makeUpdate({
    RequestedFormatting: ForeignDefinition.makeNoopStep(),
  }),
})

// @ts-expect-error A tuple producer cannot introduce another Block's Message.
ForeignDefinition.makeBlock(foreignConstructor)

export const EmptyOperationProofKey = Symbol('EmptyOperationProof')

export const validateTupleOutput = () =>
  Contracted.makeDefinition('EmptyOperationProof', {
    key: EmptyOperationProofKey,
    Model,
    Message,
    Init: Schema.Tuple([]),
    operations: {
      // @ts-expect-error Operation producers must return a nonempty Message tuple.
      empty: () => [],
    },
  })

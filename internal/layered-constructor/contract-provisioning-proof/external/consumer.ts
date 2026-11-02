import { Effect, Layer, Schema } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'
import { defineMessageUnion } from 'foldkit/message'

import { Block, Contract, ParentBlock, Send } from '../declarations/basic.js'
import { ContextBlock } from '../declarations/context-and-codecs.js'
import {
  FormattedBlock,
  StringItemBlock,
} from '../declarations/input-contracts.js'

const Model = Schema.Struct({ child: Contract.Model, submitted: Schema.String })
const Message = defineMessageUnion({ ClickedClear: {} })
export const RelocatedContractParentKey = Symbol('RelocatedContractParent')
const Definition = Contracted.makeDefinition('RelocatedContractParent', {
  key: RelocatedContractParentKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const ChildBinding = Definition.makeBinding(Contract, {
  field: 'child',
  init: { contextToArgs: () => ['External'] },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(Contract, {
    Submitted: ({ text }) =>
      Definition.makeFieldsStep(() => ({ submitted: () => text })),
  }),
})
const Composition = Definition.makeComposition({ bindings: [ChildBinding] })
const clear = ChildBinding.clear()
const externalConstructor = Effect.gen(function* () {
  const child = yield* ChildBinding

  return {
    children: [child],
    init: Composition.makeInit(() => ({ model: { submitted: '' } })),
    update: Composition.makeUpdate({ ClickedClear: clear }),
    view: Composition.makeView((model, h) =>
      h.div(
        [],
        [
          h.block(
            ChildBinding.embedView({ slotId: 'child', model: model.child }),
          ),
        ],
      ),
    ),
  }
})
export const ExternalBlock = Definition.makeBlock(externalConstructor)
export const ExternalLayer = ExternalBlock.layer.pipe(
  Layer.provide(Block.layer),
)

declare const optionalOperationsBody: Effect.Success<
  typeof externalConstructor
> &
  Readonly<{ operations?: Readonly<Record<never, never>> }>
// @ts-expect-error Optional duplicate operation declarations reject after package relocation.
Definition.makeBlock(Effect.succeed(optionalOperationsBody))

declare const unionOperationsBody:
  | Effect.Success<typeof externalConstructor>
  | (Effect.Success<typeof externalConstructor> &
      Readonly<{ operations: Readonly<Record<never, never>> }>)
// @ts-expect-error Every constructor body union member must omit duplicate operations.
Definition.makeBlock(Effect.succeed(unionOperationsBody))

// @ts-expect-error External consumers retain exact operation payloads.
ChildBinding.clear({ value: 'Wrong' })
// @ts-expect-error The external Binding field must contain the child Model.
Definition.makeBinding(Contract, { field: 'submitted' })
// @ts-expect-error External policies remain exhaustive.
Definition.makeOutMessageFold(Contract, {})

Effect.gen(function* () {
  const child = yield* Contract.get
  child.init('Value')
  // @ts-expect-error The independent init tuple survives relocation.
  child.init(1)
  const contextual = yield* ContextBlock.get
  const initial = contextual.init('')
  contextual.operations.clear(initial.model, { prefix: 'External: ' })
  // @ts-expect-error Required dispatch Context survives relocation.
  contextual.operations.clear(initial.model)
})

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Assert<Value extends true> = Value
export type ChildProviderRequired = Assert<
  Equal<
    Layer.Services<typeof ExternalBlock.layer>,
    Layer.Success<typeof Block.layer>
  >
>
export type ChildProviderSatisfied = Assert<
  Equal<Layer.Services<typeof ExternalLayer>, never>
>
export type LazyExecutionStillNeedsSend = Assert<
  Equal<Contracted.FactsOf<typeof ParentBlock>['programRequirements'], Send>
>

export const declareUnionContract = (
  id: 'ExternalFirst' | 'ExternalSecond',
) => {
  const key = Symbol('ExternalUnionContract')
  // @ts-expect-error A provider identity must be one literal after declaration relocation.
  Contracted.makeDefinition(id, { key, Model, Message, Init: Schema.Tuple([]) })
}

export const itemInputs: Contracted.FactsOf<
  typeof StringItemBlock
>['view']['inputs'] = {
  items: ['one'],
  itemToKey: item => item,
  itemToText: item => item.toUpperCase(),
}

export const incorrectItemInputs: Contracted.FactsOf<
  typeof StringItemBlock
>['view']['inputs'] = {
  items: ['one'],
  itemToKey: item => item,
  // @ts-expect-error Callback input correlation survives declaration relocation.
  itemToText: (item: number) => globalThis.String(item),
}

export const mappedExternalCalls = () =>
  Effect.gen(function* () {
    const itemBlock = yield* StringItemBlock.get
    const initial = itemBlock.init({ initialCount: 1 })
    itemBlock.operations.increment(initial.model)
    itemBlock.operations.increment(initial.model, 3)
    // @ts-expect-error Defaulted mapped arguments retain their numeric type.
    itemBlock.operations.increment(initial.model, 'wrong')
    itemBlock.operations.select(initial.model, 'alpha', item =>
      item.toUpperCase(),
    )
    // @ts-expect-error Generic item inputs survive declaration relocation.
    itemBlock.operations.select(initial.model, 1, item =>
      globalThis.String(item),
    )
    // @ts-expect-error Generic callback inputs stay correlated after relocation.
    itemBlock.operations.select(initial.model, 'alpha', (item: number) =>
      globalThis.String(item),
    )

    const formatted = yield* FormattedBlock.get
    const initialFormatting = formatted.init()
    formatted.operations.format(initialFormatting.model, 1, {
      format: count => globalThis.String(count),
    })
    formatted.operations.format(initialFormatting.model, 1, {
      // @ts-expect-error Mapped callback Context retains its exact argument type.
      format: (text: string) => text,
    })
  })

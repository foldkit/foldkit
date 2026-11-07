import { Effect, Layer, Schema } from 'effect'
import { Block, Story, Struct, Update } from 'foldkit'

import {
  ChildBlock,
  ChildMessage,
  ChildModel,
  ChildOutMessage,
  Choice,
} from './child.js'
import {
  EntryId,
  Model,
  ParentBlock,
  ParentMessage,
  ParentOutMessage,
  RecordSelection,
  SelectionLog,
  foldSelection,
  layer,
  makeFieldsStep,
  makeOutMessageFold,
} from './parent.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
const expectType = <Value extends true>(value: Value) => value

export type ExactFoldRequirements = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof foldSelection>>,
    Effect.Services<ReturnType<typeof RecordSelection>['effect']>
  >
>
export type ExactLayerRequirements = Expect<
  Equal<Layer.Services<typeof layer>, never>
>
export type ExactHandlerServices = Expect<
  Equal<Layer.Services<typeof RecordSelection.layer>, SelectionLog>
>

export const foldForEntry = (key: EntryId) =>
  makeOutMessageFold(ChildBlock, {
    Selected: ({ value }, { modelBeforeUpdate }) => {
      const exactValue: Choice = value
      const exactModel: Model = modelBeforeUpdate

      return makeFieldsStep(() => ({
        selected: () => exactValue,
        selectedId: () => key,
        beforeCount: () => exactModel.beforeCount,
      }))
    },
    Closed: ParentBlock.makeNoopStep,
  })
export const ExtractedEntriesBinding = ParentBlock.makeRecordBinding(
  ChildBlock,
  {
    field: 'entries',
  },
).withOutMessagePolicy({ fold: foldForEntry })

export const InlineEntriesBinding = ParentBlock.makeRecordBinding(ChildBlock, {
  field: 'entries',
}).withOutMessagePolicy({
  fold: key => {
    expectType<Equal<typeof key, EntryId>>(true)

    return makeOutMessageFold(ChildBlock, {
      Selected:
        ({ value }) =>
        model => {
          expectType<Equal<typeof value, Choice>>(true)
          expectType<Equal<typeof model, Model>>(true)

          return {
            model: Struct.modifyFields(model, {
              selected: () => value,
              selectedId: () => key,
            }),
          }
        },
      Closed: ParentBlock.makeNoopStep,
    })
  },
})

const EquivalentChildKey = Symbol('EquivalentKeyedFoldChild')
const EquivalentChildBlock = Block.make('EquivalentKeyedFoldChild', {
  key: EquivalentChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
  InitArgs: Schema.Tuple([]),
})
const equivalentFold = ParentBlock.makeOutMessageFold(EquivalentChildBlock, {
  Selected: ParentBlock.makeNoopStep,
  Closed: ParentBlock.makeNoopStep,
})
export const EquivalentEntriesBinding = ParentBlock.makeRecordBinding(
  ChildBlock,
  {
    field: 'entries',
  },
).withOutMessagePolicy({ fold: equivalentFold })

export const acquiredSelection = Story.withBlock(
  { block: ParentBlock, layer },
  executable => {
    const initial = Struct.modifyFields(executable.init().model, {
      entries: () => ({
        [EntryId.make('first')]: ChildModel.make({ count: 0 }),
      }),
    })
    const selected = executable.update(
      initial,
      ParentMessage.RequestedChoose({
        id: EntryId.make('first'),
        value: 'Pear',
      }),
    )
    expectType<Equal<typeof selected.model, Model>>(true)
    expectType<
      Equal<
        Exclude<typeof selected.outMessage, undefined>,
        typeof ParentOutMessage.Type
      >
    >(true)

    return selected
  },
)
export type ExactAcquiredRequirements = Expect<
  Equal<Effect.Services<typeof acquiredSelection>, never>
>

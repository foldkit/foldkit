import { Effect, Number, Option, Schema } from 'effect'
import { Block, Message, Struct, Update } from 'foldkit'

import { SelectionStore } from './contracts.js'
import { HistoryBlock } from './history.js'

/** The synchronous Item contract used by the public Combobox factory. */
export type ItemSchema<Item extends string, ItemEncoded = Item> = Schema.Codec<
  Item,
  ItemEncoded,
  never,
  never
> &
  Readonly<{ '~type.make': Item }>

/** Constructs and completes generic child policies while preserving the Item Schema. */
export const makeSelectionFeature = <Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
) => {
  const SelectionModel = Schema.Struct({ selections: Schema.Number })
  const SelectionMessage = Message.defineMessageUnion({
    RequestedSelect: { value: Item },
    RequestedClose: {},
  })
  const SelectionOutMessage = Message.defineMessageUnion({
    Selected: { value: Item },
    Closed: {},
  })
  const SelectionDefinition = Block.makeDefinition('GenericPolicySelection', {
    Model: SelectionModel,
    Message: SelectionMessage,
    OutMessage: SelectionOutMessage,
  })
  const SelectionComposition = SelectionDefinition.makeComposition()
  const prepareSelectionBlock = () =>
    SelectionComposition.prepareBlock({
      init: SelectionComposition.makeInit(() => ({
        model: SelectionModel.make({ selections: 0 }),
      })),
      update: SelectionComposition.makeUpdate({
        RequestedSelect: (model, { value }) => ({
          model: Struct.modifyFields(model, { selections: Number.increment }),
          outMessage: SelectionOutMessage.Selected({ value }),
        }),
        RequestedClose: model => ({
          model,
          outMessage: SelectionOutMessage.Closed(),
        }),
      }),
      operations: {
        select: SelectionMessage.RequestedSelect,
        close: SelectionMessage.RequestedClose,
      },
    })
  const SelectionBlock: Block.FromAssemblyWithOutMessage<
    typeof SelectionModel,
    typeof prepareSelectionBlock
  > = Block.assemble(prepareSelectionBlock)

  const Model = Schema.Struct({
    selection: SelectionBlock.Model,
    history: HistoryBlock.Model,
    maybeSelected: Schema.Option(Item),
  })
  const ParentMessage = Message.defineMessageUnion({
    RequestedSelect: { value: Item },
    RequestedClose: {},
    CompletedRecordSelection: {},
  })
  const OutMessage = Message.defineMessageUnion({
    ChoseItem: { value: Item },
  })
  const Definition = Block.makeDefinition('GenericPolicyParent', {
    Model,
    Message: ParentMessage,
    OutMessage,
  })
  const RecordSelection = Definition.makeCommand('RecordSelection', {
    args: { value: Item },
    messages: [ParentMessage.CompletedRecordSelection],
    handler: function* () {
      const store = yield* SelectionStore

      return ({ value }) =>
        Effect.as(store.record(value), ParentMessage.CompletedRecordSelection())
    },
  })
  const HistoryBinding = Definition.makeBinding(HistoryBlock, {
    field: 'history',
  })
  const UnselectedBinding = Definition.makeBinding(SelectionBlock, {
    field: 'selection',
  })
  const foldSelectionOutMessage = Definition.makeOutMessageFold(
    SelectionBlock,
    {
      Selected: ({ value }) => {
        const selectedItem: Item = value

        return Update.combineSteps([
          HistoryBinding.recordSelection(),
          Definition.makeStep(model => ({
            model: Struct.modifyFields(model, {
              maybeSelected: () => Option.some(selectedItem),
            }),
            commands: [RecordSelection({ value: selectedItem })],
          })),
        ])
      },
      Closed: Definition.makeNoopStep,
    },
  )
  const forwardSelectionOutMessage = Definition.makeOutMessageForward(
    SelectionBlock,
    {
      Selected: ({ value }) => OutMessage.ChoseItem({ value }),
      Closed: () => undefined,
    },
  )
  const SelectionBinding = UnselectedBinding.withOutMessagePolicy({
    fold: foldSelectionOutMessage,
    forward: forwardSelectionOutMessage,
  })
  const Composition = Definition.makeComposition({
    bindings: [SelectionBinding, HistoryBinding],
  })
  const init = Composition.makeInit(() => ({
    model: { maybeSelected: Option.none() },
  }))
  const update = Composition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      SelectionBinding.select({ value })(model),
    RequestedClose: model => SelectionBinding.close()(model),
    CompletedRecordSelection: model => Definition.makeNoopStep()(model),
  })
  const prepareBlock = () =>
    Composition.prepareBlock({
      init,
      update,
      operations: {
        select: ParentMessage.RequestedSelect,
        close: ParentMessage.RequestedClose,
      },
      EffectsLayer: RecordSelection.layer,
    })
  const block: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)

  return {
    Model,
    Message: ParentMessage,
    OutMessage,
    Definition,
    Composition,
    SelectionBlock,
    SelectionBinding,
    UnselectedBinding,
    HistoryBinding,
    RecordSelection,
    foldSelectionOutMessage,
    forwardSelectionOutMessage,
    block,
  }
}

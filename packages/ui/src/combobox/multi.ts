import { Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
  ComboboxNamespace,
  EffectsLayer,
  type ItemSchema,
  Message,
  type MessageSchema,
  OutMessage,
  type OutMessageSchema,
  baseInit,
  closedBaseModel,
  makeMessage,
  makeOutMessage,
  makeUpdateHandlers,
  makeView,
  mounts,
} from './shared.js'

// MODEL

/** Schema for the multi-select combobox's private interaction state (open/closed status, active item, activation trigger, typed input value). The selection is owned by the parent and passed in via `ViewInputs.selectedValues`. */
export const Model = Schema.Struct({
  ...BaseModel.fields,
})

export type Model = typeof Model.Type

const ComboboxDefinition = ComboboxNamespace.makeDefinition({
  Model,
  Message,
  OutMessage,
})

// INIT

/** Configuration for creating a multi-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

// UPDATE

/** Processes a Combobox Message and returns the next Model, optional Commands,
 *  and an optional OutMessage. Selection leaves the multi-select Combobox open
 *  and emits `Selected({ value })` for the parent to fold by toggling
 *  membership.
 *  Closing never emits `ClearedSelection` because its input rests empty by
 *  design. Clear the selection by toggling each value off. */
const defaultUpdate = makeUpdateHandlers(
  ComboboxDefinition.makeBinding,
  ComboboxDefinition.makeOutMessageFold,
  ComboboxDefinition.makeStep,
  ComboboxDefinition.makeFieldsStep,
  ComboboxDefinition.makeNoopStep,
  ComboboxDefinition.makeCommandsStep,
  'KeepOpen',
  {
    handleClose: model => ({
      model: modifyFields(closedBaseModel(model), { inputValue: () => '' }),
    }),

    handleSelectedItem: (model, item) => ({
      model,
      outMessage: OutMessage.Selected({ value: item }),
    }),

    handleImmediateActivation: (model, item) => ({
      model,
      outMessage: OutMessage.Selected({ value: item }),
    }),
  },
)

const ComboboxComposition = ComboboxDefinition.makeComposition({
  mounts,
  bindings: [defaultUpdate.AnimationBinding],
})

export const update = ComboboxComposition.makeUpdate(defaultUpdate.handlers)

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the Combobox, updating the Model and returning
 *  focus and modal Commands. When it is already open, returns the Model
 *  unchanged with no Commands. Use this in domain-event handlers. */
export const open = (model: Model): UpdateReturn =>
  block.operations.requestOpen(model)

/** Programmatically closes the Combobox, updating the Model and returning
 *  focus and modal Commands. The multi-select input always rests empty on
 *  close. Use this in domain-event handlers to close the combobox. */
export const close = (model: Model): UpdateReturn =>
  block.operations.requestClose(model)

/** Programmatically activates an item in the multi-select combobox. Emits
 *  `Selected({ value })`; the parent toggles the value's membership. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  block.operations.requestSelectItem(model, item)

// VIEW

/** Per-render view inputs passed to the view via `h.block`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputs<Item>

const makeBlockParts = <Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
) => {
  const ItemMessage: MessageSchema<Item, ItemEncoded> = makeMessage(Item)
  const ItemOutMessage: OutMessageSchema<Item, ItemEncoded> =
    makeOutMessage(Item)
  const ComboboxDefinition = ComboboxNamespace.makeDefinition({
    Model,
    Message: ItemMessage,
    OutMessage: ItemOutMessage,
  })
  const itemUpdate = makeUpdateHandlers(
    ComboboxDefinition.makeBinding,
    ComboboxDefinition.makeOutMessageFold,
    ComboboxDefinition.makeStep,
    ComboboxDefinition.makeFieldsStep,
    ComboboxDefinition.makeNoopStep,
    ComboboxDefinition.makeCommandsStep,
    'KeepOpen',
    {
      handleClose: model => ({
        model: modifyFields(closedBaseModel(model), { inputValue: () => '' }),
      }),
      handleSelectedItem: (model, item) => ({
        model,
        outMessage: ItemOutMessage.Selected({ value: item }),
      }),
      handleImmediateActivation: (model, item) => ({
        model,
        outMessage: ItemOutMessage.Selected({ value: item }),
      }),
    },
  )
  const ComboboxComposition = ComboboxDefinition.makeComposition({
    mounts,
    bindings: [itemUpdate.AnimationBinding],
  })
  const update = ComboboxComposition.makeUpdate(itemUpdate.handlers)
  const init = ComboboxComposition.makeInit((config: InitConfig) => ({
    model: baseInit(config),
  }))
  const view = ComboboxComposition.makeView.withInputs<ViewInputs<Item>>(
    makeView<Model, Item, typeof ComboboxComposition.Message.Type, ItemEncoded>(
      { ariaMultiSelectable: true },
      ItemMessage,
    ),
  )
  const requestOpen = ItemMessage.RequestedOpen
  const requestClose = () =>
    Tuple.make(
      ItemMessage.RequestedClose({
        restingInputValue: '',
        isClearable: true,
      }),
    )
  const requestSelectItem = (item: Item) =>
    Tuple.make(
      ItemMessage.RequestedSelectItem({
        item,
        displayText: item,
      }),
    )

  const operations = { requestOpen, requestClose, requestSelectItem }
  return {
    composition: ComboboxComposition,
    implementation: {
      view,
      init,
      update,
      operations,
      EffectsLayer,
    },
  }
}

type BlockParts<Item extends string, ItemEncoded> = ReturnType<
  typeof makeBlockParts<Item, ItemEncoded>
>

/** A completed multi-select Combobox Block refined to one Item Schema. */
export interface Completed<
  Item extends string = string,
  ItemEncoded = Item,
> extends Block.CompletedWithViewAndOutMessage<
  BlockParts<Item, ItemEncoded>['composition'],
  BlockParts<Item, ItemEncoded>['implementation']
> {}

const makeBlock = <Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
): Completed<Item, ItemEncoded> => {
  const { composition, implementation } = makeBlockParts(Item)

  const prepare = () => composition.prepareBlock(implementation)
  const completedBlock: Block.FromAssemblyWithViewAndOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return completedBlock
}

/** Creates a checked multi-select Combobox Block. Pass an Item Schema to
 * retain its exact Message and OutMessage payloads. */
export function create(): Completed<string>
export function create<Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
): Completed<Item, ItemEncoded>
export function create(Item: ItemSchema<string, unknown> = Schema.String) {
  return makeBlock(Item)
}

/** Complete default multi-select Combobox Block definition. */
export const block = makeBlock(Schema.String)

/** Creates the initial multi-select Combobox Model and Commands. Defaults to closed with no active item and an empty input. */
export const init = block.init

import { Option, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputsCommon,
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

/** Schema for the single-select combobox's private interaction state (open/closed status, active item, activation trigger, typed input value). The selection is owned by the parent and passed in via `ViewInputs.maybeSelectedValue`. */
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

/** Configuration for creating a single-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

// UPDATE

/** Processes a Combobox Message and returns the next Model, optional Commands,
 *  and an optional OutMessage. Selection closes the Combobox and emits
 *  `Selected({ value })` for the parent to store. A nullable Combobox also
 *  emits `ClearedSelection` when it closes with an empty input. */
const defaultUpdate = makeUpdateHandlers(
  ComboboxDefinition.makeBinding,
  ComboboxDefinition.makeOutMessageFold,
  ComboboxDefinition.makeStep,
  ComboboxDefinition.makeFieldsStep,
  ComboboxDefinition.makeNoopStep,
  ComboboxDefinition.makeCommandsStep,
  'CloseWithFocus',
  {
    handleClose: (model, restingInputValue, isClearable) => {
      if (isClearable && model.nullable && model.inputValue === '') {
        return {
          model: modifyFields(closedBaseModel(model), { inputValue: () => '' }),
          outMessage: OutMessage.ClearedSelection(),
        }
      }

      return {
        model: modifyFields(closedBaseModel(model), {
          inputValue: () => restingInputValue,
        }),
      }
    },

    handleSelectedItem: (model, item, displayText, wasSelected) => {
      const nullableDeselect = model.nullable && wasSelected

      return {
        model: modifyFields(closedBaseModel(model), {
          inputValue: () => (nullableDeselect ? '' : displayText),
        }),
        outMessage: OutMessage.Selected({ value: item }),
      }
    },

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
 *  focus and modal Commands. `restingInputValue` is the text the input
 *  returns to (the parent-owned selection's display text, or empty). Use
 *  this in domain-event handlers to close the combobox. */
export const close = (model: Model, restingInputValue: string): UpdateReturn =>
  block.operations.requestClose(model, restingInputValue)

/** Programmatically selects an item in the single-select combobox, closing
 *  the combobox and emitting `Selected({ value })`. The Block treats the
 *  select as fresh (`wasSelected: false`), so the input rests on
 *  `displayText`; what the selection becomes is the parent's fold to decide,
 *  and a parent that toggles on its own state will still deselect an
 *  already-selected value. */
export const selectItem = (
  model: Model,
  item: string,
  displayText: string,
): UpdateReturn => block.operations.requestSelectItem(model, item, displayText)

// VIEW

/** Per-render view inputs passed to the view via `h.block`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  `Option` because a single-select combobox may have no selection
     *  yet. Marks the selected item and drives the hidden form input
     *  submitted under `formName`. */
    maybeSelectedValue: Option.Option<Item>
  }>

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
    'CloseWithFocus',
    {
      handleClose: (model, restingInputValue, isClearable) => {
        if (isClearable && model.nullable && model.inputValue === '') {
          return {
            model: modifyFields(closedBaseModel(model), {
              inputValue: () => '',
            }),
            outMessage: ItemOutMessage.ClearedSelection(),
          }
        }

        return {
          model: modifyFields(closedBaseModel(model), {
            inputValue: () => restingInputValue,
          }),
        }
      },
      handleSelectedItem: (model, item, displayText, wasSelected) => {
        const nullableDeselect = model.nullable && wasSelected

        return {
          model: modifyFields(closedBaseModel(model), {
            inputValue: () => (nullableDeselect ? '' : displayText),
          }),
          outMessage: ItemOutMessage.Selected({ value: item }),
        }
      },
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
  const render = makeView<
    Model,
    Item,
    typeof ComboboxComposition.Message.Type,
    ItemEncoded
  >({ ariaMultiSelectable: false }, ItemMessage)
  const view = ComboboxComposition.makeView.withInputs<ViewInputs<Item>>(
    (model, { maybeSelectedValue, ...baseInputs }, h) =>
      render(
        model,
        {
          ...baseInputs,
          selectedValues: Option.toArray(maybeSelectedValue),
        },
        h,
      ),
  )
  const requestOpen = ItemMessage.RequestedOpen
  const requestClose = (restingInputValue: string) =>
    Tuple.make(
      ItemMessage.RequestedClose({
        restingInputValue,
        isClearable: true,
      }),
    )
  const requestSelectItem = (item: Item, displayText: string) =>
    Tuple.make(
      ItemMessage.RequestedSelectItem({
        item,
        displayText,
      }),
    )

  return {
    composition: ComboboxComposition,
    implementation: {
      view,
      init,
      update,
      operations: { requestOpen, requestClose, requestSelectItem },
      EffectsLayer,
    },
  }
}

type BlockParts<Item extends string, ItemEncoded> = ReturnType<
  typeof makeBlockParts<Item, ItemEncoded>
>

/** A completed single-select Combobox Block refined to one Item Schema. */
export interface Completed<
  Item extends string = string,
  ItemEncoded = Item,
> extends Block.CompletedWithViewAndOutMessage<
  BlockParts<Item, ItemEncoded>['composition'],
  BlockParts<Item, ItemEncoded>['implementation']
> {}

const assembleBlock = <Item extends string, ItemEncoded>(
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

/** Creates a checked single-select Combobox Block. Pass an Item Schema to
 * retain its exact Message and OutMessage payloads. */
export function makeBlock(): Completed<string>
export function makeBlock<Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
): Completed<Item, ItemEncoded>
export function makeBlock(Item: ItemSchema<string, unknown> = Schema.String) {
  return assembleBlock(Item)
}

/** Complete default single-select Combobox Block definition. */
export const block = assembleBlock(Schema.String)

/** Creates the initial single-select Combobox Model and Commands. Defaults to closed with no active item and an empty input. */
export const init = block.init

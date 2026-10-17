import { Option, Schema } from 'effect'
import type * as Block from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputsCommon,
  EffectsLayer,
  type ItemSchema,
  Message,
  type MessageSchema,
  OutMessage,
  type OutMessageSchema,
  Combobox as SharedCombobox,
  baseInit,
  closedBaseModel,
  makeMessage,
  makeOutMessage,
  makeUpdate,
  makeView,
  mounts,
} from './shared.js'

// MODEL

/** Schema for the single-select combobox's private interaction state (open/closed status, active item, activation trigger, typed input value). The selection is owned by the parent and passed in via `ViewInputs.maybeSelectedValue`. */
export const Model = Schema.Struct({
  ...BaseModel.fields,
})

export type Model = typeof Model.Type

const Combobox = SharedCombobox.define({
  Model,
  Message,
  OutMessage,
})

// INIT

/** Configuration for creating a single-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

/** Creates an initial single-select combobox model from a config. Defaults to closed with no active item and an empty input. */
export const init = (config: InitConfig): Model => baseInit(config)

// UPDATE

/** Processes a Combobox Message and returns the next Model, optional Commands,
 *  and an optional OutMessage. Selection closes the Combobox and emits
 *  `Selected({ value })` for the parent to store. A nullable Combobox also
 *  emits `ClearedSelection` when it closes with an empty input. */
const defaultUpdate = makeUpdate(
  Combobox.bindChild,
  Combobox.step,
  Message,
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

const ComboboxComposition = Combobox.makeComposition({
  mounts,
  childBindings: [defaultUpdate.AnimationBinding],
})

const authoredUpdate = Combobox.step(
  (model, message: Parameters<typeof defaultUpdate.update>[1]) =>
    defaultUpdate.update(model, message),
)

export const update = ComboboxComposition.makeUpdate((model, message) =>
  authoredUpdate(model, message),
)

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the Combobox, updating the Model and returning
 *  focus and modal Commands. Use this in domain-event handlers. */
export const open = (model: Model): UpdateReturn =>
  update(model, Message.Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the Combobox, updating the Model and returning
 *  focus and modal Commands. `restingInputValue` is the text the input
 *  returns to (the parent-owned selection's display text, or empty). Use
 *  this in domain-event handlers to close the combobox. */
export const close = (model: Model, restingInputValue: string): UpdateReturn =>
  update(model, Message.Closed({ restingInputValue, isClearable: true }))

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
): UpdateReturn =>
  update(model, Message.SelectedItem({ item, displayText, wasSelected: false }))

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

const makeBlockParts = <Item extends string>(Item: ItemSchema<Item>) => {
  const ItemMessage: MessageSchema<Item> = makeMessage(Item)
  const ItemOutMessage: OutMessageSchema<Item> = makeOutMessage(Item)
  const Combobox = SharedCombobox.define({
    Model,
    Message: ItemMessage,
    OutMessage: ItemOutMessage,
  })
  const itemUpdate = makeUpdate(
    Combobox.bindChild,
    Combobox.step,
    ItemMessage,
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
  const ComboboxComposition = Combobox.makeComposition({
    mounts,
    childBindings: [itemUpdate.AnimationBinding],
  })
  const authoredUpdate = Combobox.step(
    (model, message: Parameters<typeof itemUpdate.update>[1]) =>
      itemUpdate.update(model, message),
  )
  const update = ComboboxComposition.makeUpdate((model, message) =>
    authoredUpdate(model, message),
  )
  const render = makeView<Model, Item>(
    { ariaMultiSelectable: false },
    ItemMessage,
  )
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
  const open = Combobox.step(model =>
    update(model, ItemMessage.Opened({ maybeActiveItemIndex: Option.none() })),
  )
  const close = Combobox.step((model, restingInputValue: string) =>
    update(model, ItemMessage.Closed({ restingInputValue, isClearable: true })),
  )
  const selectItem = Combobox.step((model, item: Item, displayText: string) =>
    update(
      model,
      ItemMessage.SelectedItem({
        item,
        displayText,
        wasSelected: false,
      }),
    ),
  )

  return {
    composition: ComboboxComposition,
    implementation: {
      view,
      init: ComboboxComposition.makeInit((config: InitConfig) => ({
        model: init(config),
      })),
      update,
      expose: { open, close, selectItem },
      EffectsLayer,
    },
  }
}

type BlockParts<Item extends string> = ReturnType<typeof makeBlockParts<Item>>

/** A completed single-select Combobox Block refined to one Item Schema. */
export interface Completed<
  Item extends string = string,
> extends Block.CompletedWithViewAndOutMessage<
  BlockParts<Item>['composition'],
  BlockParts<Item>['implementation']
> {}

const makeBlock = <Item extends string>(
  Item: ItemSchema<Item>,
): Completed<Item> => {
  const { composition, implementation } = makeBlockParts(Item)

  return composition.makeBlock(implementation)
}

/** Creates a checked single-select Combobox Block. Pass an Item Schema to
 * retain its exact Message and OutMessage payloads. */
export function create(): Completed<string>
export function create<Item extends string>(
  Item: ItemSchema<Item>,
): Completed<Item>
export function create(Item: ItemSchema<string> = Schema.String) {
  return makeBlock(Item)
}

/** Complete default single-select Combobox Block definition. */
export const block = makeBlock(Schema.String)

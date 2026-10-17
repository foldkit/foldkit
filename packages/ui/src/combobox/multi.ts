import { Option, Schema } from 'effect'
import type * as Block from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
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

/** Schema for the multi-select combobox's private interaction state (open/closed status, active item, activation trigger, typed input value). The selection is owned by the parent and passed in via `ViewInputs.selectedValues`. */
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

/** Configuration for creating a multi-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

/** Creates an initial multi-select combobox model from a config. Defaults to closed with no active item and an empty input. */
export const init = (config: InitConfig): Model => baseInit(config)

// UPDATE

/** Processes a Combobox Message and returns the next Model, optional Commands,
 *  and an optional OutMessage. Selection leaves the multi-select Combobox open
 *  and emits `Selected({ value })` for the parent to fold by toggling
 *  membership.
 *  Closing never emits `ClearedSelection` because its input rests empty by
 *  design. Clear the selection by toggling each value off. */
const defaultUpdate = makeUpdate(
  Combobox.bindChild,
  Combobox.step,
  Message,
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
 *  focus and modal Commands. The multi-select input always rests empty on
 *  close. Use this in domain-event handlers to close the combobox. */
export const close = (model: Model): UpdateReturn =>
  update(model, Message.Closed({ restingInputValue: '', isClearable: true }))

/** Programmatically activates an item in the multi-select combobox. Emits
 *  `Selected({ value })`; the parent toggles the value's membership. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  update(
    model,
    Message.SelectedItem({ item, displayText: item, wasSelected: false }),
  )

// VIEW

/** Per-render view inputs passed to the view via `h.block`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputs<Item>

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
  const view = ComboboxComposition.makeView.withInputs<ViewInputs<Item>>(
    makeView<Model, Item>({ ariaMultiSelectable: true }, ItemMessage),
  )
  const open = Combobox.step(model =>
    update(model, ItemMessage.Opened({ maybeActiveItemIndex: Option.none() })),
  )
  const close = Combobox.step(model =>
    update(
      model,
      ItemMessage.Closed({ restingInputValue: '', isClearable: true }),
    ),
  )
  const selectItem = Combobox.step((model, item: Item) =>
    update(
      model,
      ItemMessage.SelectedItem({
        item,
        displayText: item,
        wasSelected: false,
      }),
    ),
  )

  const expose = { open, close, selectItem }
  return {
    composition: ComboboxComposition,
    implementation: {
      view,
      init: ComboboxComposition.makeInit((config: InitConfig) => ({
        model: init(config),
      })),
      update,
      expose,
      EffectsLayer,
    },
  }
}

type BlockParts<Item extends string> = ReturnType<typeof makeBlockParts<Item>>

/** A completed multi-select Combobox Block refined to one Item Schema. */
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

/** Creates a checked multi-select Combobox Block. Pass an Item Schema to
 * retain its exact Message and OutMessage payloads. */
export function create(): Completed<string>
export function create<Item extends string>(
  Item: ItemSchema<Item>,
): Completed<Item>
export function create(Item: ItemSchema<string> = Schema.String) {
  return makeBlock(Item)
}

/** Complete default multi-select Combobox Block definition. */
export const block = makeBlock(Schema.String)

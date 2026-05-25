import { Array, Function, Option, Schema as S } from 'effect'

import type * as Command from '../../command/index.js'
import type { SubmodelView } from '../../html/index.js'
import { evo } from '../../struct/index.js'
import type { Reflect } from '../../submodel/submodel.js'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
  Closed,
  type Message,
  Opened,
  type OutMessage,
  SelectedItem,
  Selected as SharedSelected,
  baseInit,
  closedBaseModel,
  makeUpdate,
  makeView,
} from './shared.js'

// MODEL

/** Schema for the multi-select combobox component's state, tracking open/closed status, active item, input value, and selected items. */
export const Model = S.Struct({
  ...BaseModel.fields,
  selectedItems: S.Array(S.String),
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a multi-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). `selectedItems` sets the initial selection (default `[]`). */
export type InitConfig = BaseInitConfig &
  Readonly<{
    selectedItems?: ReadonlyArray<string>
  }>

/** Creates an initial multi-select combobox model from a config. Defaults to closed with no active item, empty input, and no selection. */
export const init = (config: InitConfig): Model => ({
  ...baseInit(config),
  selectedItems: config.selectedItems ?? [],
})

// UPDATE

const toggleItem = (
  selectedItems: ReadonlyArray<string>,
  item: string,
): ReadonlyArray<string> =>
  Array.contains(selectedItems, item)
    ? Array.filter(selectedItems, selected => selected !== item)
    : Array.append(selectedItems, item)

const emptySelection: ReadonlyArray<string> = []

/** Processes a combobox message and returns the next model and commands. Stays open on selection and toggles item membership (multi-select behavior). */
export const update = makeUpdate<Model>({
  handleClose: model => {
    if (model.nullable && model.inputValue === '') {
      return evo(closedBaseModel(model), {
        selectedItems: () => emptySelection,
        inputValue: () => '',
      })
    }

    return evo(closedBaseModel(model), {
      inputValue: () => '',
    })
  },

  handleSelectedItem: (model, item) => {
    const wasAdded = !Array.contains(model.selectedItems, item)
    const nextSelectedItems = wasAdded
      ? Array.append(model.selectedItems, item)
      : Array.filter(model.selectedItems, selected => selected !== item)

    return [
      evo(model, { selectedItems: () => nextSelectedItems }),
      [],
      Option.some(SharedSelected({ value: item, wasAdded })),
    ]
  },

  handleImmediateActivation: (model, item) =>
    evo(model, {
      selectedItems: () => toggleItem(model.selectedItems, item),
    }),
})

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the combobox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the combobox. */
export const open = (model: Model): UpdateReturn =>
  update(model, Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the combobox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to close the combobox. */
export const close = (model: Model): UpdateReturn => update(model, Closed())

/** Programmatically toggles an item in the multi-select combobox. Emits `Selected({ value, wasAdded })`. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  update(model, SelectedItem({ item, displayText: item }))

/** Reflects an externally-sourced selection set onto the model without
 *  emitting an OutMessage or running selection side effects. Use this to
 *  mirror external truth (URL parameters, restored storage, a server push)
 *  onto the combobox's selected items. Contrast with `selectItem`, which
 *  toggles a single item as a user *choice* and emits `Selected`. Returns
 *  the model directly because it produces no commands and no OutMessage. */
export const reflectSelectedItems: Reflect<
  Model,
  ReadonlyArray<string>
> = Function.dual(
  2,
  (model: Model, items: ReadonlyArray<string>): Model =>
    evo(model, { selectedItems: () => items }),
)

// VIEW

/** Per-render view inputs passed to the view via `h.submodel`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputs<Item>

const internalView = makeView<Model>({
  isItemSelected: (model, itemValue) =>
    Array.contains(model.selectedItems, itemValue),
  ariaMultiSelectable: true,
})

/** Pairs the multi-select combobox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. */
export const create = <Item extends string = string>(): Readonly<{
  view: SubmodelView<Model, Message, BaseViewInputs<Item>>
  update: (
    model: Model,
    message: Message,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Item>>,
  ]
  selectItem: (
    model: Model,
    item: Item,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Item>>,
  ]
  open: (
    model: Model,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Item>>,
  ]
  close: (
    model: Model,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Item>>,
  ]
  reflectSelectedItems: Reflect<Model, ReadonlyArray<Item>>
}> => {
  type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Item>>,
  ]
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedUpdate = update as (model: Model, message: Message) => UpdateReturn
  return {
    view: internalView<Item>(),
    update: typedUpdate,
    selectItem: (model, item) =>
      typedUpdate(model, SelectedItem({ item, displayText: item })),
    open: model =>
      typedUpdate(model, Opened({ maybeActiveItemIndex: Option.none() })),
    close: model => typedUpdate(model, Closed()),
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    reflectSelectedItems: reflectSelectedItems as Reflect<
      Model,
      ReadonlyArray<Item>
    >,
  }
}

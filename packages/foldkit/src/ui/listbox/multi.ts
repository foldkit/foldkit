import { Array, Function, Option, Schema as S, pipe } from 'effect'

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
  makeUpdate,
  makeView,
} from './shared.js'

// MODEL

/** Schema for the multi-select listbox component's state, tracking open/closed status, active item, selected items, activation trigger, and typeahead search. */
export const Model = S.Struct({
  ...BaseModel.fields,
  selectedItems: S.Array(S.String),
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a multi-select listbox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). `selectedItems` sets the initial selection (default `[]`). */
export type InitConfig = BaseInitConfig &
  Readonly<{
    selectedItems?: ReadonlyArray<string>
  }>

/** Creates an initial multi-select listbox model from a config. Defaults to closed with no active item and no selection. */
export const init = (config: InitConfig): Model => ({
  ...baseInit(config),
  selectedItems: config.selectedItems ?? [],
})

// UPDATE

/** Processes a listbox message and returns the next model, commands, and optional OutMessage. Stays open on selection and toggles item membership (multi-select behavior); emits a `Selected({ value, wasAdded })` OutMessage indicating whether the value was added or removed. */
export const update = makeUpdate<Model>((model, item) => {
  const wasAdded = !Array.contains(model.selectedItems, item)
  const nextSelectedItems = wasAdded
    ? Array.append(model.selectedItems, item)
    : Array.filter(model.selectedItems, selected => selected !== item)

  return [
    evo(model, { selectedItems: () => nextSelectedItems }),
    [],
    Option.some(SharedSelected({ value: item, wasAdded })),
  ]
})

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the listbox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the listbox. */
export const open = (model: Model): UpdateReturn =>
  update(model, Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the listbox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to close the listbox. */
export const close = (model: Model): UpdateReturn => update(model, Closed())

/** Programmatically toggles an item in the multi-select listbox. Emits `Selected({ value, wasAdded })`. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  update(model, SelectedItem({ item }))

/** Reflects an externally-sourced selection set onto the model without
 *  emitting an OutMessage or running selection side effects. Use this to
 *  mirror external truth (URL parameters, restored storage, a server push)
 *  onto the listbox's selected items. Contrast with `selectItem`, which
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
export type ViewInputs<Item, Value extends string = string> = BaseViewInputs<
  Item,
  Value
>

const internalView = makeView<Model>({
  isItemSelected: (model, itemValue) =>
    Array.contains(model.selectedItems, itemValue),
  selectedItemIndex: (model, items, itemToValue) =>
    pipe(
      model.selectedItems,
      Array.head,
      Option.flatMap(selectedItem =>
        Array.findFirstIndex(items, item => itemToValue(item) === selectedItem),
      ),
    ),
  ariaMultiSelectable: true,
})

/** Pairs the multi-select listbox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. Same shape as
 *  `Ui.Listbox.create`. Two type params support object-typed items via
 *  `itemToValue`: `Value` defaults to `Item` when `Item extends string`,
 *  else `string`. */
export const create = <
  Item = string,
  Value extends string = Item extends string ? Item : string,
>(): Readonly<{
  view: SubmodelView<Model, Message, BaseViewInputs<Item, Value>>
  update: (
    model: Model,
    message: Message,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  selectItem: (
    model: Model,
    item: Value,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  open: (
    model: Model,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  close: (
    model: Model,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  reflectSelectedItems: Reflect<Model, ReadonlyArray<Value>>
}> => {
  type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Value>>,
  ]
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedUpdate = update as (model: Model, message: Message) => UpdateReturn
  return {
    view: internalView<Item, Value>(),
    update: typedUpdate,
    selectItem: (model, item) => typedUpdate(model, SelectedItem({ item })),
    open: model =>
      typedUpdate(model, Opened({ maybeActiveItemIndex: Option.none() })),
    close: model => typedUpdate(model, Closed()),
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    reflectSelectedItems: reflectSelectedItems as Reflect<
      Model,
      ReadonlyArray<Value>
    >,
  }
}

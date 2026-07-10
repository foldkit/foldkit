import { Option, Schema as S } from 'effect'
import type * as Command from 'foldkit/command'
import type { View as SubmodelView } from 'foldkit/submodel'

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

/** Schema for the multi-select listbox's private interaction state (open/closed status, active item, activation trigger, typeahead search). The selection is owned by the parent and passed in via `ViewInputs.selectedValues`. */
export const Model = S.Struct({
  ...BaseModel.fields,
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a multi-select listbox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

/** Creates an initial multi-select listbox model from a config. Defaults to closed with no active item. */
export const init = (config: InitConfig): Model => baseInit(config)

// UPDATE

/** Processes a listbox message and returns the next model, commands, and optional OutMessage. Stays open on selection (multi-select behavior); emits a `Selected({ value })` OutMessage the parent folds by toggling the value's membership in the selection it owns. */
export const update = makeUpdate<Model>((model, item) => [
  model,
  [],
  Option.some(SharedSelected({ value: item })),
])

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the listbox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the listbox. */
export const open = (model: Model): UpdateReturn =>
  update(model, Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the listbox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to close the listbox. */
export const close = (model: Model): UpdateReturn => update(model, Closed())

/** Programmatically activates an item in the multi-select listbox. Emits `Selected({ value })`; the parent toggles the value's membership. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  update(model, SelectedItem({ item }))

// VIEW

/** Per-render view inputs passed to the view via `h.submodel`'s `viewInputs` field. */
export type ViewInputs<Item, Value extends string = string> = BaseViewInputs<
  Item,
  Value
>

const internalView = makeView<Model>({ ariaMultiSelectable: true })

/** Pairs the multi-select listbox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. Same shape as
 *  `Listbox.create`. Two type params support object-typed items via
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
  }
}

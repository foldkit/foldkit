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
  makeUpdate,
  makeView,
} from './shared.js'

// MODEL

/** Schema for the listbox component's state, tracking open/closed status, active item, selected item, activation trigger, and typeahead search. */
export const Model = S.Struct({
  ...BaseModel.fields,
  maybeSelectedItem: S.Option(S.String),
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a single-select listbox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). `selectedItem` sets the initial selection (default none). */
export type InitConfig = BaseInitConfig &
  Readonly<{
    selectedItem?: string
  }>

/** Creates an initial single-select listbox model from a config. Defaults to closed with no active item and no selection. */
export const init = (config: InitConfig): Model => ({
  ...baseInit(config),
  maybeSelectedItem: Option.fromNullishOr(config.selectedItem),
})

// UPDATE

/** Processes a listbox message and returns the next model, commands, and optional OutMessage. Closes the listbox on selection (single-select behavior); emits a `Selected({ value, wasAdded: true })` OutMessage. */
export const update = makeUpdate<Model>((model, item, context) =>
  context.closeWithFocus(
    evo(model, { maybeSelectedItem: () => Option.some(item) }),
    Option.some(SharedSelected({ value: item, wasAdded: true })),
  ),
)

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the listbox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the listbox. */
export const open = (model: Model): UpdateReturn =>
  update(model, Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the listbox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to close the listbox. */
export const close = (model: Model): UpdateReturn => update(model, Closed())

/** Programmatically selects an item in the single-select listbox, closing the listbox and emitting a `Selected({ value, wasAdded: true })` OutMessage. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  update(model, SelectedItem({ item }))

/** Reflects an externally-sourced selection onto the model without
 *  emitting an OutMessage or running the user-selection side effects (no
 *  close, no focus). Use this to mirror external truth (a URL parameter,
 *  restored storage, a server push) onto the listbox's selection.
 *  Contrast with `selectItem`, which represents a user or programmatic
 *  *choice*: it closes the listbox, restores focus, and emits `Selected`.
 *  `reflect` returns the model directly because it produces no commands and
 *  no OutMessage, so a parent reflecting external state cannot
 *  accidentally echo it back out. */
export const reflectSelectedItem: Reflect<
  Model,
  Option.Option<string>
> = Function.dual(
  2,
  (model: Model, maybeItem: Option.Option<string>): Model =>
    evo(model, { maybeSelectedItem: () => maybeItem }),
)

// VIEW

/** Per-render view inputs passed to the view via `h.submodel`'s `viewInputs` field. */
export type ViewInputs<Item, Value extends string = string> = BaseViewInputs<
  Item,
  Value
>

const internalView = makeView<Model>({
  isItemSelected: (model, itemValue) =>
    Option.exists(
      model.maybeSelectedItem,
      selectedItem => selectedItem === itemValue,
    ),
  selectedItemIndex: (model, items, itemToValue) =>
    Option.flatMap(model.maybeSelectedItem, selectedItem =>
      Array.findFirstIndex(items, item => itemToValue(item) === selectedItem),
    ),
  ariaMultiSelectable: false,
})

/** Pairs the single-select listbox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. Declaring the listbox
 *  once at module scope ensures the view's `Item` type and the update's
 *  OutMessage `item` type can't drift:
 *
 *  ```ts
 *  const ColorListbox = Ui.Listbox.create<Color>()
 *
 *  // In view:
 *  h.submodel({ view: ColorListbox.view, ... })
 *
 *  // In update:
 *  const [next, commands, maybeOutMessage] = ColorListbox.update(model, message)
 *  // maybeOutMessage: Option<Listbox.OutMessage<Color>>
 *  ```
 *
 *  Two type params support object-typed items with an `itemToValue`
 *  extractor: pass `<Person, string>` when items are objects whose
 *  extracted value is a plain string. `Value` defaults to `Item` when
 *  `Item extends string`, else defaults to `string`. */
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
  reflectSelectedItem: Reflect<Model, Option.Option<Value>>
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
    reflectSelectedItem: reflectSelectedItem as Reflect<
      Model,
      Option.Option<Value>
    >,
  }
}

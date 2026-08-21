import { Option, Schema as S } from 'effect'
import { type Update } from 'foldkit'
import type * as Command from 'foldkit/command'
import { type View as SubmodelView, defineView } from 'foldkit/submodel'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputsCommon,
  type ItemToValueInput,
  Message,
  OutMessage,
  baseInit,
  makeUpdate,
  makeView,
} from './shared.js'

// MODEL

/** Schema for the single-select listbox's private interaction state (open/closed status, active item, activation trigger, typeahead search). The selection is owned by the parent and passed in via `ViewInputs.maybeSelectedValue`. */
export const Model = S.Struct({
  ...BaseModel.fields,
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a single-select listbox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

/** Creates an initial single-select listbox model from a config. Defaults to closed with no active item. */
export const init = (config: InitConfig): Model => baseInit(config)

// UPDATE

/** Processes a listbox message and returns the next model, commands, and optional OutMessage. Closes the listbox on selection (single-select behavior); emits a `Selected({ value })` OutMessage the parent stores as the selection. */
export const update = makeUpdate<Model>((model, item, context) =>
  context.closeWithFocus(model, OutMessage.Selected({ value: item })),
)

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the listbox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the listbox. */
export const open = (model: Model): UpdateReturn =>
  update(model, Message.Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the listbox. If it is open, returns the closed Model
 *  with focus and modal Commands. If it is already closed, returns the Model
 *  unchanged with no Commands. Use this in domain-event handlers to close the
 *  listbox. */
export const close = (model: Model): UpdateReturn =>
  update(model, Message.Closed())

/** Programmatically selects an item in the single-select listbox, closing the listbox and emitting a `Selected({ value })` OutMessage. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  update(model, Message.SelectedItem({ item }))

// VIEW

/** Per-render view inputs passed to the view via `h.submodel`'s `viewInputs` field. */
export type ViewInputs<
  Item,
  Value extends string = string,
> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  `Option` because a single-select listbox may have no selection yet.
     *  Drives `aria-selected` and `data-selected` on items, which item the
     *  Listbox highlights when it opens onto a selection, and the hidden
     *  form input submitted under `name`. */
    maybeSelectedValue: Option.Option<Value>
  }> &
  ItemToValueInput<Item, Value>

const internalView = makeView<Model>({ ariaMultiSelectable: false })

const arrayBasedView = internalView<unknown, string>()

const singleViewImpl = defineView<Model, Message, ViewInputs<unknown, string>>(
  (model, { maybeSelectedValue, ...baseInputs }, h) =>
    arrayBasedView(
      model,
      {
        ...baseInputs,
        selectedValues: Option.toArray(maybeSelectedValue),
      },
      h,
    ),
)

/** The `view`, `update`, and programmatic helpers that `Listbox.create`
 *  returns, bound to one `Item` and `Value` pair. Name it to annotate a
 *  value that holds a created bundle, such as a field on a config object
 *  or a function parameter that takes the bundle rather than calling
 *  `create` itself. */
export type Bundle<
  Item = string,
  Value extends string = Item extends string ? Item : string,
> = Readonly<{
  view: SubmodelView<Model, Message, ViewInputs<Item, Value>>
  update: (
    model: Model,
    message: Message,
  ) => Readonly<{
    model: Model
    commands?: ReadonlyArray<Command.Command<Message>>
    outMessage?: OutMessage<Value>
  }>
  selectItem: (
    model: Model,
    item: Value,
  ) => Readonly<{
    model: Model
    commands?: ReadonlyArray<Command.Command<Message>>
    outMessage?: OutMessage<Value>
  }>
  open: (model: Model) => Readonly<{
    model: Model
    commands?: ReadonlyArray<Command.Command<Message>>
    outMessage?: OutMessage<Value>
  }>
  close: (model: Model) => Readonly<{
    model: Model
    commands?: ReadonlyArray<Command.Command<Message>>
    outMessage?: OutMessage<Value>
  }>
}>

/** Pairs the single-select listbox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. Declaring the listbox
 *  once at module scope ensures the view's `Item` type and the update's
 *  OutMessage `item` type can't drift:
 *
 *  ```ts
 *  const ColorListbox = Listbox.create<Color>()
 *
 *  // In view:
 *  h.submodel({ view: ColorListbox.view, ... })
 *
 *  // In update:
 *  const colorListboxUpdate = ColorListbox.update(model, message)
 *  // colorListboxUpdate.outMessage: Listbox.OutMessage<Color> | undefined
 *  ```
 *
 *  Two type params support object-typed items with an `itemToValue`
 *  extractor: pass `<Person, string>` when items are objects whose
 *  extracted value is a plain string. `Value` defaults to `Item` when
 *  `Item extends string`, else defaults to `string`. */
export const create = <
  Item = string,
  Value extends string = Item extends string ? Item : string,
>(): Bundle<Item, Value> => {
  type UpdateReturn = Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage<Value>
  >
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedUpdate = update as (model: Model, message: Message) => UpdateReturn
  const view =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    singleViewImpl as unknown as SubmodelView<
      Model,
      Message,
      ViewInputs<Item, Value>
    >
  return {
    view,
    update: typedUpdate,
    selectItem: (model, item) =>
      typedUpdate(model, Message.SelectedItem({ item })),
    open: model =>
      typedUpdate(
        model,
        Message.Opened({ maybeActiveItemIndex: Option.none() }),
      ),
    close: model => typedUpdate(model, Message.Closed()),
  }
}

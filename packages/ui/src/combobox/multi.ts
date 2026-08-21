import { Option, Schema as S } from 'effect'
import { type Update } from 'foldkit'
import type * as Command from 'foldkit/command'
import { evo } from 'foldkit/struct'
import type { View as SubmodelView } from 'foldkit/submodel'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
  Message,
  OutMessage,
  baseInit,
  closedBaseModel,
  makeUpdate,
  makeView,
} from './shared.js'

// MODEL

/** Schema for the multi-select combobox's private interaction state (open/closed status, active item, activation trigger, typed input value). The selection is owned by the parent and passed in via `ViewInputs.selectedValues`. */
export const Model = S.Struct({
  ...BaseModel.fields,
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a multi-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

/** Creates an initial multi-select combobox model from a config. Defaults to closed with no active item and an empty input. */
export const init = (config: InitConfig): Model => baseInit(config)

// UPDATE

/** Processes a combobox message and returns the next model, commands, and optional OutMessage. Stays open on selection (multi-select behavior) and emits a `Selected({ value })` OutMessage the parent folds by toggling the value's membership. Closing never emits `ClearedSelection`: the multi-select input rests empty by design, so an empty input on close carries no intent to clear. Clearing a multi-select is toggling its values off, one `Selected` at a time. The input always rests empty on close, so this ignores the message's `restingInputValue`; multi consumers pass `''`. */
export const update = makeUpdate<Model>({
  handleClose: model => ({
    model: evo(closedBaseModel(model), { inputValue: () => '' }),
  }),

  handleSelectedItem: (model, item) => ({
    model,
    outMessage: OutMessage.Selected({ value: item }),
  }),

  handleImmediateActivation: (model, item) => ({
    model,
    outMessage: OutMessage.Selected({ value: item }),
  }),
})

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the combobox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the combobox. */
export const open = (model: Model): UpdateReturn =>
  update(model, Message.Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the combobox, updating the model and returning
 *  focus and modal commands. The multi-select input always rests empty on
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

/** Per-render view inputs passed to the view via `h.submodel`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputs<Item>

const internalView = makeView<Model>({ ariaMultiSelectable: true })

/** The `view`, `update`, and programmatic helpers that
 *  `Combobox.Multi.create` returns, bound to one `Item` type. Name it to
 *  annotate a value that holds a created bundle, such as a field on a
 *  config object or a function parameter that takes the bundle rather than
 *  calling `create` itself. */
export type Bundle<Item extends string = string> = Readonly<{
  view: SubmodelView<Model, Message, ViewInputs<Item>>
  update: (
    model: Model,
    message: Message,
  ) => Readonly<{
    model: Model
    commands?: ReadonlyArray<Command.Command<Message>>
    outMessage?: OutMessage<Item>
  }>
  selectItem: (
    model: Model,
    item: Item,
  ) => Readonly<{
    model: Model
    commands?: ReadonlyArray<Command.Command<Message>>
    outMessage?: OutMessage<Item>
  }>
  open: (model: Model) => Readonly<{
    model: Model
    commands?: ReadonlyArray<Command.Command<Message>>
    outMessage?: OutMessage<Item>
  }>
  close: (model: Model) => Readonly<{
    model: Model
    commands?: ReadonlyArray<Command.Command<Message>>
    outMessage?: OutMessage<Item>
  }>
}>

/** Pairs the multi-select combobox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. `selectItem` emits
 *  `Selected({ value })`; the parent toggles the value's membership. */
export const create = <Item extends string = string>(): Bundle<Item> => {
  type UpdateReturn = Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage<Item>
  >
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedUpdate = update as (model: Model, message: Message) => UpdateReturn
  return {
    view: internalView<Item>(),
    update: typedUpdate,
    selectItem: (model, item) =>
      typedUpdate(
        model,
        Message.SelectedItem({ item, displayText: item, wasSelected: false }),
      ),
    open: model =>
      typedUpdate(
        model,
        Message.Opened({ maybeActiveItemIndex: Option.none() }),
      ),
    close: model =>
      typedUpdate(
        model,
        Message.Closed({ restingInputValue: '', isClearable: true }),
      ),
  }
}

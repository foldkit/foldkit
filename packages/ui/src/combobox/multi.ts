import { Option, Schema as S } from 'effect'
import type * as Command from 'foldkit/command'
import { evo } from 'foldkit/struct'
import type { View as SubmodelView } from 'foldkit/submodel'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
  ClearedSelection,
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

/** Processes a combobox message and returns the next model, commands, and optional OutMessage. Stays open on selection (multi-select behavior); emits a `Selected({ value })` OutMessage the parent folds by toggling the value's membership, and `ClearedSelection` when a nullable combobox closes with an empty input. The multi-select input always rests empty on close, so it ignores the message's `restingInputValue`; multi consumers pass `''`. */
export const update = makeUpdate<Model>({
  handleClose: model => {
    if (model.nullable && model.inputValue === '') {
      return [
        evo(closedBaseModel(model), { inputValue: () => '' }),
        Option.some(ClearedSelection()),
      ]
    }

    return [
      evo(closedBaseModel(model), { inputValue: () => '' }),
      Option.none(),
    ]
  },

  handleSelectedItem: (model, item) => [
    model,
    [],
    Option.some(SharedSelected({ value: item })),
  ],

  handleImmediateActivation: (model, item) => [
    model,
    Option.some(SharedSelected({ value: item })),
  ],
})

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the combobox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the combobox. */
export const open = (model: Model): UpdateReturn =>
  update(model, Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the combobox, updating the model and returning
 *  focus and modal commands. The multi-select input always rests empty on
 *  close. Use this in domain-event handlers to close the combobox. */
export const close = (model: Model): UpdateReturn =>
  update(model, Closed({ restingInputValue: '' }))

/** Programmatically activates an item in the multi-select combobox. Emits
 *  `Selected({ value })`; the parent toggles the value's membership. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  update(model, SelectedItem({ item, displayText: item, wasSelected: false }))

// VIEW

/** Per-render view inputs passed to the view via `h.submodel`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputs<Item>

const internalView = makeView<Model>({ ariaMultiSelectable: true })

/** Pairs the multi-select combobox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. `selectItem` emits
 *  `Selected({ value })`; the parent toggles the value's membership. */
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
      typedUpdate(
        model,
        SelectedItem({ item, displayText: item, wasSelected: false }),
      ),
    open: model =>
      typedUpdate(model, Opened({ maybeActiveItemIndex: Option.none() })),
    close: model => typedUpdate(model, Closed({ restingInputValue: '' })),
  }
}

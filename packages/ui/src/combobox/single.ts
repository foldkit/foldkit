import { Array, Option, Schema as S, pipe } from 'effect'
import type * as Command from 'foldkit/command'
import { evo } from 'foldkit/struct'
import { type View as SubmodelView, defineView } from 'foldkit/submodel'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputsCommon,
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

/** Schema for the single-select combobox's private interaction state (open/closed status, active item, activation trigger, typed input value). The selection is owned by the parent and passed in via `ViewInputs.maybeSelectedValue`. */
export const Model = S.Struct({
  ...BaseModel.fields,
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a single-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

/** Creates an initial single-select combobox model from a config. Defaults to closed with no active item and an empty input. */
export const init = (config: InitConfig): Model => baseInit(config)

// UPDATE

/** Processes a combobox message and returns the next model, commands, and optional OutMessage. Closes the combobox on selection (single-select behavior); emits `Selected({ value })` for the parent to store, and `ClearedSelection` when a nullable combobox closes with an empty input. */
export const update = makeUpdate<Model>({
  handleClose: (model, restingInputValue) => {
    if (model.nullable && model.inputValue === '') {
      return [
        evo(closedBaseModel(model), { inputValue: () => '' }),
        Option.some(ClearedSelection()),
      ]
    }

    return [
      evo(closedBaseModel(model), { inputValue: () => restingInputValue }),
      Option.none(),
    ]
  },

  handleSelectedItem: (model, item, displayText, wasSelected, context) => {
    const nullableDeselect = model.nullable && wasSelected

    return [
      evo(closedBaseModel(model), {
        inputValue: () => (nullableDeselect ? '' : displayText),
      }),
      pipe(
        Array.getSomes([context.maybeUnlockScroll, context.maybeRestoreInert]),
        Array.prepend(context.focusInput),
      ),
      Option.some(SharedSelected({ value: item })),
    ]
  },

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
 *  focus and modal commands. `restingInputValue` is the text the input
 *  returns to (the parent-owned selection's display text, or empty). Use
 *  this in domain-event handlers to close the combobox. */
export const close = (model: Model, restingInputValue: string): UpdateReturn =>
  update(model, Closed({ restingInputValue }))

/** Programmatically selects an item in the single-select combobox, closing
 *  the combobox and emitting `Selected({ value })`. The Submodel treats the
 *  select as fresh (`wasSelected: false`), so the input rests on
 *  `displayText`; what the selection becomes is the parent's fold to decide,
 *  and a parent that toggles on its own state will still deselect an
 *  already-selected value. */
export const selectItem = (
  model: Model,
  item: string,
  displayText: string,
): UpdateReturn =>
  update(model, SelectedItem({ item, displayText, wasSelected: false }))

// VIEW

/** Per-render view inputs passed to the view via `h.submodel`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  `Option` because a single-select combobox may have no selection
     *  yet. Marks the selected item and drives the hidden form input
     *  submitted under `formName`. */
    maybeSelectedValue: Option.Option<Item>
  }>

const internalView = makeView<Model>({ ariaMultiSelectable: false })

/** Pairs the single-select combobox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. See `Listbox.create`
 *  for the rationale; the combobox factory follows the same shape with
 *  `selectItem` taking both `item` and `displayText`. `selectItem` emits
 *  `Selected({ value })` with the input resting on `displayText`; what the
 *  selection becomes is the parent's fold to decide. */
export const create = <Item extends string = string>(): Readonly<{
  view: SubmodelView<Model, Message, ViewInputs<Item>>
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
    displayText: string,
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
    restingInputValue: string,
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
  const arrayBasedView = internalView<Item>()
  const view = defineView<Model, Message, ViewInputs<Item>>(
    (model, { maybeSelectedValue, ...baseInputs }) =>
      arrayBasedView(model, {
        ...baseInputs,
        selectedValues: Option.toArray(maybeSelectedValue),
      }),
  )
  return {
    view,
    update: typedUpdate,
    selectItem: (model, item, displayText) =>
      typedUpdate(
        model,
        SelectedItem({ item, displayText, wasSelected: false }),
      ),
    open: model =>
      typedUpdate(model, Opened({ maybeActiveItemIndex: Option.none() })),
    close: (model, restingInputValue) =>
      typedUpdate(model, Closed({ restingInputValue })),
  }
}

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
  closedBaseModel,
  makeUpdate,
  makeView,
} from './shared.js'

// MODEL

/** Schema for the single-select combobox component's state, tracking open/closed status, active item, input value, selected item, and display text. */
export const Model = S.Struct({
  ...BaseModel.fields,
  maybeSelectedItem: S.Option(S.String),
  maybeSelectedDisplayText: S.Option(S.String),
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a single-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). `selectedItem` sets the initial selection (default none). */
export type InitConfig = BaseInitConfig &
  Readonly<{
    selectedItem?: string
    selectedDisplayText?: string
  }>

/** Creates an initial single-select combobox model from a config. Defaults to closed with no active item, empty input, and no selection. */
export const init = (config: InitConfig): Model => ({
  ...baseInit(config),
  maybeSelectedItem: Option.fromNullishOr(config.selectedItem),
  maybeSelectedDisplayText: Option.fromNullishOr(
    config.selectedDisplayText ?? config.selectedItem,
  ),
})

// UPDATE

/** Processes a combobox message and returns the next model and commands. Closes the combobox on selection (single-select behavior). */
export const update = makeUpdate<Model>({
  handleClose: model => {
    if (model.nullable && model.inputValue === '') {
      return evo(closedBaseModel(model), {
        maybeSelectedItem: () => Option.none(),
        maybeSelectedDisplayText: () => Option.none(),
        inputValue: () => '',
      })
    }

    return evo(closedBaseModel(model), {
      inputValue: () =>
        Option.getOrElse(model.maybeSelectedDisplayText, () => ''),
    })
  },

  handleSelectedItem: (model, item, displayText, context) => {
    const isAlreadySelected = Option.exists(
      model.maybeSelectedItem,
      selectedItem => selectedItem === item,
    )

    const nullableDeselect = model.nullable && isAlreadySelected
    const nextModel = nullableDeselect
      ? evo(closedBaseModel(model), {
          inputValue: () => '',
          maybeSelectedItem: () => Option.none(),
          maybeSelectedDisplayText: () => Option.none(),
        })
      : evo(closedBaseModel(model), {
          inputValue: () => displayText,
          maybeSelectedItem: () => Option.some(item),
          maybeSelectedDisplayText: () => Option.some(displayText),
        })

    return [
      nextModel,
      pipe(
        Array.getSomes([context.maybeUnlockScroll, context.maybeRestoreInert]),
        Array.prepend(context.focusInput),
      ),
      Option.some(SharedSelected({ value: item, wasAdded: !nullableDeselect })),
    ]
  },

  handleImmediateActivation: (model, item, displayText) =>
    evo(model, {
      maybeSelectedItem: () => Option.some(item),
      maybeSelectedDisplayText: () => Option.some(displayText),
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

/** Programmatically selects an item in the single-select combobox. Emits `Selected({ value, wasAdded })`. */
export const selectItem = (
  model: Model,
  item: string,
  displayText: string,
): UpdateReturn => update(model, SelectedItem({ item, displayText }))

/** Reflects an externally-sourced selection onto the model without
 *  emitting an OutMessage or running selection side effects (no close, no
 *  focus). Sets the selected item, its display text, and the input text
 *  together, so the input shows the reflected selection. Pass
 *  `Option.none()` to clear. Use this to mirror external truth (a URL
 *  parameter, restored storage, a server push) onto the combobox.
 *  Contrast with `selectItem`, a user/programmatic *choice* that emits
 *  `Selected`. Returns the model directly because it produces no commands
 *  and no OutMessage. */
export const reflectSelectedItem: Reflect<
  Model,
  Option.Option<{ readonly item: string; readonly displayText: string }>
> = Function.dual(
  2,
  (
    model: Model,
    maybeSelection: Option.Option<{
      readonly item: string
      readonly displayText: string
    }>,
  ): Model =>
    Option.match(maybeSelection, {
      onNone: () =>
        evo(model, {
          maybeSelectedItem: () => Option.none(),
          maybeSelectedDisplayText: () => Option.none(),
          inputValue: () => '',
        }),
      onSome: ({ item, displayText }) =>
        evo(model, {
          maybeSelectedItem: () => Option.some(item),
          maybeSelectedDisplayText: () => Option.some(displayText),
          inputValue: () => displayText,
        }),
    }),
)

// VIEW

/** Per-render view inputs passed to the view via `h.submodel`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputs<Item>

const internalView = makeView<Model>({
  isItemSelected: (model, itemValue) =>
    Option.exists(
      model.maybeSelectedItem,
      selectedItem => selectedItem === itemValue,
    ),
  ariaMultiSelectable: false,
})

/** Pairs the single-select combobox's `view` and `update` (and programmatic
 *  helpers) behind a single Item-typed entry point. See `Ui.Listbox.create`
 *  for the rationale; the combobox factory follows the same shape with
 *  `selectItem` taking both `item` and `displayText`. */
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
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Item>>,
  ]
  reflectSelectedItem: Reflect<
    Model,
    Option.Option<{ readonly item: Item; readonly displayText: string }>
  >
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
    selectItem: (model, item, displayText) =>
      typedUpdate(model, SelectedItem({ item, displayText })),
    open: model =>
      typedUpdate(model, Opened({ maybeActiveItemIndex: Option.none() })),
    close: model => typedUpdate(model, Closed()),
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    reflectSelectedItem: reflectSelectedItem as Reflect<
      Model,
      Option.Option<{ readonly item: Item; readonly displayText: string }>
    >,
  }
}

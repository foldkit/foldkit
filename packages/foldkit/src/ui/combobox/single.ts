import { Array, Option, Schema as S, pipe } from 'effect'

import type * as Command from '../../command/index.js'
import { type Html, createLazy } from '../../html/index.js'
import { evo } from '../../struct/index.js'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewConfig,
  type Message,
  SelectedItem,
  baseInit,
  closedBaseModel,
  makeUpdate,
  makeView,
} from './shared.js'

// MODEL

/** Schema for the single-select combobox component's state, tracking open/closed status, active item, input value, selected item, and display text. */
export const Model = BaseModel.pipe(
  S.extend(
    S.Struct({
      maybeSelectedItem: S.OptionFromSelf(S.String),
      maybeSelectedDisplayText: S.OptionFromSelf(S.String),
    }),
  ),
)

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
  maybeSelectedItem: Option.fromNullable(config.selectedItem),
  maybeSelectedDisplayText: Option.fromNullable(
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

    const nextModel =
      model.nullable && isAlreadySelected
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
    ]
  },

  handleImmediateActivation: (model, item, displayText) =>
    evo(model, {
      maybeSelectedItem: () => Option.some(item),
      maybeSelectedDisplayText: () => Option.some(displayText),
    }),
})

/** Programmatically selects an item in the single-select combobox, closing the combobox and returning
 *  focus commands. Use this in domain-event handlers when the combobox uses `onSelectedItem`. */
export const selectItem = (
  model: Model,
  item: string,
  displayText: string,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, SelectedItem({ item, displayText }))

// VIEW

/** Configuration for rendering a single-select combobox with `view`. */
export type ViewConfig<Message, Item extends string> = BaseViewConfig<
  Message,
  Item,
  Model
>

/** Renders a headless single-select combobox with keyboard navigation, selection tracking, and aria-activedescendant focus management. */
export const view = makeView<Model>({
  isItemSelected: (model, itemValue) =>
    Option.exists(
      model.maybeSelectedItem,
      selectedItem => selectedItem === itemValue,
    ),
  ariaMultiSelectable: false,
})

/** Creates a memoized single-select combobox view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <Message, Item extends string>(
  staticConfig: Omit<
    ViewConfig<Message, Item>,
    'model' | 'toParentMessage' | 'onSelectedItem'
  >,
): ((
  model: Model,
  toParentMessage: BaseViewConfig<Message, Item, Model>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: BaseViewConfig<
          Message,
          Item,
          Model
        >['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
        }),
      [model, toParentMessage],
    )
}

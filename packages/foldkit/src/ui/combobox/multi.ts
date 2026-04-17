import { Array, Option, Schema as S } from 'effect'

import type * as Command from '../../command'
import { type Html, createLazy } from '../../html'
import { evo } from '../../struct'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewConfig,
  Closed,
  type Message,
  Opened,
  SelectedItem,
  baseInit,
  closedBaseModel,
  makeUpdate,
  makeView,
} from './shared'

// MODEL

/** Schema for the multi-select combobox component's state, tracking open/closed status, active item, input value, and selected items. */
export const Model = BaseModel.pipe(
  S.extend(S.Struct({ selectedItems: S.Array(S.String) })),
)

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
    const nextSelectedItems = toggleItem(model.selectedItems, item)

    return [evo(model, { selectedItems: () => nextSelectedItems }), []]
  },

  handleImmediateActivation: (model, item) =>
    evo(model, {
      selectedItems: () => toggleItem(model.selectedItems, item),
    }),
})

/** Programmatically opens the combobox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the combobox. */
export const open = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the combobox, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to close the combobox. */
export const close = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Closed())

/** Programmatically toggles an item in the multi-select combobox. Use this in domain-event handlers when the combobox uses `onSelectedItem`. */
export const selectItem = (
  model: Model,
  item: string,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, SelectedItem({ item, displayText: item }))

// VIEW

/** Configuration for rendering a multi-select combobox with `view`. */
export type ViewConfig<Message, Item extends string> = BaseViewConfig<
  Message,
  Item,
  Model
>

/** Renders a headless multi-select combobox with keyboard navigation, selection tracking, and aria-activedescendant focus management. */
export const view = makeView<Model>({
  isItemSelected: (model, itemValue) =>
    Array.contains(model.selectedItems, itemValue),
  ariaMultiSelectable: true,
})

/** Creates a memoized multi-select combobox view. Static config is captured in a closure;
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

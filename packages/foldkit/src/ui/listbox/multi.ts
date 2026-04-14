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
  makeUpdate,
  makeView,
} from './shared.js'

// MODEL

/** Schema for the multi-select listbox component's state, tracking open/closed status, active item, selected items, activation trigger, and typeahead search. */
export const Model = BaseModel.pipe(
  S.extend(S.Struct({ selectedItems: S.Array(S.String) })),
)

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

/** Processes a listbox message and returns the next model and commands. Stays open on selection and toggles item membership (multi-select behavior). */
export const update = makeUpdate<Model>((model, item) => {
  const nextSelectedItems = Array.contains(model.selectedItems, item)
    ? Array.filter(model.selectedItems, selected => selected !== item)
    : Array.append(model.selectedItems, item)

  return [evo(model, { selectedItems: () => nextSelectedItems }), []]
})

/** Programmatically toggles an item in the multi-select listbox. Use this in domain-event handlers when the listbox uses `onSelectedItem`. */
export const selectItem = (
  model: Model,
  item: string,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, SelectedItem({ item }))

// VIEW

/** Configuration for rendering a multi-select listbox with `view`. */
export type ViewConfig<Message, Item> = BaseViewConfig<Message, Item, Model>

/** Renders a headless multi-select listbox with typeahead search, keyboard navigation, selection tracking, and aria-activedescendant focus management. */
export const view = makeView<Model>({
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

/** Creates a memoized multi-select listbox view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <Message, Item>(
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

import { Array, Option, Schema as S, pipe } from 'effect'

import { type Html, createLazy } from '../../html'
import { evo } from '../../struct'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewConfig,
  baseInit,
  closedModel,
  makeUpdate,
  makeView,
} from './shared'

// MODEL

/** Schema for the listbox component's state, tracking open/closed status, active item, selected item, activation trigger, and typeahead search. */
export const Model = BaseModel.pipe(
  S.extend(S.Struct({ maybeSelectedItem: S.OptionFromSelf(S.String) })),
)

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
  maybeSelectedItem: Option.fromNullable(config.selectedItem),
})

// UPDATE

/** Processes a listbox message and returns the next model and commands. Closes the listbox on selection (single-select behavior). */
export const update = makeUpdate<Model>((model, item, context) => [
  evo(closedModel(model), {
    maybeSelectedItem: () => Option.some(item),
  }),
  pipe(
    Array.getSomes([
      context.maybeNextFrame,
      context.maybeUnlockScroll,
      context.maybeRestoreInert,
    ]),
    Array.prepend(context.focusButton),
  ),
])

// VIEW

/** Configuration for rendering a single-select listbox with `view`. */
export type ViewConfig<Message, Item> = BaseViewConfig<Message, Item, Model>

/** Renders a headless single-select listbox with typeahead search, keyboard navigation, selection tracking, and aria-activedescendant focus management. */
export const view = makeView<Model>({
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

/** Creates a memoized single-select listbox view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <Message, Item>(
  staticConfig: Omit<ViewConfig<Message, Item>, 'model' | 'toParentMessage'>,
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

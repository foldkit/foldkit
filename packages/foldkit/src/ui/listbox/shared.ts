import {
  Array,
  Effect,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  String as Str,
  pipe,
} from 'effect'

import type { Command } from '../../command'
import { OptionExt } from '../../effectExtensions'
import { type Html, html } from '../../html'
import { m } from '../../message'
import { makeConstrainedEvo } from '../../struct'
import * as Task from '../../task'
import { anchorHooks } from '../anchor'
import type { AnchorConfig } from '../anchor'
import { groupContiguous } from '../group'
import { findFirstEnabledIndex, isPrintableKey, keyToIndex } from '../keyboard'
import { TransitionState } from '../transition'
import { resolveTypeaheadMatch } from '../typeahead'

export { resolveTypeaheadMatch }

// MODEL

/** Schema for the activation trigger — whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literal('Pointer', 'Keyboard')
export type ActivationTrigger = typeof ActivationTrigger.Type

/** Schema for the listbox orientation — whether items flow vertically or horizontally. */
export const Orientation = S.Literal('Vertical', 'Horizontal')
export type Orientation = typeof Orientation.Type

/** Schema fields shared by all listbox variants (single-select and multi-select). Spread into each variant's `S.Struct` to avoid duplicating field definitions. */
export const BaseModel = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  isModal: S.Boolean,
  orientation: Orientation,
  transitionState: TransitionState,
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
  activationTrigger: ActivationTrigger,
  searchQuery: S.String,
  searchVersion: S.Number,
  maybeLastPointerPosition: S.OptionFromSelf(
    S.Struct({ screenX: S.Number, screenY: S.Number }),
  ),
  maybeLastButtonPointerType: S.OptionFromSelf(S.String),
})
export type BaseModel = typeof BaseModel.Type

/** Configuration fields shared by all listbox variant `init` functions. */
export type BaseInitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
  orientation?: typeof Orientation.Type
}>

/** Creates the shared base fields for a listbox model from a config. Each variant spreads this and adds its selection field. */
export const baseInit = (config: BaseInitConfig): BaseModel => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  orientation: config.orientation ?? 'Vertical',
  transitionState: 'Idle',
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  searchQuery: '',
  searchVersion: 0,
  maybeLastPointerPosition: Option.none(),
  maybeLastButtonPointerType: Option.none(),
})

// MESSAGE

/** Sent when the listbox opens via button click or keyboard. Contains an optional initial active item index — None for pointer, Some for keyboard. */
export const Opened = m('Opened', {
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
})
/** Sent when the listbox closes via Escape key or backdrop click. */
export const Closed = m('Closed')
/** Sent when focus leaves the listbox items container via Tab key or blur. */
export const ClosedByTab = m('ClosedByTab')
/** Sent when an item is highlighted via arrow keys or mouse hover. Includes activation trigger. */
export const ActivatedItem = m('ActivatedItem', {
  index: S.Number,
  activationTrigger: ActivationTrigger,
})
/** Sent when the mouse leaves an enabled item. */
export const DeactivatedItem = m('DeactivatedItem')
/** Sent when an item is selected via Enter, Space, or click. Contains the item's string value. */
export const SelectedItem = m('SelectedItem', { item: S.String })
/** Sent when Enter or Space is pressed on the active item, triggering a programmatic click on the DOM element. */
export const RequestedItemClick = m('RequestedItemClick', {
  index: S.Number,
})
/** Sent when a printable character is typed for typeahead search. */
export const Searched = m('Searched', {
  key: S.String,
  maybeTargetIndex: S.OptionFromSelf(S.Number),
})
/** Sent after the search debounce period to clear the accumulated query. */
export const ClearedSearch = m('ClearedSearch', { version: S.Number })
/** Sent when the pointer moves over a listbox item, carrying screen coordinates for tracked-pointer comparison. */
export const MovedPointerOverItem = m('MovedPointerOverItem', {
  index: S.Number,
  screenX: S.Number,
  screenY: S.Number,
})
/** Placeholder message used when no action is needed. */
export const NoOp = m('NoOp')
/** Sent internally when a double-rAF completes, advancing the transition to its animating phase. */
export const AdvancedTransitionFrame = m('AdvancedTransitionFrame')
/** Sent internally when all CSS transitions on the listbox items container have completed. */
export const EndedTransition = m('EndedTransition')
/** Sent internally when the listbox button moves in the viewport during a leave transition, cancelling the animation. */
export const DetectedButtonMovement = m('DetectedButtonMovement')
/** Sent when the user presses a pointer device on the listbox button. Records pointer type for click handling. */
export const PressedPointerOnButton = m('PressedPointerOnButton', {
  pointerType: S.String,
  button: S.Number,
})

/** Union of all messages the listbox component can produce. */
export const Message = S.Union(
  Opened,
  Closed,
  ClosedByTab,
  ActivatedItem,
  DeactivatedItem,
  SelectedItem,
  MovedPointerOverItem,
  RequestedItemClick,
  Searched,
  ClearedSearch,
  NoOp,
  AdvancedTransitionFrame,
  EndedTransition,
  DetectedButtonMovement,
  PressedPointerOnButton,
)

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type ClosedByTab = typeof ClosedByTab.Type
export type ActivatedItem = typeof ActivatedItem.Type
export type DeactivatedItem = typeof DeactivatedItem.Type
export type SelectedItem = typeof SelectedItem.Type
export type MovedPointerOverItem = typeof MovedPointerOverItem.Type
export type RequestedItemClick = typeof RequestedItemClick.Type
export type Searched = typeof Searched.Type
export type ClearedSearch = typeof ClearedSearch.Type
export type NoOp = typeof NoOp.Type
export type AdvancedTransitionFrame = typeof AdvancedTransitionFrame.Type
export type EndedTransition = typeof EndedTransition.Type
export type DetectedButtonMovement = typeof DetectedButtonMovement.Type
export type PressedPointerOnButton = typeof PressedPointerOnButton.Type

export type Message = typeof Message.Type

// CONSTANTS

export const SEARCH_DEBOUNCE_MILLISECONDS = 350
export const LEFT_MOUSE_BUTTON = 0

// SELECTORS

export const buttonSelector = (id: string): string => `#${id}-button`
export const itemsSelector = (id: string): string => `#${id}-items`
export const itemSelector = (id: string, index: number): string =>
  `#${id}-item-${index}`
export const itemId = (id: string, index: number): string =>
  `${id}-item-${index}`

// HELPERS

const constrainedEvo = makeConstrainedEvo<BaseModel>()

export const closedModel = <Model extends BaseModel>(model: Model): Model =>
  constrainedEvo(model, {
    isOpen: () => false,
    transitionState: () =>
      model.isAnimated ? ('LeaveStart' as const) : ('Idle' as const),
    maybeActiveItemIndex: () => Option.none(),
    activationTrigger: () => 'Keyboard' as const,
    searchQuery: () => '',
    searchVersion: () => 0,
    maybeLastPointerPosition: () => Option.none(),
    maybeLastButtonPointerType: () => Option.none(),
  })

// UPDATE FACTORY

type SelectedItemContext = Readonly<{
  focusButton: Command<Message>
  maybeNextFrame: Option.Option<Command<Message>>
  maybeUnlockScroll: Option.Option<Command<Message>>
  maybeRestoreInert: Option.Option<Command<Message>>
}>

export const makeUpdate = <Model extends BaseModel>(
  handleSelectedItem: (
    model: Model,
    item: string,
    context: SelectedItemContext,
  ) => [Model, ReadonlyArray<Command<Message>>],
) => {
  type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
  const withUpdateReturn = M.withReturnType<UpdateReturn>()

  return (model: Model, message: Message): UpdateReturn => {
    const maybeNextFrame = OptionExt.when(
      model.isAnimated,
      Task.nextFrame.pipe(Effect.as(AdvancedTransitionFrame())),
    )

    const maybeLockScroll = OptionExt.when(
      model.isModal,
      Task.lockScroll.pipe(Effect.as(NoOp())),
    )

    const maybeUnlockScroll = OptionExt.when(
      model.isModal,
      Task.unlockScroll.pipe(Effect.as(NoOp())),
    )

    const maybeInertOthers = OptionExt.when(
      model.isModal,
      Task.inertOthers(model.id, [
        buttonSelector(model.id),
        itemsSelector(model.id),
      ]).pipe(Effect.as(NoOp())),
    )

    const maybeRestoreInert = OptionExt.when(
      model.isModal,
      Task.restoreInert(model.id).pipe(Effect.as(NoOp())),
    )

    const focusButton = Task.focus(buttonSelector(model.id)).pipe(
      Effect.ignore,
      Effect.as(NoOp()),
    )

    return M.value(message).pipe(
      withUpdateReturn,
      M.tagsExhaustive({
        Opened: ({ maybeActiveItemIndex }) => {
          const nextModel = constrainedEvo(model, {
            isOpen: () => true,
            transitionState: () =>
              model.isAnimated ? ('EnterStart' as const) : ('Idle' as const),
            maybeActiveItemIndex: () => maybeActiveItemIndex,
            activationTrigger: () =>
              Option.match(maybeActiveItemIndex, {
                onNone: () => 'Pointer' as const,
                onSome: () => 'Keyboard' as const,
              }),
            searchQuery: () => '',
            searchVersion: () => 0,
            maybeLastPointerPosition: () => Option.none(),
          })

          return [
            nextModel,
            pipe(
              Array.getSomes([
                maybeNextFrame,
                maybeLockScroll,
                maybeInertOthers,
              ]),
              Array.prepend(
                Task.focus(itemsSelector(model.id)).pipe(
                  Effect.ignore,
                  Effect.as(NoOp()),
                ),
              ),
            ),
          ]
        },

        Closed: () => [
          closedModel(model),
          pipe(
            Array.getSomes([
              maybeNextFrame,
              maybeUnlockScroll,
              maybeRestoreInert,
            ]),
            Array.prepend(focusButton),
          ),
        ],

        ClosedByTab: () => [
          closedModel(model),
          Array.getSomes([
            maybeNextFrame,
            maybeUnlockScroll,
            maybeRestoreInert,
          ]),
        ],

        ActivatedItem: ({ index, activationTrigger }) => [
          constrainedEvo(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => activationTrigger,
          }),
          activationTrigger === 'Keyboard'
            ? [
                Task.scrollIntoView(itemSelector(model.id, index)).pipe(
                  Effect.ignore,
                  Effect.as(NoOp()),
                ),
              ]
            : [],
        ],

        MovedPointerOverItem: ({ index, screenX, screenY }) => {
          const isSamePosition = Option.exists(
            model.maybeLastPointerPosition,
            position =>
              position.screenX === screenX && position.screenY === screenY,
          )

          if (isSamePosition) {
            return [model, []]
          }

          return [
            constrainedEvo(model, {
              maybeActiveItemIndex: () => Option.some(index),
              activationTrigger: () => 'Pointer' as const,
              maybeLastPointerPosition: () => Option.some({ screenX, screenY }),
            }),
            [],
          ]
        },

        DeactivatedItem: () =>
          model.activationTrigger === 'Pointer'
            ? [
                constrainedEvo(model, {
                  maybeActiveItemIndex: () => Option.none(),
                }),
                [],
              ]
            : [model, []],

        SelectedItem: ({ item }) =>
          handleSelectedItem(model, item, {
            focusButton,
            maybeNextFrame,
            maybeUnlockScroll,
            maybeRestoreInert,
          }),

        RequestedItemClick: ({ index }) => [
          model,
          [
            Task.clickElement(itemSelector(model.id, index)).pipe(
              Effect.ignore,
              Effect.as(NoOp()),
            ),
          ],
        ],

        Searched: ({ key, maybeTargetIndex }) => {
          const nextSearchQuery = model.searchQuery + key
          const nextSearchVersion = model.searchVersion + 1

          return [
            constrainedEvo(model, {
              searchQuery: () => nextSearchQuery,
              searchVersion: () => nextSearchVersion,
              maybeActiveItemIndex: () =>
                Option.orElse(
                  maybeTargetIndex,
                  () => model.maybeActiveItemIndex,
                ),
            }),
            [
              Task.delay(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
                Effect.as(ClearedSearch({ version: nextSearchVersion })),
              ),
            ],
          ]
        },

        ClearedSearch: ({ version }) => {
          if (version !== model.searchVersion) {
            return [model, []]
          }

          return [constrainedEvo(model, { searchQuery: () => '' }), []]
        },

        AdvancedTransitionFrame: () =>
          M.value(model.transitionState).pipe(
            withUpdateReturn,
            M.when('EnterStart', () => [
              constrainedEvo(model, {
                transitionState: () => 'EnterAnimating' as const,
              }),
              [
                Task.waitForTransitions(itemsSelector(model.id)).pipe(
                  Effect.as(EndedTransition()),
                ),
              ],
            ]),
            M.when('LeaveStart', () => [
              constrainedEvo(model, {
                transitionState: () => 'LeaveAnimating' as const,
              }),
              [
                Effect.raceFirst(
                  Task.detectElementMovement(buttonSelector(model.id)).pipe(
                    Effect.as(DetectedButtonMovement()),
                  ),
                  Task.waitForTransitions(itemsSelector(model.id)).pipe(
                    Effect.as(EndedTransition()),
                  ),
                ),
              ],
            ]),
            M.orElse(() => [model, []]),
          ),

        EndedTransition: () =>
          M.value(model.transitionState).pipe(
            withUpdateReturn,
            M.whenOr('EnterAnimating', 'LeaveAnimating', () => [
              constrainedEvo(model, { transitionState: () => 'Idle' as const }),
              [],
            ]),
            M.orElse(() => [model, []]),
          ),

        DetectedButtonMovement: () =>
          M.value(model.transitionState).pipe(
            withUpdateReturn,
            M.when('LeaveAnimating', () => [
              constrainedEvo(model, { transitionState: () => 'Idle' as const }),
              [],
            ]),
            M.orElse(() => [model, []]),
          ),

        PressedPointerOnButton: ({ pointerType, button }) => {
          const withPointerType = constrainedEvo(model, {
            maybeLastButtonPointerType: () => Option.some(pointerType),
          })

          if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
            return [withPointerType, []]
          }

          if (model.isOpen) {
            return [
              closedModel(withPointerType),
              pipe(
                Array.getSomes([
                  maybeNextFrame,
                  maybeUnlockScroll,
                  maybeRestoreInert,
                ]),
                Array.prepend(focusButton),
              ),
            ]
          }

          const nextModel = constrainedEvo(withPointerType, {
            isOpen: () => true,
            transitionState: () =>
              model.isAnimated ? ('EnterStart' as const) : ('Idle' as const),
            maybeActiveItemIndex: () => Option.none(),
            activationTrigger: () => 'Pointer' as const,
            searchQuery: () => '',
            searchVersion: () => 0,
            maybeLastPointerPosition: () => Option.none(),
          })

          return [
            nextModel,
            pipe(
              Array.getSomes([
                maybeNextFrame,
                maybeLockScroll,
                maybeInertOthers,
              ]),
              Array.prepend(
                Task.focus(itemsSelector(model.id)).pipe(
                  Effect.ignore,
                  Effect.as(NoOp()),
                ),
              ),
            ),
          ]
        },

        NoOp: () => [model, []],
      }),
    )
  }
}

// VIEW TYPES

/** Configuration for an individual listbox item's appearance. */
export type ItemConfig = Readonly<{
  className: string
  content: Html
}>

/** Configuration for a group heading rendered above a group of items. */
export type GroupHeading = Readonly<{
  content: Html
  className: string
}>

/** Configuration for rendering a listbox with `view`. */
export type BaseViewConfig<Message, Item, Model extends BaseModel> = Readonly<{
  model: Model
  toMessage: (
    message:
      | Opened
      | Closed
      | ClosedByTab
      | ActivatedItem
      | DeactivatedItem
      | SelectedItem
      | MovedPointerOverItem
      | RequestedItemClick
      | Searched
      | PressedPointerOnButton
      | NoOp,
  ) => Message
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{
      isActive: boolean
      isDisabled: boolean
      isSelected: boolean
    }>,
  ) => ItemConfig
  isItemDisabled?: (item: Item, index: number) => boolean
  itemToSearchText?: (item: Item, index: number) => string
  itemToValue?: (item: Item) => string
  isButtonDisabled?: boolean
  buttonContent: Html
  buttonClassName: string
  itemsClassName: string
  backdropClassName: string
  className?: string
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  separatorClassName?: string
  anchor?: AnchorConfig
  name?: string
  form?: string
  isDisabled?: boolean
  isInvalid?: boolean
}>

// VIEW FACTORY

type ViewBehavior<Model extends BaseModel> = Readonly<{
  isItemSelected: (model: Model, itemValue: string) => boolean
  selectedItemIndex: <Item>(
    model: Model,
    items: ReadonlyArray<Item>,
    itemToValue: (item: Item) => string,
  ) => Option.Option<number>
  ariaMultiSelectable: boolean
}>

export const makeView =
  <Model extends BaseModel>(behavior: ViewBehavior<Model>) =>
  <Message, Item>(config: BaseViewConfig<Message, Item, Model>): Html => {
    const {
      div,
      input,
      AriaActiveDescendant,
      AriaControls,
      AriaDisabled,
      AriaExpanded,
      AriaHasPopup,
      AriaLabelledBy,
      AriaMultiSelectable,
      AriaOrientation,
      AriaSelected,
      Attribute,
      Class,
      DataAttribute,
      Id,
      Name,
      OnBlur,
      OnClick,
      OnDestroy,
      OnInsert,
      OnKeyDownPreventDefault,
      OnKeyUpPreventDefault,
      OnPointerDown,
      OnPointerLeave,
      OnPointerMove,
      Role,
      Style,
      Tabindex,
      Type,
      Value,
      keyed,
    } = html<Message>()

    const {
      model: {
        id,
        isOpen,
        orientation,
        transitionState,
        maybeActiveItemIndex,
        searchQuery,
        maybeLastButtonPointerType,
      },
      toMessage,
      items,
      itemToConfig,
      isItemDisabled,
      isButtonDisabled,
      buttonContent,
      buttonClassName,
      itemsClassName,
      backdropClassName,
      className,
      itemGroupKey,
      groupToHeading,
      groupClassName,
      separatorClassName,
      anchor,
      name,
      form,
      isDisabled,
      isInvalid,
    } = config

    const itemToValue = config.itemToValue ?? (item => String(item))
    const itemToSearchText =
      config.itemToSearchText ?? (item => itemToValue(item))

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving

    const transitionAttributes: ReadonlyArray<
      ReturnType<typeof DataAttribute>
    > = M.value(transitionState).pipe(
      M.when('EnterStart', () => [
        DataAttribute('closed', ''),
        DataAttribute('enter', ''),
        DataAttribute('transition', ''),
      ]),
      M.when('EnterAnimating', () => [
        DataAttribute('enter', ''),
        DataAttribute('transition', ''),
      ]),
      M.when('LeaveStart', () => [
        DataAttribute('leave', ''),
        DataAttribute('transition', ''),
      ]),
      M.when('LeaveAnimating', () => [
        DataAttribute('closed', ''),
        DataAttribute('leave', ''),
        DataAttribute('transition', ''),
      ]),
      M.orElse(() => []),
    )

    const isItemDisabledByIndex = (index: number): boolean =>
      Predicate.isNotUndefined(isItemDisabled) &&
      pipe(
        items,
        Array.get(index),
        Option.exists(item => isItemDisabled(item, index)),
      )

    const isButtonEffectivelyDisabled = isDisabled || isButtonDisabled

    const nextKey = orientation === 'Horizontal' ? 'ArrowRight' : 'ArrowDown'
    const previousKey = orientation === 'Horizontal' ? 'ArrowLeft' : 'ArrowUp'

    const navigationKeys = [
      nextKey,
      previousKey,
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]
    const isNavigationKey = (key: string): boolean =>
      Array.contains(navigationKeys, key)

    const firstEnabledIndex = findFirstEnabledIndex(
      items.length,
      0,
      isItemDisabledByIndex,
    )(0, 1)

    const lastEnabledIndex = findFirstEnabledIndex(
      items.length,
      0,
      isItemDisabledByIndex,
    )(items.length - 1, -1)

    const selectedItemIndex = behavior.selectedItemIndex(
      config.model,
      items,
      itemToValue,
    )

    const handleButtonKeyDown = (key: string): Option.Option<Message> =>
      M.value(key).pipe(
        M.whenOr('Enter', ' ', 'ArrowDown', () =>
          Option.some(
            toMessage(
              Opened({
                maybeActiveItemIndex: Option.orElse(selectedItemIndex, () =>
                  Option.some(firstEnabledIndex),
                ),
              }),
            ),
          ),
        ),
        M.when('ArrowUp', () =>
          Option.some(
            toMessage(
              Opened({
                maybeActiveItemIndex: Option.orElse(selectedItemIndex, () =>
                  Option.some(lastEnabledIndex),
                ),
              }),
            ),
          ),
        ),
        M.orElse(() => Option.none()),
      )

    const handleButtonPointerDown = (
      pointerType: string,
      button: number,
    ): Option.Option<Message> =>
      Option.some(
        toMessage(
          PressedPointerOnButton({
            pointerType,
            button,
          }),
        ),
      )

    const handleButtonClick = (): Message => {
      const isMouse = Option.exists(
        maybeLastButtonPointerType,
        type => type === 'mouse',
      )

      if (isMouse) {
        return toMessage(NoOp())
      } else if (isOpen) {
        return toMessage(Closed())
      } else {
        return toMessage(Opened({ maybeActiveItemIndex: Option.none() }))
      }
    }

    const handleSpaceKeyUp = (key: string): Option.Option<Message> =>
      OptionExt.when(key === ' ', toMessage(NoOp()))

    const resolveActiveIndex = (key: string): number =>
      Option.match(maybeActiveItemIndex, {
        onNone: () =>
          M.value(key).pipe(
            M.whenOr(previousKey, 'End', 'PageDown', () => lastEnabledIndex),
            M.orElse(() => firstEnabledIndex),
          ),
        onSome: activeIndex =>
          keyToIndex(
            nextKey,
            previousKey,
            items.length,
            activeIndex,
            isItemDisabledByIndex,
          )(key),
      })

    const searchForKey = (key: string): Option.Option<Message> => {
      const nextQuery = searchQuery + key
      const maybeTargetIndex = resolveTypeaheadMatch(
        items,
        nextQuery,
        maybeActiveItemIndex,
        isItemDisabledByIndex,
        itemToSearchText,
        Str.isNonEmpty(searchQuery),
      )
      return Option.some(toMessage(Searched({ key, maybeTargetIndex })))
    }

    const handleItemsKeyDown = (key: string): Option.Option<Message> =>
      M.value(key).pipe(
        M.when('Escape', () => Option.some(toMessage(Closed()))),
        M.when('Enter', () =>
          Option.map(maybeActiveItemIndex, index =>
            toMessage(RequestedItemClick({ index })),
          ),
        ),
        M.when(' ', () =>
          Str.isNonEmpty(searchQuery)
            ? searchForKey(' ')
            : Option.map(maybeActiveItemIndex, index =>
                toMessage(RequestedItemClick({ index })),
              ),
        ),
        M.when(isNavigationKey, () =>
          Option.some(
            toMessage(
              ActivatedItem({
                index: resolveActiveIndex(key),
                activationTrigger: 'Keyboard',
              }),
            ),
          ),
        ),
        M.when(isPrintableKey, () => searchForKey(key)),
        M.orElse(() => Option.none()),
      )

    const buttonAttributes = [
      Id(`${id}-button`),
      Type('button'),
      Class(buttonClassName),
      AriaHasPopup('listbox'),
      AriaExpanded(isVisible),
      AriaControls(`${id}-items`),
      ...(isButtonEffectivelyDisabled
        ? [AriaDisabled(true), DataAttribute('disabled', '')]
        : [
            OnPointerDown(handleButtonPointerDown),
            OnKeyDownPreventDefault(handleButtonKeyDown),
            OnKeyUpPreventDefault(handleSpaceKeyUp),
            OnClick(handleButtonClick()),
          ]),
      ...(isVisible ? [DataAttribute('open', '')] : []),
      ...(isInvalid ? [DataAttribute('invalid', '')] : []),
    ]

    const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
      onNone: () => [],
      onSome: index => [AriaActiveDescendant(itemId(id, index))],
    })

    const hooks = anchor
      ? anchorHooks({ buttonId: `${id}-button`, anchor })
      : undefined

    const anchorAttributes = hooks
      ? [
          Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
          OnInsert(hooks.onInsert),
          OnDestroy(hooks.onDestroy),
        ]
      : []

    const itemsContainerAttributes = [
      Id(`${id}-items`),
      Role('listbox'),
      AriaOrientation(Str.toLowerCase(orientation)),
      ...(behavior.ariaMultiSelectable ? [AriaMultiSelectable(true)] : []),
      AriaLabelledBy(`${id}-button`),
      ...maybeActiveDescendant,
      Tabindex(0),
      Class(itemsClassName),
      ...anchorAttributes,
      ...transitionAttributes,
      ...(isLeaving
        ? []
        : [
            OnKeyDownPreventDefault(handleItemsKeyDown),
            OnKeyUpPreventDefault(handleSpaceKeyUp),
            OnBlur(toMessage(ClosedByTab())),
          ]),
    ]

    const listboxItems = Array.map(items, (item, index) => {
      const isActiveItem = Option.exists(
        maybeActiveItemIndex,
        activeIndex => activeIndex === index,
      )
      const isDisabledItem = isItemDisabledByIndex(index)
      const isSelectedItem = behavior.isItemSelected(
        config.model,
        itemToValue(item),
      )
      const itemConfig = itemToConfig(item, {
        isActive: isActiveItem,
        isDisabled: isDisabledItem,
        isSelected: isSelectedItem,
      })

      const isInteractive = !isDisabledItem && !isLeaving

      return keyed('div')(
        itemId(id, index),
        [
          Id(itemId(id, index)),
          Role('option'),
          AriaSelected(isSelectedItem),
          Class(itemConfig.className),
          ...(isActiveItem ? [DataAttribute('active', '')] : []),
          ...(isSelectedItem ? [DataAttribute('selected', '')] : []),
          ...(isDisabledItem
            ? [AriaDisabled(true), DataAttribute('disabled', '')]
            : []),
          ...(isInteractive
            ? [
                OnClick(toMessage(SelectedItem({ item: itemToValue(item) }))),
                ...(isActiveItem
                  ? []
                  : [
                      OnPointerMove((screenX, screenY, pointerType) =>
                        OptionExt.when(
                          pointerType !== 'touch',
                          toMessage(
                            MovedPointerOverItem({ index, screenX, screenY }),
                          ),
                        ),
                      ),
                    ]),
                OnPointerLeave(pointerType =>
                  OptionExt.when(
                    pointerType !== 'touch',
                    toMessage(DeactivatedItem()),
                  ),
                ),
              ]
            : []),
        ],
        [itemConfig.content],
      )
    })

    const renderGroupedItems = (): ReadonlyArray<Html> => {
      if (!itemGroupKey) {
        return listboxItems
      }

      const segments = groupContiguous(listboxItems, (_, index) =>
        Array.get(items, index).pipe(
          Option.match({
            onNone: () => '',
            onSome: item => itemGroupKey(item, index),
          }),
        ),
      )

      return Array.flatMap(segments, (segment, segmentIndex) => {
        const maybeHeading = Option.fromNullable(groupToHeading?.(segment.key))

        const headingId = `${id}-heading-${segment.key}`

        const headingElement = Option.match(maybeHeading, {
          onNone: () => [],
          onSome: heading => [
            keyed('div')(
              headingId,
              [Id(headingId), Role('presentation'), Class(heading.className)],
              [heading.content],
            ),
          ],
        })

        const groupContent = [...headingElement, ...segment.items]

        const groupElement = keyed('div')(
          `${id}-group-${segment.key}`,
          [
            Role('group'),
            ...(Option.isSome(maybeHeading) ? [AriaLabelledBy(headingId)] : []),
            ...(groupClassName ? [Class(groupClassName)] : []),
          ],
          groupContent,
        )

        const separator =
          segmentIndex > 0 && separatorClassName
            ? [
                keyed('div')(
                  `${id}-separator-${segmentIndex}`,
                  [Role('separator'), Class(separatorClassName)],
                  [],
                ),
              ]
            : []

        return [...separator, groupElement]
      })
    }

    const backdrop = keyed('div')(
      `${id}-backdrop`,
      [
        Class(backdropClassName),
        ...(isLeaving ? [] : [OnClick(toMessage(Closed()))]),
      ],
      [],
    )

    const renderedItems = renderGroupedItems()

    const visibleContent = [
      backdrop,
      keyed('div')(
        `${id}-items-container`,
        itemsContainerAttributes,
        renderedItems,
      ),
    ]

    const formAttribute = form ? [Attribute('form', form)] : []

    const selectedValues = pipe(
      items,
      Array.filter(item =>
        behavior.isItemSelected(config.model, itemToValue(item)),
      ),
      Array.map(itemToValue),
    )

    const hiddenInputs = name
      ? Array.match(selectedValues, {
          onEmpty: () => [
            input([Type('hidden'), Name(name), ...formAttribute]),
          ],
          onNonEmpty: Array.map(selectedValue =>
            input([
              Type('hidden'),
              Name(name),
              Value(selectedValue),
              ...formAttribute,
            ]),
          ),
        })
      : []

    const wrapperAttributes = [
      ...(className ? [Class(className)] : []),
      ...(isVisible ? [DataAttribute('open', '')] : []),
      ...(isDisabled ? [DataAttribute('disabled', '')] : []),
      ...(isInvalid ? [DataAttribute('invalid', '')] : []),
    ]

    return div(wrapperAttributes, [
      keyed('button')(`${id}-button`, buttonAttributes, [buttonContent]),
      ...hiddenInputs,
      ...(isVisible ? visibleContent : []),
    ])
  }

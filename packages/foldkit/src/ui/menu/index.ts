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

import * as Command from '../../command'
import { OptionExt } from '../../effectExtensions'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
import { anchorHooks } from '../anchor'
import type { AnchorConfig } from '../anchor'
import { groupContiguous } from '../group'
import { findFirstEnabledIndex, isPrintableKey, keyToIndex } from '../keyboard'
import { TransitionState } from '../transition'
import { resolveTypeaheadMatch } from '../typeahead'

// MODEL

/** Schema for the activation trigger — whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literal('Pointer', 'Keyboard')
export type ActivationTrigger = typeof ActivationTrigger.Type

const PointerOrigin = S.Struct({
  screenX: S.Number,
  screenY: S.Number,
  timeStamp: S.Number,
})

/** Schema for the menu component's state, tracking open/closed status, active item, activation trigger, and typeahead search. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  isModal: S.Boolean,
  transitionState: TransitionState,
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
  activationTrigger: ActivationTrigger,
  searchQuery: S.String,
  searchVersion: S.Number,
  maybeLastPointerPosition: S.OptionFromSelf(
    S.Struct({ screenX: S.Number, screenY: S.Number }),
  ),
  maybeLastButtonPointerType: S.OptionFromSelf(S.String),
  maybePointerOrigin: S.OptionFromSelf(PointerOrigin),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the menu opens via button click or keyboard. Contains an optional initial active item index — None for pointer, Some for keyboard. */
export const Opened = m('Opened', {
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
})
/** Sent when the menu closes via Escape key or backdrop click. */
export const Closed = m('Closed')
/** Sent when focus leaves the menu items container via Tab key or blur. */
export const ClosedByTab = m('ClosedByTab')
/** Sent when an item is highlighted via arrow keys or mouse hover. Includes activation trigger. */
export const ActivatedItem = m('ActivatedItem', {
  index: S.Number,
  activationTrigger: ActivationTrigger,
})
/** Sent when the mouse leaves an enabled item. */
export const DeactivatedItem = m('DeactivatedItem')
/** Sent when an item is selected via Enter, Space, or click. */
export const SelectedItem = m('SelectedItem', { index: S.Number })
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
/** Sent when the pointer moves over a menu item, carrying screen coordinates for tracked-pointer comparison. */
export const MovedPointerOverItem = m('MovedPointerOverItem', {
  index: S.Number,
  screenX: S.Number,
  screenY: S.Number,
})
/** Sent when the focus-items command completes after opening the menu. */
export const CompletedItemsFocus = m('CompletedItemsFocus')
/** Sent when the focus-button command completes after closing or selecting. */
export const CompletedButtonFocus = m('CompletedButtonFocus')
/** Sent when the scroll lock command completes. */
export const CompletedScrollLock = m('CompletedScrollLock')
/** Sent when the scroll unlock command completes. */
export const CompletedScrollUnlock = m('CompletedScrollUnlock')
/** Sent when the inert-others command completes. */
export const CompletedInertSetup = m('CompletedInertSetup')
/** Sent when the restore-inert command completes. */
export const CompletedInertTeardown = m('CompletedInertTeardown')
/** Sent when the scroll-into-view command completes after keyboard activation. */
export const CompletedScrollIntoView = m('CompletedScrollIntoView')
/** Sent when the programmatic click command completes. */
export const CompletedItemClick = m('CompletedItemClick')
/** Sent when the advance-focus command completes. */
export const CompletedFocusAdvance = m('CompletedFocusAdvance')
/** Sent when a mouse click on the button is ignored because pointer-down already handled the toggle. */
export const IgnoredMouseClick = m('IgnoredMouseClick')
/** Sent when a Space key-up is captured to prevent page scrolling. */
export const SuppressedSpaceScroll = m('SuppressedSpaceScroll')
/** Sent internally when a double-rAF completes, advancing the transition to its animating phase. */
export const AdvancedTransitionFrame = m('AdvancedTransitionFrame')
/** Sent internally when all CSS transitions on the menu items container have completed. */
export const EndedTransition = m('EndedTransition')
/** Sent internally when the menu button moves in the viewport during a leave transition, cancelling the animation. */
export const DetectedButtonMovement = m('DetectedButtonMovement')
/** Sent when the user presses a pointer device on the menu button. Records pointer type and toggles for mouse. */
export const PressedPointerOnButton = m('PressedPointerOnButton', {
  pointerType: S.String,
  button: S.Number,
  screenX: S.Number,
  screenY: S.Number,
  timeStamp: S.Number,
})
/** Sent when the user releases a pointer on the items container, enabling drag-to-select for mouse. */
export const ReleasedPointerOnItems = m('ReleasedPointerOnItems', {
  screenX: S.Number,
  screenY: S.Number,
  timeStamp: S.Number,
})

/** Union of all messages the menu component can produce. */
export const Message: S.Union<
  [
    typeof Opened,
    typeof Closed,
    typeof ClosedByTab,
    typeof ActivatedItem,
    typeof DeactivatedItem,
    typeof SelectedItem,
    typeof MovedPointerOverItem,
    typeof RequestedItemClick,
    typeof Searched,
    typeof ClearedSearch,
    typeof CompletedItemsFocus,
    typeof CompletedButtonFocus,
    typeof CompletedScrollLock,
    typeof CompletedScrollUnlock,
    typeof CompletedInertSetup,
    typeof CompletedInertTeardown,
    typeof CompletedScrollIntoView,
    typeof CompletedItemClick,
    typeof CompletedFocusAdvance,
    typeof IgnoredMouseClick,
    typeof SuppressedSpaceScroll,
    typeof AdvancedTransitionFrame,
    typeof EndedTransition,
    typeof DetectedButtonMovement,
    typeof PressedPointerOnButton,
    typeof ReleasedPointerOnItems,
  ]
> = S.Union(
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
  CompletedItemsFocus,
  CompletedButtonFocus,
  CompletedScrollLock,
  CompletedScrollUnlock,
  CompletedInertSetup,
  CompletedInertTeardown,
  CompletedScrollIntoView,
  CompletedItemClick,
  CompletedFocusAdvance,
  IgnoredMouseClick,
  SuppressedSpaceScroll,
  AdvancedTransitionFrame,
  EndedTransition,
  DetectedButtonMovement,
  PressedPointerOnButton,
  ReleasedPointerOnItems,
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
export type IgnoredMouseClick = typeof IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof SuppressedSpaceScroll.Type
export type AdvancedTransitionFrame = typeof AdvancedTransitionFrame.Type
export type EndedTransition = typeof EndedTransition.Type
export type DetectedButtonMovement = typeof DetectedButtonMovement.Type
export type PressedPointerOnButton = typeof PressedPointerOnButton.Type
export type ReleasedPointerOnItems = typeof ReleasedPointerOnItems.Type

export type Message = typeof Message.Type

// INIT

const SEARCH_DEBOUNCE_MILLISECONDS = 350
const LEFT_MOUSE_BUTTON = 0
const POINTER_HOLD_THRESHOLD_MILLISECONDS = 200
const POINTER_MOVEMENT_THRESHOLD_PIXELS = 5

/** Configuration for creating a menu model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
}>

/** Creates an initial menu model from a config. Defaults to closed with no active item. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  transitionState: 'Idle',
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  searchQuery: '',
  searchVersion: 0,
  maybeLastPointerPosition: Option.none(),
  maybeLastButtonPointerType: Option.none(),
  maybePointerOrigin: Option.none(),
})

// UPDATE

const closedModel = (model: Model): Model =>
  evo(model, {
    isOpen: () => false,
    transitionState: () => (model.isAnimated ? 'LeaveStart' : 'Idle'),
    maybeActiveItemIndex: () => Option.none(),
    activationTrigger: () => 'Keyboard',
    searchQuery: () => '',
    searchVersion: () => 0,
    maybeLastPointerPosition: () => Option.none(),
    maybeLastButtonPointerType: () => Option.none(),
    maybePointerOrigin: () => Option.none(),
  })

const buttonSelector = (id: string): string => `#${id}-button`
const itemsSelector = (id: string): string => `#${id}-items`
const itemSelector = (id: string, index: number): string =>
  `#${id}-item-${index}`

type UpdateReturn = [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Processes a menu message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeNextFrame = OptionExt.when(
    model.isAnimated,
    Task.nextFrame.pipe(
      Effect.as(AdvancedTransitionFrame()),
      Command.make('RequestFrame'),
    ),
  )

  const maybeLockScroll = OptionExt.when(
    model.isModal,
    Task.lockScroll.pipe(
      Effect.as(CompletedScrollLock()),
      Command.make('LockScroll'),
    ),
  )

  const maybeUnlockScroll = OptionExt.when(
    model.isModal,
    Task.unlockScroll.pipe(
      Effect.as(CompletedScrollUnlock()),
      Command.make('UnlockScroll'),
    ),
  )

  const maybeInertOthers = OptionExt.when(
    model.isModal,
    Task.inertOthers(model.id, [
      buttonSelector(model.id),
      itemsSelector(model.id),
    ]).pipe(Effect.as(CompletedInertSetup()), Command.make('InertOthers')),
  )

  const maybeRestoreInert = OptionExt.when(
    model.isModal,
    Task.restoreInert(model.id).pipe(
      Effect.as(CompletedInertTeardown()),
      Command.make('RestoreInert'),
    ),
  )

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Opened: ({ maybeActiveItemIndex }) => {
        const nextModel = evo(model, {
          isOpen: () => true,
          transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
          maybeActiveItemIndex: () => maybeActiveItemIndex,
          activationTrigger: () =>
            Option.match(maybeActiveItemIndex, {
              onNone: () => 'Pointer',
              onSome: () => 'Keyboard',
            }),
          searchQuery: () => '',
          searchVersion: () => 0,
          maybeLastPointerPosition: () => Option.none(),
        })

        return [
          nextModel,
          pipe(
            Array.getSomes([maybeNextFrame, maybeLockScroll, maybeInertOthers]),
            Array.prepend(
              Task.focus(itemsSelector(model.id)).pipe(
                Effect.ignore,
                Effect.as(CompletedItemsFocus()),
                Command.make('FocusItems'),
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
          Array.prepend(
            Task.focus(buttonSelector(model.id)).pipe(
              Effect.ignore,
              Effect.as(CompletedButtonFocus()),
              Command.make('FocusButton'),
            ),
          ),
        ),
      ],

      ClosedByTab: () => [
        closedModel(model),
        Array.getSomes([maybeNextFrame, maybeUnlockScroll, maybeRestoreInert]),
      ],

      ActivatedItem: ({ index, activationTrigger }) => [
        evo(model, {
          maybeActiveItemIndex: () => Option.some(index),
          activationTrigger: () => activationTrigger,
        }),
        activationTrigger === 'Keyboard'
          ? [
              Task.scrollIntoView(itemSelector(model.id, index)).pipe(
                Effect.ignore,
                Effect.as(CompletedScrollIntoView()),
                Command.make('ScrollIntoView'),
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
          evo(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => 'Pointer',
            maybeLastPointerPosition: () => Option.some({ screenX, screenY }),
          }),
          [],
        ]
      },

      DeactivatedItem: () =>
        model.activationTrigger === 'Pointer'
          ? [evo(model, { maybeActiveItemIndex: () => Option.none() }), []]
          : [model, []],

      SelectedItem: () => [
        closedModel(model),
        pipe(
          Array.getSomes([
            maybeNextFrame,
            maybeUnlockScroll,
            maybeRestoreInert,
          ]),
          Array.prepend(
            Task.focus(buttonSelector(model.id)).pipe(
              Effect.ignore,
              Effect.as(CompletedButtonFocus()),
              Command.make('FocusButton'),
            ),
          ),
        ),
      ],

      RequestedItemClick: ({ index }) => [
        model,
        [
          Task.clickElement(itemSelector(model.id, index)).pipe(
            Effect.ignore,
            Effect.as(CompletedItemClick()),
            Command.make('ClickItem'),
          ),
        ],
      ],

      Searched: ({ key, maybeTargetIndex }) => {
        const nextSearchQuery = model.searchQuery + key
        const nextSearchVersion = model.searchVersion + 1

        return [
          evo(model, {
            searchQuery: () => nextSearchQuery,
            searchVersion: () => nextSearchVersion,
            maybeActiveItemIndex: () =>
              Option.orElse(maybeTargetIndex, () => model.maybeActiveItemIndex),
          }),
          [
            Task.delay(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
              Effect.as(ClearedSearch({ version: nextSearchVersion })),
              Command.make('DelayClearSearch'),
            ),
          ],
        ]
      },

      ClearedSearch: ({ version }) => {
        if (version !== model.searchVersion) {
          return [model, []]
        }

        return [evo(model, { searchQuery: () => '' }), []]
      },

      AdvancedTransitionFrame: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterStart', () => [
            evo(model, { transitionState: () => 'EnterAnimating' }),
            [
              Task.waitForTransitions(itemsSelector(model.id)).pipe(
                Effect.as(EndedTransition()),
                Command.make('WaitForTransitions'),
              ),
            ],
          ]),
          M.when('LeaveStart', () => [
            evo(model, { transitionState: () => 'LeaveAnimating' }),
            [
              Effect.raceFirst(
                Task.detectElementMovement(buttonSelector(model.id)).pipe(
                  Effect.as(DetectedButtonMovement()),
                ),
                Task.waitForTransitions(itemsSelector(model.id)).pipe(
                  Effect.as(EndedTransition()),
                ),
              ).pipe(Command.make('DetectMovementOrTransitionEnd')),
            ],
          ]),
          M.orElse(() => [model, []]),
        ),

      EndedTransition: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.whenOr('EnterAnimating', 'LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      DetectedButtonMovement: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      PressedPointerOnButton: ({
        pointerType,
        button,
        screenX,
        screenY,
        timeStamp,
      }) => {
        const withPointerType = evo(model, {
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
              Array.prepend(
                Task.focus(buttonSelector(model.id)).pipe(
                  Effect.ignore,
                  Effect.as(CompletedButtonFocus()),
                  Command.make('FocusButton'),
                ),
              ),
            ),
          ]
        }

        const nextModel = evo(withPointerType, {
          isOpen: () => true,
          transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
          maybeActiveItemIndex: () => Option.none(),
          activationTrigger: () => 'Pointer',
          searchQuery: () => '',
          searchVersion: () => 0,
          maybeLastPointerPosition: () => Option.none(),
          maybePointerOrigin: () =>
            Option.some({ screenX, screenY, timeStamp }),
        })

        return [
          nextModel,
          pipe(
            Array.getSomes([maybeNextFrame, maybeLockScroll, maybeInertOthers]),
            Array.prepend(
              Task.focus(itemsSelector(model.id)).pipe(
                Effect.ignore,
                Effect.as(CompletedItemsFocus()),
                Command.make('FocusItems'),
              ),
            ),
          ),
        ]
      },

      ReleasedPointerOnItems: ({ screenX, screenY, timeStamp }) => {
        const hasNoOrigin = Option.isNone(model.maybePointerOrigin)

        const hasNoActiveItem = Option.isNone(model.maybeActiveItemIndex)

        const isMovementBelowThreshold = Option.exists(
          model.maybePointerOrigin,
          origin =>
            Math.abs(screenX - origin.screenX) <
              POINTER_MOVEMENT_THRESHOLD_PIXELS &&
            Math.abs(screenY - origin.screenY) <
              POINTER_MOVEMENT_THRESHOLD_PIXELS,
        )

        const isHoldTimeBelowThreshold = Option.exists(
          model.maybePointerOrigin,
          origin =>
            timeStamp - origin.timeStamp < POINTER_HOLD_THRESHOLD_MILLISECONDS,
        )

        if (
          hasNoOrigin ||
          isMovementBelowThreshold ||
          isHoldTimeBelowThreshold ||
          hasNoActiveItem
        ) {
          return [model, []]
        }

        return [
          model,
          [
            Task.clickElement(
              itemSelector(model.id, model.maybeActiveItemIndex.value),
            ).pipe(
              Effect.ignore,
              Effect.as(CompletedItemClick()),
              Command.make('ClickItem'),
            ),
          ],
        ]
      },

      CompletedItemsFocus: () => [model, []],
      CompletedButtonFocus: () => [model, []],
      CompletedScrollLock: () => [model, []],
      CompletedScrollUnlock: () => [model, []],
      CompletedInertSetup: () => [model, []],
      CompletedInertTeardown: () => [model, []],
      CompletedScrollIntoView: () => [model, []],
      CompletedItemClick: () => [model, []],
      CompletedFocusAdvance: () => [model, []],
      IgnoredMouseClick: () => [model, []],
      SuppressedSpaceScroll: () => [model, []],
    }),
  )
}

// VIEW

/** Configuration for an individual menu item's appearance. */
export type ItemConfig = Readonly<{
  className?: string
  content: Html
}>

/** Configuration for a group heading rendered above a group of items. */
export type GroupHeading = Readonly<{
  content: Html
  className?: string
}>

/** Configuration for rendering a menu with `view`. */
export type ViewConfig<Message, Item extends string> = Readonly<{
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
      | ReleasedPointerOnItems
      | IgnoredMouseClick
      | SuppressedSpaceScroll,
  ) => Message
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{ isActive: boolean; isDisabled: boolean }>,
  ) => ItemConfig
  isItemDisabled?: (item: Item, index: number) => boolean
  itemToSearchText?: (item: Item, index: number) => string
  isButtonDisabled?: boolean
  buttonContent: Html
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<Attribute<Message>>
  itemsClassName?: string
  itemsAttributes?: ReadonlyArray<Attribute<Message>>
  itemsScrollClassName?: string
  itemsScrollAttributes?: ReadonlyArray<Attribute<Message>>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<Attribute<Message>>
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  groupAttributes?: ReadonlyArray<Attribute<Message>>
  separatorClassName?: string
  separatorAttributes?: ReadonlyArray<Attribute<Message>>
  anchor?: AnchorConfig
}>

export { groupContiguous, resolveTypeaheadMatch }

const itemId = (id: string, index: number): string => `${id}-item-${index}`

/** Renders a headless menu with typeahead search, keyboard navigation, and aria-activedescendant focus management. */
export const view = <Message, Item extends string>(
  config: ViewConfig<Message, Item>,
): Html => {
  const {
    div,
    AriaActiveDescendant,
    AriaControls,
    AriaDisabled,
    AriaExpanded,
    AriaHasPopup,
    AriaLabelledBy,
    Class,
    DataAttribute,
    Id,
    OnBlur,
    OnClick,
    OnDestroy,
    OnInsert,
    OnKeyDownPreventDefault,
    OnKeyUpPreventDefault,
    OnPointerDown,
    OnPointerLeave,
    OnPointerMove,
    OnPointerUp,
    Role,
    Style,
    Tabindex,
    Type,
    keyed,
  } = html<Message>()

  const {
    model: {
      id,
      isOpen,
      transitionState,
      maybeActiveItemIndex,
      searchQuery,
      maybeLastButtonPointerType,
    },
    toMessage,
    items,
    itemToConfig,
    isItemDisabled,
    itemToSearchText = (item: Item) => item,
    isButtonDisabled,
    buttonContent,
    buttonClassName,
    buttonAttributes = [],
    itemsClassName,
    itemsAttributes = [],
    itemsScrollClassName,
    itemsScrollAttributes = [],
    backdropClassName,
    backdropAttributes = [],
    className,
    attributes = [],
    itemGroupKey,
    groupToHeading,
    groupClassName,
    groupAttributes = [],
    separatorClassName,
    separatorAttributes = [],
    anchor,
  } = config

  const isLeaving =
    transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
  const isVisible = isOpen || isLeaving

  const transitionAttributes: ReadonlyArray<ReturnType<typeof DataAttribute>> =
    M.value(transitionState).pipe(
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

  const isDisabled = (index: number): boolean =>
    Predicate.isNotUndefined(isItemDisabled) &&
    pipe(
      items,
      Array.get(index),
      Option.exists(item => isItemDisabled(item, index)),
    )

  const firstEnabledIndex = findFirstEnabledIndex(
    items.length,
    0,
    isDisabled,
  )(0, 1)

  const lastEnabledIndex = findFirstEnabledIndex(
    items.length,
    0,
    isDisabled,
  )(items.length - 1, -1)

  const handleButtonKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.whenOr('Enter', ' ', 'ArrowDown', () =>
        Option.some(
          toMessage(
            Opened({
              maybeActiveItemIndex: Option.some(firstEnabledIndex),
            }),
          ),
        ),
      ),
      M.when('ArrowUp', () =>
        Option.some(
          toMessage(
            Opened({
              maybeActiveItemIndex: Option.some(lastEnabledIndex),
            }),
          ),
        ),
      ),
      M.orElse(() => Option.none()),
    )

  const handleButtonPointerDown = (
    pointerType: string,
    button: number,
    screenX: number,
    screenY: number,
    timeStamp: number,
  ): Option.Option<Message> =>
    Option.some(
      toMessage(
        PressedPointerOnButton({
          pointerType,
          button,
          screenX,
          screenY,
          timeStamp,
        }),
      ),
    )

  const handleButtonClick = (): Message => {
    const isMouse = Option.exists(
      maybeLastButtonPointerType,
      type => type === 'mouse',
    )

    if (isMouse) {
      return toMessage(IgnoredMouseClick())
    } else if (isOpen) {
      return toMessage(Closed())
    } else {
      return toMessage(Opened({ maybeActiveItemIndex: Option.none() }))
    }
  }

  const handleSpaceKeyUp = (key: string): Option.Option<Message> =>
    OptionExt.when(key === ' ', toMessage(SuppressedSpaceScroll()))

  const resolveActiveIndex = keyToIndex(
    'ArrowDown',
    'ArrowUp',
    items.length,
    Option.getOrElse(maybeActiveItemIndex, () => 0),
    isDisabled,
  )

  const searchForKey = (key: string): Option.Option<Message> => {
    const nextQuery = searchQuery + key
    const maybeTargetIndex = resolveTypeaheadMatch(
      items,
      nextQuery,
      maybeActiveItemIndex,
      isDisabled,
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
      M.whenOr(
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End',
        'PageUp',
        'PageDown',
        () =>
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

  const handleItemsPointerUp = (
    screenX: number,
    screenY: number,
    pointerType: string,
    timeStamp: number,
  ): Option.Option<Message> =>
    OptionExt.when(
      pointerType === 'mouse',
      toMessage(ReleasedPointerOnItems({ screenX, screenY, timeStamp })),
    )

  const resolvedButtonAttributes = [
    Id(`${id}-button`),
    Type('button'),
    AriaHasPopup('menu'),
    AriaExpanded(isVisible),
    AriaControls(`${id}-items`),
    ...(isButtonDisabled
      ? [AriaDisabled(true), DataAttribute('disabled', '')]
      : [
          OnPointerDown(handleButtonPointerDown),
          OnKeyDownPreventDefault(handleButtonKeyDown),
          OnKeyUpPreventDefault(handleSpaceKeyUp),
          OnClick(handleButtonClick()),
        ]),
    ...(isVisible ? [DataAttribute('open', '')] : []),
    ...(buttonClassName ? [Class(buttonClassName)] : []),
    ...buttonAttributes,
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
    Role('menu'),
    AriaLabelledBy(`${id}-button`),
    ...maybeActiveDescendant,
    Tabindex(0),
    ...anchorAttributes,
    ...transitionAttributes,
    ...(isLeaving
      ? []
      : [
          OnKeyDownPreventDefault(handleItemsKeyDown),
          OnKeyUpPreventDefault(handleSpaceKeyUp),
          OnPointerUp(handleItemsPointerUp),
          OnBlur(toMessage(ClosedByTab())),
        ]),
    ...(itemsClassName ? [Class(itemsClassName)] : []),
    ...itemsAttributes,
  ]

  const menuItems = Array.map(items, (item, index) => {
    const isActiveItem = Option.exists(
      maybeActiveItemIndex,
      activeIndex => activeIndex === index,
    )
    const isDisabledItem = isDisabled(index)
    const itemConfig = itemToConfig(item, {
      isActive: isActiveItem,
      isDisabled: isDisabledItem,
    })

    const isInteractive = !isDisabledItem && !isLeaving

    return keyed('div')(
      itemId(id, index),
      [
        Id(itemId(id, index)),
        Role('menuitem'),
        ...(isActiveItem ? [DataAttribute('active', '')] : []),
        ...(isDisabledItem
          ? [AriaDisabled(true), DataAttribute('disabled', '')]
          : []),
        ...(isInteractive
          ? [
              OnClick(toMessage(SelectedItem({ index }))),
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
        ...(itemConfig.className ? [Class(itemConfig.className)] : []),
      ],
      [itemConfig.content],
    )
  })

  const renderGroupedItems = (): ReadonlyArray<Html> => {
    if (!itemGroupKey) {
      return menuItems
    }

    const segments = groupContiguous(menuItems, (_, index) =>
      Array.get(items, index).pipe(
        Option.match({
          onNone: () => '',
          onSome: item => itemGroupKey(item, index),
        }),
      ),
    )

    return Array.flatMap(segments, (segment, segmentIndex) => {
      const maybeHeading = Option.fromNullable(
        groupToHeading && groupToHeading(segment.key),
      )

      const headingId = `${id}-heading-${segment.key}`

      const headingElement = Option.match(maybeHeading, {
        onNone: () => [],
        onSome: heading => [
          keyed('div')(
            headingId,
            [
              Id(headingId),
              Role('presentation'),
              ...(heading.className ? [Class(heading.className)] : []),
            ],
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
          ...groupAttributes,
        ],
        groupContent,
      )

      const separator =
        segmentIndex > 0 &&
        (separatorClassName ||
          Array.isNonEmptyReadonlyArray(separatorAttributes))
          ? [
              keyed('div')(
                `${id}-separator-${segmentIndex}`,
                [
                  Role('separator'),
                  ...(separatorClassName ? [Class(separatorClassName)] : []),
                  ...separatorAttributes,
                ],
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
      ...(isLeaving ? [] : [OnClick(toMessage(Closed()))]),
      ...(backdropClassName ? [Class(backdropClassName)] : []),
      ...backdropAttributes,
    ],
    [],
  )

  const renderedItems = renderGroupedItems()

  const scrollableItems =
    itemsScrollClassName || Array.isNonEmptyReadonlyArray(itemsScrollAttributes)
      ? [
          div(
            [
              ...(itemsScrollClassName ? [Class(itemsScrollClassName)] : []),
              ...itemsScrollAttributes,
            ],
            renderedItems,
          ),
        ]
      : renderedItems

  const visibleContent = [
    backdrop,
    keyed('div')(
      `${id}-items-container`,
      itemsContainerAttributes,
      scrollableItems,
    ),
  ]

  const wrapperAttributes = [
    ...(className ? [Class(className)] : []),
    ...attributes,
    ...(isVisible ? [DataAttribute('open', '')] : []),
  ]

  return div(wrapperAttributes, [
    keyed('button')(`${id}-button`, resolvedButtonAttributes, [buttonContent]),
    ...(isVisible ? visibleContent : []),
  ])
}

/** Creates a memoized menu view. Static config is captured in a closure;
 *  only `model` and `toMessage` are compared per render via `createLazy`. */
export const lazy = <Message, Item extends string>(
  staticConfig: Omit<ViewConfig<Message, Item>, 'model' | 'toMessage'>,
): ((
  model: Model,
  toMessage: ViewConfig<Message, Item>['toMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message, Item>['toMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toMessage: currentToMessage,
        }),
      [model, toMessage],
    )
}

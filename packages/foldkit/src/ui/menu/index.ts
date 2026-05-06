import {
  Array,
  Effect,
  Equal,
  Function,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  String as Str,
  pipe,
} from 'effect'

import * as Command from '../../command/index.js'
import { OptionExt } from '../../effectExtensions/index.js'
import {
  type Attribute,
  type Html,
  type MountResult,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { evo } from '../../struct/index.js'
import * as Task from '../../task/index.js'
import { anchorSetup, portalToBody } from '../anchor.js'
import type { AnchorConfig } from '../anchor.js'
// NOTE: Animation imports are split across schema + update to avoid a circular
// dependency: animation → html → runtime → devtools → menu → animation.
// The barrel (../animation) imports from html, which starts the cycle.
import {
  EndedAnimation as AnimationEndedAnimation,
  Hid as AnimationHid,
  Message as AnimationMessage,
  Model as AnimationModel,
  type OutMessage as AnimationOutMessage,
  Showed as AnimationShowed,
  init as animationInit,
} from '../animation/schema.js'
import { update as animationUpdate } from '../animation/update.js'
import { groupContiguous } from '../group.js'
import {
  findFirstEnabledIndex,
  isPrintableKey,
  keyToIndex,
} from '../keyboard.js'
import { resolveTypeaheadMatch } from '../typeahead.js'

// MODEL

/** Schema for the activation trigger — whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literals(['Pointer', 'Keyboard'])
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
  animation: AnimationModel,
  maybeActiveItemIndex: S.Option(S.Number),
  activationTrigger: ActivationTrigger,
  searchQuery: S.String,
  searchVersion: S.Number,
  maybeLastPointerPosition: S.Option(
    S.Struct({ screenX: S.Number, screenY: S.Number }),
  ),
  maybeLastButtonPointerType: S.Option(S.String),
  maybePointerOrigin: S.Option(PointerOrigin),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the menu opens via button click or keyboard. Contains an optional initial active item index — None for pointer, Some for keyboard. */
export const Opened = m('Opened', {
  maybeActiveItemIndex: S.Option(S.Number),
})
/** Sent when the menu closes via Escape key or backdrop click. */
export const Closed = m('Closed')
/** Sent when the menu items container loses focus. */
export const BlurredItems = m('BlurredItems')
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
  maybeTargetIndex: S.Option(S.Number),
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
export const CompletedFocusItems = m('CompletedFocusItems')
/** Sent when the focus-button command completes after closing or selecting. */
export const CompletedFocusButton = m('CompletedFocusButton')
/** Sent when the scroll lock command completes. */
export const CompletedLockScroll = m('CompletedLockScroll')
/** Sent when the scroll unlock command completes. */
export const CompletedUnlockScroll = m('CompletedUnlockScroll')
/** Sent when the inert-others command completes. */
export const CompletedSetupInert = m('CompletedSetupInert')
/** Sent when the restore-inert command completes. */
export const CompletedTeardownInert = m('CompletedTeardownInert')
/** Sent when the scroll-into-view command completes after keyboard activation. */
export const CompletedScrollIntoView = m('CompletedScrollIntoView')
/** Sent when the programmatic click command completes. */
export const CompletedClickItem = m('CompletedClickItem')
/** Sent when the advance-focus command completes. */
export const CompletedAdvanceFocus = m('CompletedAdvanceFocus')
/** Sent when a mouse click on the button is ignored because pointer-down already handled the toggle. */
export const IgnoredMouseClick = m('IgnoredMouseClick')
/** Sent when a Space key-up is captured to prevent page scrolling. */
export const SuppressedSpaceScroll = m('SuppressedSpaceScroll')
/** Sent when the menu items panel mounts and Floating UI has positioned it. Update no-ops; the side effect is the act of positioning, surfaced for DevTools observability. */
export const CompletedAnchorMount = m('CompletedAnchorMount')
/** Sent when the menu items panel mounts and the no-anchor focus fallback runs. Update no-ops; the side effect is the focus call, surfaced for DevTools observability. */
export const CompletedFocusItemsOnMount = m('CompletedFocusItemsOnMount')
/** Sent when the menu backdrop mounts and is portaled to the document body. Update no-ops; surfaces the portal side effect for DevTools. */
export const CompletedBackdropPortal = m('CompletedBackdropPortal')
/** Wraps an Animation submodel message for delegation. */
export const GotAnimationMessage = m('GotAnimationMessage', {
  message: AnimationMessage,
})
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
    typeof BlurredItems,
    typeof ActivatedItem,
    typeof DeactivatedItem,
    typeof SelectedItem,
    typeof MovedPointerOverItem,
    typeof RequestedItemClick,
    typeof Searched,
    typeof ClearedSearch,
    typeof CompletedFocusItems,
    typeof CompletedFocusButton,
    typeof CompletedLockScroll,
    typeof CompletedUnlockScroll,
    typeof CompletedSetupInert,
    typeof CompletedTeardownInert,
    typeof CompletedScrollIntoView,
    typeof CompletedClickItem,
    typeof CompletedAdvanceFocus,
    typeof IgnoredMouseClick,
    typeof SuppressedSpaceScroll,
    typeof CompletedAnchorMount,
    typeof CompletedFocusItemsOnMount,
    typeof CompletedBackdropPortal,
    typeof GotAnimationMessage,
    typeof PressedPointerOnButton,
    typeof ReleasedPointerOnItems,
  ]
> = S.Union([
  Opened,
  Closed,
  BlurredItems,
  ActivatedItem,
  DeactivatedItem,
  SelectedItem,
  MovedPointerOverItem,
  RequestedItemClick,
  Searched,
  ClearedSearch,
  CompletedFocusItems,
  CompletedFocusButton,
  CompletedLockScroll,
  CompletedUnlockScroll,
  CompletedSetupInert,
  CompletedTeardownInert,
  CompletedScrollIntoView,
  CompletedClickItem,
  CompletedAdvanceFocus,
  IgnoredMouseClick,
  SuppressedSpaceScroll,
  CompletedAnchorMount,
  CompletedFocusItemsOnMount,
  CompletedBackdropPortal,
  GotAnimationMessage,
  PressedPointerOnButton,
  ReleasedPointerOnItems,
])

export type Message = typeof Message.Type

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type BlurredItems = typeof BlurredItems.Type
export type ActivatedItem = typeof ActivatedItem.Type
export type DeactivatedItem = typeof DeactivatedItem.Type
export type SelectedItem = typeof SelectedItem.Type
export type MovedPointerOverItem = typeof MovedPointerOverItem.Type
export type RequestedItemClick = typeof RequestedItemClick.Type
export type Searched = typeof Searched.Type
export type ClearedSearch = typeof ClearedSearch.Type
export type IgnoredMouseClick = typeof IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof SuppressedSpaceScroll.Type
export type PressedPointerOnButton = typeof PressedPointerOnButton.Type
export type ReleasedPointerOnItems = typeof ReleasedPointerOnItems.Type

// INIT

const SEARCH_DEBOUNCE_MILLISECONDS = 350
const LEFT_MOUSE_BUTTON = 0
const POINTER_HOLD_THRESHOLD_MILLISECONDS = 200
const POINTER_MOVEMENT_THRESHOLD_PIXELS = 5

/** Configuration for creating a menu model with `init`. `isAnimated` enables animation coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
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
  animation: animationInit({ id: `${config.id}-items` }),
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
    maybeActiveItemIndex: () => Option.none(),
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

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Prevents page scrolling while the menu is open. */
export const LockScroll = Command.define('LockScroll', CompletedLockScroll)
/** Re-enables page scrolling after the menu closes. */
export const UnlockScroll = Command.define(
  'UnlockScroll',
  CompletedUnlockScroll,
)
/** Marks all elements outside the menu as inert for modal behavior. */
export const InertOthers = Command.define('InertOthers', CompletedSetupInert)
/** Removes the inert attribute from elements outside the menu. */
export const RestoreInert = Command.define(
  'RestoreInert',
  CompletedTeardownInert,
)
/** Moves focus to the menu items container after opening. */
export const FocusItems = Command.define('FocusItems', CompletedFocusItems)
/** Moves focus back to the menu button after closing. */
export const FocusButton = Command.define('FocusButton', CompletedFocusButton)
/** Scrolls the active menu item into view after keyboard navigation. */
export const ScrollIntoView = Command.define(
  'ScrollIntoView',
  CompletedScrollIntoView,
)
/** Programmatically clicks the active menu item's DOM element. */
export const ClickItem = Command.define('ClickItem', CompletedClickItem)
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearSearch = Command.define(
  'DelayClearSearch',
  ClearedSearch,
)
/** Detects whether the menu button moved or the leave animation ended — whichever comes first. Both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  GotAnimationMessage,
)

const delegateToAnimation = (
  model: Model,
  animationMessage: AnimationMessage,
): UpdateReturn => {
  const [nextAnimation, animationCommands, maybeOutMessage] = animationUpdate(
    model.animation,
    animationMessage,
  )

  const mappedCommands = animationCommands.map(
    Command.mapEffect(Effect.map(message => GotAnimationMessage({ message }))),
  )

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<AnimationOutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          DetectMovementOrAnimationEnd(
            Effect.raceFirst(
              Task.detectElementMovement(buttonSelector(model.id)).pipe(
                Effect.as(
                  GotAnimationMessage({
                    message: AnimationEndedAnimation(),
                  }),
                ),
              ),
              Task.waitForAnimationSettled(itemsSelector(model.id)).pipe(
                Effect.as(
                  GotAnimationMessage({
                    message: AnimationEndedAnimation(),
                  }),
                ),
              ),
            ),
          ),
        ],
        TransitionedOut: () => [],
      }),
    ),
  })

  return [
    evo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...additionalCommands],
  ]
}

/** Processes a menu message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeLockScroll = OptionExt.when(
    model.isModal,
    LockScroll(Task.lockScroll.pipe(Effect.as(CompletedLockScroll()))),
  )

  const maybeUnlockScroll = OptionExt.when(
    model.isModal,
    UnlockScroll(Task.unlockScroll.pipe(Effect.as(CompletedUnlockScroll()))),
  )

  const maybeInertOthers = OptionExt.when(
    model.isModal,
    InertOthers(
      Task.inertOthers(model.id, [
        buttonSelector(model.id),
        itemsSelector(model.id),
      ]).pipe(Effect.as(CompletedSetupInert())),
    ),
  )

  const maybeRestoreInert = OptionExt.when(
    model.isModal,
    RestoreInert(
      Task.restoreInert(model.id).pipe(Effect.as(CompletedTeardownInert())),
    ),
  )

  const focusButton = FocusButton(
    Task.focus(buttonSelector(model.id)).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusButton()),
    ),
  )

  const openCommands = Array.getSomes([maybeLockScroll, maybeInertOthers])

  const closeWithFocusCommands = [
    focusButton,
    ...Array.getSomes([maybeUnlockScroll, maybeRestoreInert]),
  ]

  const closeWithoutFocusCommands = Array.getSomes([
    maybeUnlockScroll,
    maybeRestoreInert,
  ])

  const openMenu = (baseModel: Model): UpdateReturn => {
    if (model.isAnimated) {
      const [nextModel, animationCommands] = delegateToAnimation(
        baseModel,
        AnimationShowed(),
      )
      return [
        evo(nextModel, { isOpen: () => true }),
        [...openCommands, ...animationCommands],
      ]
    }

    return [evo(baseModel, { isOpen: () => true }), openCommands]
  }

  const closeMenu = (
    baseModel: Model,
    commands: ReadonlyArray<Command.Command<Message>>,
  ): UpdateReturn => {
    const closed = closedModel(baseModel)

    if (model.isAnimated) {
      const [nextModel, animationCommands] = delegateToAnimation(
        closed,
        AnimationHid(),
      )
      return [nextModel, [...commands, ...animationCommands]]
    }

    return [closed, commands]
  }

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Opened: ({ maybeActiveItemIndex }) =>
        openMenu(
          evo(model, {
            maybeActiveItemIndex: () => maybeActiveItemIndex,
            activationTrigger: () =>
              Option.match(maybeActiveItemIndex, {
                onNone: () => 'Pointer',
                onSome: () => 'Keyboard',
              }),
            searchQuery: () => '',
            searchVersion: () => 0,
            maybeLastPointerPosition: () => Option.none(),
          }),
        ),

      Closed: () => closeMenu(model, closeWithFocusCommands),

      BlurredItems: () => {
        if (
          Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
        ) {
          return [model, []]
        }

        return closeMenu(model, closeWithoutFocusCommands)
      },

      ActivatedItem: ({ index, activationTrigger }) => [
        evo(model, {
          maybeActiveItemIndex: () => Option.some(index),
          activationTrigger: () => activationTrigger,
        }),
        activationTrigger === 'Keyboard'
          ? [
              ScrollIntoView(
                Task.scrollIntoView(itemSelector(model.id, index)).pipe(
                  Effect.ignore,
                  Effect.as(CompletedScrollIntoView()),
                ),
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

      SelectedItem: () => closeMenu(model, closeWithFocusCommands),

      RequestedItemClick: ({ index }) => [
        model,
        [
          ClickItem(
            Task.clickElement(itemSelector(model.id, index)).pipe(
              Effect.ignore,
              Effect.as(CompletedClickItem()),
            ),
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
            DelayClearSearch(
              Task.delay(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
                Effect.as(ClearedSearch({ version: nextSearchVersion })),
              ),
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

      GotAnimationMessage: ({ message: animationMessage }) =>
        delegateToAnimation(model, animationMessage),

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
          const [closed, commands] = closeMenu(
            withPointerType,
            closeWithFocusCommands,
          )
          return [
            evo(closed, {
              maybeLastButtonPointerType: () => Option.some(pointerType),
            }),
            commands,
          ]
        }

        return openMenu(
          evo(withPointerType, {
            maybeActiveItemIndex: () => Option.none(),
            activationTrigger: () => 'Pointer',
            searchQuery: () => '',
            searchVersion: () => 0,
            maybeLastPointerPosition: () => Option.none(),
            maybePointerOrigin: () =>
              Option.some({ screenX, screenY, timeStamp }),
          }),
        )
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
            ClickItem(
              Task.clickElement(
                itemSelector(model.id, model.maybeActiveItemIndex.value),
              ).pipe(Effect.ignore, Effect.as(CompletedClickItem())),
            ),
          ],
        ]
      },

      CompletedFocusItems: () => [model, []],
      CompletedFocusButton: () => [model, []],
      CompletedLockScroll: () => [model, []],
      CompletedUnlockScroll: () => [model, []],
      CompletedSetupInert: () => [model, []],
      CompletedTeardownInert: () => [model, []],
      CompletedScrollIntoView: () => [model, []],
      CompletedClickItem: () => [model, []],
      CompletedAdvanceFocus: () => [model, []],
      IgnoredMouseClick: () => [
        evo(model, { maybeLastButtonPointerType: () => Option.none() }),
        [],
      ],
      SuppressedSpaceScroll: () => [model, []],
      CompletedAnchorMount: () => [model, []],
      CompletedFocusItemsOnMount: () => [model, []],
      CompletedBackdropPortal: () => [model, []],
    }),
  )
}

const MenuAnchor = Mount.define('MenuAnchor', CompletedAnchorMount)
const MenuFocusItemsOnMount = Mount.define(
  'MenuFocusItemsOnMount',
  CompletedFocusItemsOnMount,
)
const MenuBackdropPortal = Mount.define(
  'MenuBackdropPortal',
  CompletedBackdropPortal,
)

const focusItemsOnMount = MenuFocusItemsOnMount(
  (
    element,
  ): Effect.Effect<MountResult<typeof CompletedFocusItemsOnMount.Type>> =>
    Effect.sync(() => {
      if (element instanceof HTMLElement) {
        element.focus()
      }
      return {
        message: CompletedFocusItemsOnMount(),
        cleanup: Function.constVoid,
      }
    }),
)

const portalBackdropOnMount = MenuBackdropPortal(
  (element): Effect.Effect<MountResult<typeof CompletedBackdropPortal.Type>> =>
    Effect.sync(() => ({
      message: CompletedBackdropPortal(),
      cleanup: portalToBody(element),
    })),
)

/** Programmatically opens the menu, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the menu. */
export const open = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the menu, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to close the menu. */
export const close = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Closed())

/** Programmatically selects a menu item at the given index, closing the menu and returning
 *  focus commands. Use this in domain-event handlers when the menu uses `onSelectedItem`. */
export const selectItem = (
  model: Model,
  index: number,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, SelectedItem({ index }))

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
export type ViewConfig<ParentMessage, Item extends string> = Readonly<{
  model: Model
  toParentMessage: (
    message:
      | Opened
      | Closed
      | BlurredItems
      | ActivatedItem
      | DeactivatedItem
      | SelectedItem
      | MovedPointerOverItem
      | RequestedItemClick
      | Searched
      | PressedPointerOnButton
      | ReleasedPointerOnItems
      | IgnoredMouseClick
      | SuppressedSpaceScroll
      | typeof CompletedAnchorMount.Type
      | typeof CompletedFocusItemsOnMount.Type
      | typeof CompletedBackdropPortal.Type,
  ) => ParentMessage
  onSelectedItem?: (index: number) => ParentMessage
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
  buttonAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  itemsClassName?: string
  itemsAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  itemsScrollClassName?: string
  itemsScrollAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  className?: string
  attributes?: ReadonlyArray<Attribute<ParentMessage>>
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  groupAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  separatorClassName?: string
  separatorAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  anchor?: AnchorConfig
}>

export { groupContiguous, resolveTypeaheadMatch }

const itemId = (id: string, index: number): string => `${id}-item-${index}`

/** Renders a headless menu with typeahead search, keyboard navigation, and aria-activedescendant focus management. */
export const view = <ParentMessage, Item extends string>(
  config: ViewConfig<ParentMessage, Item>,
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
    OnKeyDownPreventDefault,
    OnKeyUpPreventDefault,
    OnMount,
    OnPointerDown,
    OnPointerLeave,
    OnPointerMove,
    OnPointerUp,
    Role,
    Style,
    Tabindex,
    Type,
    keyed,
  } = html<ParentMessage>()

  const {
    model: {
      id,
      isOpen,
      animation: { transitionState },
      maybeActiveItemIndex,
      searchQuery,
      maybeLastButtonPointerType,
    },
    toParentMessage,
    onSelectedItem,
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

  const dispatchSelectedItem = (index: number): ParentMessage =>
    onSelectedItem
      ? onSelectedItem(index)
      : toParentMessage(SelectedItem({ index }))

  const isLeaving =
    transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
  const isVisible = isOpen || isLeaving

  const animationAttributes: ReadonlyArray<ReturnType<typeof DataAttribute>> =
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

  const handleButtonKeyDown = (key: string): Option.Option<ParentMessage> => {
    if (isOpen) {
      return handleItemsKeyDown(key)
    }

    return M.value(key).pipe(
      M.whenOr('Enter', ' ', 'ArrowDown', () =>
        Option.some(
          toParentMessage(
            Opened({
              maybeActiveItemIndex: Option.some(firstEnabledIndex),
            }),
          ),
        ),
      ),
      M.when('ArrowUp', () =>
        Option.some(
          toParentMessage(
            Opened({
              maybeActiveItemIndex: Option.some(lastEnabledIndex),
            }),
          ),
        ),
      ),
      M.orElse(() => Option.none()),
    )
  }

  const handleButtonPointerDown = (
    pointerType: string,
    button: number,
    screenX: number,
    screenY: number,
    timeStamp: number,
  ): Option.Option<ParentMessage> =>
    Option.some(
      toParentMessage(
        PressedPointerOnButton({
          pointerType,
          button,
          screenX,
          screenY,
          timeStamp,
        }),
      ),
    )

  const handleButtonClick = (): ParentMessage => {
    const isMouse = Option.exists(
      maybeLastButtonPointerType,
      type => type === 'mouse',
    )

    if (isMouse) {
      return toParentMessage(IgnoredMouseClick())
    } else if (isOpen) {
      return toParentMessage(Closed())
    } else {
      return toParentMessage(Opened({ maybeActiveItemIndex: Option.none() }))
    }
  }

  const handleSpaceKeyUp = (key: string): Option.Option<ParentMessage> =>
    OptionExt.when(key === ' ', toParentMessage(SuppressedSpaceScroll()))

  const resolveActiveIndex = keyToIndex(
    'ArrowDown',
    'ArrowUp',
    items.length,
    Option.getOrElse(maybeActiveItemIndex, () => 0),
    isDisabled,
  )

  const searchForKey = (key: string): Option.Option<ParentMessage> => {
    const nextQuery = searchQuery + key
    const maybeTargetIndex = resolveTypeaheadMatch(
      items,
      nextQuery,
      maybeActiveItemIndex,
      isDisabled,
      itemToSearchText,
      Str.isNonEmpty(searchQuery),
    )
    return Option.some(toParentMessage(Searched({ key, maybeTargetIndex })))
  }

  const handleItemsKeyDown = (key: string): Option.Option<ParentMessage> =>
    M.value(key).pipe(
      M.when('Escape', () => Option.some(toParentMessage(Closed()))),
      M.when('Enter', () =>
        Option.map(maybeActiveItemIndex, index =>
          toParentMessage(RequestedItemClick({ index })),
        ),
      ),
      M.when(' ', () =>
        Str.isNonEmpty(searchQuery)
          ? searchForKey(' ')
          : Option.map(maybeActiveItemIndex, index =>
              toParentMessage(RequestedItemClick({ index })),
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
            toParentMessage(
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
  ): Option.Option<ParentMessage> =>
    OptionExt.when(
      pointerType === 'mouse',
      toParentMessage(ReleasedPointerOnItems({ screenX, screenY, timeStamp })),
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
    ...(isVisible
      ? [
          DataAttribute('open', ''),
          Style({ position: 'relative', zIndex: '1' }),
        ]
      : []),
    ...(buttonClassName ? [Class(buttonClassName)] : []),
    ...buttonAttributes,
  ]

  const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
    onNone: () => [],
    onSome: index => [AriaActiveDescendant(itemId(id, index))],
  })

  const anchorAttributes = anchor
    ? [
        Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
        OnMount(
          Mount.mapMessage(
            MenuAnchor(
              (
                items,
              ): Effect.Effect<MountResult<typeof CompletedAnchorMount.Type>> =>
                Effect.sync(() => ({
                  message: CompletedAnchorMount(),
                  cleanup: anchorSetup({
                    buttonId: `${id}-button`,
                    anchor,
                    focusAfterPosition: true,
                  })(items),
                })),
            ),
            toParentMessage,
          ),
        ),
      ]
    : [OnMount(Mount.mapMessage(focusItemsOnMount, toParentMessage))]

  const itemsContainerAttributes = [
    Id(`${id}-items`),
    Role('menu'),
    AriaLabelledBy(`${id}-button`),
    ...maybeActiveDescendant,
    Tabindex(0),
    ...anchorAttributes,
    ...animationAttributes,
    ...(isLeaving
      ? []
      : [
          OnKeyDownPreventDefault(handleItemsKeyDown),
          OnKeyUpPreventDefault(handleSpaceKeyUp),
          OnPointerUp(handleItemsPointerUp),
          OnBlur(toParentMessage(BlurredItems())),
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
              OnClick(dispatchSelectedItem(index)),
              ...(isActiveItem
                ? []
                : [
                    OnPointerMove((screenX, screenY, pointerType) =>
                      OptionExt.when(
                        pointerType !== 'touch',
                        toParentMessage(
                          MovedPointerOverItem({ index, screenX, screenY }),
                        ),
                      ),
                    ),
                  ]),
              OnPointerLeave(pointerType =>
                OptionExt.when(
                  pointerType !== 'touch',
                  toParentMessage(DeactivatedItem()),
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
      const maybeHeading = Option.fromNullishOr(
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
          Array.isReadonlyArrayNonEmpty(separatorAttributes))
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
      OnMount(Mount.mapMessage(portalBackdropOnMount, toParentMessage)),
      ...(isLeaving ? [] : [OnClick(toParentMessage(Closed()))]),
      ...(backdropClassName ? [Class(backdropClassName)] : []),
      ...backdropAttributes,
    ],
    [],
  )

  const renderedItems = renderGroupedItems()

  const scrollableItems =
    itemsScrollClassName || Array.isReadonlyArrayNonEmpty(itemsScrollAttributes)
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
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <ParentMessage, Item extends string>(
  staticConfig: Omit<
    ViewConfig<ParentMessage, Item>,
    'model' | 'toParentMessage' | 'onSelectedItem'
  >,
): ((
  model: Model,
  toParentMessage: ViewConfig<ParentMessage, Item>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToParentMessage: ViewConfig<
          ParentMessage,
          Item
        >['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToParentMessage,
        }),
      [model, toParentMessage],
    )
}

import {
  Array,
  Effect,
  Equal,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  String as Str,
  pipe,
} from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import { OptionExt } from '../../effectExtensions/index.js'
import {
  type ChildAttribute,
  type Html,
  type SubmodelView,
  defineView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { evo } from '../../struct/index.js'
import { AnchorConfig, anchorSetup, portalToBody } from '../anchor.js'
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

/** Schema for the activation trigger: whether the user interacted via mouse or keyboard. */
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

/** Sent when the menu opens via button click or keyboard. Contains an optional initial active item index: None for pointer, Some for keyboard. */
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
export const SelectedItem = m('SelectedItem', {
  index: S.Number,
  item: S.String,
})
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
export const CompletedInertOthers = m('CompletedInertOthers')
/** Sent when the restore-inert command completes. */
export const CompletedRestoreInert = m('CompletedRestoreInert')
/** Sent when the scroll-into-view command completes after keyboard activation. */
export const CompletedScrollIntoView = m('CompletedScrollIntoView')
/** Sent when the programmatic click command completes. */
export const CompletedClickItem = m('CompletedClickItem')
/** Sent when a mouse click on the button is ignored because pointer-down already handled the toggle. */
export const IgnoredMouseClick = m('IgnoredMouseClick')
/** Sent when a Space key-up is captured to prevent page scrolling. */
export const SuppressedSpaceScroll = m('SuppressedSpaceScroll')
/** Sent when the menu items panel mounts and Floating UI has positioned it. Update no-ops; the side effect is the act of positioning, surfaced for DevTools observability. */
export const CompletedAnchorMenu = m('CompletedAnchorMenu')
/** Sent when the menu backdrop mounts and is portaled to the document body. Update no-ops; surfaces the portal side effect for DevTools. */
export const CompletedPortalMenuBackdrop = m('CompletedPortalMenuBackdrop')
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
    typeof CompletedInertOthers,
    typeof CompletedRestoreInert,
    typeof CompletedScrollIntoView,
    typeof CompletedClickItem,
    typeof IgnoredMouseClick,
    typeof SuppressedSpaceScroll,
    typeof CompletedAnchorMenu,
    typeof CompletedPortalMenuBackdrop,
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
  CompletedInertOthers,
  CompletedRestoreInert,
  CompletedScrollIntoView,
  CompletedClickItem,
  IgnoredMouseClick,
  SuppressedSpaceScroll,
  CompletedAnchorMenu,
  CompletedPortalMenuBackdrop,
  GotAnimationMessage,
  PressedPointerOnButton,
  ReleasedPointerOnItems,
])

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent when a menu item is selected. Carries both the selected value (from the `viewInputs.items` array supplied at view time) and its index. The menu has already closed when this fires; the parent does not need to dispatch `Ui.Menu.close`. */
export const Selected = m('Selected', {
  value: S.String,
  index: S.Number,
})

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
}>

/** Union of out-messages the menu component can produce. Surfaced as the third element of `update`'s return tuple and pattern-matched by the parent. */
export const OutMessage = S.Union([Selected])

/** Generic over `Value extends string` so consumers using the typed
 *  `Ui.Menu.create<MyUnion>()` factory receive `value: MyUnion` in the
 *  `Selected` OutMessage. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

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

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Prevents page scrolling while the menu is open. */
export const LockScroll = Command.define(
  'LockScroll',
  CompletedLockScroll,
)(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())))
/** Re-enables page scrolling after the menu closes. */
export const UnlockScroll = Command.define(
  'UnlockScroll',
  CompletedUnlockScroll,
)(Dom.unlockScroll.pipe(Effect.as(CompletedUnlockScroll())))
/** Marks all elements outside the menu as inert for modal behavior. */
export const InertOthers = Command.define(
  'InertOthers',
  { id: S.String },
  CompletedInertOthers,
)(({ id }) =>
  Dom.inertOthers(id, [buttonSelector(id), itemsSelector(id)]).pipe(
    Effect.as(CompletedInertOthers()),
  ),
)
/** Removes the inert attribute from elements outside the menu. */
export const RestoreInert = Command.define(
  'RestoreInert',
  { id: S.String },
  CompletedRestoreInert,
)(({ id }) => Dom.restoreInert(id).pipe(Effect.as(CompletedRestoreInert())))
/** Moves focus to the menu items container after opening. */
export const FocusItems = Command.define(
  'FocusItems',
  { id: S.String },
  CompletedFocusItems,
)(({ id }) =>
  Dom.focus(itemsSelector(id)).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusItems()),
  ),
)
/** Moves focus back to the menu button after closing. */
export const FocusButton = Command.define(
  'FocusButton',
  { id: S.String },
  CompletedFocusButton,
)(({ id }) =>
  Dom.focus(buttonSelector(id)).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusButton()),
  ),
)
/** Scrolls the active menu item into view after keyboard navigation. */
export const ScrollIntoView = Command.define(
  'ScrollIntoView',
  { id: S.String, index: S.Number },
  CompletedScrollIntoView,
)(({ id, index }) =>
  Dom.scrollIntoView(itemSelector(id, index)).pipe(
    Effect.ignore,
    Effect.as(CompletedScrollIntoView()),
  ),
)
/** Programmatically clicks the active menu item's DOM element. */
export const ClickItem = Command.define(
  'ClickItem',
  { id: S.String, index: S.Number },
  CompletedClickItem,
)(({ id, index }) =>
  Dom.clickElement(itemSelector(id, index)).pipe(
    Effect.ignore,
    Effect.as(CompletedClickItem()),
  ),
)
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearSearch = Command.define(
  'DelayClearSearch',
  { version: S.Number },
  ClearedSearch,
)(({ version }) =>
  Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
    Effect.as(ClearedSearch({ version })),
  ),
)
/** Detects whether the menu button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  { id: S.String },
  GotAnimationMessage,
)(({ id }) =>
  Effect.raceFirst(
    Dom.detectElementMovement(buttonSelector(id)).pipe(
      Effect.as(GotAnimationMessage({ message: AnimationEndedAnimation() })),
    ),
    Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
      Effect.as(GotAnimationMessage({ message: AnimationEndedAnimation() })),
    ),
  ),
)

const delegateToAnimation = (
  model: Model,
  animationMessage: AnimationMessage,
): UpdateReturn => {
  const [nextAnimation, animationCommands, maybeOutMessage] = animationUpdate(
    model.animation,
    animationMessage,
  )

  const mappedCommands = Command.mapMessages(animationCommands, message =>
    GotAnimationMessage({ message }),
  )

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<AnimationOutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          DetectMovementOrAnimationEnd({ id: model.id }),
        ],
        TransitionedOut: () => [],
      }),
    ),
  })

  return [
    evo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...additionalCommands],
    Option.none(),
  ]
}

/** Processes a menu message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeLockScroll = OptionExt.when(model.isModal, LockScroll())

  const maybeUnlockScroll = OptionExt.when(model.isModal, UnlockScroll())

  const maybeInertOthers = OptionExt.when(
    model.isModal,
    InertOthers({ id: model.id }),
  )

  const maybeRestoreInert = OptionExt.when(
    model.isModal,
    RestoreInert({ id: model.id }),
  )

  const openCommands = [
    ...Array.getSomes([maybeLockScroll, maybeInertOthers]),
    FocusItems({ id: model.id }),
  ]

  const closeWithFocusCommands = [
    FocusButton({ id: model.id }),
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
        Option.none(),
      ]
    }

    return [evo(baseModel, { isOpen: () => true }), openCommands, Option.none()]
  }

  const closeMenu = (
    baseModel: Model,
    commands: ReadonlyArray<Command.Command<Message>>,
    maybeOutMessage: Option.Option<OutMessage> = Option.none(),
  ): UpdateReturn => {
    const closed = closedModel(baseModel)

    if (model.isAnimated) {
      const [nextModel, animationCommands] = delegateToAnimation(
        closed,
        AnimationHid(),
      )
      return [nextModel, [...commands, ...animationCommands], maybeOutMessage]
    }

    return [closed, commands, maybeOutMessage]
  }

  return M.value(message).pipe(
    withUpdateReturn,
    M.tag(
      'CompletedFocusItems',
      'CompletedFocusButton',
      'CompletedLockScroll',
      'CompletedUnlockScroll',
      'CompletedInertOthers',
      'CompletedRestoreInert',
      'CompletedScrollIntoView',
      'CompletedClickItem',
      'SuppressedSpaceScroll',
      'CompletedAnchorMenu',
      'CompletedPortalMenuBackdrop',
      () => [model, [], Option.none()],
    ),
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
          return [model, [], Option.none()]
        }

        return closeMenu(model, closeWithoutFocusCommands)
      },

      ActivatedItem: ({ index, activationTrigger }) => [
        evo(model, {
          maybeActiveItemIndex: () => Option.some(index),
          activationTrigger: () => activationTrigger,
        }),
        activationTrigger === 'Keyboard'
          ? [ScrollIntoView({ id: model.id, index })]
          : [],
        Option.none(),
      ],

      MovedPointerOverItem: ({ index, screenX, screenY }) => {
        const isSamePosition = Option.exists(
          model.maybeLastPointerPosition,
          position =>
            position.screenX === screenX && position.screenY === screenY,
        )

        if (isSamePosition) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => 'Pointer',
            maybeLastPointerPosition: () => Option.some({ screenX, screenY }),
          }),
          [],
          Option.none(),
        ]
      },

      DeactivatedItem: () =>
        model.activationTrigger === 'Pointer'
          ? [
              evo(model, { maybeActiveItemIndex: () => Option.none() }),
              [],
              Option.none(),
            ]
          : [model, [], Option.none()],

      SelectedItem: ({ index, item }) =>
        closeMenu(
          model,
          closeWithFocusCommands,
          Option.some(Selected({ value: item, index })),
        ),

      RequestedItemClick: ({ index }) => [
        model,
        [ClickItem({ id: model.id, index })],
        Option.none(),
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
          [DelayClearSearch({ version: nextSearchVersion })],
          Option.none(),
        ]
      },

      ClearedSearch: ({ version }) => {
        if (version !== model.searchVersion) {
          return [model, [], Option.none()]
        }

        return [evo(model, { searchQuery: () => '' }), [], Option.none()]
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
          return [withPointerType, [], Option.none()]
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
            Option.none(),
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
          return [model, [], Option.none()]
        }

        return [
          model,
          [
            ClickItem({
              id: model.id,
              index: model.maybeActiveItemIndex.value,
            }),
          ],
          Option.none(),
        ]
      },

      IgnoredMouseClick: () => [
        evo(model, { maybeLastButtonPointerType: () => Option.none() }),
        [],
        Option.none(),
      ],
    }),
  )
}

/** The anchor-positioning Mount this Menu renders on its panel. Exposed so
 *  Scene tests can call `Scene.Mount.resolve(AnchorMenu, CompletedAnchorMenu())`
 *  to acknowledge the mount produced by the rendered panel. */
export const AnchorMenu = Mount.define(
  'AnchorMenu',
  { buttonId: S.String, anchor: AnchorConfig },
  CompletedAnchorMenu,
)(
  ({ buttonId, anchor }) =>
    element =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => anchorSetup({ buttonId, anchor })(element)),
          cleanup => Effect.sync(cleanup),
        )
        return CompletedAnchorMenu()
      }),
)

/** The backdrop-portaling Mount this Menu renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalMenuBackdrop, CompletedPortalMenuBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalMenuBackdrop = Mount.define(
  'PortalMenuBackdrop',
  CompletedPortalMenuBackdrop,
)(element =>
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => portalToBody(element)),
      cleanup => Effect.sync(cleanup),
    )
    return CompletedPortalMenuBackdrop()
  }),
)

/** Programmatically opens the menu, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to open the menu. */
export const open = (model: Model): UpdateReturn =>
  update(model, Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the menu, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers to close the menu. */
export const close = (model: Model): UpdateReturn => update(model, Closed())

/** Programmatically selects a menu item, closing the menu and returning
 *  focus commands plus a `Selected` OutMessage. Use this in domain-event handlers. */
export const selectItem = (
  model: Model,
  item: string,
  index: number,
): UpdateReturn => update(model, SelectedItem({ index, item }))

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

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *
 *  The Menu emits a `Selected({ value, index })` OutMessage on commit.
 *  The menu has already closed by the time this fires; consumers
 *  pattern-match it in their `GotMenuMessage` handler to react. */
export type ViewInputs<Item extends string> = Readonly<{
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
  buttonAttributes?: ReadonlyArray<ChildAttribute>
  itemsClassName?: string
  itemsAttributes?: ReadonlyArray<ChildAttribute>
  itemsScrollClassName?: string
  itemsScrollAttributes?: ReadonlyArray<ChildAttribute>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<ChildAttribute>
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  groupAttributes?: ReadonlyArray<ChildAttribute>
  separatorClassName?: string
  separatorAttributes?: ReadonlyArray<ChildAttribute>
  anchor?: AnchorConfig
}>

export { groupContiguous, resolveTypeaheadMatch }

const itemId = (id: string, index: number): string => `${id}-item-${index}`

/** Headless menu view with typeahead search, keyboard navigation,
 *  and aria-activedescendant focus management. Obtained from
 *  `Ui.Menu.create<MyItem>().view`; not exported directly. */
type ViewForItem<Item extends string> = SubmodelView<
  Model,
  Message,
  ViewInputs<Item>
>

const internalView = <Item extends string>() =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  menuViewImpl as unknown as ViewForItem<Item>

const menuViewImpl = defineView<Model, Message, ViewInputs<string>>(
  (model, viewInputs) => {
    const h = html<Message>()

    const {
      id,
      isOpen,
      animation: { transitionState },
      maybeActiveItemIndex,
      searchQuery,
      maybeLastButtonPointerType,
    } = model

    const {
      items,
      itemToConfig,
      isItemDisabled,
      itemToSearchText = (item: string) => item,
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
    } = viewInputs

    const dispatchSelectedItem = (item: string, index: number) =>
      SelectedItem({ index, item })

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving

    const animationAttributes: ReadonlyArray<
      ReturnType<typeof h.DataAttribute>
    > = M.value(transitionState).pipe(
      M.when('EnterStart', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      M.when('EnterAnimating', () => [
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      M.when('LeaveStart', () => [
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      M.when('LeaveAnimating', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
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

    const handleButtonKeyDown = (key: string): Option.Option<Message> => {
      if (isOpen) {
        return handleItemsKeyDown(key)
      }

      return M.value(key).pipe(
        M.whenOr('Enter', ' ', 'ArrowDown', () =>
          Option.some(
            Opened({ maybeActiveItemIndex: Option.some(firstEnabledIndex) }),
          ),
        ),
        M.when('ArrowUp', () =>
          Option.some(
            Opened({ maybeActiveItemIndex: Option.some(lastEnabledIndex) }),
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
    ): Option.Option<Message> =>
      Option.some(
        PressedPointerOnButton({
          pointerType,
          button,
          screenX,
          screenY,
          timeStamp,
        }),
      )

    const handleButtonClick = (): Message => {
      const isMouse = Option.exists(
        maybeLastButtonPointerType,
        type => type === 'mouse',
      )

      if (isMouse) {
        return IgnoredMouseClick()
      } else if (isOpen) {
        return Closed()
      } else {
        return Opened({ maybeActiveItemIndex: Option.none() })
      }
    }

    const handleSpaceKeyUp = (key: string): Option.Option<Message> =>
      OptionExt.when(key === ' ', SuppressedSpaceScroll())

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
      return Option.some(Searched({ key, maybeTargetIndex }))
    }

    const handleItemsKeyDown = (key: string): Option.Option<Message> =>
      M.value(key).pipe(
        M.when('Escape', () => Option.some(Closed())),
        M.when('Enter', () =>
          Option.map(maybeActiveItemIndex, index =>
            RequestedItemClick({ index }),
          ),
        ),
        M.when(' ', () =>
          Str.isNonEmpty(searchQuery)
            ? searchForKey(' ')
            : Option.map(maybeActiveItemIndex, index =>
                RequestedItemClick({ index }),
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
              ActivatedItem({
                index: resolveActiveIndex(key),
                activationTrigger: 'Keyboard',
              }),
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
        ReleasedPointerOnItems({ screenX, screenY, timeStamp }),
      )

    const resolvedButtonAttributes = [
      h.Id(`${id}-button`),
      h.Type('button'),
      h.AriaHasPopup('menu'),
      h.AriaExpanded(isVisible),
      h.AriaControls(`${id}-items`),
      ...(isButtonDisabled
        ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
        : [
            h.OnPointerDown(handleButtonPointerDown),
            h.OnKeyDownPreventDefault(handleButtonKeyDown),
            h.OnKeyUpPreventDefault(handleSpaceKeyUp),
            h.OnClick(handleButtonClick()),
          ]),
      ...(isVisible
        ? [
            h.DataAttribute('open', ''),
            h.Style({ position: 'relative', zIndex: '1' }),
          ]
        : []),
      ...(buttonClassName ? [h.Class(buttonClassName)] : []),
      ...buttonAttributes,
    ]

    const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
      onNone: () => [],
      onSome: index => [h.AriaActiveDescendant(itemId(id, index))],
    })

    const anchorAttributes = anchor
      ? [
          h.Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
          h.OnMount(AnchorMenu({ buttonId: `${id}-button`, anchor })),
        ]
      : []

    const itemsContainerAttributes = [
      h.Id(`${id}-items`),
      h.Role('menu'),
      h.AriaLabelledBy(`${id}-button`),
      ...maybeActiveDescendant,
      h.Tabindex(0),
      ...anchorAttributes,
      ...animationAttributes,
      ...(isLeaving
        ? []
        : [
            h.OnKeyDownPreventDefault(handleItemsKeyDown),
            h.OnKeyUpPreventDefault(handleSpaceKeyUp),
            h.OnPointerUp(handleItemsPointerUp),
            h.OnBlur(BlurredItems()),
          ]),
      ...(itemsClassName ? [h.Class(itemsClassName)] : []),
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

      return h.keyed('div')(
        itemId(id, index),
        [
          h.Id(itemId(id, index)),
          h.Role('menuitem'),
          ...(isActiveItem ? [h.DataAttribute('active', '')] : []),
          ...(isDisabledItem
            ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
            : []),
          ...(isInteractive
            ? [
                h.OnClick(dispatchSelectedItem(item, index)),
                ...(isActiveItem
                  ? []
                  : [
                      h.OnPointerMove((screenX, screenY, pointerType) =>
                        OptionExt.when(
                          pointerType !== 'touch',
                          MovedPointerOverItem({ index, screenX, screenY }),
                        ),
                      ),
                    ]),
                h.OnPointerLeave(pointerType =>
                  OptionExt.when(pointerType !== 'touch', DeactivatedItem()),
                ),
              ]
            : []),
          ...(itemConfig.className ? [h.Class(itemConfig.className)] : []),
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
            h.keyed('div')(
              headingId,
              [
                h.Id(headingId),
                h.Role('presentation'),
                ...(heading.className ? [h.Class(heading.className)] : []),
              ],
              [heading.content],
            ),
          ],
        })

        const groupContent = [...headingElement, ...segment.items]

        const groupElement = h.keyed('div')(
          `${id}-group-${segment.key}`,
          [
            h.Role('group'),
            ...(Option.isSome(maybeHeading)
              ? [h.AriaLabelledBy(headingId)]
              : []),
            ...(groupClassName ? [h.Class(groupClassName)] : []),
            ...groupAttributes,
          ],
          groupContent,
        )

        const separator =
          segmentIndex > 0 &&
          (separatorClassName ||
            Array.isReadonlyArrayNonEmpty(separatorAttributes))
            ? [
                h.keyed('div')(
                  `${id}-separator-${segmentIndex}`,
                  [
                    h.Role('separator'),
                    ...(separatorClassName
                      ? [h.Class(separatorClassName)]
                      : []),
                    ...separatorAttributes,
                  ],
                  [],
                ),
              ]
            : []

        return [...separator, groupElement]
      })
    }

    const backdrop = h.keyed('div')(
      `${id}-backdrop`,
      [
        h.OnMount(PortalMenuBackdrop()),
        ...(isLeaving ? [] : [h.OnClick(Closed())]),
        ...(backdropClassName ? [h.Class(backdropClassName)] : []),
        ...backdropAttributes,
      ],
      [],
    )

    const renderedItems = renderGroupedItems()

    const scrollableItems =
      itemsScrollClassName ||
      Array.isReadonlyArrayNonEmpty(itemsScrollAttributes)
        ? [
            h.div(
              [
                ...(itemsScrollClassName
                  ? [h.Class(itemsScrollClassName)]
                  : []),
                ...itemsScrollAttributes,
              ],
              renderedItems,
            ),
          ]
        : renderedItems

    const visibleContent = [
      backdrop,
      h.keyed('div')(
        `${id}-items-container`,
        itemsContainerAttributes,
        scrollableItems,
      ),
    ]

    const wrapperAttributes = [
      ...(className ? [h.Class(className)] : []),
      ...attributes,
      ...(isVisible ? [h.DataAttribute('open', '')] : []),
    ]

    return h.div(wrapperAttributes, [
      h.keyed('button')(`${id}-button`, resolvedButtonAttributes, [
        buttonContent,
      ]),
      ...(isVisible ? visibleContent : []),
    ])
  },
)

/** Pairs the menu's `view` and `update` (and programmatic helpers)
 *  behind a single Item-typed entry point. Declaring the menu once at
 *  module scope ensures the view's `Item` type and the OutMessage's
 *  `item` type can't drift:
 *
 *  ```ts
 *  const ActionMenu = Ui.Menu.create<Action>()
 *
 *  // In view:
 *  h.submodel({ view: ActionMenu.view, ... })
 *
 *  // In update:
 *  const [next, commands, maybeOutMessage] = ActionMenu.update(model.menu, message)
 *  // maybeOutMessage: Option<Ui.Menu.OutMessage<Action>>
 *  ```
 */
export const create = <Item extends string = string>(): Readonly<{
  view: ViewForItem<Item>
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
    index: number,
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
  type GenericReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage<Item>>,
  ]
  const cast = (result: UpdateReturn): GenericReturn =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    result as unknown as GenericReturn

  return {
    view: internalView<Item>(),
    update: (model, message) => cast(update(model, message)),
    selectItem: (model, item, index) => cast(selectItem(model, item, index)),
    open: model => cast(open(model)),
    close: model => cast(close(model)),
  }
}

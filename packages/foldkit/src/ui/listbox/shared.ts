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
  type Attribute,
  type Html,
  type MountResult,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { makeConstrainedEvo } from '../../struct/index.js'
import { anchorSetup, portalToBody } from '../anchor.js'
import type { AnchorConfig } from '../anchor.js'
// NOTE: Animation imports are split across schema + update to avoid a circular
// dependency: animation → html → runtime → devtools → listbox → animation.
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

export { resolveTypeaheadMatch }

// MODEL

/** Schema for the activation trigger — whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literals(['Pointer', 'Keyboard'])
export type ActivationTrigger = typeof ActivationTrigger.Type

/** Schema for the listbox orientation — whether items flow vertically or horizontally. */
export const Orientation = S.Literals(['Vertical', 'Horizontal'])
export type Orientation = typeof Orientation.Type

/** Schema fields shared by all listbox variants (single-select and multi-select). Spread into each variant's `S.Struct` to avoid duplicating field definitions. */
export const BaseModel = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  isModal: S.Boolean,
  orientation: Orientation,
  animation: AnimationModel,
  maybeActiveItemIndex: S.Option(S.Number),
  activationTrigger: ActivationTrigger,
  searchQuery: S.String,
  searchVersion: S.Number,
  maybeLastPointerPosition: S.Option(
    S.Struct({ screenX: S.Number, screenY: S.Number }),
  ),
  maybeLastButtonPointerType: S.Option(S.String),
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
  animation: animationInit({ id: `${config.id}-listbox` }),
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
  maybeActiveItemIndex: S.Option(S.Number),
})
/** Sent when the listbox closes via Escape key or backdrop click. */
export const Closed = m('Closed')
/** Sent when the listbox items container loses focus. */
export const BlurredItems = m('BlurredItems')
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
  maybeTargetIndex: S.Option(S.Number),
})
/** Sent after the search debounce period to clear the accumulated query. */
export const ClearedSearch = m('ClearedSearch', { version: S.Number })
/** Sent when the pointer moves over a listbox item, carrying screen coordinates for tracked-pointer comparison. */
export const MovedPointerOverItem = m('MovedPointerOverItem', {
  index: S.Number,
  screenX: S.Number,
  screenY: S.Number,
})
/** Sent when the scroll lock command completes. */
export const CompletedLockScroll = m('CompletedLockScroll')
/** Sent when the scroll unlock command completes. */
export const CompletedUnlockScroll = m('CompletedUnlockScroll')
/** Sent when the inert-others command completes. */
export const CompletedSetupInert = m('CompletedSetupInert')
/** Sent when the restore-inert command completes. */
export const CompletedTeardownInert = m('CompletedTeardownInert')
/** Sent when the focus-button command completes after closing. */
export const CompletedFocusButton = m('CompletedFocusButton')
/** Sent when the focus-items command completes after opening. */
export const CompletedFocusItems = m('CompletedFocusItems')
/** Sent when the scroll-into-view command completes after keyboard activation. */
export const CompletedScrollIntoView = m('CompletedScrollIntoView')
/** Sent when the programmatic item click command completes. */
export const CompletedClickItem = m('CompletedClickItem')
/** Sent when a mouse click on the button is ignored because pointer-down already handled the toggle. */
export const IgnoredMouseClick = m('IgnoredMouseClick')
/** Sent when a Space key-up is captured to prevent page scrolling. */
export const SuppressedSpaceScroll = m('SuppressedSpaceScroll')
/** Sent when the listbox items panel mounts and Floating UI has positioned it. Update no-ops; surfaces the positioning side effect for DevTools. */
export const CompletedAnchorListbox = m('CompletedAnchorListbox')
/** Sent when the listbox backdrop mounts and is portaled to the document body. Update no-ops; surfaces the portal side effect for DevTools. */
export const CompletedPortalListboxBackdrop = m(
  'CompletedPortalListboxBackdrop',
)
/** Wraps an Animation submodel message for delegation. */
export const GotAnimationMessage = m('GotAnimationMessage', {
  message: AnimationMessage,
})
/** Sent when the user presses a pointer device on the listbox button. Records pointer type for click handling. */
export const PressedPointerOnButton = m('PressedPointerOnButton', {
  pointerType: S.String,
  button: S.Number,
})

/** Union of all messages the listbox component can produce. */
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
    typeof CompletedLockScroll,
    typeof CompletedUnlockScroll,
    typeof CompletedSetupInert,
    typeof CompletedTeardownInert,
    typeof CompletedFocusButton,
    typeof CompletedFocusItems,
    typeof CompletedScrollIntoView,
    typeof CompletedClickItem,
    typeof IgnoredMouseClick,
    typeof SuppressedSpaceScroll,
    typeof CompletedAnchorListbox,
    typeof CompletedPortalListboxBackdrop,
    typeof GotAnimationMessage,
    typeof PressedPointerOnButton,
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
  CompletedLockScroll,
  CompletedUnlockScroll,
  CompletedSetupInert,
  CompletedTeardownInert,
  CompletedFocusButton,
  CompletedFocusItems,
  CompletedScrollIntoView,
  CompletedClickItem,
  IgnoredMouseClick,
  SuppressedSpaceScroll,
  CompletedAnchorListbox,
  CompletedPortalListboxBackdrop,
  GotAnimationMessage,
  PressedPointerOnButton,
])

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
    maybeActiveItemIndex: () => Option.none(),
    searchQuery: () => '',
    searchVersion: () => 0,
    maybeLastPointerPosition: () => Option.none(),
    maybeLastButtonPointerType: () => Option.none(),
  })

// UPDATE FACTORY

type SelectedItemContext<Model extends BaseModel> = Readonly<{
  closeWithFocus: (
    model: Model,
  ) => readonly [Model, ReadonlyArray<Command.Command<Message>>]
  closeWithoutFocus: (
    model: Model,
  ) => readonly [Model, ReadonlyArray<Command.Command<Message>>]
}>

/** Prevents page scrolling while the listbox is open in modal mode. */
export const LockScroll = Command.define('LockScroll', CompletedLockScroll)
/** Re-enables page scrolling after the listbox closes. */
export const UnlockScroll = Command.define(
  'UnlockScroll',
  CompletedUnlockScroll,
)
/** Marks all elements outside the listbox as inert for modal behavior. */
export const InertOthers = Command.define('InertOthers', CompletedSetupInert)
/** Removes the inert attribute from elements outside the listbox. */
export const RestoreInert = Command.define(
  'RestoreInert',
  CompletedTeardownInert,
)
/** Moves focus back to the listbox button after closing. */
export const FocusButton = Command.define('FocusButton', CompletedFocusButton)
/** Moves focus to the listbox items container after opening. */
export const FocusItems = Command.define('FocusItems', CompletedFocusItems)
/** Scrolls the active listbox item into view after keyboard navigation. */
export const ScrollIntoView = Command.define(
  'ScrollIntoView',
  CompletedScrollIntoView,
)
/** Programmatically clicks the active listbox item's DOM element. */
export const ClickItem = Command.define('ClickItem', CompletedClickItem)
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearSearch = Command.define(
  'DelayClearSearch',
  ClearedSearch,
)
/** Detects whether the listbox button moved or the leave animation ended — whichever comes first. Both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  GotAnimationMessage,
)

export const makeUpdate = <Model extends BaseModel>(
  handleSelectedItem: (
    model: Model,
    item: string,
    context: SelectedItemContext<Model>,
  ) => [Model, ReadonlyArray<Command.Command<Message>>],
) => {
  type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
  const withUpdateReturn = M.withReturnType<UpdateReturn>()

  const delegateToAnimation = (
    model: Model,
    animationMessage: AnimationMessage,
  ): UpdateReturn => {
    const [nextAnimation, animationCommands, maybeOutMessage] = animationUpdate(
      model.animation,
      animationMessage,
    )

    const mappedCommands = animationCommands.map(
      Command.mapEffect(
        Effect.map(message => GotAnimationMessage({ message })),
      ),
    )

    const additionalCommands = Option.match(maybeOutMessage, {
      onNone: () => [],
      onSome: M.type<AnimationOutMessage>().pipe(
        M.tagsExhaustive({
          StartedLeaveAnimating: () => [
            DetectMovementOrAnimationEnd(
              Effect.raceFirst(
                Dom.detectElementMovement(buttonSelector(model.id)).pipe(
                  Effect.as(
                    GotAnimationMessage({
                      message: AnimationEndedAnimation(),
                    }),
                  ),
                ),
                Dom.waitForAnimationSettled(itemsSelector(model.id)).pipe(
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
      constrainedEvo(model, { animation: () => nextAnimation }),
      [...mappedCommands, ...additionalCommands],
    ]
  }

  const openListbox = (
    baseModel: Model,
    openCommands: ReadonlyArray<Command.Command<Message>>,
  ): UpdateReturn => {
    if (baseModel.isAnimated) {
      const [nextModel, animationCommands] = delegateToAnimation(
        baseModel,
        AnimationShowed(),
      )
      return [
        constrainedEvo(nextModel, { isOpen: () => true }),
        [...openCommands, ...animationCommands],
      ]
    }

    return [constrainedEvo(baseModel, { isOpen: () => true }), openCommands]
  }

  const closeListbox = (
    baseModel: Model,
    commands: ReadonlyArray<Command.Command<Message>>,
  ): UpdateReturn => {
    const closed = closedModel(baseModel)

    if (baseModel.isAnimated) {
      const [nextModel, animationCommands] = delegateToAnimation(
        closed,
        AnimationHid(),
      )
      return [nextModel, [...commands, ...animationCommands]]
    }

    return [closed, commands]
  }

  return (model: Model, message: Message): UpdateReturn => {
    const maybeLockScroll = OptionExt.when(
      model.isModal,
      LockScroll(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll()))),
    )

    const maybeUnlockScroll = OptionExt.when(
      model.isModal,
      UnlockScroll(Dom.unlockScroll.pipe(Effect.as(CompletedUnlockScroll()))),
    )

    const maybeInertOthers = OptionExt.when(
      model.isModal,
      InertOthers(
        Dom.inertOthers(model.id, [
          buttonSelector(model.id),
          itemsSelector(model.id),
        ]).pipe(Effect.as(CompletedSetupInert())),
      ),
    )

    const maybeRestoreInert = OptionExt.when(
      model.isModal,
      RestoreInert(
        Dom.restoreInert(model.id).pipe(Effect.as(CompletedTeardownInert())),
      ),
    )

    const focusButton = FocusButton(
      Dom.focus(buttonSelector(model.id)).pipe(
        Effect.ignore,
        Effect.as(CompletedFocusButton()),
      ),
    )

    const focusItems = FocusItems(
      Dom.focus(itemsSelector(model.id)).pipe(
        Effect.ignore,
        Effect.as(CompletedFocusItems()),
      ),
    )

    const openCommands = [
      ...Array.getSomes([maybeLockScroll, maybeInertOthers]),
      focusItems,
    ]

    const closeWithFocusCommands = [
      focusButton,
      ...Array.getSomes([maybeUnlockScroll, maybeRestoreInert]),
    ]

    const closeWithoutFocusCommands = Array.getSomes([
      maybeUnlockScroll,
      maybeRestoreInert,
    ])

    return M.value(message).pipe(
      withUpdateReturn,
      M.tagsExhaustive({
        Opened: ({ maybeActiveItemIndex }) =>
          openListbox(
            constrainedEvo(model, {
              maybeActiveItemIndex: () => maybeActiveItemIndex,
              activationTrigger: () =>
                Option.match(maybeActiveItemIndex, {
                  onNone: () => 'Pointer' as const,
                  onSome: () => 'Keyboard' as const,
                }),
              searchQuery: () => '',
              searchVersion: () => 0,
              maybeLastPointerPosition: () => Option.none(),
            }),
            openCommands,
          ),

        Closed: () => closeListbox(model, closeWithFocusCommands),

        BlurredItems: () => {
          if (
            Option.exists(
              model.maybeLastButtonPointerType,
              Equal.equals('mouse'),
            )
          ) {
            return [model, []]
          }

          return closeListbox(model, closeWithoutFocusCommands)
        },

        ActivatedItem: ({ index, activationTrigger }) => [
          constrainedEvo(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => activationTrigger,
          }),
          activationTrigger === 'Keyboard'
            ? [
                ScrollIntoView(
                  Dom.scrollIntoView(itemSelector(model.id, index)).pipe(
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
            closeWithFocus: closeModel =>
              closeListbox(closeModel, closeWithFocusCommands),
            closeWithoutFocus: closeModel =>
              closeListbox(closeModel, closeWithoutFocusCommands),
          }),

        RequestedItemClick: ({ index }) => [
          model,
          [
            ClickItem(
              Dom.clickElement(itemSelector(model.id, index)).pipe(
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
              DelayClearSearch(
                Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
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

          return [constrainedEvo(model, { searchQuery: () => '' }), []]
        },

        GotAnimationMessage: ({ message: animationMessage }) =>
          delegateToAnimation(model, animationMessage),

        PressedPointerOnButton: ({ pointerType, button }) => {
          const withPointerType = constrainedEvo(model, {
            maybeLastButtonPointerType: () => Option.some(pointerType),
          })

          if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
            return [withPointerType, []]
          }

          if (model.isOpen) {
            const [closed, commands] = closeListbox(
              withPointerType,
              closeWithFocusCommands,
            )
            return [
              constrainedEvo(closed, {
                maybeLastButtonPointerType: () => Option.some(pointerType),
              }),
              commands,
            ]
          }

          return openListbox(
            constrainedEvo(withPointerType, {
              maybeActiveItemIndex: () => Option.none(),
              activationTrigger: () => 'Pointer' as const,
              searchQuery: () => '',
              searchVersion: () => 0,
              maybeLastPointerPosition: () => Option.none(),
            }),
            openCommands,
          )
        },

        CompletedLockScroll: () => [model, []],
        CompletedUnlockScroll: () => [model, []],
        CompletedSetupInert: () => [model, []],
        CompletedTeardownInert: () => [model, []],
        CompletedFocusButton: () => [model, []],
        CompletedFocusItems: () => [model, []],
        CompletedScrollIntoView: () => [model, []],
        CompletedClickItem: () => [model, []],
        IgnoredMouseClick: () => [
          constrainedEvo(model, {
            maybeLastButtonPointerType: () => Option.none(),
          }),
          [],
        ],
        SuppressedSpaceScroll: () => [model, []],
        CompletedAnchorListbox: () => [model, []],
        CompletedPortalListboxBackdrop: () => [model, []],
      }),
    )
  }
}

/** The anchor-positioning Mount this Listbox renders when an anchor is
 *  configured. Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AnchorListbox, CompletedAnchorListbox())`. */
export const AnchorListbox = Mount.define(
  'AnchorListbox',
  CompletedAnchorListbox,
)
/** The backdrop-portaling Mount this Listbox renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalListboxBackdrop, CompletedPortalListboxBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalListboxBackdrop = Mount.define(
  'PortalListboxBackdrop',
  CompletedPortalListboxBackdrop,
)

const portalListboxBackdrop = PortalListboxBackdrop(
  (
    element,
  ): Effect.Effect<MountResult<typeof CompletedPortalListboxBackdrop.Type>> =>
    Effect.sync(() => {
      const cleanup = portalToBody(element)
      return { message: CompletedPortalListboxBackdrop(), cleanup }
    }),
)

// VIEW TYPES

/** Configuration for an individual listbox item's appearance. */
export type ItemConfig = Readonly<{
  className?: string
  content: Html
}>

/** Configuration for a group heading rendered above a group of items. */
export type GroupHeading = Readonly<{
  content: Html
  className?: string
}>

/** Configuration for rendering a listbox with `view`. */
export type BaseViewConfig<
  ParentMessage,
  Item,
  Model extends BaseModel,
> = Readonly<{
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
      | IgnoredMouseClick
      | SuppressedSpaceScroll
      | typeof CompletedAnchorListbox.Type
      | typeof CompletedPortalListboxBackdrop.Type,
  ) => ParentMessage
  onSelectedItem?: (value: string) => ParentMessage
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
  <ParentMessage, Item>(
    config: BaseViewConfig<ParentMessage, Item, Model>,
  ): Html => {
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
      OnKeyDownPreventDefault,
      OnKeyUpPreventDefault,
      OnMount,
      OnPointerDown,
      OnPointerLeave,
      OnPointerMove,
      Role,
      Style,
      Tabindex,
      Type,
      Value,
      keyed,
    } = html<ParentMessage>()

    const {
      model: {
        id,
        isOpen,
        orientation,
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
      name,
      form,
      isDisabled,
      isInvalid,
    } = config

    const itemToValue = config.itemToValue ?? (item => String(item))
    const itemToSearchText =
      config.itemToSearchText ?? (item => itemToValue(item))

    const dispatchSelectedItem = (value: string): ParentMessage =>
      onSelectedItem
        ? onSelectedItem(value)
        : toParentMessage(SelectedItem({ item: value }))

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

    const handleButtonKeyDown = (key: string): Option.Option<ParentMessage> => {
      if (isOpen) {
        return handleItemsKeyDown(key)
      }

      return M.value(key).pipe(
        M.whenOr('Enter', ' ', 'ArrowDown', () =>
          Option.some(
            toParentMessage(
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
            toParentMessage(
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
    }

    const handleButtonPointerDown = (
      pointerType: string,
      button: number,
    ): Option.Option<ParentMessage> =>
      Option.some(
        toParentMessage(
          PressedPointerOnButton({
            pointerType,
            button,
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

    const searchForKey = (key: string): Option.Option<ParentMessage> => {
      const nextQuery = searchQuery + key
      const maybeTargetIndex = resolveTypeaheadMatch(
        items,
        nextQuery,
        maybeActiveItemIndex,
        isItemDisabledByIndex,
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
        M.when(isNavigationKey, () =>
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

    const resolvedButtonAttributes = [
      Id(`${id}-button`),
      Type('button'),
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
      ...(isVisible
        ? [
            DataAttribute('open', ''),
            Style({ position: 'relative', zIndex: '1' }),
          ]
        : []),
      ...(isInvalid ? [DataAttribute('invalid', '')] : []),
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
              AnchorListbox(
                (
                  items,
                ): Effect.Effect<
                  MountResult<typeof CompletedAnchorListbox.Type>
                > =>
                  Effect.sync(() => {
                    const cleanup = anchorSetup({
                      buttonId: `${id}-button`,
                      anchor,
                    })(items)
                    return { message: CompletedAnchorListbox(), cleanup }
                  }),
              ),
              toParentMessage,
            ),
          ),
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
      ...anchorAttributes,
      ...animationAttributes,
      ...(isLeaving
        ? []
        : [
            OnKeyDownPreventDefault(handleItemsKeyDown),
            OnKeyUpPreventDefault(handleSpaceKeyUp),
            OnBlur(toParentMessage(BlurredItems())),
          ]),
      ...(itemsClassName ? [Class(itemsClassName)] : []),
      ...itemsAttributes,
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
          ...(isActiveItem ? [DataAttribute('active', '')] : []),
          ...(isSelectedItem ? [DataAttribute('selected', '')] : []),
          ...(isDisabledItem
            ? [AriaDisabled(true), DataAttribute('disabled', '')]
            : []),
          ...(isInteractive
            ? [
                OnClick(dispatchSelectedItem(itemToValue(item))),
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
        const maybeHeading = Option.fromNullishOr(groupToHeading?.(segment.key))

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
        OnMount(Mount.mapMessage(portalListboxBackdrop, toParentMessage)),
        ...(isLeaving ? [] : [OnClick(toParentMessage(Closed()))]),
        ...(backdropClassName ? [Class(backdropClassName)] : []),
        ...backdropAttributes,
      ],
      [],
    )

    const renderedItems = renderGroupedItems()

    const scrollableItems =
      itemsScrollClassName ||
      Array.isReadonlyArrayNonEmpty(itemsScrollAttributes)
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
      ...attributes,
      ...(isVisible ? [DataAttribute('open', '')] : []),
      ...(isDisabled ? [DataAttribute('disabled', '')] : []),
      ...(isInvalid ? [DataAttribute('invalid', '')] : []),
    ]

    return div(wrapperAttributes, [
      keyed('button')(`${id}-button`, resolvedButtonAttributes, [
        buttonContent,
      ]),
      ...hiddenInputs,
      ...(isVisible ? visibleContent : []),
    ])
  }

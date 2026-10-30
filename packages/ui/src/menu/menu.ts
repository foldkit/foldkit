import {
  Array,
  Effect,
  Equal,
  Layer,
  Match,
  Option,
  Predicate,
  Schema,
  String,
  pipe,
} from 'effect'
import { Block, Command, Mount } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { type MessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { AnchorConfig, anchorSetup, portalBackdrop } from '../anchor/index.js'
import * as Animation from '../animation/index.js'
import { groupContiguous } from '../group.js'
import * as OptionExt from '../internal/optionExtensions.js'
import { idSelector } from '../internal/selectors.js'
import {
  findFirstEnabledIndex,
  isPrintableKey,
  keyToIndex,
} from '../keyboard.js'
import { resolveTypeaheadMatch } from '../typeahead.js'

// MODEL

/** Schema for the activation trigger: whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = Schema.Literals(['Pointer', 'Keyboard'])
export type ActivationTrigger = typeof ActivationTrigger.Type

const PointerOrigin = Schema.Struct({
  screenX: Schema.Number,
  screenY: Schema.Number,
  timeStamp: Schema.Number,
})
type PointerOrigin = typeof PointerOrigin.Type

/** Schema for the menu component's state, tracking open/closed status, active item, activation trigger, and typeahead search. */
export const Model = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  isAnimated: Schema.Boolean,
  isModal: Schema.Boolean,
  animation: Animation.Animation,
  maybeActiveItemIndex: Schema.Option(Schema.Number),
  activationTrigger: ActivationTrigger,
  searchQuery: Schema.String,
  searchVersion: Schema.Number,
  maybeLastPointerPosition: Schema.Option(
    Schema.Struct({ screenX: Schema.Number, screenY: Schema.Number }),
  ),
  maybeLastButtonPointerType: Schema.Option(Schema.String),
  maybePointerOrigin: Schema.Option(PointerOrigin),
})
export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the menu component can produce. */
export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  RequestedSelectItem: { index: Schema.Number, item: Schema.String },
  Opened: { maybeActiveItemIndex: Schema.Option(Schema.Number) },
  Closed: {},
  BlurredItems: {},
  ActivatedItem: { index: Schema.Number, activationTrigger: ActivationTrigger },
  DeactivatedItem: {},
  SelectedItem: { index: Schema.Number, item: Schema.String },
  RequestedItemClick: { index: Schema.Number },
  Searched: {
    key: Schema.String,
    maybeTargetIndex: Schema.Option(Schema.Number),
  },
  CompletedDelayClearMenuSearch: { version: Schema.Number },
  MovedPointerOverItem: {
    index: Schema.Number,
    screenX: Schema.Number,
    screenY: Schema.Number,
  },
  CompletedFocusMenuItems: {},
  CompletedFocusMenuButton: {},
  CompletedLockMenuScroll: {},
  CompletedUnlockMenuScroll: {},
  CompletedInertMenuOthers: {},
  CompletedRestoreMenuInert: {},
  CompletedScrollMenuItemIntoView: {},
  CompletedClickMenuItem: {},
  ClickedButton: {},
  IgnoredMouseClick: {},
  SuppressedSpaceScroll: {},
  CompletedAnchorMenu: {},
  CompletedPortalMenuBackdrop: {},
  CompletedDetectMenuMovementOrAnimationEnd: { generation: Schema.Number },
  PressedPointerOnButton: {
    pointerType: Schema.String,
    button: Schema.Number,
    screenX: Schema.Number,
    screenY: Schema.Number,
    timeStamp: Schema.Number,
  },
  ReleasedPointerOnItems: {
    screenX: Schema.Number,
    screenY: Schema.Number,
    timeStamp: Schema.Number,
  },
})
export type Message = typeof Message.Type
export type RequestedOpen = typeof Message.RequestedOpen.Type
export type RequestedClose = typeof Message.RequestedClose.Type
export type RequestedSelectItem = typeof Message.RequestedSelectItem.Type

/** A string Schema whose decoded type and constructor input are both
 *  narrowed to a Menu's Item type. */
type ItemSchema<Item extends string> = Schema.Codec<Item, Item> &
  Readonly<{ '~type.make': Item }>

/** The Message union on a Menu class, refined so the item a parent sends
 *  with `RequestedSelectItem` carries the Menu's Item type. */
type MessageSchema<Item extends string = string> =
  typeof Message extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'RequestedSelectItem'> &
          Readonly<{
            RequestedSelectItem: Omit<Cases['RequestedSelectItem'], 'item'> &
              Readonly<{ item: ItemSchema<Item> }>
          }>
      >
    : never

// OUT MESSAGE

/** Union of OutMessages the menu component can produce. The parent handles
 *  them with `menu.on(...)`. */
export const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String, index: Schema.Number },
  Closed: {},
})

/** The OutMessage union on a Menu class, refined to its Item type. */
type OutMessageSchema<Item extends string = string> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{ value: Schema.Schema<Item> }>
          }>
      >
    : never

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
}>

/** Generic over `Value extends string` so consumers using the typed
 *  `Menu.makeBlock<MyUnion>()` factory receive `value: MyUnion` in the
 *  `Selected` OutMessage. `Closed` reports a non-selection transition from
 *  open to closed. Defaults to `string`. */
export type OutMessage<Value extends string = string> =
  | Selected<Value>
  | typeof OutMessage.Closed.Type

export type Opened = typeof Message.Opened.Type
export type Closed = typeof Message.Closed.Type
export type BlurredItems = typeof Message.BlurredItems.Type
export type ActivatedItem = typeof Message.ActivatedItem.Type
export type DeactivatedItem = typeof Message.DeactivatedItem.Type
export type SelectedItem = typeof Message.SelectedItem.Type
export type MovedPointerOverItem = typeof Message.MovedPointerOverItem.Type
export type RequestedItemClick = typeof Message.RequestedItemClick.Type
export type Searched = typeof Message.Searched.Type
export type CompletedDelayClearMenuSearch =
  typeof Message.CompletedDelayClearMenuSearch.Type
/** A click on the Menu trigger button. */
export type ClickedButton = typeof Message.ClickedButton.Type
export type IgnoredMouseClick = typeof Message.IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof Message.SuppressedSpaceScroll.Type
export type PressedPointerOnButton = typeof Message.PressedPointerOnButton.Type
export type ReleasedPointerOnItems = typeof Message.ReleasedPointerOnItems.Type

// INIT

const SEARCH_DEBOUNCE_MILLISECONDS = 350
const LEFT_MOUSE_BUTTON = 0
const POINTER_HOLD_THRESHOLD_MILLISECONDS = 200
const POINTER_MOVEMENT_THRESHOLD_PIXELS = 5

/** Constructor args for a Menu instance. `id` prefixes the DOM ids of the
 *  button, items, and item elements. `isAnimated` enables animation
 *  coordination (default `false`). `isModal` locks page scroll and inerts
 *  other elements when open (default `false`). */
export type InitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
}>

// SELECTORS

/** Returns the bare DOM id of the menu trigger button, derived from the
 *  menu's base id. Use this to associate an external label with the trigger
 *  via a native `<label for={Menu.buttonId(id)}>` or an `aria-labelledby`
 *  reference. */
export const buttonId = (id: string): string => `${id}-button`

const buttonSelector = (id: string): string => idSelector(`${id}-button`)
const itemsSelector = (id: string): string => idSelector(`${id}-items`)
const itemSelector = (id: string, index: number): string =>
  idSelector(`${id}-item-${index}`)

// COMMAND

/** Prevents page scrolling while the menu is open. */
export const LockMenuScroll = Command.define('LockMenuScroll', {
  messages: [Message.CompletedLockMenuScroll],
})
/** Re-enables page scrolling after the menu closes. */
export const UnlockMenuScroll = Command.define('UnlockMenuScroll', {
  messages: [Message.CompletedUnlockMenuScroll],
})
/** Marks all elements outside the menu as inert for modal behavior. */
export const InertMenuOthers = Command.define('InertMenuOthers', {
  args: { id: Schema.String },
  messages: [Message.CompletedInertMenuOthers],
})
/** Removes the inert attribute from elements outside the Menu. */
export const RestoreMenuInert = Command.define('RestoreMenuInert', {
  args: { id: Schema.String },
  messages: [Message.CompletedRestoreMenuInert],
})
/** Moves focus to the menu items container after opening. */
export const FocusMenuItems = Command.define('FocusMenuItems', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusMenuItems],
})
/** Moves focus back to the menu button after closing. */
export const FocusMenuButton = Command.define('FocusMenuButton', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusMenuButton],
})
/** Scrolls the active menu item into view after keyboard navigation. */
export const ScrollMenuItemIntoView = Command.define('ScrollMenuItemIntoView', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedScrollMenuItemIntoView],
})
/** Programmatically clicks the active menu item's DOM element. */
export const ClickMenuItem = Command.define('ClickMenuItem', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedClickMenuItem],
})
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearMenuSearch = Command.define('DelayClearMenuSearch', {
  args: { version: Schema.Number },
  messages: [Message.CompletedDelayClearMenuSearch],
})
/** Detects whether the menu button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation block that leave is complete. */
export const DetectMenuMovementOrAnimationEnd = Command.define(
  'DetectMenuMovementOrAnimationEnd',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.CompletedDetectMenuMovementOrAnimationEnd],
  },
)

const commands = [
  LockMenuScroll,
  UnlockMenuScroll,
  InertMenuOthers,
  RestoreMenuInert,
  FocusMenuItems,
  FocusMenuButton,
  ScrollMenuItemIntoView,
  ClickMenuItem,
  DelayClearMenuSearch,
  DetectMenuMovementOrAnimationEnd,
]

// MOUNT

/**
 * The anchor-positioning Mount this Menu renders on its panel. The panel is
 *  always anchored to the button via Floating UI and portaled to the document
 *  body, or into the enclosing `<dialog>` when there is one (opt out of
 *  portaling with `anchor.portal: false`), so it escapes ancestor stacking
 *  contexts and overflow clipping.
 *
 *  It also carries the open-focus for the anchored panel. An anchored panel
 *  renders `visibility: hidden` until Floating UI resolves its first position,
 *  and `.focus()` does not land on a hidden element, so `FocusMenuItems` alone
 *  cannot focus it. `focusAfterPosition` focuses the panel as part of that
 *  first reveal. `FocusMenuItems` still focuses the panel when no anchor is
 *  configured, where the panel is visible as soon as the render commits.
 *
 *  Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu())`.
 */
export const AnchorMenu = Mount.define('AnchorMenu', {
  args: { buttonId: Schema.String, anchor: AnchorConfig },
  messages: [Message.CompletedAnchorMenu],
})

/** The backdrop-portaling Mount this Menu renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalMenuBackdrop, Message.CompletedPortalMenuBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalMenuBackdrop = Mount.define('PortalMenuBackdrop', {
  messages: [Message.CompletedPortalMenuBackdrop],
})

/** Mount definitions rendered by Menu. */
export const mounts = [AnchorMenu, PortalMenuBackdrop]

type MountRequirements = Mount.RequirementsOf<typeof mounts>

// UPDATE

const closedModel = (model: Model): Model =>
  modifyFields(model, {
    isOpen: () => false,
    maybeActiveItemIndex: () => Option.none(),
    searchQuery: () => '',
    searchVersion: () => 0,
    maybeLastPointerPosition: () => Option.none(),
    maybeLastButtonPointerType: () => Option.none(),
    maybePointerOrigin: () => Option.none(),
  })

const showAnimation = (model: Model) =>
  model.animation.send(Animation.Animation.Message.RequestedShow())

const hideAnimation = (model: Model) =>
  model.animation.send(Animation.Animation.Message.RequestedHide())

const makeUpdate =
  <Item extends string>(
    selected: (value: string, index: number) => OutMessage<Item>,
  ) =>
  (model: Model, message: Message) => {
    const modalOpenCommands = Array.filter(
      [LockMenuScroll(), InertMenuOthers({ id: model.id })],
      () => model.isModal,
    )

    const closeWithoutFocusCommands = Array.filter(
      [UnlockMenuScroll(), RestoreMenuInert({ id: model.id })],
      () => model.isModal,
    )

    const openCommands = [
      ...modalOpenCommands,
      FocusMenuItems({ id: model.id }),
    ]

    const closeWithFocusCommands = [
      FocusMenuButton({ id: model.id }),
      ...closeWithoutFocusCommands,
    ]

    const openMenu = (baseModel: Model) => {
      const nextModel = modifyFields(baseModel, { isOpen: () => true })

      if (model.isAnimated) {
        return {
          model: nextModel,
          commands: openCommands,
          messages: [showAnimation(nextModel)],
        }
      }

      return { model: nextModel, commands: openCommands }
    }

    const closeMenu = (
      baseModel: Model,
      commands: typeof closeWithFocusCommands,
      outMessage?: OutMessage<Item>,
    ) => {
      if (!baseModel.isOpen) {
        return { model: baseModel, outMessage }
      }

      const closed = closedModel(baseModel)
      const closeOutMessage = outMessage ?? OutMessage.Closed()

      if (model.isAnimated) {
        return {
          model: closed,
          commands,
          outMessage: closeOutMessage,
          messages: [hideAnimation(closed)],
        }
      }

      return { model: closed, commands, outMessage: closeOutMessage }
    }

    const openWithActiveItem = (
      maybeActiveItemIndex: Option.Option<number>,
    ) => {
      if (model.isOpen) {
        return { model }
      }

      return openMenu(
        modifyFields(model, {
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
      )
    }

    const selectItem = (index: number, item: string) =>
      closeMenu(model, closeWithFocusCommands, selected(item, index))

    return Message.match(message, {
      CompletedFocusMenuItems: () => ({ model }),
      CompletedFocusMenuButton: () => ({ model }),
      CompletedLockMenuScroll: () => ({ model }),
      CompletedUnlockMenuScroll: () => ({ model }),
      CompletedInertMenuOthers: () => ({ model }),
      CompletedRestoreMenuInert: () => ({ model }),
      CompletedScrollMenuItemIntoView: () => ({ model }),
      CompletedClickMenuItem: () => ({ model }),
      SuppressedSpaceScroll: () => ({ model }),
      CompletedAnchorMenu: () => ({ model }),
      CompletedPortalMenuBackdrop: () => ({ model }),

      RequestedOpen: () => openWithActiveItem(Option.none()),

      RequestedClose: () => closeMenu(model, closeWithFocusCommands),

      RequestedSelectItem: ({ index, item }) => selectItem(index, item),

      Opened: ({ maybeActiveItemIndex }) =>
        openWithActiveItem(maybeActiveItemIndex),

      Closed: () => closeMenu(model, closeWithFocusCommands),

      BlurredItems: () => {
        if (
          Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
        ) {
          return { model }
        }

        return closeMenu(model, closeWithoutFocusCommands)
      },

      ActivatedItem: ({ index, activationTrigger }) => ({
        model: modifyFields(model, {
          maybeActiveItemIndex: () => Option.some(index),
          activationTrigger: () => activationTrigger,
        }),
        commands: Array.filter(
          [ScrollMenuItemIntoView({ id: model.id, index })],
          () => activationTrigger === 'Keyboard',
        ),
      }),

      MovedPointerOverItem: ({ index, screenX, screenY }) => {
        const isSamePosition = Option.exists(
          model.maybeLastPointerPosition,
          position =>
            position.screenX === screenX && position.screenY === screenY,
        )

        if (isSamePosition) {
          return { model }
        }

        return {
          model: modifyFields(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => 'Pointer',
            maybeLastPointerPosition: () => Option.some({ screenX, screenY }),
          }),
        }
      },

      DeactivatedItem: () =>
        model.activationTrigger === 'Pointer'
          ? {
              model: modifyFields(model, {
                maybeActiveItemIndex: () => Option.none(),
              }),
            }
          : { model },

      SelectedItem: ({ index, item }) => selectItem(index, item),

      RequestedItemClick: ({ index }) => ({
        model,
        commands: [ClickMenuItem({ id: model.id, index })],
      }),

      Searched: ({ key, maybeTargetIndex }) => {
        const nextSearchQuery = model.searchQuery + key
        const nextSearchVersion = model.searchVersion + 1

        return {
          model: modifyFields(model, {
            searchQuery: () => nextSearchQuery,
            searchVersion: () => nextSearchVersion,
            maybeActiveItemIndex: () =>
              Option.orElse(maybeTargetIndex, () => model.maybeActiveItemIndex),
          }),
          commands: [DelayClearMenuSearch({ version: nextSearchVersion })],
        }
      },

      CompletedDelayClearMenuSearch: ({ version }) => {
        if (version !== model.searchVersion) {
          return { model }
        }

        return { model: modifyFields(model, { searchQuery: () => '' }) }
      },

      CompletedDetectMenuMovementOrAnimationEnd: ({ generation }) => ({
        model,
        messages: [
          model.animation.send(
            Animation.Animation.Message.RequestedFinish({ generation }),
          ),
        ],
      }),

      PressedPointerOnButton: ({
        pointerType,
        button,
        screenX,
        screenY,
        timeStamp,
      }) => {
        const withPointerType = modifyFields(model, {
          maybeLastButtonPointerType: () => Option.some(pointerType),
        })

        if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
          return { model: withPointerType }
        }

        if (model.isOpen) {
          const closed = modifyFields(closedModel(withPointerType), {
            maybeLastButtonPointerType: () => Option.some(pointerType),
          })

          if (model.isAnimated) {
            return {
              model: closed,
              commands: closeWithFocusCommands,
              outMessage: OutMessage.Closed(),
              messages: [hideAnimation(closed)],
            }
          }

          return {
            model: closed,
            commands: closeWithFocusCommands,
            outMessage: OutMessage.Closed(),
          }
        }

        return openMenu(
          modifyFields(withPointerType, {
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
          return { model }
        }

        return {
          model,
          commands: [
            ClickMenuItem({
              id: model.id,
              index: model.maybeActiveItemIndex.value,
            }),
          ],
        }
      },

      IgnoredMouseClick: () => ({
        model: modifyFields(model, {
          maybeLastButtonPointerType: () => Option.none(),
        }),
      }),
      ClickedButton: () => {
        if (
          Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
        ) {
          return {
            model: modifyFields(model, {
              maybeLastButtonPointerType: () => Option.none(),
            }),
          }
        }

        if (model.isOpen) {
          return closeMenu(model, closeWithFocusCommands)
        }

        return openWithActiveItem(Option.none())
      },
    })
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

/** Per-render view input a parent passes to `model.menu.view(...)`.
 *
 *  The Menu emits `OutMessage.Selected({ value, index })` on commit and
 *  `OutMessage.Closed()` when an open Menu closes without selection. `Closed`
 *  is emitted by the update that closes the Menu, before any animation or
 *  cleanup Commands complete. Handle each variant with `menu.on(...)`. */
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
  ariaLabel?: string
  ariaLabelledBy?: string
}>

export { groupContiguous, resolveTypeaheadMatch }

const itemId = (id: string, index: number): string => `${id}-item-${index}`

type MenuHtmlBuilder = HtmlBuilder<Message, MountRequirements>

const menuView = <Item extends string>(
  model: Model,
  h: MenuHtmlBuilder,
  viewInputs: ViewInputs<Item>,
): Html => {
  const { id, isOpen, maybeActiveItemIndex, searchQuery } = model
  const { transitionState } = model.animation.model

  const {
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
    anchor = {},
    ariaLabel,
    ariaLabelledBy,
  } = viewInputs

  const dispatchSelectedItem = (item: Item, index: number) =>
    Message.SelectedItem({ index, item })

  const isLeaving = Animation.isLeaving(transitionState)
  const isVisible = isOpen || isLeaving

  const animationAttributes = Animation.transitionAttributes(h, transitionState)

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

    return Match.value(key).pipe(
      Match.whenOr('Enter', ' ', 'ArrowDown', () =>
        Option.some(
          Message.Opened({
            maybeActiveItemIndex: Option.some(firstEnabledIndex),
          }),
        ),
      ),
      Match.when('ArrowUp', () =>
        Option.some(
          Message.Opened({
            maybeActiveItemIndex: Option.some(lastEnabledIndex),
          }),
        ),
      ),
      Match.orElse(() => Option.none()),
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
      Message.PressedPointerOnButton({
        pointerType,
        button,
        screenX,
        screenY,
        timeStamp,
      }),
    )

  const handleSpaceKeyUp = (key: string): Option.Option<Message> =>
    OptionExt.when(key === ' ', Message.SuppressedSpaceScroll())

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
      String.isNonEmpty(searchQuery),
    )
    return Option.some(Message.Searched({ key, maybeTargetIndex }))
  }

  const handleItemsKeyDown = (key: string): Option.Option<Message> =>
    Match.value(key).pipe(
      Match.when('Escape', () => Option.some(Message.Closed())),
      Match.when('Enter', () =>
        Option.map(maybeActiveItemIndex, index =>
          Message.RequestedItemClick({ index }),
        ),
      ),
      Match.when(' ', () =>
        String.isNonEmpty(searchQuery)
          ? searchForKey(' ')
          : Option.map(maybeActiveItemIndex, index =>
              Message.RequestedItemClick({ index }),
            ),
      ),
      Match.whenOr(
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End',
        'PageUp',
        'PageDown',
        () =>
          Option.some(
            Message.ActivatedItem({
              index: resolveActiveIndex(key),
              activationTrigger: 'Keyboard',
            }),
          ),
      ),
      Match.when(isPrintableKey, () => searchForKey(key)),
      Match.orElse(() => Option.none()),
    )

  const handleItemsPointerUp = (
    screenX: number,
    screenY: number,
    pointerType: string,
    timeStamp: number,
  ): Option.Option<Message> =>
    OptionExt.when(
      pointerType === 'mouse',
      Message.ReleasedPointerOnItems({ screenX, screenY, timeStamp }),
    )

  const resolveButtonLabel = () => {
    if (Predicate.isNotUndefined(ariaLabel)) {
      return [h.AriaLabel(ariaLabel)]
    } else if (Predicate.isNotUndefined(ariaLabelledBy)) {
      return [h.AriaLabelledBy(ariaLabelledBy)]
    } else {
      return []
    }
  }

  const buttonLabelAttributes = resolveButtonLabel()

  const resolvedButtonAttributes = [
    h.Id(`${id}-button`),
    h.Type('button'),
    h.AriaHasPopup('menu'),
    h.AriaExpanded(isVisible),
    ...(isVisible ? [h.AriaControls(`${id}-items`)] : []),
    ...buttonLabelAttributes,
    ...(isButtonDisabled
      ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
      : [
          h.OnPointerDown(handleButtonPointerDown),
          h.OnKeyDownPreventDefault(handleButtonKeyDown),
          h.OnKeyUpPreventDefault(handleSpaceKeyUp),
          h.OnClick(Message.ClickedButton()),
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

  const anchorAttributes = [
    h.Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
    h.OnMount(AnchorMenu({ buttonId: `${id}-button`, anchor })),
  ]

  const itemsContainerAttributes = [
    h.Id(`${id}-items`),
    h.Role('menu'),
    h.AriaLabelledBy(`${id}-button`),
    ...maybeActiveDescendant,
    h.Tabindex(-1),
    ...anchorAttributes,
    ...animationAttributes,
    ...(isLeaving
      ? []
      : [
          h.OnKeyDownPreventDefault(handleItemsKeyDown),
          h.OnKeyUpPreventDefault(handleSpaceKeyUp),
          h.OnPointerUp(handleItemsPointerUp),
          h.OnBlur(Message.BlurredItems()),
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
                        Message.MovedPointerOverItem({
                          index,
                          screenX,
                          screenY,
                        }),
                      ),
                    ),
                  ]),
              h.OnPointerLeave(pointerType =>
                OptionExt.when(
                  pointerType !== 'touch',
                  Message.DeactivatedItem(),
                ),
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
          ...(Option.isSome(maybeHeading) ? [h.AriaLabelledBy(headingId)] : []),
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
              h.keyed('div')(`${id}-separator-${segmentIndex}`, [
                h.Role('separator'),
                ...(separatorClassName ? [h.Class(separatorClassName)] : []),
                ...separatorAttributes,
              ]),
            ]
          : []

      return [...separator, groupElement]
    })
  }

  const backdrop = h.keyed('div')(`${id}-backdrop`, [
    h.OnMount(PortalMenuBackdrop()),
    ...(isLeaving ? [] : [h.OnClick(Message.Closed())]),
    ...(backdropClassName ? [h.Class(backdropClassName)] : []),
    ...backdropAttributes,
  ])

  const renderedItems = renderGroupedItems()

  const scrollableItems =
    itemsScrollClassName || Array.isReadonlyArrayNonEmpty(itemsScrollAttributes)
      ? [
          h.div(
            [
              ...(itemsScrollClassName ? [h.Class(itemsScrollClassName)] : []),
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
}

// BLOCK

type Contract<Item extends string> = Readonly<{
  Model: typeof Model
  Message: MessageSchema<Item>
  OutMessage: OutMessageSchema<Item>
  Command: typeof commands
  Mount: typeof mounts
}>

/** A Menu instance refined to one Item type. Store it in the parent Model
 *  and render it with `model.menu.view(viewInputs)`. */
export interface Menu<Item extends string = string> extends BlockTypes.Instance<
  Menu<Item>,
  Contract<Item>,
  InitConfig,
  ViewInputs<Item>
> {}

/** A Menu class refined to one Item type, with its Layer as `Live`. */
export type MenuClass<Item extends string = string> = BlockTypes.BlockClass<
  Menu<Item>,
  'Menu',
  InitConfig,
  ViewInputs<Item>,
  never,
  Contract<Item>
> &
  Readonly<{ Live: Layer.Layer<Menu<Item>> }>

/**
 * Creates a Menu class refined to one Item type, with its Layer attached as
 * `Live`. Declare `Menu.makeBlock<Action>()` once at module scope, create
 * instances with `yield* new ActionMenu('menu', { id })` in a parent
 * constructor, and provide `ActionMenu.Live` to the parent's Layer. Its view
 * input and `Selected.value` share the Item type.
 *
 * Send `Message.RequestedOpen`, `Message.RequestedClose`, and
 * `Message.RequestedSelectItem({ index, item })` to drive the Menu from the
 * parent.
 */
export const makeBlock = <Item extends string = string>(): MenuClass<Item> => {
  const contract: Contract<Item> = {
    Model,
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    Message: Message as unknown as MessageSchema<Item>,
    OutMessage: OutMessage as unknown as OutMessageSchema<Item>,
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
    Command: commands,
    Mount: mounts,
  }

  const MenuClass = Block<Menu<Item>, InitConfig, ViewInputs<Item>>()(
    'Menu',
    contract,
  )

  const selected = (value: string, index: number): Selected<Item> =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    contract.OutMessage.Selected({ value: value as Item, index })

  const menuUpdate = makeUpdate(selected)

  const MenuLive = MenuClass.make(
    Effect.fn(function* (_instanceId, config) {
      const animation = yield* new Animation.Animation('animation', {
        id: `${config.id}-items`,
      })

      return {
        model: {
          id: config.id,
          isOpen: false,
          isAnimated: config.isAnimated ?? false,
          isModal: config.isModal ?? false,
          animation,
          maybeActiveItemIndex: Option.none(),
          activationTrigger: 'Keyboard',
          searchQuery: '',
          searchVersion: 0,
          maybeLastPointerPosition: Option.none(),
          maybeLastButtonPointerType: Option.none(),
          maybePointerOrigin: Option.none(),
        },

        update: {
          RequestedOpen: menuUpdate,
          RequestedClose: menuUpdate,
          RequestedSelectItem: menuUpdate,
          Opened: menuUpdate,
          Closed: menuUpdate,
          BlurredItems: menuUpdate,
          ActivatedItem: menuUpdate,
          DeactivatedItem: menuUpdate,
          SelectedItem: menuUpdate,
          RequestedItemClick: menuUpdate,
          Searched: menuUpdate,
          CompletedDelayClearMenuSearch: menuUpdate,
          MovedPointerOverItem: menuUpdate,
          CompletedFocusMenuItems: menuUpdate,
          CompletedFocusMenuButton: menuUpdate,
          CompletedLockMenuScroll: menuUpdate,
          CompletedUnlockMenuScroll: menuUpdate,
          CompletedInertMenuOthers: menuUpdate,
          CompletedRestoreMenuInert: menuUpdate,
          CompletedScrollMenuItemIntoView: menuUpdate,
          CompletedClickMenuItem: menuUpdate,
          ClickedButton: menuUpdate,
          IgnoredMouseClick: menuUpdate,
          SuppressedSpaceScroll: menuUpdate,
          CompletedAnchorMenu: menuUpdate,
          CompletedPortalMenuBackdrop: menuUpdate,
          CompletedDetectMenuMovementOrAnimationEnd: menuUpdate,
          PressedPointerOnButton: menuUpdate,
          ReleasedPointerOnItems: menuUpdate,
          ...animation.on({
            StartedLeaveAnimating: (model: Model, { generation }) => ({
              model,
              commands: [
                DetectMenuMovementOrAnimationEnd({ id: model.id, generation }),
              ],
            }),
            TransitionedOut: (model: Model) => ({ model }),
          }),
        },

        commands: {
          LockMenuScroll: () =>
            Dom.lockScroll.pipe(Effect.as(Message.CompletedLockMenuScroll())),
          UnlockMenuScroll: () =>
            Dom.unlockScroll.pipe(
              Effect.as(Message.CompletedUnlockMenuScroll()),
            ),
          InertMenuOthers: ({ id }) =>
            Dom.inertOthers(id, [buttonSelector(id), itemsSelector(id)]).pipe(
              Effect.as(Message.CompletedInertMenuOthers()),
            ),
          RestoreMenuInert: ({ id }) =>
            Dom.restoreInert(id).pipe(
              Effect.as(Message.CompletedRestoreMenuInert()),
            ),
          FocusMenuItems: ({ id }) =>
            Dom.focus(itemsSelector(id)).pipe(
              Effect.ignore,
              Effect.as(Message.CompletedFocusMenuItems()),
            ),
          FocusMenuButton: ({ id }) =>
            Dom.focus(buttonSelector(id)).pipe(
              Effect.ignore,
              Effect.as(Message.CompletedFocusMenuButton()),
            ),
          ScrollMenuItemIntoView: ({ id, index }) =>
            Dom.scrollIntoView(itemSelector(id, index)).pipe(
              Effect.ignore,
              Effect.as(Message.CompletedScrollMenuItemIntoView()),
            ),
          ClickMenuItem: ({ id, index }) =>
            Dom.clickElement(itemSelector(id, index)).pipe(
              Effect.ignore,
              Effect.as(Message.CompletedClickMenuItem()),
            ),
          DelayClearMenuSearch: ({ version }) =>
            Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
              Effect.as(Message.CompletedDelayClearMenuSearch({ version })),
            ),
          DetectMenuMovementOrAnimationEnd: ({ id, generation }) =>
            Effect.raceFirst(
              Dom.detectElementMovement(buttonSelector(id)).pipe(
                Effect.as(
                  Message.CompletedDetectMenuMovementOrAnimationEnd({
                    generation,
                  }),
                ),
              ),
              Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
                Effect.as(
                  Message.CompletedDetectMenuMovementOrAnimationEnd({
                    generation,
                  }),
                ),
              ),
            ),
        },

        mounts: {
          AnchorMenu: ({ element, buttonId, anchor }) =>
            Effect.gen(function* () {
              yield* Effect.acquireRelease(
                Effect.sync(() =>
                  anchorSetup(element, {
                    buttonId,
                    anchor,
                    focusAfterPosition: true,
                  }),
                ),
                cleanup => Effect.sync(cleanup),
              )
              return Message.CompletedAnchorMenu()
            }),
          PortalMenuBackdrop: ({ element }) =>
            Effect.gen(function* () {
              yield* Effect.acquireRelease(
                Effect.sync(() => portalBackdrop(element)),
                cleanup => Effect.sync(cleanup),
              )
              return Message.CompletedPortalMenuBackdrop()
            }),
        },

        view: (model, h, viewInputs) =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          menuView(model, h as unknown as MenuHtmlBuilder, viewInputs),
      }
    }),
  ).pipe(Layer.provide(Animation.AnimationLive))

  return Object.assign(MenuClass, { Live: MenuLive })
}

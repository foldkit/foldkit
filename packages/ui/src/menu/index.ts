import {
  Array,
  Effect,
  Equal,
  Match,
  Number,
  Option,
  Predicate,
  Schema,
  String,
  pipe,
} from 'effect'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute, Html, KeyboardModifiers } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'
import { modifyFields } from 'foldkit/struct'
import { type View as SubmodelView, defineView } from 'foldkit/submodel'
import * as Update from 'foldkit/update'

import {
  AnchorConfig,
  anchorSetup,
  anchorSetupWithoutRelocation,
  portalBackdrop,
  portalToContainingRoot,
} from '../anchor/index.js'
// NOTE: Animation imports are split across schema + update to avoid a circular
// dependency: animation → html → runtime → devtools → menu → animation.
// The barrel (../animation) imports from html, which starts the cycle.
import * as Animation from '../animation/schema.js'
import {
  hide as animationHide,
  show as animationShow,
  update as animationUpdate,
} from '../animation/update.js'
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

const MenuLevel = Schema.Struct({
  maybeActiveItemIndex: Schema.Option(Schema.Number),
  searchQuery: Schema.String,
  searchVersion: Schema.Number,
})

/** Schema for the menu component's state, tracking open/closed status, active item, activation trigger, and typeahead search. */
export const Model = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  isAnimated: Schema.Boolean,
  isModal: Schema.Boolean,
  animation: Animation.Model,
  maybeActiveItemIndex: Schema.Option(Schema.Number),
  activationTrigger: ActivationTrigger,
  searchQuery: Schema.String,
  searchVersion: Schema.Number,
  maybeLastPointerPosition: Schema.Option(
    Schema.Struct({ screenX: Schema.Number, screenY: Schema.Number }),
  ),
  maybeLastButtonPointerType: Schema.Option(Schema.String),
  maybePointerOrigin: Schema.Option(PointerOrigin),
  openSubmenuIndexPath: Schema.Array(Schema.Number),
  openSubmenuPath: Schema.Array(Schema.String),
  submenuLevels: Schema.Array(MenuLevel),
  pathSearchVersion: Schema.Number,
  maybePendingSubmenuIndexPath: Schema.Option(Schema.Array(Schema.Number)),
  maybePendingSubmenuCloseDepth: Schema.Option(Schema.Number),
  maybePendingPathItemIndexPath: Schema.Option(Schema.Array(Schema.Number)),
  submenuRequestVersion: Schema.Number,
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the menu component can produce. */
export const Message = defineMessageUnion({
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
  CompletedDelayClearSearch: { version: Schema.Number },
  CompletedDelayClearPathSearch: {
    depth: Schema.Number,
    version: Schema.Number,
  },
  MovedPointerOverItem: {
    index: Schema.Number,
    screenX: Schema.Number,
    screenY: Schema.Number,
  },
  CompletedFocusItems: {},
  CompletedFocusButton: {},
  CompletedLockScroll: {},
  CompletedUnlockScroll: {},
  CompletedInertOthers: {},
  CompletedRestoreInert: {},
  CompletedScrollIntoView: {},
  CompletedClickItem: {},
  IgnoredMouseClick: {},
  SuppressedSpaceScroll: {},
  CompletedAnchorMenu: {},
  CompletedAnchorSubmenu: {},
  CompletedPortalMenuBackdrop: {},
  CompletedPortalSubmenuLayer: {},
  GotAnimationMessage: { message: Animation.Message },
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
  ReleasedPointerOnPathItem: {
    screenX: Schema.Number,
    screenY: Schema.Number,
    timeStamp: Schema.Number,
    index: Schema.Number,
    item: Schema.String,
    path: Schema.Array(Schema.String),
    indexPath: Schema.Array(Schema.Number),
  },
  ClickedButton: {},
  ActivatedPathItem: {
    indexPath: Schema.Array(Schema.Number),
    activationTrigger: ActivationTrigger,
  },
  OpenedSubmenu: {
    indexPath: Schema.Array(Schema.Number),
    submenuPath: Schema.Array(Schema.String),
    maybeActiveItemIndex: Schema.Option(Schema.Number),
  },
  ClickedSubmenuTrigger: {
    indexPath: Schema.Array(Schema.Number),
    submenuPath: Schema.Array(Schema.String),
    maybeActiveItemIndex: Schema.Option(Schema.Number),
  },
  RequestedSubmenuOpen: {
    indexPath: Schema.Array(Schema.Number),
    submenuPath: Schema.Array(Schema.String),
    maybeActiveItemIndex: Schema.Option(Schema.Number),
  },
  CompletedDelayOpenSubmenu: {
    version: Schema.Number,
    indexPath: Schema.Array(Schema.Number),
    submenuPath: Schema.Array(Schema.String),
    maybeActiveItemIndex: Schema.Option(Schema.Number),
  },
  RequestedSubmenuClose: { depth: Schema.Number },
  CancelledSubmenuClose: {},
  MovedPointerWithinSubmenu: { depth: Schema.Number },
  CompletedDelayCloseSubmenu: { depth: Schema.Number, version: Schema.Number },
  ClosedSubmenu: { depth: Schema.Number },
  RequestedPathItemActivation: { indexPath: Schema.Array(Schema.Number) },
  CompletedDelayActivatePathItem: {
    indexPath: Schema.Array(Schema.Number),
    version: Schema.Number,
  },
  LeftPathItem: { indexPath: Schema.Array(Schema.Number) },
  SelectedPathItem: {
    index: Schema.Number,
    item: Schema.String,
    path: Schema.Array(Schema.String),
    indexPath: Schema.Array(Schema.Number),
  },
  SearchedPath: {
    depth: Schema.Number,
    key: Schema.String,
    maybeTargetIndex: Schema.Option(Schema.Number),
  },
  CompletedScrollPathItemIntoView: {},
})

export type Message = typeof Message.Type

// OUT MESSAGE

/** Union of OutMessages the menu component can produce. The parent's
 *  `Update.foldChild` config handles them through `foldOutMessage`. */
export const OutMessage = defineMessageUnion({
  Selected: {
    value: Schema.String,
    index: Schema.Number,
    path: Schema.optional(Schema.Array(Schema.String)),
    indexPath: Schema.optional(Schema.Array(Schema.Number)),
  },
})

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly index: number
  readonly path?: ReadonlyArray<string>
  readonly indexPath?: ReadonlyArray<number>
}>

/** Generic over `Value extends string` so consumers using the typed
 *  `Menu.create<MyUnion>()` factory receive `value: MyUnion` in the
 *  `Selected` OutMessage. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

export type Opened = typeof Message.Opened.Type
export type Closed = typeof Message.Closed.Type
export type BlurredItems = typeof Message.BlurredItems.Type
export type ActivatedItem = typeof Message.ActivatedItem.Type
export type DeactivatedItem = typeof Message.DeactivatedItem.Type
export type SelectedItem = typeof Message.SelectedItem.Type
export type MovedPointerOverItem = typeof Message.MovedPointerOverItem.Type
export type RequestedItemClick = typeof Message.RequestedItemClick.Type
export type Searched = typeof Message.Searched.Type
export type CompletedDelayClearSearch =
  typeof Message.CompletedDelayClearSearch.Type
export type IgnoredMouseClick = typeof Message.IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof Message.SuppressedSpaceScroll.Type
export type PressedPointerOnButton = typeof Message.PressedPointerOnButton.Type
export type ReleasedPointerOnItems = typeof Message.ReleasedPointerOnItems.Type

// INIT

const SEARCH_DEBOUNCE_MILLISECONDS = 350
const SUBMENU_OPEN_DELAY_MILLISECONDS = 200
const SUBMENU_CLOSE_GRACE_MILLISECONDS = 300
const SUBMENU_OVERLAP_PIXELS = 8
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
  animation: Animation.init({ id: `${config.id}-items` }),
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  searchQuery: '',
  searchVersion: 0,
  maybeLastPointerPosition: Option.none(),
  maybeLastButtonPointerType: Option.none(),
  maybePointerOrigin: Option.none(),
  openSubmenuIndexPath: [],
  openSubmenuPath: [],
  submenuLevels: [],
  pathSearchVersion: 0,
  maybePendingSubmenuIndexPath: Option.none(),
  maybePendingSubmenuCloseDepth: Option.none(),
  maybePendingPathItemIndexPath: Option.none(),
  submenuRequestVersion: 0,
})

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
    openSubmenuIndexPath: () => [],
    openSubmenuPath: () => [],
    submenuLevels: () => [],
    maybePendingSubmenuIndexPath: () => Option.none(),
    maybePendingSubmenuCloseDepth: () => Option.none(),
    maybePendingPathItemIndexPath: () => Option.none(),
    submenuRequestVersion: Number.increment,
  })

/** Returns the bare DOM id of the menu trigger button, derived from the
 *  menu's base id. Use this to associate an external label with the trigger
 *  via a native `<label for={Menu.buttonId(id)}>` or an `aria-labelledby`
 *  reference. */
export const buttonId = (id: string): string => `${id}-button`

const buttonSelector = (id: string): string => idSelector(`${id}-button`)
const itemsSelector = (id: string): string => idSelector(`${id}-items`)
const submenuLayerSelector = (id: string): string =>
  idSelector(`${id}-submenu-layer`)
const itemSelector = (id: string, index: number): string =>
  idSelector(`${id}-item-${index}`)

const pathSuffix = (indexPath: ReadonlyArray<number>): string =>
  pipe(indexPath, Array.map(globalThis.String), Array.join('-'))

const menuLevelId = (
  id: string,
  parentIndexPath: ReadonlyArray<number>,
): string =>
  Array.match(parentIndexPath, {
    onEmpty: () => `${id}-items`,
    onNonEmpty: () => `${id}-submenu-${pathSuffix(parentIndexPath)}`,
  })

const pathItemId = (id: string, indexPath: ReadonlyArray<number>): string => {
  const index = Option.getOrThrow(Array.last(indexPath))
  const parentIndexPath = Array.dropRight(indexPath, 1)

  return `${menuLevelId(id, parentIndexPath)}-item-${index}`
}

const stablePathKey = (parts: ReadonlyArray<string>): string =>
  pipe(parts, Array.map(encodeURIComponent), Array.join('/'))

const menuLevelKey = (id: string, submenuIds: ReadonlyArray<string>): string =>
  `${id}-level-${stablePathKey(submenuIds)}`

const menuEntryKey = (
  id: string,
  submenuIds: ReadonlyArray<string>,
  entry: Entry<string>,
  precedingEntries: ReadonlyArray<Entry<string>>,
): string =>
  `${menuLevelKey(id, submenuIds)}-${
    isSubmenu(entry)
      ? `submenu-${stablePathKey([entry.id])}`
      : `item-${stablePathKey([
          entry,
          globalThis.String(
            Array.filter(precedingEntries, sibling => sibling === entry).length,
          ),
        ])}`
  }`

type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  typeof OutMessage.Type
>

type MenuLevel = typeof MenuLevel.Type

const emptyMenuLevel = (
  maybeActiveItemIndex: Option.Option<number> = Option.none(),
): MenuLevel => ({
  maybeActiveItemIndex,
  searchQuery: '',
  searchVersion: 0,
})

const levelAtDepth = (model: Model, depth: number): MenuLevel => {
  if (depth === 0) {
    return {
      maybeActiveItemIndex: model.maybeActiveItemIndex,
      searchQuery: model.searchQuery,
      searchVersion: model.searchVersion,
    }
  }

  return Option.getOrElse(Array.get(model.submenuLevels, depth - 1), () =>
    emptyMenuLevel(),
  )
}

const updateLevelAtDepth = (
  model: Model,
  depth: number,
  updateLevel: (level: MenuLevel) => MenuLevel,
): Model => {
  if (depth === 0) {
    const nextLevel = updateLevel(levelAtDepth(model, 0))
    return modifyFields(model, {
      maybeActiveItemIndex: () => nextLevel.maybeActiveItemIndex,
      searchQuery: () => nextLevel.searchQuery,
      searchVersion: () => nextLevel.searchVersion,
    })
  }

  return modifyFields(model, {
    submenuLevels: Array.map((level, index) =>
      index === depth - 1 ? updateLevel(level) : level,
    ),
  })
}

/** Prevents page scrolling while the menu is open. */
export const LockScroll = Command.define('LockScroll', {
  messages: [Message.CompletedLockScroll],
  execute: Dom.lockScroll.pipe(Effect.as(Message.CompletedLockScroll())),
})
/** Re-enables page scrolling after the menu closes. */
export const UnlockScroll = Command.define('UnlockScroll', {
  messages: [Message.CompletedUnlockScroll],
  execute: Dom.unlockScroll.pipe(Effect.as(Message.CompletedUnlockScroll())),
})
/** Marks all elements outside the menu as inert for modal behavior. */
export const InertOthers = Command.define('InertOthers', {
  args: { id: Schema.String },
  messages: [Message.CompletedInertOthers],
  execute: ({ id }) =>
    Dom.inertOthers(id, [
      buttonSelector(id),
      itemsSelector(id),
      submenuLayerSelector(id),
    ]).pipe(Effect.as(Message.CompletedInertOthers())),
})
/** Removes the inert attribute from elements outside the menu. */
export const RestoreInert = Command.define('RestoreInert', {
  args: { id: Schema.String },
  messages: [Message.CompletedRestoreInert],
  execute: ({ id }) =>
    Dom.restoreInert(id).pipe(Effect.as(Message.CompletedRestoreInert())),
})
/** Moves focus to the menu items container after opening. */
export const FocusItems = Command.define('FocusItems', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusItems],
  execute: ({ id }) =>
    Dom.focus(itemsSelector(id)).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusItems()),
    ),
})
/** Moves focus back to the menu button after closing. */
export const FocusButton = Command.define('FocusButton', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusButton],
  execute: ({ id }) =>
    Dom.focus(buttonSelector(id)).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusButton()),
    ),
})
/** Scrolls the active menu item into view after keyboard navigation. */
export const ScrollIntoView = Command.define('ScrollIntoView', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedScrollIntoView],
  execute: ({ id, index }) =>
    Dom.scrollIntoView(itemSelector(id, index)).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollIntoView()),
    ),
})
/** Programmatically clicks the active menu item's DOM element. */
export const ClickItem = Command.define('ClickItem', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedClickItem],
  execute: ({ id, index }) =>
    Dom.clickElement(itemSelector(id, index)).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedClickItem()),
    ),
})
/** Scrolls an active item in a nested menu level into view. */
export const ScrollPathItemIntoView = Command.define('ScrollPathItemIntoView', {
  args: { id: Schema.String, indexPath: Schema.Array(Schema.Number) },
  messages: [Message.CompletedScrollPathItemIntoView],
  execute: ({ id, indexPath }) =>
    Dom.scrollIntoView(idSelector(pathItemId(id, indexPath))).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollPathItemIntoView()),
    ),
})
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearSearch = Command.define('DelayClearSearch', {
  args: { version: Schema.Number },
  messages: [Message.CompletedDelayClearSearch],
  execute: ({ version }) =>
    Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
      Effect.as(Message.CompletedDelayClearSearch({ version })),
    ),
})
/** Waits before clearing typeahead at one nested menu level. */
export const DelayClearPathSearch = Command.define('DelayClearPathSearch', {
  args: { depth: Schema.Number, version: Schema.Number },
  messages: [Message.CompletedDelayClearPathSearch],
  execute: ({ depth, version }) =>
    Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
      Effect.as(Message.CompletedDelayClearPathSearch({ depth, version })),
    ),
})
/** Waits briefly before opening a submenu reached by pointer movement. */
export const DelayOpenSubmenu = Command.define('DelayOpenSubmenu', {
  args: {
    version: Schema.Number,
    indexPath: Schema.Array(Schema.Number),
    submenuPath: Schema.Array(Schema.String),
    maybeActiveItemIndex: Schema.Option(Schema.Number),
  },
  messages: [Message.CompletedDelayOpenSubmenu],
  execute: ({ version, indexPath, submenuPath, maybeActiveItemIndex }) =>
    Effect.sleep(SUBMENU_OPEN_DELAY_MILLISECONDS).pipe(
      Effect.as(
        Message.CompletedDelayOpenSubmenu({
          version,
          indexPath,
          submenuPath,
          maybeActiveItemIndex,
        }),
      ),
    ),
})
/** Keeps a submenu open briefly while the pointer crosses to its panel. */
export const DelayCloseSubmenu = Command.define('DelayCloseSubmenu', {
  args: { depth: Schema.Number, version: Schema.Number },
  messages: [Message.CompletedDelayCloseSubmenu],
  execute: ({ depth, version }) =>
    Effect.sleep(SUBMENU_CLOSE_GRACE_MILLISECONDS).pipe(
      Effect.as(Message.CompletedDelayCloseSubmenu({ depth, version })),
    ),
})
/** Waits briefly before activating a parent item while its submenu is open. */
export const DelayActivatePathItem = Command.define('DelayActivatePathItem', {
  args: {
    indexPath: Schema.Array(Schema.Number),
    version: Schema.Number,
  },
  messages: [Message.CompletedDelayActivatePathItem],
  execute: ({ indexPath, version }) =>
    Effect.sleep(SUBMENU_OPEN_DELAY_MILLISECONDS).pipe(
      Effect.as(Message.CompletedDelayActivatePathItem({ indexPath, version })),
    ),
})
/** Detects whether the menu button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.GotAnimationMessage],
    execute: ({ id, generation }) =>
      Effect.raceFirst(
        Dom.detectElementMovement(buttonSelector(id)).pipe(
          Effect.as(
            Message.GotAnimationMessage({
              message: Animation.Message.EndedAnimation({ generation }),
            }),
          ),
        ),
        Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
          Effect.as(
            Message.GotAnimationMessage({
              message: Animation.Message.EndedAnimation({ generation }),
            }),
          ),
        ),
      ),
  },
)

const foldAnimationOutMessage = Animation.OutMessage.match<
  Update.Step<Model, Message>
>({
  StartedLeaveAnimating:
    ({ generation }) =>
    model => ({
      model,
      commands: [DetectMovementOrAnimationEnd({ id: model.id, generation })],
    }),
  TransitionedOut: () => model => ({ model }),
})

const foldAnimation = Update.foldChild({
  update: animationUpdate,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    modifyFields(model, { animation: () => nextAnimation }),
  toParentMessage: message => Message.GotAnimationMessage({ message }),
  foldOutMessage: foldAnimationOutMessage,
})

const foldAnimationShow = Update.foldChildStep({
  update: animationShow,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    modifyFields(model, { animation: () => nextAnimation }),
  toParentMessage: message => Message.GotAnimationMessage({ message }),
})

const foldAnimationHide = Update.foldChildStep({
  update: animationHide,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    modifyFields(model, { animation: () => nextAnimation }),
  toParentMessage: message => Message.GotAnimationMessage({ message }),
})

/** Processes a Menu Message and returns the next Model, optional Commands, and
 *  an optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeLockScroll = OptionExt.when(model.isModal, LockScroll())

  const maybeUnlockScroll = OptionExt.when(model.isModal, UnlockScroll())

  const maybeRestoreInert = OptionExt.when(
    model.isModal,
    RestoreInert({ id: model.id }),
  )

  const openCommands: ReadonlyArray<Command.Command<Message>> = [
    ...Array.getSomes([maybeLockScroll]),
    FocusItems({ id: model.id }),
  ]

  const closeWithFocusCommands: ReadonlyArray<Command.Command<Message>> = [
    FocusButton({ id: model.id }),
    ...Array.getSomes([maybeUnlockScroll, maybeRestoreInert]),
  ]

  const closeWithoutFocusCommands: ReadonlyArray<Command.Command<Message>> =
    Array.getSomes([maybeUnlockScroll, maybeRestoreInert])

  const openMenu = (baseModel: Model): Update.Return<Model, Message> => {
    if (model.isOpen) {
      return { model: baseModel }
    }

    if (model.isAnimated) {
      return Update.combine(baseModel, [
        stepModel => ({ model: stepModel, commands: openCommands }),
        foldAnimationShow,
        stepModel => ({
          model: modifyFields(stepModel, { isOpen: () => true }),
        }),
      ])
    }

    return {
      model: modifyFields(baseModel, { isOpen: () => true }),
      commands: openCommands,
    }
  }

  const closeMenu = (
    baseModel: Model,
    commands: ReadonlyArray<Command.Command<Message>>,
  ): Update.Return<Model, Message> => {
    if (!baseModel.isOpen) {
      return { model: baseModel }
    }

    const closed = closedModel(baseModel)

    if (model.isAnimated) {
      return Update.combine(closed, [
        stepModel => ({ model: stepModel, commands }),
        foldAnimationHide,
      ])
    }

    return { model: closed, commands }
  }

  return Message.match<UpdateReturn>(message, {
    CompletedFocusItems: () => ({ model }),
    CompletedFocusButton: () => ({ model }),
    CompletedLockScroll: () => ({ model }),
    CompletedUnlockScroll: () => ({ model }),
    CompletedInertOthers: () => ({ model }),
    CompletedRestoreInert: () => ({ model }),
    CompletedScrollIntoView: () => ({ model }),
    CompletedClickItem: () => ({ model }),
    CompletedScrollPathItemIntoView: () => ({ model }),
    SuppressedSpaceScroll: () => ({ model }),
    CompletedAnchorMenu: () =>
      model.isOpen && model.isModal
        ? { model, commands: [InertOthers({ id: model.id })] }
        : { model },
    CompletedAnchorSubmenu: () => ({ model }),
    CompletedPortalMenuBackdrop: () => ({ model }),
    CompletedPortalSubmenuLayer: () => ({ model }),

    ActivatedPathItem: ({ indexPath, activationTrigger }) => {
      const maybeIndex = Array.last(indexPath)
      if (Option.isNone(maybeIndex)) {
        return { model }
      }

      const depth = Array.length(indexPath) - 1
      const maybeOpenIndex = Array.get(model.openSubmenuIndexPath, depth)
      const shouldCloseChild =
        activationTrigger === 'Pointer' &&
        Option.exists(
          maybeOpenIndex,
          openIndex => openIndex !== maybeIndex.value,
        )
      const hasPendingOpen = Option.isSome(model.maybePendingSubmenuIndexPath)
      const hasPendingActivation = Option.isSome(
        model.maybePendingPathItemIndexPath,
      )
      const withoutOpenChild = shouldCloseChild
        ? modifyFields(model, {
            openSubmenuIndexPath: Array.take(depth),
            openSubmenuPath: Array.take(depth),
            submenuLevels: Array.take(depth),
          })
        : model
      const baseModel =
        shouldCloseChild || hasPendingOpen || hasPendingActivation
          ? modifyFields(withoutOpenChild, {
              maybePendingSubmenuIndexPath: () => Option.none(),
              maybePendingSubmenuCloseDepth: () => Option.none(),
              maybePendingPathItemIndexPath: () => Option.none(),
              submenuRequestVersion: Number.increment,
            })
          : withoutOpenChild
      return {
        model: modifyFields(
          updateLevelAtDepth(baseModel, depth, level =>
            modifyFields(level, {
              maybeActiveItemIndex: () => Option.some(maybeIndex.value),
            }),
          ),
          { activationTrigger: () => activationTrigger },
        ),
        commands:
          activationTrigger === 'Keyboard'
            ? [ScrollPathItemIntoView({ id: model.id, indexPath })]
            : [],
      }
    },

    OpenedSubmenu: ({ indexPath, submenuPath, maybeActiveItemIndex }) => {
      const maybeTriggerIndex = Array.last(indexPath)
      const parentDepth = Array.length(indexPath) - 1
      const withActiveTrigger = Option.match(maybeTriggerIndex, {
        onNone: () => model,
        onSome: triggerIndex =>
          updateLevelAtDepth(model, parentDepth, level =>
            modifyFields(level, {
              maybeActiveItemIndex: () => Option.some(triggerIndex),
            }),
          ),
      })
      return {
        model: modifyFields(withActiveTrigger, {
          openSubmenuIndexPath: () => indexPath,
          openSubmenuPath: () => submenuPath,
          submenuLevels: () => [
            ...Array.take(model.submenuLevels, Array.length(indexPath) - 1),
            emptyMenuLevel(maybeActiveItemIndex),
          ],
          maybePendingSubmenuIndexPath: () => Option.none(),
          maybePendingSubmenuCloseDepth: () => Option.none(),
          maybePendingPathItemIndexPath: () => Option.none(),
          submenuRequestVersion: Number.increment,
        }),
      }
    },

    ClickedSubmenuTrigger: ({
      indexPath,
      submenuPath,
      maybeActiveItemIndex,
    }) => {
      const depth = Array.length(indexPath)
      const isOpen =
        Array.length(model.openSubmenuIndexPath) >= depth &&
        Equal.equals(Array.take(model.openSubmenuIndexPath, depth), indexPath)
      if (isOpen) {
        return update(model, Message.ClosedSubmenu({ depth }))
      }

      return update(
        model,
        Message.OpenedSubmenu({
          indexPath,
          submenuPath,
          maybeActiveItemIndex,
        }),
      )
    },

    RequestedSubmenuOpen: ({
      indexPath,
      submenuPath,
      maybeActiveItemIndex,
    }) => {
      const nextVersion = Number.increment(model.submenuRequestVersion)
      const maybeTriggerIndex = Array.last(indexPath)
      const parentDepth = Array.length(indexPath) - 1
      const withActiveTrigger = Option.match(maybeTriggerIndex, {
        onNone: () => model,
        onSome: triggerIndex =>
          updateLevelAtDepth(model, parentDepth, level =>
            modifyFields(level, {
              maybeActiveItemIndex: () => Option.some(triggerIndex),
            }),
          ),
      })
      return {
        model: modifyFields(withActiveTrigger, {
          maybePendingSubmenuIndexPath: () => Option.some(indexPath),
          maybePendingSubmenuCloseDepth: () => Option.none(),
          maybePendingPathItemIndexPath: () => Option.none(),
          submenuRequestVersion: () => nextVersion,
        }),
        commands: [
          DelayOpenSubmenu({
            version: nextVersion,
            indexPath,
            submenuPath,
            maybeActiveItemIndex,
          }),
        ],
      }
    },

    CompletedDelayOpenSubmenu: ({
      version,
      indexPath,
      submenuPath,
      maybeActiveItemIndex,
    }) => {
      const isPending = Option.exists(
        model.maybePendingSubmenuIndexPath,
        path => Equal.equals(path, indexPath),
      )
      if (version !== model.submenuRequestVersion || !isPending) {
        return { model }
      }

      return update(
        model,
        Message.OpenedSubmenu({
          indexPath,
          submenuPath,
          maybeActiveItemIndex,
        }),
      )
    },

    RequestedSubmenuClose: ({ depth }) => {
      if (Array.length(model.openSubmenuIndexPath) < depth) {
        if (Option.isNone(model.maybePendingSubmenuIndexPath)) {
          return { model }
        }

        return {
          model: modifyFields(model, {
            maybePendingSubmenuIndexPath: () => Option.none(),
            submenuRequestVersion: Number.increment,
          }),
        }
      }

      const nextVersion = Number.increment(model.submenuRequestVersion)
      return {
        model: modifyFields(model, {
          maybePendingSubmenuIndexPath: () => Option.none(),
          maybePendingSubmenuCloseDepth: () => Option.some(depth),
          submenuRequestVersion: () => nextVersion,
        }),
        commands: [DelayCloseSubmenu({ depth, version: nextVersion })],
      }
    },

    CancelledSubmenuClose: () => {
      if (Option.isNone(model.maybePendingSubmenuCloseDepth)) {
        return { model }
      }

      return {
        model: modifyFields(model, {
          maybePendingSubmenuCloseDepth: () => Option.none(),
          submenuRequestVersion: Number.increment,
        }),
      }
    },

    MovedPointerWithinSubmenu: ({ depth }) => {
      const shouldCancelOpen = Option.exists(
        model.maybePendingSubmenuIndexPath,
        indexPath => Array.length(indexPath) <= depth,
      )
      const shouldCancelActivation = Option.exists(
        model.maybePendingPathItemIndexPath,
        indexPath => Array.length(indexPath) <= depth,
      )
      const shouldCancelClose = Option.isSome(
        model.maybePendingSubmenuCloseDepth,
      )
      if (!shouldCancelOpen && !shouldCancelActivation && !shouldCancelClose) {
        return { model }
      }

      return {
        model: modifyFields(model, {
          maybePendingSubmenuIndexPath: maybePendingSubmenuIndexPath =>
            shouldCancelOpen ? Option.none() : maybePendingSubmenuIndexPath,
          maybePendingPathItemIndexPath: maybePendingPathItemIndexPath =>
            shouldCancelActivation
              ? Option.none()
              : maybePendingPathItemIndexPath,
          maybePendingSubmenuCloseDepth: () => Option.none(),
          submenuRequestVersion: Number.increment,
        }),
      }
    },

    CompletedDelayCloseSubmenu: ({ depth, version }) => {
      const isPending = Option.contains(
        model.maybePendingSubmenuCloseDepth,
        depth,
      )
      if (version !== model.submenuRequestVersion || !isPending) {
        return { model }
      }

      return update(model, Message.ClosedSubmenu({ depth }))
    },

    ClosedSubmenu: ({ depth }) => {
      if (depth <= 0) {
        return closeMenu(model, closeWithFocusCommands)
      }

      const nextOpenPath = Array.take(model.openSubmenuIndexPath, depth - 1)
      return {
        model: modifyFields(model, {
          openSubmenuIndexPath: () => nextOpenPath,
          openSubmenuPath: () => Array.take(model.openSubmenuPath, depth - 1),
          submenuLevels: () => Array.take(model.submenuLevels, depth - 1),
          maybePendingSubmenuIndexPath: () => Option.none(),
          maybePendingSubmenuCloseDepth: () => Option.none(),
          maybePendingPathItemIndexPath: () => Option.none(),
          submenuRequestVersion: Number.increment,
        }),
      }
    },

    RequestedPathItemActivation: ({ indexPath }) => {
      const depth = Array.length(indexPath) - 1
      const isChildOpen = Option.isSome(
        Array.get(model.openSubmenuIndexPath, depth),
      )
      if (!isChildOpen) {
        return update(
          model,
          Message.ActivatedPathItem({
            indexPath,
            activationTrigger: 'Pointer',
          }),
        )
      }

      const isAlreadyPending = Option.exists(
        model.maybePendingPathItemIndexPath,
        pendingPath => Equal.equals(pendingPath, indexPath),
      )
      if (isAlreadyPending) {
        return { model }
      }

      const nextVersion = Number.increment(model.submenuRequestVersion)
      return {
        model: modifyFields(model, {
          maybePendingSubmenuIndexPath: () => Option.none(),
          maybePendingSubmenuCloseDepth: () => Option.none(),
          maybePendingPathItemIndexPath: () => Option.some(indexPath),
          submenuRequestVersion: () => nextVersion,
        }),
        commands: [DelayActivatePathItem({ indexPath, version: nextVersion })],
      }
    },

    CompletedDelayActivatePathItem: ({ indexPath, version }) => {
      const isPending = Option.exists(
        model.maybePendingPathItemIndexPath,
        pendingPath => Equal.equals(pendingPath, indexPath),
      )
      if (version !== model.submenuRequestVersion || !isPending) {
        return { model }
      }

      return update(
        model,
        Message.ActivatedPathItem({ indexPath, activationTrigger: 'Pointer' }),
      )
    },

    LeftPathItem: ({ indexPath }) => {
      const isPending = Option.exists(
        model.maybePendingPathItemIndexPath,
        pendingPath => Equal.equals(pendingPath, indexPath),
      )
      if (!isPending) {
        return { model }
      }

      return {
        model: modifyFields(model, {
          maybePendingPathItemIndexPath: () => Option.none(),
          submenuRequestVersion: Number.increment,
        }),
      }
    },

    SelectedPathItem: ({ index, item, path, indexPath }) =>
      pipe(
        closeMenu(model, closeWithFocusCommands),
        Update.withOutMessage(
          OutMessage.Selected({ value: item, index, path, indexPath }),
        ),
      ),

    SearchedPath: ({ depth, key, maybeTargetIndex }) => {
      const nextSearchVersion = Number.increment(model.pathSearchVersion)
      return {
        model: modifyFields(
          updateLevelAtDepth(model, depth, currentLevel =>
            modifyFields(currentLevel, {
              searchQuery: searchQuery => searchQuery + key,
              searchVersion: () => nextSearchVersion,
              maybeActiveItemIndex: maybeActiveItemIndex =>
                Option.orElse(maybeTargetIndex, () => maybeActiveItemIndex),
            }),
          ),
          { pathSearchVersion: () => nextSearchVersion },
        ),
        commands: [DelayClearPathSearch({ depth, version: nextSearchVersion })],
      }
    },

    CompletedDelayClearPathSearch: ({ depth, version }) => {
      const level = levelAtDepth(model, depth)
      if (version !== level.searchVersion) {
        return { model }
      }

      return {
        model: updateLevelAtDepth(model, depth, currentLevel =>
          modifyFields(currentLevel, { searchQuery: () => '' }),
        ),
      }
    },

    Opened: ({ maybeActiveItemIndex }) => {
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
          openSubmenuIndexPath: () => [],
          openSubmenuPath: () => [],
          submenuLevels: () => [],
          maybePendingSubmenuIndexPath: () => Option.none(),
          maybePendingSubmenuCloseDepth: () => Option.none(),
          submenuRequestVersion: Number.increment,
        }),
      )
    },

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
      commands:
        activationTrigger === 'Keyboard'
          ? [ScrollIntoView({ id: model.id, index })]
          : [],
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

    SelectedItem: ({ index, item }) =>
      pipe(
        closeMenu(model, closeWithFocusCommands),
        Update.withOutMessage(
          OutMessage.Selected({
            value: item,
            index,
            path: [item],
            indexPath: [index],
          }),
        ),
      ),

    RequestedItemClick: ({ index }) => ({
      model,
      commands: [ClickItem({ id: model.id, index })],
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
        commands: [DelayClearSearch({ version: nextSearchVersion })],
      }
    },

    CompletedDelayClearSearch: ({ version }) => {
      if (version !== model.searchVersion) {
        return { model }
      }

      return { model: modifyFields(model, { searchQuery: () => '' }) }
    },

    GotAnimationMessage: ({ message: animationMessage }) =>
      foldAnimation(model, animationMessage),

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
        return Update.combine(withPointerType, [
          stepModel => closeMenu(stepModel, closeWithFocusCommands),
          stepModel => ({
            model: modifyFields(stepModel, {
              maybeLastButtonPointerType: () => Option.some(pointerType),
            }),
          }),
        ])
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

    ClickedButton: () => {
      const isMouse = Option.exists(
        model.maybeLastButtonPointerType,
        Equal.equals('mouse'),
      )

      if (isMouse) {
        return update(model, Message.IgnoredMouseClick())
      } else if (model.isOpen) {
        return closeMenu(model, closeWithFocusCommands)
      } else {
        return openMenu(
          modifyFields(model, {
            maybeActiveItemIndex: () => Option.none(),
            activationTrigger: () => 'Pointer',
            searchQuery: () => '',
            searchVersion: () => 0,
            maybeLastPointerPosition: () => Option.none(),
          }),
        )
      }
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
          ClickItem({
            id: model.id,
            index: model.maybeActiveItemIndex.value,
          }),
        ],
      }
    },

    ReleasedPointerOnPathItem: ({
      screenX,
      screenY,
      timeStamp,
      index,
      item,
      path,
      indexPath,
    }) => {
      const hasNoOrigin = Option.isNone(model.maybePointerOrigin)
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

      if (hasNoOrigin || isMovementBelowThreshold || isHoldTimeBelowThreshold) {
        return { model }
      }

      return update(
        model,
        Message.SelectedPathItem({ index, item, path, indexPath }),
      )
    },

    IgnoredMouseClick: () => ({
      model: modifyFields(model, {
        maybeLastButtonPointerType: () => Option.none(),
      }),
    }),
  })
}

/** The anchor-positioning Mount this Menu renders on its panel. The panel is
 *  always anchored to the button via Floating UI and portaled to the document
 *  body, or into the enclosing `<dialog>` when there is one (opt out of
 *  portaling with `anchor.portal: false`), so it escapes ancestor stacking
 *  contexts and overflow clipping.
 *
 *  It also carries the open-focus for the anchored panel. An anchored panel
 *  renders `visibility: hidden` until Floating UI resolves its first position,
 *  and `.focus()` does not land on a hidden element, so `FocusItems` alone
 *  cannot focus it. `focusAfterPosition` focuses the panel as part of that
 *  first reveal. `FocusItems` still focuses the panel when no anchor is
 *  configured, where the panel is visible as soon as the render commits.
 *
 *  Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AnchorMenu, Message.CompletedAnchorMenu())`. */
export const AnchorMenu = Mount.define('AnchorMenu', {
  args: { buttonId: Schema.String, anchor: AnchorConfig },
  messages: [Message.CompletedAnchorMenu],
  execute: ({ element, buttonId, anchor }) =>
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
})

/** Positions a child menu panel against its parent menu item. */
export const AnchorSubmenu = Mount.define('AnchorSubmenu', {
  args: { itemId: Schema.String, anchor: AnchorConfig },
  messages: [Message.CompletedAnchorSubmenu],
  execute: ({ element, itemId, anchor }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          anchorSetupWithoutRelocation(element, {
            buttonId: itemId,
            anchor,
            interceptTab: false,
            shiftCrossAxis: true,
          }),
        ),
        cleanup => Effect.sync(cleanup),
      )
      return Message.CompletedAnchorSubmenu()
    }),
})

/** Owns relocation of the stable child-panel layer when portal mode is
 * enabled. Keyed sibling panels reconcile within that layer. */
export const PortalSubmenuLayer = Mount.define('PortalSubmenuLayer', {
  args: { isPortal: Schema.Boolean },
  messages: [Message.CompletedPortalSubmenuLayer],
  execute: ({ element, isPortal }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          isPortal ? portalToContainingRoot(element) : undefined,
        ),
        cleanup => Effect.sync(() => cleanup?.()),
      )
      return Message.CompletedPortalSubmenuLayer()
    }),
})

/** The backdrop-portaling Mount this Menu renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalMenuBackdrop, Message.CompletedPortalMenuBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalMenuBackdrop = Mount.define('PortalMenuBackdrop', {
  messages: [Message.CompletedPortalMenuBackdrop],
  execute: ({ element }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => portalBackdrop(element)),
        cleanup => Effect.sync(cleanup),
      )
      return Message.CompletedPortalMenuBackdrop()
    }),
})

/** Programmatically opens the Menu, updating the Model and returning focus and
 *  modal Commands. Use this in domain-event handlers. */
export const open = (model: Model): UpdateReturn =>
  update(model, Message.Opened({ maybeActiveItemIndex: Option.none() }))

/** Programmatically closes the menu. If it is open, returns the closed Model
 *  with focus and modal Commands. If it is already closed, returns the Model
 *  unchanged with no Commands. Use this in domain-event handlers to close the
 *  menu. */
export const close = (model: Model): UpdateReturn =>
  update(model, Message.Closed())

/** Programmatically selects a Menu item, closing the Menu and returning focus
 *  Commands plus a `Selected` OutMessage. Use this in domain-event handlers. */
export const selectItem = (
  model: Model,
  item: string,
  index: number,
): UpdateReturn =>
  update(
    model,
    Message.SelectedPathItem({
      index,
      item,
      path: [item],
      indexPath: [index],
    }),
  )

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

type LegacyViewInputs<Item extends string> = Readonly<{
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{ isActive: boolean; isDisabled: boolean }>,
    index: number,
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

/** A nested Menu entry. Its stable `id` identifies the submenu in selection
 * paths and DOM ownership; `label` supplies its default typeahead text and
 * accessible name. */
export type Submenu<Item extends string> = Readonly<{
  _tag: 'Submenu'
  id: string
  label: string
  items: ReadonlyArray<Entry<Item>>
  isDisabled?: boolean
}>

/** A Menu level contains leaf action values or nested Submenus. */
export type Entry<Item extends string> = Item | Submenu<Item>

/** Creates a nested Menu entry without requiring a literal assertion. */
export const submenu = <Item extends string>(
  config: Omit<Submenu<Item>, '_tag'>,
): Submenu<Item> => ({ _tag: 'Submenu', ...config })

/** Identity and interaction state supplied while rendering one Menu entry. */
export type EntryContext<Item extends string> = Readonly<{
  isActive: boolean
  isDisabled: boolean
  path: ReadonlyArray<string>
  indexPath: ReadonlyArray<number>
  isSubmenuOpen: boolean
  entry: Entry<Item>
}>

/** Per-render inputs passed to `view` through `h.submodel`. A selection
 * closes the Menu tree and emits `OutMessage.Selected` with the leaf value,
 * level index, and full paths. Handle it in `Update.foldChild`'s
 * `foldOutMessage`. */
export type ViewInputs<Item extends string> = Readonly<{
  items: ReadonlyArray<Entry<Item>>
  itemToConfig: (item: Item, context: EntryContext<Item>) => ItemConfig
  submenuToConfig?: (
    submenu: Submenu<Item>,
    context: EntryContext<Item>,
  ) => ItemConfig
  isItemDisabled?: (
    item: Item,
    index: number,
    context: Readonly<{
      path: ReadonlyArray<string>
      indexPath: ReadonlyArray<number>
    }>,
  ) => boolean
  itemToSearchText?: (
    item: Item,
    index: number,
    context: Readonly<{
      path: ReadonlyArray<string>
      indexPath: ReadonlyArray<number>
    }>,
  ) => string
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
  submenuAnchor?: AnchorConfig
  ariaLabel?: string
  ariaLabelledBy?: string
}>

export { groupContiguous, resolveTypeaheadMatch }

const itemId = (id: string, index: number): string => `${id}-item-${index}`

/** Headless menu view with typeahead search, keyboard navigation,
 *  and aria-activedescendant focus management. Obtained from
 *  `Menu.create<MyItem>().view`; not exported directly. */
type ViewForItem<Item extends string> = SubmodelView<
  Model,
  Message,
  ViewInputs<Item>
>

const internalView = <Item extends string>() =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  nestedMenuViewImpl as unknown as ViewForItem<Item>

const flatMenuViewImpl = defineView<Model, Message, LegacyViewInputs<string>>(
  (model, viewInputs, h) => {
    const {
      id,
      isOpen,
      animation: { transitionState },
      maybeActiveItemIndex,
      searchQuery,
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
      anchor = {},
      ariaLabel,
      ariaLabelledBy,
    } = viewInputs

    const dispatchSelectedItem = (item: string, index: number) =>
      Message.SelectedPathItem({
        index,
        item,
        path: [item],
        indexPath: [index],
      })

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving

    const animationAttributes: ReadonlyArray<
      ReturnType<typeof h.DataAttribute>
    > = Match.value(transitionState).pipe(
      Match.when('EnterStart', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('EnterAnimating', () => [
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveStart', () => [
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveAnimating', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.orElse(() => []),
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

    const handleButtonKeyDown = (
      key: string,
      modifiers: KeyboardModifiers,
    ): Option.Option<Message> => {
      if (isOpen) {
        return handleItemsKeyDown(key, modifiers)
      }

      if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) {
        return Option.none()
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

    const handleItemsKeyDown = (
      key: string,
      modifiers: KeyboardModifiers,
    ): Option.Option<Message> => {
      if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) {
        return Option.none()
      }

      return Match.value(key).pipe(
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
    }

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
      const itemConfig = itemToConfig(
        item,
        {
          isActive: isActiveItem,
          isDisabled: isDisabledItem,
        },
        index,
      )

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

const isSubmenu = <Item extends string>(
  entry: Entry<Item>,
): entry is Submenu<Item> => !Predicate.isString(entry)

const nestedMenuViewImpl = defineView<Model, Message, ViewInputs<string>>(
  (model, viewInputs, h) => {
    if (Array.every(viewInputs.items, Predicate.isString)) {
      const {
        submenuToConfig: _submenuToConfig,
        submenuAnchor: _submenuAnchor,
        isItemDisabled: flatIsItemDisabled,
        itemToSearchText: flatItemToSearchText,
        ...flatViewInputs
      } = viewInputs

      return flatMenuViewImpl(
        model,
        {
          ...flatViewInputs,
          items: viewInputs.items,
          itemToConfig: (item, context, index) =>
            viewInputs.itemToConfig(item, {
              ...context,
              path: [item],
              indexPath: [index],
              isSubmenuOpen: false,
              entry: item,
            }),
          ...(flatIsItemDisabled
            ? {
                isItemDisabled: (item: string, index: number) =>
                  flatIsItemDisabled(item, index, {
                    path: [item],
                    indexPath: [index],
                  }),
              }
            : {}),
          ...(flatItemToSearchText
            ? {
                itemToSearchText: (item: string, index: number) =>
                  flatItemToSearchText(item, index, {
                    path: [item],
                    indexPath: [index],
                  }),
              }
            : {}),
        },
        h,
      )
    }

    const {
      id,
      isOpen,
      animation: { transitionState },
      openSubmenuIndexPath: storedOpenSubmenuIndexPath,
    } = model
    const {
      items,
      itemToConfig,
      submenuToConfig,
      isItemDisabled,
      itemToSearchText = item => item,
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
      submenuAnchor = {},
      ariaLabel,
      ariaLabelledBy,
    } = viewInputs
    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving
    const animationAttributes: ReadonlyArray<
      ReturnType<typeof h.DataAttribute>
    > = Match.value(transitionState).pipe(
      Match.when('EnterStart', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('EnterAnimating', () => [
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveStart', () => [
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveAnimating', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.orElse(() => []),
    )

    const entriesAndIdsAtPath = (
      indexPath: ReadonlyArray<number>,
    ): Readonly<{
      entries: ReadonlyArray<Entry<string>>
      ids: ReadonlyArray<string>
    }> => {
      const rootEntriesAndIds: Readonly<{
        entries: ReadonlyArray<Entry<string>>
        ids: ReadonlyArray<string>
        depth: number
      }> = { entries: items, ids: [], depth: 0 }

      const resolved = Array.reduce(
        indexPath,
        rootEntriesAndIds,
        (state, parentIndex) =>
          pipe(
            Array.get(state.entries, parentIndex),
            Option.filter(isSubmenu),
            Option.filter(entry =>
              Option.contains(
                Array.get(model.openSubmenuPath, state.depth),
                entry.id,
              ),
            ),
            Option.match({
              onNone: () => ({
                entries: [],
                ids: state.ids,
                depth: state.depth + 1,
              }),
              onSome: entry => ({
                entries: entry.items,
                ids: [...state.ids, entry.id],
                depth: state.depth + 1,
              }),
            }),
          ),
      )

      return { entries: resolved.entries, ids: resolved.ids }
    }

    const entryIsDisabled = (
      entry: Entry<string>,
      index: number,
      path: ReadonlyArray<string>,
      indexPath: ReadonlyArray<number>,
    ): boolean => {
      if (isSubmenu(entry)) {
        return entry.isDisabled ?? false
      }
      return isItemDisabled?.(entry, index, { path, indexPath }) ?? false
    }

    const childFirstEnabledIndex = (
      submenuEntry: Submenu<string>,
      path: ReadonlyArray<string>,
      indexPath: ReadonlyArray<number>,
    ): Option.Option<number> => {
      if (Array.isReadonlyArrayEmpty(submenuEntry.items)) {
        return Option.none()
      }

      const isChildDisabled = (childIndex: number): boolean =>
        Option.exists(Array.get(submenuEntry.items, childIndex), child =>
          entryIsDisabled(
            child,
            childIndex,
            [...path, isSubmenu(child) ? child.id : child],
            [...indexPath, childIndex],
          ),
        )
      const firstIndex = findFirstEnabledIndex(
        Array.length(submenuEntry.items),
        0,
        isChildDisabled,
      )(0, 1)

      return Option.liftPredicate(firstIndex, index => !isChildDisabled(index))
    }

    const current = entriesAndIdsAtPath(storedOpenSubmenuIndexPath)
    const activeDepth = Array.length(current.ids)
    const openSubmenuIndexPath = Array.take(
      storedOpenSubmenuIndexPath,
      activeDepth,
    )
    const currentLevel = levelAtDepth(model, activeDepth)
    const currentIsDisabled = (index: number): boolean =>
      Option.exists(Array.get(current.entries, index), entry =>
        entryIsDisabled(
          entry,
          index,
          [...current.ids, isSubmenu(entry) ? entry.id : entry],
          [...openSubmenuIndexPath, index],
        ),
      )
    const resolveActiveIndex = (key: string): number => {
      if (Option.isNone(currentLevel.maybeActiveItemIndex)) {
        const find = findFirstEnabledIndex(
          Array.length(current.entries),
          0,
          currentIsDisabled,
        )
        if (key === 'ArrowDown') {
          return find(0, 1)
        }
        if (key === 'ArrowUp') {
          return find(Array.length(current.entries) - 1, -1)
        }
      }

      return keyToIndex(
        'ArrowDown',
        'ArrowUp',
        Array.length(current.entries),
        Option.getOrElse(currentLevel.maybeActiveItemIndex, () => 0),
        currentIsDisabled,
      )(key)
    }
    const resolveEnabledIndex = (key: string): Option.Option<number> => {
      const index = resolveActiveIndex(key)
      return pipe(
        Array.get(current.entries, index),
        Option.filter(() => !currentIsDisabled(index)),
        Option.map(() => index),
      )
    }

    const searchForKey = (key: string): Option.Option<Message> => {
      const nextQuery = currentLevel.searchQuery + key
      const maybeTargetIndex = resolveTypeaheadMatch(
        current.entries,
        nextQuery,
        currentLevel.maybeActiveItemIndex,
        currentIsDisabled,
        (entry, index) => {
          if (isSubmenu(entry)) {
            return entry.label
          }
          return itemToSearchText(entry, index, {
            path: [...current.ids, entry],
            indexPath: [...openSubmenuIndexPath, index],
          })
        },
        String.isNonEmpty(currentLevel.searchQuery),
      )
      return Option.some(
        Message.SearchedPath({ depth: activeDepth, key, maybeTargetIndex }),
      )
    }

    const openActiveSubmenu = (): Option.Option<Message> =>
      pipe(
        currentLevel.maybeActiveItemIndex,
        Option.flatMap(index =>
          pipe(
            Array.get(current.entries, index),
            Option.filter(isSubmenu),
            Option.filter(entry => !entry.isDisabled),
            Option.map(entry =>
              Message.OpenedSubmenu({
                indexPath: [...openSubmenuIndexPath, index],
                submenuPath: [...current.ids, entry.id],
                maybeActiveItemIndex: childFirstEnabledIndex(
                  entry,
                  [...current.ids, entry.id],
                  [...openSubmenuIndexPath, index],
                ),
              }),
            ),
          ),
        ),
      )

    const activateCurrentEntry = (): Option.Option<Message> =>
      pipe(
        currentLevel.maybeActiveItemIndex,
        Option.filter(index => !currentIsDisabled(index)),
        Option.flatMap(index =>
          pipe(
            Array.get(current.entries, index),
            Option.map(entry => {
              const indexPath = [...openSubmenuIndexPath, index]
              if (isSubmenu(entry)) {
                return Message.OpenedSubmenu({
                  indexPath,
                  submenuPath: [...current.ids, entry.id],
                  maybeActiveItemIndex: childFirstEnabledIndex(
                    entry,
                    [...current.ids, entry.id],
                    indexPath,
                  ),
                })
              }

              return Message.SelectedPathItem({
                index,
                item: entry,
                path: [...current.ids, entry],
                indexPath,
              })
            }),
          ),
        ),
      )

    const handleItemsKeyDown = (
      key: string,
      modifiers: KeyboardModifiers,
    ): Option.Option<Message> => {
      if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) {
        return Option.none()
      }
      return Match.value(key).pipe(
        Match.when('Escape', () =>
          Option.some(
            activeDepth === 0
              ? Message.Closed()
              : Message.ClosedSubmenu({ depth: activeDepth }),
          ),
        ),
        Match.when('ArrowLeft', () =>
          activeDepth === 0
            ? Option.none()
            : Option.some(Message.ClosedSubmenu({ depth: activeDepth })),
        ),
        Match.when('ArrowRight', openActiveSubmenu),
        Match.when('Enter', activateCurrentEntry),
        Match.when(' ', () =>
          String.isNonEmpty(currentLevel.searchQuery)
            ? searchForKey(' ')
            : activateCurrentEntry(),
        ),
        Match.whenOr(
          'ArrowDown',
          'ArrowUp',
          'Home',
          'End',
          'PageUp',
          'PageDown',
          () =>
            Option.map(resolveEnabledIndex(key), index =>
              Message.ActivatedPathItem({
                indexPath: [...openSubmenuIndexPath, index],
                activationTrigger: 'Keyboard',
              }),
            ),
        ),
        Match.when(isPrintableKey, () => searchForKey(key)),
        Match.orElse(() => Option.none()),
      )
    }

    const rootIsDisabled = (index: number): boolean =>
      Option.exists(Array.get(items, index), entry =>
        entryIsDisabled(
          entry,
          index,
          [isSubmenu(entry) ? entry.id : entry],
          [index],
        ),
      )
    const firstEnabledRootIndex = (): Option.Option<number> => {
      if (Array.isReadonlyArrayEmpty(items)) {
        return Option.none()
      }

      const firstIndex = findFirstEnabledIndex(
        Array.length(items),
        0,
        rootIsDisabled,
      )(0, 1)
      return Option.liftPredicate(firstIndex, index => !rootIsDisabled(index))
    }
    const lastEnabledRootIndex = (): Option.Option<number> => {
      if (Array.isReadonlyArrayEmpty(items)) {
        return Option.none()
      }

      const lastIndex = findFirstEnabledIndex(
        Array.length(items),
        0,
        rootIsDisabled,
      )(Array.length(items) - 1, -1)
      return Option.liftPredicate(lastIndex, index => !rootIsDisabled(index))
    }
    const handleButtonKeyDown = (
      key: string,
      modifiers: KeyboardModifiers,
    ): Option.Option<Message> => {
      if (isOpen) {
        return handleItemsKeyDown(key, modifiers)
      }
      if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) {
        return Option.none()
      }
      return Match.value(key).pipe(
        Match.whenOr('Enter', ' ', 'ArrowDown', () =>
          Option.some(
            Message.Opened({
              maybeActiveItemIndex: firstEnabledRootIndex(),
            }),
          ),
        ),
        Match.when('ArrowUp', () =>
          Option.some(
            Message.Opened({
              maybeActiveItemIndex: lastEnabledRootIndex(),
            }),
          ),
        ),
        Match.orElse(() => Option.none()),
      )
    }

    const handleSpaceKeyUp = (key: string): Option.Option<Message> =>
      OptionExt.when(key === ' ', Message.SuppressedSpaceScroll())

    const renderLevel = (
      levelEntries: ReadonlyArray<Entry<string>>,
      parentIndexPath: ReadonlyArray<number>,
      submenuIds: ReadonlyArray<string>,
      depth: number,
    ): Readonly<{ panel: Html; descendantPanels: ReadonlyArray<Html> }> => {
      const level = levelAtDepth(model, depth)
      const panelId = menuLevelId(id, parentIndexPath)
      const isRoot = depth === 0
      const handleItemsPointerUp = (
        screenX: number,
        screenY: number,
        pointerType: string,
        timeStamp: number,
      ): Option.Option<Message> => {
        if (pointerType !== 'mouse') {
          return Option.none()
        }

        return Option.flatMap(level.maybeActiveItemIndex, index =>
          pipe(
            Array.get(levelEntries, index),
            Option.filter(Predicate.isString),
            Option.filter(
              item =>
                !entryIsDisabled(
                  item,
                  index,
                  [...submenuIds, item],
                  [...parentIndexPath, index],
                ),
            ),
            Option.map(item =>
              Message.ReleasedPointerOnPathItem({
                screenX,
                screenY,
                timeStamp,
                index,
                item,
                path: [...submenuIds, item],
                indexPath: [...parentIndexPath, index],
              }),
            ),
          ),
        )
      }
      const levelItems = Array.map(levelEntries, (entry, index) => {
        const indexPath = [...parentIndexPath, index]
        const path = [...submenuIds, isSubmenu(entry) ? entry.id : entry]
        const entryKey = menuEntryKey(
          id,
          submenuIds,
          entry,
          Array.take(levelEntries, index),
        )
        const maybeGroupKey =
          isSubmenu(entry) || !itemGroupKey
            ? Option.none()
            : Option.some(itemGroupKey(entry, index))
        const isActive = Option.exists(
          level.maybeActiveItemIndex,
          activeIndex => activeIndex === index,
        )
        const isDisabled = entryIsDisabled(entry, index, path, indexPath)
        const isOpenSubmenu =
          isSubmenu(entry) &&
          Array.length(openSubmenuIndexPath) > depth &&
          Equal.equals(indexPath, Array.take(openSubmenuIndexPath, depth + 1))
        const context: EntryContext<string> = {
          isActive,
          isDisabled,
          path,
          indexPath,
          isSubmenuOpen: isOpenSubmenu,
          entry,
        }
        const config = isSubmenu(entry)
          ? (submenuToConfig?.(entry, context) ?? {
              content: h.span([], [entry.label]),
            })
          : itemToConfig(entry, context)
        const clickMessage = (): Message => {
          if (isSubmenu(entry)) {
            return Message.ClickedSubmenuTrigger({
              indexPath,
              submenuPath: path,
              maybeActiveItemIndex: childFirstEnabledIndex(
                entry,
                path,
                indexPath,
              ),
            })
          }

          return Message.SelectedPathItem({
            index,
            item: entry,
            path,
            indexPath,
          })
        }

        const rendered = h.keyed('div')(
          entryKey,
          [
            h.Id(pathItemId(id, indexPath)),
            h.Role('menuitem'),
            ...(isSubmenu(entry)
              ? [
                  h.AriaLabel(entry.label),
                  h.AriaHasPopup('menu'),
                  h.AriaExpanded(isOpenSubmenu),
                  h.AriaControls(menuLevelId(id, indexPath)),
                  ...(isOpenSubmenu
                    ? [h.AriaOwns(menuLevelId(id, indexPath))]
                    : []),
                ]
              : []),
            ...(isActive ? [h.DataAttribute('active', '')] : []),
            ...(isDisabled
              ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
              : []),
            ...(!isDisabled && !isLeaving
              ? [
                  h.OnClick(clickMessage()),
                  h.OnPointerMove((_screenX, _screenY, pointerType) => {
                    if (pointerType === 'touch') {
                      return Option.none()
                    }
                    if (isActive && isOpenSubmenu) {
                      return Option.some(Message.CancelledSubmenuClose())
                    }
                    if (isActive) {
                      return Option.none()
                    }
                    if (isSubmenu(entry)) {
                      return Option.some(
                        Message.RequestedSubmenuOpen({
                          indexPath,
                          submenuPath: path,
                          maybeActiveItemIndex: childFirstEnabledIndex(
                            entry,
                            path,
                            indexPath,
                          ),
                        }),
                      )
                    }
                    return Option.some(
                      Message.RequestedPathItemActivation({ indexPath }),
                    )
                  }),
                  ...(isSubmenu(entry)
                    ? [
                        h.OnPointerLeave(pointerType =>
                          OptionExt.when(
                            pointerType !== 'touch',
                            Message.RequestedSubmenuClose({ depth: depth + 1 }),
                          ),
                        ),
                      ]
                    : [
                        h.OnPointerLeave(pointerType =>
                          OptionExt.when(
                            pointerType !== 'touch',
                            Message.LeftPathItem({ indexPath }),
                          ),
                        ),
                      ]),
                ]
              : []),
            ...(config.className ? [h.Class(config.className)] : []),
          ],
          [config.content],
        )
        return { entry, entryKey, maybeGroupKey, rendered }
      })
      const renderGroupedItems = (): ReadonlyArray<Html> => {
        if (!itemGroupKey) {
          return Array.map(levelItems, ({ rendered }) => rendered)
        }

        const segments = groupContiguous(
          levelItems,
          ({ entry, maybeGroupKey }) =>
            isSubmenu(entry)
              ? `submenu-${stablePathKey([entry.id])}`
              : `leaf-${stablePathKey([Option.getOrThrow(maybeGroupKey)])}`,
        )

        return Array.flatMap(segments, (segment, segmentIndex) => {
          const firstItem = Option.getOrThrow(Array.head(segment.items))
          const maybeHeading = Option.flatMap(firstItem.maybeGroupKey, key =>
            Option.fromNullishOr(groupToHeading?.(key)),
          )
          const groupId = `${panelId}-group-${segment.key}-${firstItem.entryKey}`
          const headingId = `${groupId}-heading`
          const heading = Option.match(maybeHeading, {
            onNone: () => [],
            onSome: config => [
              h.keyed('div')(
                headingId,
                [
                  h.Id(headingId),
                  h.Role('presentation'),
                  ...(config.className ? [h.Class(config.className)] : []),
                ],
                [config.content],
              ),
            ],
          })
          const group = h.keyed('div')(
            groupId,
            [
              h.Role('group'),
              ...(Option.isSome(maybeHeading)
                ? [h.AriaLabelledBy(headingId)]
                : []),
              ...(groupClassName ? [h.Class(groupClassName)] : []),
              ...groupAttributes,
            ],
            [
              ...heading,
              ...Array.map(segment.items, ({ rendered }) => rendered),
            ],
          )
          const separator =
            segmentIndex > 0 &&
            (separatorClassName ||
              Array.isReadonlyArrayNonEmpty(separatorAttributes))
              ? [
                  h.keyed('div')(`${panelId}-separator-${segmentIndex}`, [
                    h.Role('separator'),
                    ...(separatorClassName
                      ? [h.Class(separatorClassName)]
                      : []),
                    ...separatorAttributes,
                  ]),
                ]
              : []
          return [...separator, group]
        })
      }
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
      const maybeActiveDescendant = isRoot
        ? Option.match(
            Option.filter(currentLevel.maybeActiveItemIndex, index =>
              Option.isSome(Array.get(current.entries, index)),
            ),
            {
              onNone: () => [],
              onSome: index => [
                h.AriaActiveDescendant(
                  pathItemId(id, [...openSubmenuIndexPath, index]),
                ),
              ],
            },
          )
        : []
      const panel = h.keyed('div')(
        menuLevelKey(id, submenuIds),
        [
          h.Id(panelId),
          h.Role('menu'),
          ...(isRoot
            ? [h.AriaLabelledBy(`${id}-button`)]
            : [h.AriaLabelledBy(pathItemId(id, parentIndexPath))]),
          ...maybeActiveDescendant,
          ...(isRoot ? [h.Tabindex(-1)] : []),
          ...(isRoot ? animationAttributes : []),
          h.Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
          h.OnMount(
            isRoot
              ? AnchorMenu({ buttonId: `${id}-button`, anchor })
              : AnchorSubmenu({
                  itemId: pathItemId(id, parentIndexPath),
                  anchor: {
                    placement: 'right-start',
                    gap: -SUBMENU_OVERLAP_PIXELS,
                    ...submenuAnchor,
                  },
                }),
          ),
          ...(isRoot && !isLeaving
            ? [
                h.OnKeyDownPreventDefault(handleItemsKeyDown),
                h.OnKeyUpPreventDefault(handleSpaceKeyUp),
                h.OnPointerUp(handleItemsPointerUp),
                h.OnBlur(Message.BlurredItems()),
              ]
            : []),
          ...(!isRoot && !isLeaving
            ? [h.OnPointerUp(handleItemsPointerUp)]
            : []),
          ...(!isRoot
            ? [
                h.OnPointerMove((_screenX, _screenY, pointerType) =>
                  OptionExt.when(
                    pointerType !== 'touch',
                    Message.MovedPointerWithinSubmenu({ depth }),
                  ),
                ),
              ]
            : []),
          ...(!isRoot
            ? [
                h.OnPointerLeave(pointerType =>
                  OptionExt.when(
                    pointerType !== 'touch',
                    Message.RequestedSubmenuClose({ depth }),
                  ),
                ),
              ]
            : []),
          ...(itemsClassName ? [h.Class(itemsClassName)] : []),
          ...itemsAttributes,
        ],
        scrollableItems,
      )
      const maybeChildIndex = Array.get(openSubmenuIndexPath, depth)
      const descendantPanels = pipe(
        maybeChildIndex,
        Option.flatMap(index => Array.get(levelEntries, index)),
        Option.filter(isSubmenu),
        Option.filter(entry =>
          Option.contains(Array.get(model.openSubmenuPath, depth), entry.id),
        ),
        Option.match({
          onNone: () => [],
          onSome: entry => {
            const childLevel = renderLevel(
              entry.items,
              [...parentIndexPath, Option.getOrElse(maybeChildIndex, () => 0)],
              [...submenuIds, entry.id],
              depth + 1,
            )
            return [childLevel.panel, ...childLevel.descendantPanels]
          },
        }),
      )
      return { panel, descendantPanels }
    }

    const buttonLabelAttributes = (() => {
      if (Predicate.isNotUndefined(ariaLabel)) {
        return [h.AriaLabel(ariaLabel)]
      } else if (Predicate.isNotUndefined(ariaLabelledBy)) {
        return [h.AriaLabelledBy(ariaLabelledBy)]
      } else {
        return []
      }
    })()
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
            h.OnPointerDown(
              (pointerType, button, screenX, screenY, timeStamp) =>
                Option.some(
                  Message.PressedPointerOnButton({
                    pointerType,
                    button,
                    screenX,
                    screenY,
                    timeStamp,
                  }),
                ),
            ),
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
    const backdrop = h.keyed('div')(`${id}-backdrop`, [
      h.OnMount(PortalMenuBackdrop()),
      ...(isLeaving ? [] : [h.OnClick(Message.Closed())]),
      ...(backdropClassName ? [h.Class(backdropClassName)] : []),
      ...backdropAttributes,
    ])
    const rootLevel = renderLevel(items, [], [], 0)
    const submenuLayer = h.keyed('div')(
      `${id}-submenu-layer`,
      [
        h.Id(`${id}-submenu-layer`),
        h.OnMount(
          PortalSubmenuLayer({ isPortal: submenuAnchor.portal ?? true }),
        ),
      ],
      rootLevel.descendantPanels,
    )

    return h.div(
      [
        ...(className ? [h.Class(className)] : []),
        ...attributes,
        ...(isVisible ? [h.DataAttribute('open', '')] : []),
      ],
      [
        h.keyed('button')(`${id}-button`, resolvedButtonAttributes, [
          buttonContent,
        ]),
        ...(isVisible ? [backdrop, rootLevel.panel, submenuLayer] : []),
      ],
    )
  },
)

/** The `view`, `update`, and programmatic helpers that `Menu.create`
 *  returns, bound to one `Item` type. Name it to annotate a value that
 *  holds a created bundle, such as a field on a config object or a
 *  function parameter that takes the bundle rather than calling `create`
 *  itself. */
type BundleUpdateReturn<Item extends string> = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage<Item>
>

export type Bundle<Item extends string = string> = Readonly<{
  view: SubmodelView<Model, Message, ViewInputs<Item>>
  update: (model: Model, message: Message) => BundleUpdateReturn<Item>
  selectItem: (
    model: Model,
    item: Item,
    index: number,
  ) => BundleUpdateReturn<Item>
  open: (model: Model) => BundleUpdateReturn<Item>
  close: (model: Model) => BundleUpdateReturn<Item>
}>

/** Pairs the menu's `view` and `update` (and programmatic helpers)
 *  behind a single Item-typed entry point. Declaring the menu once at
 *  module scope ensures the view's `Item` type and the OutMessage's
 *  `item` type can't drift:
 *
 *  ```ts
 *  const ActionMenu = Menu.create<Action>()
 *
 *  // In view:
 *  h.submodel({ view: ActionMenu.view, ... })
 *
 *  // In the parent update, pass ActionMenu.update to Update.foldChild and
 *  // handle Menu.OutMessage<Action> in foldOutMessage.
 *  ```
 */
export const create = <Item extends string = string>(): Bundle<Item> => {
  type GenericReturn = Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage<Item>
  >
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

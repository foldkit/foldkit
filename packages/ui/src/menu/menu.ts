import {
  Array,
  Context,
  Effect,
  Equal,
  Function,
  Layer,
  Match,
  Option,
  Predicate,
  Schema,
  String,
  Tuple,
  pipe,
} from 'effect'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute, Html } from 'foldkit/html'
import * as BlockFamily from 'foldkit/internal/block'
import {
  type MessageUnion,
  defineInMessageUnion,
  defineMessageUnion,
} from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import { AnchorConfig, anchorSetup, portalBackdrop } from '../anchor/index.js'
import * as Animation from '../animation/index.js'
import { groupContiguous } from '../group.js'
import { makeFixedFamilyLayer } from '../internal/fixedFamily.js'
import * as OptionExt from '../internal/optionExtensions.js'
import { idSelector } from '../internal/selectors.js'
import {
  findFirstEnabledIndex,
  isPrintableKey,
  keyToIndex,
} from '../keyboard.js'
import { resolveTypeaheadMatch } from '../typeahead.js'
import { MenuNamespace } from './definition.js'

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
  animation: Animation.AnimationBlock.Model,
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

/** Parent opening and closing requests, separate from local interactions. */
export const InMessage = defineInMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
})
export type InMessage = typeof InMessage.Type
export type RequestedOpen = typeof InMessage.RequestedOpen.Type
export type RequestedClose = typeof InMessage.RequestedClose.Type
export type RequestedSelectItem = typeof Message.RequestedSelectItem.Type

// OUT MESSAGE

/** Union of OutMessages the menu component can produce. The parent handles
 *  them through the Menu connection's OutMessage fold. */
export const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String, index: Schema.Number },
  Closed: {},
})

/** The OutMessage union interface on a completed Menu, refined to its Item
 * type. */
export type OutMessageSchema<Item extends string = string> =
  typeof OutMessage extends MessageUnion<infer Cases>
    ? MessageUnion<
        Omit<Cases, 'Selected'> &
          Readonly<{
            Selected: Omit<Cases['Selected'], 'value'> &
              Readonly<{
                value: Schema.Codec<Item, Item> &
                  Readonly<{ '~type.make': Item }>
              }>
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

/** Configuration for creating a Menu occurrence. */
export const InitConfig = Schema.Struct({
  id: Schema.String,
  isAnimated: Schema.optionalKey(Schema.Boolean),
  isModal: Schema.optionalKey(Schema.Boolean),
})
export type InitConfig = typeof InitConfig.Type

const makeInitialModel = (config: InitConfig): Omit<Model, 'animation'> => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
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
  modifyFields(model, {
    isOpen: () => false,
    maybeActiveItemIndex: () => Option.none(),
    searchQuery: () => '',
    searchVersion: () => 0,
    maybeLastPointerPosition: () => Option.none(),
    maybeLastButtonPointerType: () => Option.none(),
    maybePointerOrigin: () => Option.none(),
  })

/** Returns the bare DOM id of the menu trigger button, derived from the
 *  menu's base id. Use this to associate an external label with the trigger
 *  via a native `<label for={Menu.buttonId(id)}>` or an `aria-labelledby`
 *  reference. */
export const buttonId = (id: string): string => `${id}-button`

const buttonSelector = (id: string): string => idSelector(`${id}-button`)
const itemsSelector = (id: string): string => idSelector(`${id}-items`)
const itemSelector = (id: string, index: number): string =>
  idSelector(`${id}-item-${index}`)

/** Prevents page scrolling while the menu is open. */
export const LockMenuScroll = MenuNamespace.makeCommand('LockMenuScroll', {
  messages: [Message.CompletedLockMenuScroll],
  handler: function* () {
    return () =>
      Dom.lockScroll.pipe(Effect.as(Message.CompletedLockMenuScroll()))
  },
})
/** Re-enables page scrolling after the menu closes. */
export const UnlockMenuScroll = MenuNamespace.makeCommand('UnlockMenuScroll', {
  messages: [Message.CompletedUnlockMenuScroll],
  handler: function* () {
    return () =>
      Dom.unlockScroll.pipe(Effect.as(Message.CompletedUnlockMenuScroll()))
  },
})
/** Marks all elements outside the menu as inert for modal behavior. */
export const InertMenuOthers = MenuNamespace.makeCommand('InertMenuOthers', {
  args: { id: Schema.String },
  messages: [Message.CompletedInertMenuOthers],
  handler: function* () {
    return ({ id }) =>
      Dom.inertOthers(id, [buttonSelector(id), itemsSelector(id)]).pipe(
        Effect.as(Message.CompletedInertMenuOthers()),
      )
  },
})
/** Removes the inert attribute from elements outside the Menu. */
export const RestoreMenuInert = MenuNamespace.makeCommand('RestoreMenuInert', {
  args: { id: Schema.String },
  messages: [Message.CompletedRestoreMenuInert],
  handler: function* () {
    return ({ id }) =>
      Dom.restoreInert(id).pipe(Effect.as(Message.CompletedRestoreMenuInert()))
  },
})
/** Moves focus to the menu items container after opening. */
export const FocusMenuItems = MenuNamespace.makeCommand('FocusMenuItems', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusMenuItems],
  handler: function* () {
    return ({ id }) =>
      Dom.focus(itemsSelector(id)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusMenuItems()),
      )
  },
})
/** Moves focus back to the menu button after closing. */
export const FocusMenuButton = MenuNamespace.makeCommand('FocusMenuButton', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusMenuButton],
  handler: function* () {
    return ({ id }) =>
      Dom.focus(buttonSelector(id)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusMenuButton()),
      )
  },
})
/** Scrolls the active menu item into view after keyboard navigation. */
export const ScrollMenuItemIntoView = MenuNamespace.makeCommand(
  'ScrollMenuItemIntoView',
  {
    args: { id: Schema.String, index: Schema.Number },
    messages: [Message.CompletedScrollMenuItemIntoView],
    handler: function* () {
      return ({ id, index }) =>
        Dom.scrollIntoView(itemSelector(id, index)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedScrollMenuItemIntoView()),
        )
    },
  },
)
/** Programmatically clicks the active menu item's DOM element. */
export const ClickMenuItem = MenuNamespace.makeCommand('ClickMenuItem', {
  args: { id: Schema.String, index: Schema.Number },
  messages: [Message.CompletedClickMenuItem],
  handler: function* () {
    return ({ id, index }) =>
      Dom.clickElement(itemSelector(id, index)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedClickMenuItem()),
      )
  },
})
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearMenuSearch = MenuNamespace.makeCommand(
  'DelayClearMenuSearch',
  {
    args: { version: Schema.Number },
    messages: [Message.CompletedDelayClearMenuSearch],
    handler: function* () {
      return ({ version }) =>
        Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
          Effect.as(Message.CompletedDelayClearMenuSearch({ version })),
        )
    },
  },
)
/** Detects whether the menu button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation block that leave is complete. */
export const DetectMenuMovementOrAnimationEnd = MenuNamespace.makeCommand(
  'DetectMenuMovementOrAnimationEnd',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.CompletedDetectMenuMovementOrAnimationEnd],
    handler: function* () {
      return ({ id, generation }) =>
        Effect.raceFirst(
          Dom.detectElementMovement(buttonSelector(id)).pipe(
            Effect.as(
              Message.CompletedDetectMenuMovementOrAnimationEnd({ generation }),
            ),
          ),
          Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
            Effect.as(
              Message.CompletedDetectMenuMovementOrAnimationEnd({ generation }),
            ),
          ),
        )
    },
  },
)

const detectMenuMovementOrAnimationEnd = (generation: number) =>
  MenuBlock.makeCommandsStep(model => [
    DetectMenuMovementOrAnimationEnd({ id: model.id, generation }),
  ])

const makeTransitions =
  (animationBinding: typeof AnimationBinding) => (model: Model) => {
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
      if (model.isAnimated) {
        return Update.combineSteps([
          MenuBlock.makeStep(() => ({
            model: baseModel,
            commands: openCommands,
          })),
          animationBinding.requestShow(),
          MenuBlock.makeFieldsStep(() => ({ isOpen: () => true })),
        ])
      }

      return {
        model: modifyFields(baseModel, { isOpen: () => true }),
        commands: openCommands,
      }
    }

    const closeMenu = (
      baseModel: Model,
      commands: typeof closeWithFocusCommands,
      outMessage?: OutMessage,
    ) => {
      if (!baseModel.isOpen) {
        return Update.withOutMessage({ model: baseModel }, outMessage)
      }

      const closed = closedModel(baseModel)
      const closeOutMessage = outMessage ?? OutMessage.Closed()

      if (model.isAnimated) {
        return MenuBlock.makeStep(() =>
          Function.compose(
            Update.combineSteps([
              MenuBlock.makeStep(() => ({ model: closed, commands })),
              animationBinding.requestHide(),
            ]),
            Update.withOutMessage(closeOutMessage),
          ),
        )
      }

      return Update.withOutMessage({ model: closed, commands }, closeOutMessage)
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
      closeMenu(
        model,
        closeWithFocusCommands,
        OutMessage.Selected({ value: item, index }),
      )

    return {
      requestOpen: () => openWithActiveItem(Option.none()),
      requestClose: () => closeMenu(model, closeWithFocusCommands),
      update: (message: Message) =>
        Message.match(message, {
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

          RequestedSelectItem: ({ index, item }) => selectItem(index, item),

          Opened: ({ maybeActiveItemIndex }) =>
            openWithActiveItem(maybeActiveItemIndex),

          Closed: () => closeMenu(model, closeWithFocusCommands),

          BlurredItems: () => {
            if (
              Option.exists(
                model.maybeLastButtonPointerType,
                Equal.equals('mouse'),
              )
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
                maybeLastPointerPosition: () =>
                  Option.some({ screenX, screenY }),
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
                  Option.orElse(
                    maybeTargetIndex,
                    () => model.maybeActiveItemIndex,
                  ),
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

          CompletedDetectMenuMovementOrAnimationEnd: ({ generation }) =>
            animationBinding.requestFinish(generation),

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
                return MenuBlock.makeStep(() =>
                  Function.compose(
                    Update.combineSteps([
                      MenuBlock.makeStep(() => ({
                        model: closed,
                        commands: closeWithFocusCommands,
                      })),
                      animationBinding.requestHide(),
                    ]),
                    Update.withOutMessage(OutMessage.Closed()),
                  ),
                )
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
                timeStamp - origin.timeStamp <
                POINTER_HOLD_THRESHOLD_MILLISECONDS,
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
              Option.exists(
                model.maybeLastButtonPointerType,
                Equal.equals('mouse'),
              )
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
        }),
    }
  }

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
export const AnchorMenu = MenuNamespace.makeMount('AnchorMenu', {
  args: { buttonId: Schema.String, anchor: AnchorConfig },
  messages: [Message.CompletedAnchorMenu],
  handler: function* () {
    return ({ element, buttonId, anchor }) =>
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
      })
  },
})

/** The backdrop-portaling Mount this Menu renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalMenuBackdrop, Message.CompletedPortalMenuBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalMenuBackdrop = MenuNamespace.makeMount(
  'PortalMenuBackdrop',
  {
    messages: [Message.CompletedPortalMenuBackdrop],
    handler: function* () {
      return ({ element }) =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => portalBackdrop(element)),
            cleanup => Effect.sync(cleanup),
          )
          return Message.CompletedPortalMenuBackdrop()
        })
    },
  },
)

/** Mount definitions rendered by Menu. */
export const mounts = [AnchorMenu, PortalMenuBackdrop]

/** @internal Nominal identity of the Menu contract. */
export const MenuKey = Symbol('Menu')
const MenuBlock = Block.make(MenuNamespace, {
  key: MenuKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([InitConfig]),
  ChildInitContext: InitConfig,
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<ViewInputs<string>>(),
    mounts,
  },
  inMessageOutputs: {
    RequestedOpen: { outMessage: OutMessage },
    RequestedClose: { outMessage: OutMessage },
  },
  operations: {
    requestSelectItem: {
      message: (item: string, index: number) =>
        Tuple.make(Message.RequestedSelectItem({ index, item })),
      outMessage: OutMessage,
    },
  },
})

const foldAnimationOutMessage = MenuBlock.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: ({ generation }) =>
      detectMenuMovementOrAnimationEnd(generation),
    TransitionedOut: MenuBlock.makeNoopStep,
  },
)

const AnimationBinding = MenuBlock.makeRequiredFieldBinding(
  Animation.AnimationBlock,
  {
    field: 'animation',
    init: { contextToArgs: config => [{ id: `${config.id}-items` }] },
  },
).withOutMessagePolicy({ fold: foldAnimationOutMessage })

const MenuComposition = MenuBlock.makeComposition({
  mounts,
  bindings: [AnimationBinding],
})
/** Creates an initial menu Model and Commands from a config. Defaults to closed with no active item. */
const init = MenuComposition.makeInit(config => ({
  model: makeInitialModel(config),
  childInitContext: config,
}))
type MenuViewBuilder = Block.ViewBuilderFor<typeof MenuComposition>
const transitions = makeTransitions(AnimationBinding)
const defaultUpdate = (model: Model, message: Message) =>
  transitions(model).update(message)
const applyMenuMessage = MenuBlock.makeStep(
  (model, message: Parameters<typeof defaultUpdate>[1]) =>
    defaultUpdate(model, message),
)

/** Processes a Menu Message and returns the next Model, optional Commands, and
 *  an optional OutMessage. */
const update = MenuComposition.makeUpdate({
  RequestedSelectItem: applyMenuMessage,
  Opened: applyMenuMessage,
  Closed: applyMenuMessage,
  BlurredItems: applyMenuMessage,
  ActivatedItem: applyMenuMessage,
  DeactivatedItem: applyMenuMessage,
  SelectedItem: applyMenuMessage,
  RequestedItemClick: applyMenuMessage,
  Searched: applyMenuMessage,
  CompletedDelayClearMenuSearch: applyMenuMessage,
  MovedPointerOverItem: applyMenuMessage,
  CompletedFocusMenuItems: applyMenuMessage,
  CompletedFocusMenuButton: applyMenuMessage,
  CompletedLockMenuScroll: applyMenuMessage,
  CompletedUnlockMenuScroll: applyMenuMessage,
  CompletedInertMenuOthers: applyMenuMessage,
  CompletedRestoreMenuInert: applyMenuMessage,
  CompletedScrollMenuItemIntoView: applyMenuMessage,
  CompletedClickMenuItem: applyMenuMessage,
  ClickedButton: applyMenuMessage,
  IgnoredMouseClick: applyMenuMessage,
  SuppressedSpaceScroll: applyMenuMessage,
  CompletedAnchorMenu: applyMenuMessage,
  CompletedPortalMenuBackdrop: applyMenuMessage,
  CompletedDetectMenuMovementOrAnimationEnd: applyMenuMessage,
  PressedPointerOnButton: applyMenuMessage,
  ReleasedPointerOnItems: applyMenuMessage,
})

const inMessageUpdate = MenuComposition.makeInMessageUpdate({
  RequestedOpen: MenuBlock.makeStep(model => transitions(model).requestOpen()),
  RequestedClose: MenuBlock.makeStep(model =>
    transitions(model).requestClose(),
  ),
})

const EffectsLayer = Layer.mergeAll(
  LockMenuScroll.layer,
  UnlockMenuScroll.layer,
  InertMenuOthers.layer,
  RestoreMenuInert.layer,
  FocusMenuItems.layer,
  FocusMenuButton.layer,
  ScrollMenuItemIntoView.layer,
  ClickMenuItem.layer,
  DelayClearMenuSearch.layer,
  DetectMenuMovementOrAnimationEnd.layer,
  AnchorMenu.layer,
  PortalMenuBackdrop.layer,
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

/** Per-render view inputs passed to the Menu connection's `embedView` method.
 *
 *  The Menu emits `OutMessage.Selected({ value, index })` on commit and
 *  `OutMessage.Closed()` when an open Menu closes without selection. `Closed`
 *  is emitted by the update that closes the Menu, before any animation or
 *  cleanup Commands complete. Handle each variant in the Menu connection's
 *  OutMessage fold. */
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

type MenuInputs = ViewInputs<string>

const menuViewImpl = (
  model: Model,
  viewInputs: MenuInputs,
  h: MenuViewBuilder,
) => {
  const {
    id,
    isOpen,
    animation: { transitionState },
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

  const maybeActiveItemIndex = pipe(
    model.maybeActiveItemIndex,
    Option.filter(index => index >= 0 && index < items.length),
  )

  const dispatchSelectedItem = (item: string, index: number) =>
    Message.SelectedItem({ index, item })

  const isLeaving =
    transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
  const isVisible = isOpen || isLeaving

  const animationAttributes: ReadonlyArray<ReturnType<typeof h.DataAttribute>> =
    Match.value(transitionState).pipe(
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

  const maybeFirstEnabledIndex = Array.isReadonlyArrayEmpty(items)
    ? Option.none<number>()
    : Option.some(findFirstEnabledIndex(items.length, 0, isDisabled)(0, 1))

  const maybeLastEnabledIndex = Array.isReadonlyArrayEmpty(items)
    ? Option.none<number>()
    : Option.some(
        findFirstEnabledIndex(
          items.length,
          0,
          isDisabled,
        )(items.length - 1, -1),
      )

  const handleButtonKeyDown = (key: string): Option.Option<Message> => {
    if (isOpen) {
      return handleItemsKeyDown(key)
    }

    return Match.value(key).pipe(
      Match.whenOr('Enter', ' ', 'ArrowDown', () =>
        Option.some(
          Message.Opened({
            maybeActiveItemIndex: maybeFirstEnabledIndex,
          }),
        ),
      ),
      Match.when('ArrowUp', () =>
        Option.some(
          Message.Opened({
            maybeActiveItemIndex: maybeLastEnabledIndex,
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

  const resolveActiveIndex = (key: string): Option.Option<number> =>
    Option.match(maybeActiveItemIndex, {
      onNone: () =>
        Match.value(key).pipe(
          Match.whenOr(
            'ArrowUp',
            'End',
            'PageDown',
            () => maybeLastEnabledIndex,
          ),
          Match.orElse(() => maybeFirstEnabledIndex),
        ),
      onSome: activeIndex =>
        Option.some(
          keyToIndex(
            'ArrowDown',
            'ArrowUp',
            items.length,
            activeIndex,
            isDisabled,
          )(key),
        ),
    })

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
          Option.map(resolveActiveIndex(key), index =>
            Message.ActivatedItem({
              index,
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

const view = MenuComposition.makeView.withInputs(menuViewImpl)

/** @internal Acquired implementation used by focused library tests. */
const canonicalLayer = MenuBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
}).pipe(Layer.provide(Animation.layer))
/** Constructs Menu and its private Animation dependency. */
type CanonicalIdentity = Block.SelectedPublicIdentity<typeof MenuBlock>
const MenuRefinementRule = Symbol('Menu.Refinement')
/** @internal Closed type-only refinement identity. */
export interface MenuRefinementKey {
  readonly [MenuRefinementRule]: true
}
type CanonicalImplementation = Extract<
  Layer.Success<typeof canonicalLayer>,
  Block.SelectedImplementationFacts<
    CanonicalIdentity,
    unknown,
    unknown,
    unknown
  >
>
/** @internal Captured implementation capability for this fixed family. */
export interface SharedMenuProof extends Block.ClosedFamilyCapability<MenuRefinementKey> {}
/** @internal The shared provider's original canonical implementation facts. */
export interface SharedMenuFacts extends Block.FixedRefinementProvider<
  MenuRefinementKey,
  CanonicalIdentity,
  CanonicalImplementation
> {}
const SharedMenuProof = Context.Service<
  SharedMenuProof,
  Readonly<{ executable: object }>
>('foldkit/ui/private/Menu.SharedImplementation')
const SharedMenuFacts = Context.Service<
  SharedMenuFacts,
  Readonly<Record<never, never>>
>('foldkit/ui/private/Menu.SharedFacts')
/** Constructs the original shared implementation for type-only specializations. */
export const layer = makeFixedFamilyLayer(
  MenuBlock,
  canonicalLayer,
  BlockFamily.readDeclaredExecutable(MenuBlock),
  SharedMenuProof,
  SharedMenuFacts,
)

Reflect.deleteProperty(MenuBlock, 'makeLayer')
Reflect.deleteProperty(MenuBlock, 'provideHandlers')
Object.freeze(MenuBlock)

/** @internal Selected implementation used by component tests. */
export const block = { block: MenuBlock, layer }

/** @internal Shared Animation relationship for focused transition tests. */
export { AnimationBinding }

type CanonicalContract = typeof MenuBlock
type CanonicalFacts = Block.FactsOf<CanonicalContract>
type RefinedFacts<Item extends string> = Omit<
  CanonicalFacts,
  'view' | 'update' | 'operations'
> &
  Readonly<{
    view: Block.ViewContract<ViewInputs<Item>, 'Element'>
    update: Block.ResultContract<
      OutMessage<Item>,
      CanonicalFacts['update']['requirements']
    >
    operations: Readonly<{
      requestOpen: Block.OperationContract<
        readonly [],
        OutMessage<Item>,
        CanonicalFacts['operations']['requestOpen']['requirements']
      >
      requestClose: Block.OperationContract<
        readonly [],
        OutMessage<Item>,
        CanonicalFacts['operations']['requestClose']['requirements']
      >
      requestSelectItem: Block.OperationContract<
        readonly [item: Item, index: number],
        OutMessage<Item>,
        CanonicalFacts['operations']['requestSelectItem']['requirements']
      >
    }>
  }>
type RefinedContract<Item extends string> = Block.Contract<
  CanonicalContract['owner'],
  CanonicalContract['Model'],
  CanonicalContract['Message'],
  OutMessageSchema<Item>,
  RefinedFacts<Item>
>
type RefinedConfiguration<Item extends string> = Readonly<{
  key: typeof MenuKey
  InMessage: typeof InMessage
  InitArgs: Schema.Tuple<readonly [typeof InitConfig]>
  ChildInitContext: typeof InitConfig
  view: Readonly<{
    kind: 'Element'
    Inputs: Block.InputContract<ViewInputs<Item>>
    mounts: typeof mounts
  }>
  inMessageOutputs: Readonly<{
    RequestedOpen: Readonly<{ outMessage: OutMessageSchema<Item> }>
    RequestedClose: Readonly<{ outMessage: OutMessageSchema<Item> }>
  }>
  operations: Readonly<{
    requestSelectItem: Readonly<{
      message: (
        item: Item,
        index: number,
      ) => readonly [typeof Message.RequestedSelectItem.Type]
      outMessage: OutMessageSchema<Item>
    }>
  }>
}>
/** @internal Names the exact private reader of this fixed-family specialization. */
export interface MenuReader<Item extends string> extends Block.ReadableProvider<
  MenuRefinementKey,
  Block.SelectedPublicIdentity<RefinedContract<Item>>
> {}

type RefinedBlock<Item extends string> = Omit<
  Block.UnifiedBlock<
    'Menu',
    CanonicalContract['Model'],
    CanonicalContract['Message'],
    OutMessageSchema<Item>,
    typeof InitConfig,
    RefinedConfiguration<Item>,
    CanonicalIdentity,
    MenuReader<Item>
  >,
  'makeLayer' | 'provideHandlers' | keyof RefinedContract<Item>
> &
  Omit<RefinedContract<Item>, 'get'>
/** Passive Menu contract retaining exact controlled inputs and result channels. */
export interface Completed<Item extends string = string>
  extends
    RefinedBlock<Item>,
    Block.FixedRefinement<
      MenuRefinementKey,
      CanonicalIdentity,
      Block.SelectedPublicIdentity<RefinedContract<Item>>
    > {}

/** Creates the typed contract; supply Menu.layer when constructing the parent. */
export const makeBlock = <Item extends string = string>(): Completed<Item> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  MenuBlock as unknown as Completed<Item>

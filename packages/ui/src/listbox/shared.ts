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
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute, Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import * as Mount from 'foldkit/mount'
import { makeConstrainedEvo } from 'foldkit/struct'
import { type View as SubmodelView, defineView } from 'foldkit/submodel'
import * as Update from 'foldkit/update'

import { AnchorConfig, anchorSetup, portalToContainingRoot } from '../anchor.js'
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
import * as OptionExt from '../internal/optionExtensions.js'
import { idSelector } from '../internal/selectors.js'
import {
  findFirstEnabledIndex,
  isPrintableKey,
  keyToIndex,
} from '../keyboard.js'
import { resolveTypeaheadMatch } from '../typeahead.js'

export { resolveTypeaheadMatch }

// MODEL

/** Schema for the activation trigger: whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literals(['Pointer', 'Keyboard'])
export type ActivationTrigger = typeof ActivationTrigger.Type

/** Schema for the listbox orientation: whether items flow vertically or horizontally. */
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

/** Sent when the listbox opens via button click or keyboard. Contains an optional initial active item index: None for pointer, Some for keyboard. */
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
export const CompletedDelayClearSearch = m('CompletedDelayClearSearch', {
  version: S.Number,
})
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
export const CompletedInertOthers = m('CompletedInertOthers')
/** Sent when the restore-inert command completes. */
export const CompletedRestoreInert = m('CompletedRestoreInert')
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
/** Sent when Enter or Space would commit the active item but the listbox is read-only. Update no-ops; the Message keeps the keypress visible and lets the view prevent the browser's default Space scroll. */
export const SuppressedItemCommit = m('SuppressedItemCommit')
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
    typeof CompletedDelayClearSearch,
    typeof CompletedLockScroll,
    typeof CompletedUnlockScroll,
    typeof CompletedInertOthers,
    typeof CompletedRestoreInert,
    typeof CompletedFocusButton,
    typeof CompletedFocusItems,
    typeof CompletedScrollIntoView,
    typeof CompletedClickItem,
    typeof IgnoredMouseClick,
    typeof SuppressedSpaceScroll,
    typeof SuppressedItemCommit,
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
  CompletedDelayClearSearch,
  CompletedLockScroll,
  CompletedUnlockScroll,
  CompletedInertOthers,
  CompletedRestoreInert,
  CompletedFocusButton,
  CompletedFocusItems,
  CompletedScrollIntoView,
  CompletedClickItem,
  IgnoredMouseClick,
  SuppressedSpaceScroll,
  SuppressedItemCommit,
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
export type CompletedDelayClearSearch = typeof CompletedDelayClearSearch.Type
export type IgnoredMouseClick = typeof IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof SuppressedSpaceScroll.Type
export type SuppressedItemCommit = typeof SuppressedItemCommit.Type
export type PressedPointerOnButton = typeof PressedPointerOnButton.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent when the user activates an item (single-select commit or multi-select toggle). Carries the neutral fact that the item was activated; the parent owns the selection and decides what it means (single-select sets it, multi-select toggles membership). Generic over `Value extends string`: the runtime schema stores `value: string`, but the type-level OutMessage exposes `value: Value` so consumers who supply `items: ReadonlyArray<MyUnion>` receive `value: MyUnion` from `update<MyUnion>` without casting. The cast is fenced inside this module's `update` return, sound because the value was extracted from the items array the consumer supplied. */
export const Selected = m('Selected', {
  value: S.String,
})

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
}>

/** Union of out-messages the listbox component can produce. The parent folds `Selected` into the selection it owns: single-select stores the value, multi-select toggles the value's membership. */
export const OutMessage = S.Union([Selected])

/** Generic over `Value extends string` so consumers who create the listbox
 *  via `Listbox.create<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage from the factory's `update`, instead of
 *  `value: string`. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

// CONSTANTS

export const SEARCH_DEBOUNCE_MILLISECONDS = 350
export const LEFT_MOUSE_BUTTON = 0

// SELECTORS

export const buttonSelector = (id: string): string => idSelector(`${id}-button`)

/** Returns the bare DOM id of the listbox trigger button, derived from the
 *  listbox's base id. Use this to associate an external label with the
 *  trigger via a native `<label for={Listbox.buttonId(id)}>` or an
 *  `aria-labelledby` reference. Mirrors `buttonSelector`, which returns the
 *  CSS selector form (`#${id}-button`) rather than the bare id. */
export const buttonId = (id: string): string => `${id}-button`

export const itemsSelector = (id: string): string => idSelector(`${id}-items`)
export const itemSelector = (id: string, index: number): string =>
  idSelector(`${id}-item-${index}`)
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
    maybeOutMessage?: Option.Option<OutMessage>,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage>,
  ]
  closeWithoutFocus: (
    model: Model,
    maybeOutMessage?: Option.Option<OutMessage>,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage>,
  ]
}>

/** Prevents page scrolling while the listbox is open in modal mode. */
export const LockScroll = Command.define('LockScroll', {
  messages: [CompletedLockScroll],
  execute: Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
})
/** Re-enables page scrolling after the listbox closes. */
export const UnlockScroll = Command.define('UnlockScroll', {
  messages: [CompletedUnlockScroll],
  execute: Dom.unlockScroll.pipe(Effect.as(CompletedUnlockScroll())),
})
/** Marks all elements outside the listbox as inert for modal behavior. */
export const InertOthers = Command.define('InertOthers', {
  args: { id: S.String },
  messages: [CompletedInertOthers],
  execute: ({ id }) =>
    Dom.inertOthers(id, [buttonSelector(id), itemsSelector(id)]).pipe(
      Effect.as(CompletedInertOthers()),
    ),
})
/** Removes the inert attribute from elements outside the listbox. */
export const RestoreInert = Command.define('RestoreInert', {
  args: { id: S.String },
  messages: [CompletedRestoreInert],
  execute: ({ id }) =>
    Dom.restoreInert(id).pipe(Effect.as(CompletedRestoreInert())),
})
/** Moves focus back to the listbox button after closing. */
export const FocusButton = Command.define('FocusButton', {
  args: { id: S.String },
  messages: [CompletedFocusButton],
  execute: ({ id }) =>
    Dom.focus(buttonSelector(id)).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusButton()),
    ),
})
/** Moves focus to the listbox items container after opening. */
export const FocusItems = Command.define('FocusItems', {
  args: { id: S.String },
  messages: [CompletedFocusItems],
  execute: ({ id }) =>
    Dom.focus(itemsSelector(id)).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusItems()),
    ),
})
/** Scrolls the active listbox item into view after keyboard navigation. */
export const ScrollIntoView = Command.define('ScrollIntoView', {
  args: { id: S.String, index: S.Number },
  messages: [CompletedScrollIntoView],
  execute: ({ id, index }) =>
    Dom.scrollIntoView(itemSelector(id, index)).pipe(
      Effect.ignore,
      Effect.as(CompletedScrollIntoView()),
    ),
})
/** Programmatically clicks the active listbox item's DOM element. */
export const ClickItem = Command.define('ClickItem', {
  args: { id: S.String, index: S.Number },
  messages: [CompletedClickItem],
  execute: ({ id, index }) =>
    Dom.clickElement(itemSelector(id, index)).pipe(
      Effect.ignore,
      Effect.as(CompletedClickItem()),
    ),
})
/** Waits for the typeahead search debounce period before clearing the query. */
export const DelayClearSearch = Command.define('DelayClearSearch', {
  args: { version: S.Number },
  messages: [CompletedDelayClearSearch],
  execute: ({ version }) =>
    Effect.sleep(SEARCH_DEBOUNCE_MILLISECONDS).pipe(
      Effect.as(CompletedDelayClearSearch({ version })),
    ),
})
/** Detects whether the listbox button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  {
    args: { id: S.String },
    messages: [GotAnimationMessage],
    execute: ({ id }) =>
      Effect.raceFirst(
        Dom.detectElementMovement(buttonSelector(id)).pipe(
          Effect.as(
            GotAnimationMessage({ message: AnimationEndedAnimation() }),
          ),
        ),
        Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
          Effect.as(
            GotAnimationMessage({ message: AnimationEndedAnimation() }),
          ),
        ),
      ),
  },
)

export const makeUpdate = <Model extends BaseModel>(
  handleSelectedItem: (
    model: Model,
    item: string,
    context: SelectedItemContext<Model>,
  ) => readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage>,
  ],
) => {
  type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage>,
  ]
  const withUpdateReturn = M.withReturnType<UpdateReturn>()

  const foldAnimationOutMessage = M.type<AnimationOutMessage>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      StartedLeaveAnimating: () => model => [
        model,
        [DetectMovementOrAnimationEnd({ id: model.id })],
      ],
      TransitionedOut: () => model => [model, []],
    }),
  )

  const foldAnimation = Update.foldChild({
    update: animationUpdate,
    read: (model: Model) => Option.some(model.animation),
    write: (model, nextAnimation) =>
      constrainedEvo(model, { animation: () => nextAnimation }),
    toParentMessage: message => GotAnimationMessage({ message }),
    toParentOutMessage: () => Option.none(),
    foldOutMessage: foldAnimationOutMessage,
  })

  const openListbox = (
    baseModel: Model,
    openCommands: ReadonlyArray<Command.Command<Message>>,
  ): UpdateReturn => {
    if (baseModel.isAnimated) {
      const [nextModel, animationCommands] = foldAnimation(
        baseModel,
        AnimationShowed(),
      )
      return [
        constrainedEvo(nextModel, { isOpen: () => true }),
        [...openCommands, ...animationCommands],
        Option.none(),
      ]
    }

    return [
      constrainedEvo(baseModel, { isOpen: () => true }),
      openCommands,
      Option.none(),
    ]
  }

  const closeListbox = (
    baseModel: Model,
    commands: ReadonlyArray<Command.Command<Message>>,
    maybeOutMessage: Option.Option<OutMessage> = Option.none(),
  ): UpdateReturn => {
    if (!baseModel.isOpen) {
      return [baseModel, [], maybeOutMessage]
    }

    const closed = closedModel(baseModel)

    if (baseModel.isAnimated) {
      const [nextModel, animationCommands] = foldAnimation(
        closed,
        AnimationHid(),
      )
      return [nextModel, [...commands, ...animationCommands], maybeOutMessage]
    }

    return [closed, commands, maybeOutMessage]
  }

  const internalUpdate = (model: Model, message: Message): UpdateReturn => {
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

    const focusButton = FocusButton({ id: model.id })
    const focusItems = FocusItems({ id: model.id })

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
      M.tag(
        'CompletedLockScroll',
        'CompletedUnlockScroll',
        'CompletedInertOthers',
        'CompletedRestoreInert',
        'CompletedFocusButton',
        'CompletedFocusItems',
        'CompletedScrollIntoView',
        'CompletedClickItem',
        'SuppressedSpaceScroll',
        'SuppressedItemCommit',
        'CompletedAnchorListbox',
        'CompletedPortalListboxBackdrop',
        () => [model, [], Option.none()],
      ),
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
            return [model, [], Option.none()]
          }

          return closeListbox(model, closeWithoutFocusCommands)
        },

        ActivatedItem: ({ index, activationTrigger }) => [
          constrainedEvo(model, {
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
            constrainedEvo(model, {
              maybeActiveItemIndex: () => Option.some(index),
              activationTrigger: () => 'Pointer' as const,
              maybeLastPointerPosition: () => Option.some({ screenX, screenY }),
            }),
            [],
            Option.none(),
          ]
        },

        DeactivatedItem: () =>
          model.activationTrigger === 'Pointer'
            ? [
                constrainedEvo(model, {
                  maybeActiveItemIndex: () => Option.none(),
                }),
                [],
                Option.none(),
              ]
            : [model, [], Option.none()],

        SelectedItem: ({ item }) =>
          handleSelectedItem(model, item, {
            closeWithFocus: (closeModel, maybeOutMessage = Option.none()) =>
              closeListbox(closeModel, closeWithFocusCommands, maybeOutMessage),
            closeWithoutFocus: (closeModel, maybeOutMessage = Option.none()) =>
              closeListbox(
                closeModel,
                closeWithoutFocusCommands,
                maybeOutMessage,
              ),
          }),

        RequestedItemClick: ({ index }) => [
          model,
          [ClickItem({ id: model.id, index })],
          Option.none(),
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
            [DelayClearSearch({ version: nextSearchVersion })],
            Option.none(),
          ]
        },

        CompletedDelayClearSearch: ({ version }) => {
          if (version !== model.searchVersion) {
            return [model, [], Option.none()]
          }

          return [
            constrainedEvo(model, { searchQuery: () => '' }),
            [],
            Option.none(),
          ]
        },

        GotAnimationMessage: ({ message: animationMessage }) =>
          foldAnimation(model, animationMessage),

        PressedPointerOnButton: ({ pointerType, button }) => {
          const withPointerType = constrainedEvo(model, {
            maybeLastButtonPointerType: () => Option.some(pointerType),
          })

          if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
            return [withPointerType, [], Option.none()]
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
              Option.none(),
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

        IgnoredMouseClick: () => [
          constrainedEvo(model, {
            maybeLastButtonPointerType: () => Option.none(),
          }),
          [],
          Option.none(),
        ],
      }),
    )
  }

  return internalUpdate
}

/** The anchor-positioning Mount this Listbox renders on its items panel.
 *  The panel is always anchored to the button via Floating UI and portaled
 *  to the document body (opt out of portaling with `anchor.portal: false`),
 *  so it escapes ancestor stacking contexts and overflow clipping.
 *
 *  It also carries the open-focus for the anchored panel. An anchored panel
 *  renders `visibility: hidden` until Floating UI resolves its first position,
 *  and `.focus()` does not land on a hidden element, so `FocusItems` alone
 *  cannot focus it. `focusAfterPosition` focuses the panel as part of that
 *  first reveal. `FocusItems` still focuses the panel when no anchor is
 *  configured, where the panel is visible as soon as the render commits.
 *
 *  Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AnchorListbox, CompletedAnchorListbox())`. */
export const AnchorListbox = Mount.define(
  'AnchorListbox',
  { buttonId: S.String, anchor: AnchorConfig },
  CompletedAnchorListbox,
)(
  ({ buttonId, anchor }) =>
    element =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            anchorSetup({ buttonId, anchor, focusAfterPosition: true })(
              element,
            ),
          ),
          cleanup => Effect.sync(cleanup),
        )
        return CompletedAnchorListbox()
      }),
)

/** The backdrop-portaling Mount this Listbox renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalListboxBackdrop, CompletedPortalListboxBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalListboxBackdrop = Mount.define(
  'PortalListboxBackdrop',
  CompletedPortalListboxBackdrop,
)(element =>
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => portalToContainingRoot(element)),
      cleanup => Effect.sync(cleanup),
    )
    return CompletedPortalListboxBackdrop()
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

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field.
 *
 *  The Listbox emits a `Selected({ value })` OutMessage on commit.
 *  Consumers pattern-match this in their `GotListboxMessage` handler:
 *  single-select stores the value, multi-select toggles its membership. */
export type BaseViewInputsCommon<Item> = Readonly<{
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{
      isActive: boolean
      isDisabled: boolean
      /** Mirrors the view input of the same name, so `itemToConfig` can
       *  style items for read-only state without closing over `viewInputs`. */
      isReadOnly: boolean
      isSelected: boolean
    }>,
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
  name?: string
  form?: string
  /** Marks the Listbox unavailable with `aria-disabled="true"` on the button
   *  and `data-disabled` on the button and the wrapper, and removes the
   *  button's handlers so the dropdown cannot be opened. */
  isDisabled?: boolean
  /** Prevents committing a selection while exposing read-only semantics
   *  with `aria-readonly="true"` and `data-readonly` on the items panel, and
   *  `data-readonly` on the wrapper, button, and every item. The Listbox
   *  still opens, navigates, and searches. Independent of `isDisabled`:
   *  setting both emits both attribute sets, and `isDisabled` still wins for
   *  interaction, since its button drops every handler, so a Listbox that is
   *  both read-only and disabled cannot be opened at all. */
  isReadOnly?: boolean
  isInvalid?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
}>

/** The `itemToValue` extractor piece of a Listbox's view inputs. The
 *  extractor is optional when `Item` is itself a string (the default
 *  returns the item unchanged) and required when items are objects, so the
 *  OutMessage payload type can't drift from what the consumer actually
 *  emits. */
export type ItemToValueInput<Item, Value extends string = string> = [
  Item,
] extends [string]
  ? Readonly<{ itemToValue?: (item: Item) => Value }>
  : Readonly<{ itemToValue: (item: Item) => Value }>

/** Per-render view inputs for the shared array-based Listbox view. The
 *  multi-select variant exposes this shape directly; the single-select
 *  variant swaps `selectedValues` for `maybeSelectedValue` at its public
 *  seam and adapts to this shape internally. */
export type BaseViewInputs<
  Item,
  Value extends string = string,
> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  Drives `aria-selected` and `data-selected` on items, which item the
     *  Listbox highlights when it opens onto a selection, and the hidden
     *  form inputs submitted under `name`. */
    selectedValues: ReadonlyArray<Value>
  }> &
  ItemToValueInput<Item, Value>

// VIEW FACTORY

type ViewBehavior = Readonly<{
  ariaMultiSelectable: boolean
}>

export const makeView = <Model extends BaseModel>(behavior: ViewBehavior) => {
  const impl = defineView<Model, Message, BaseViewInputs<unknown, string>>(
    (model, viewInputs, h) => {
      const {
        id,
        isOpen,
        orientation,
        animation: { transitionState },
        maybeActiveItemIndex,
        searchQuery,
        maybeLastButtonPointerType,
      } = model

      const {
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
        anchor = {},
        name,
        form,
        isDisabled,
        isReadOnly = false,
        isInvalid,
        ariaLabel,
        ariaLabelledBy,
        selectedValues,
      } = viewInputs

      const itemToValue =
        viewInputs.itemToValue ?? ((item: unknown) => String(item))
      const isValueSelected = (itemValue: string): boolean =>
        Array.contains(selectedValues, itemValue)
      const itemToSearchText =
        viewInputs.itemToSearchText ?? ((item: unknown) => itemToValue(item))

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

      const selectedItemIndex = pipe(
        selectedValues,
        Array.head,
        Option.flatMap(selectedValue =>
          Array.findFirstIndex(
            items,
            item => itemToValue(item) === selectedValue,
          ),
        ),
      )

      const handleButtonKeyDown = (key: string): Option.Option<Message> => {
        if (isOpen) {
          return handleItemsKeyDown(key)
        }

        return M.value(key).pipe(
          M.whenOr('Enter', ' ', 'ArrowDown', () =>
            Option.some(
              Opened({
                maybeActiveItemIndex: Option.orElse(selectedItemIndex, () =>
                  Option.some(firstEnabledIndex),
                ),
              }),
            ),
          ),
          M.when('ArrowUp', () =>
            Option.some(
              Opened({
                maybeActiveItemIndex: Option.orElse(selectedItemIndex, () =>
                  Option.some(lastEnabledIndex),
                ),
              }),
            ),
          ),
          M.orElse(() => Option.none()),
        )
      }

      const handleButtonPointerDown = (
        pointerType: string,
        button: number,
      ): Option.Option<Message> =>
        Option.some(PressedPointerOnButton({ pointerType, button }))

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
        return Option.some(Searched({ key, maybeTargetIndex }))
      }

      const resolveCommitMessage = (): Option.Option<Message> => {
        if (isReadOnly) {
          return Option.as(maybeActiveItemIndex, SuppressedItemCommit())
        } else {
          return Option.map(maybeActiveItemIndex, index =>
            RequestedItemClick({ index }),
          )
        }
      }

      const handleItemsKeyDown = (key: string): Option.Option<Message> =>
        M.value(key).pipe(
          M.when('Escape', () => Option.some(Closed())),
          M.when('Enter', resolveCommitMessage),
          M.when(' ', () =>
            Str.isNonEmpty(searchQuery)
              ? searchForKey(' ')
              : resolveCommitMessage(),
          ),
          M.when(isNavigationKey, () =>
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
        h.AriaHasPopup('listbox'),
        h.AriaExpanded(isVisible),
        h.AriaControls(`${id}-items`),
        ...buttonLabelAttributes,
        ...(isButtonEffectivelyDisabled
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
        ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
        ...(isInvalid ? [h.DataAttribute('invalid', '')] : []),
        ...(buttonClassName ? [h.Class(buttonClassName)] : []),
        ...buttonAttributes,
      ]

      const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
        onNone: () => [],
        onSome: index => [h.AriaActiveDescendant(itemId(id, index))],
      })

      const anchorAttributes = [
        h.Style({
          position: 'absolute',
          margin: '0',
          visibility: 'hidden',
        }),
        h.OnMount(AnchorListbox({ buttonId: `${id}-button`, anchor })),
      ]

      const itemsContainerAttributes = [
        h.Id(`${id}-items`),
        h.Role('listbox'),
        h.AriaOrientation(Str.toLowerCase(orientation)),
        ...(behavior.ariaMultiSelectable ? [h.AriaMultiSelectable(true)] : []),
        ...(isReadOnly
          ? [h.AriaReadonly(true), h.DataAttribute('readonly', '')]
          : []),
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
              h.OnBlur(BlurredItems()),
            ]),
        ...(itemsClassName ? [h.Class(itemsClassName)] : []),
        ...itemsAttributes,
      ]

      const listboxItems = Array.map(items, (item, index) => {
        const isActiveItem = Option.exists(
          maybeActiveItemIndex,
          activeIndex => activeIndex === index,
        )
        const isDisabledItem = isItemDisabledByIndex(index)
        const isSelectedItem = isValueSelected(itemToValue(item))
        const itemConfig = itemToConfig(item, {
          isActive: isActiveItem,
          isDisabled: isDisabledItem,
          isReadOnly,
          isSelected: isSelectedItem,
        })

        const isHoverable = !isDisabledItem && !isLeaving
        const isClickable = isHoverable && !isReadOnly

        return h.keyed('div')(
          itemId(id, index),
          [
            h.Id(itemId(id, index)),
            h.Role('option'),
            h.AriaSelected(isSelectedItem),
            ...(isActiveItem ? [h.DataAttribute('active', '')] : []),
            ...(isSelectedItem ? [h.DataAttribute('selected', '')] : []),
            ...(isDisabledItem
              ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
              : []),
            ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
            ...(isClickable
              ? [h.OnClick(SelectedItem({ item: itemToValue(item) }))]
              : []),
            ...(isHoverable
              ? [
                  ...(isActiveItem
                    ? []
                    : [
                        h.OnPointerMove((screenX, screenY, pointerType) =>
                          OptionExt.when(
                            pointerType !== 'touch',
                            MovedPointerOverItem({
                              index,
                              screenX,
                              screenY,
                            }),
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
          const maybeHeading = Option.fromNullishOr(
            groupToHeading?.(segment.key),
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
                    ...(separatorClassName
                      ? [h.Class(separatorClassName)]
                      : []),
                    ...separatorAttributes,
                  ]),
                ]
              : []

          return [...separator, groupElement]
        })
      }

      const backdrop = h.keyed('div')(`${id}-backdrop`, [
        h.OnMount(PortalListboxBackdrop()),
        ...(isLeaving ? [] : [h.OnClick(Closed())]),
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

      const formAttribute = form ? [h.Attribute('form', form)] : []

      const hiddenInputs = name
        ? Array.match(selectedValues, {
            onEmpty: () => [
              h.input([h.Type('hidden'), h.Name(name), ...formAttribute]),
            ],
            onNonEmpty: Array.map(selectedValue =>
              h.input([
                h.Type('hidden'),
                h.Name(name),
                h.Value(selectedValue),
                ...formAttribute,
              ]),
            ),
          })
        : []

      const wrapperAttributes = [
        ...(className ? [h.Class(className)] : []),
        ...attributes,
        ...(isVisible ? [h.DataAttribute('open', '')] : []),
        ...(isDisabled ? [h.DataAttribute('disabled', '')] : []),
        ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
        ...(isInvalid ? [h.DataAttribute('invalid', '')] : []),
      ]

      return h.div(wrapperAttributes, [
        h.keyed('button')(`${id}-button`, resolvedButtonAttributes, [
          buttonContent,
        ]),
        ...hiddenInputs,
        ...(isVisible ? visibleContent : []),
      ])
    },
  )

  return <Item, Value extends string = string>() =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    impl as unknown as SubmodelView<Model, Message, BaseViewInputs<Item, Value>>
}

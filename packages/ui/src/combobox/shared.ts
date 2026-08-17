import {
  Array,
  Effect,
  Match as M,
  Option,
  Predicate,
  Schema as S,
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

import {
  AnchorConfig,
  anchorSetup,
  portalToContainingRoot,
} from '../anchor/index.js'
// NOTE: Animation imports are split across schema + update to avoid a circular
// dependency: animation → html → runtime → devtools → combobox → animation.
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
import { findFirstEnabledIndex, keyToIndex } from '../keyboard.js'

export { groupContiguous }

// MODEL

/** Schema for the activation trigger: whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literals(['Pointer', 'Keyboard'])
export type ActivationTrigger = typeof ActivationTrigger.Type

/** Schema fields shared by all combobox variants (single-select and multi-select). Spread into each variant's `S.Struct` to avoid duplicating field definitions. */
export const BaseModel = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  isModal: S.Boolean,
  nullable: S.Boolean,
  immediate: S.Boolean,
  selectInputOnFocus: S.Boolean,
  animation: AnimationModel,
  maybeActiveItemIndex: S.Option(S.Number),
  activationTrigger: ActivationTrigger,
  inputValue: S.String,
  maybeLastPointerPosition: S.Option(
    S.Struct({ screenX: S.Number, screenY: S.Number }),
  ),
})
export type BaseModel = typeof BaseModel.Type

/** Configuration fields shared by all combobox variant `init` functions. */
export type BaseInitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
  nullable?: boolean
  /** Emits `Selected` on every keyboard activation while open, so arrow keys
   *  commit as they move instead of waiting for Enter. Combining `immediate`
   *  with `nullable` is discouraged: a nullable toggle fold would deselect as
   *  the arrows pass back over the selected item (see issue #693). Default
   *  `false`. */
  immediate?: boolean
  selectInputOnFocus?: boolean
}>

/** Creates the shared base fields for a combobox model from a config. Each variant spreads this and adds its selection fields. */
export const baseInit = (config: BaseInitConfig): BaseModel => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  nullable: config.nullable ?? false,
  immediate: config.immediate ?? false,
  selectInputOnFocus: config.selectInputOnFocus ?? false,
  animation: animationInit({ id: `${config.id}-items` }),
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  inputValue: '',
  maybeLastPointerPosition: Option.none(),
})

// MESSAGE

/** Sent when the combobox popup opens. Contains an optional initial active item index. */
export const Opened = m('Opened', {
  maybeActiveItemIndex: S.Option(S.Number),
})
/** Sent when the combobox closes via Escape key or backdrop click. `restingInputValue` is what the input returns to on close (the parent-owned selection's display text, or empty), computed by the view from `ViewInputs.restingInputValue`. `isClearable` carries whether this close may emit `ClearedSelection`, which a read-only combobox denies; the view holds `isReadOnly` and the update does not. */
export const Closed = m('Closed', {
  restingInputValue: S.String,
  isClearable: S.Boolean,
})
/** Sent when the combobox input loses focus. `restingInputValue` is what the input returns to on close (the parent-owned selection's display text, or empty), computed by the view from `ViewInputs.restingInputValue`. `isClearable` carries whether this close may emit `ClearedSelection`, which a read-only combobox denies. */
export const BlurredInput = m('BlurredInput', {
  restingInputValue: S.String,
  isClearable: S.Boolean,
})
/** Sent when an item is highlighted via arrow keys or mouse hover. Includes activation trigger and optional immediate selection info. */
export const ActivatedItem = m('ActivatedItem', {
  index: S.Number,
  activationTrigger: ActivationTrigger,
  maybeImmediateSelection: S.Option(S.Struct({ item: S.String })),
})
/** Sent when the mouse leaves an enabled item. */
export const DeactivatedItem = m('DeactivatedItem')
/** Sent when an item is selected via Enter or click. `displayText` is the item's resting input text, and `wasSelected` reports whether the item was already in the parent-owned selection when activated, so nullable deselect logic works without the Model knowing the selection. */
export const SelectedItem = m('SelectedItem', {
  item: S.String,
  displayText: S.String,
  wasSelected: S.Boolean,
})
/** Sent when the pointer moves over a combobox item. */
export const MovedPointerOverItem = m('MovedPointerOverItem', {
  index: S.Number,
  screenX: S.Number,
  screenY: S.Number,
})
/** Sent when Enter or Space is pressed on the active item, triggering a programmatic click. */
export const RequestedItemClick = m('RequestedItemClick', {
  index: S.Number,
})
/** Sent when Enter is pressed on the active item of a read-only combobox. Update no-ops; the Message exists so the keydown handler returns `Option.some` and calls `preventDefault`, which stops a surrounding form from submitting, and so the keypress stays visible for DevTools. */
export const SuppressedItemCommit = m('SuppressedItemCommit')
/** Sent when the scroll lock command completes. */
export const CompletedLockScroll = m('CompletedLockScroll')
/** Sent when the scroll unlock command completes. */
export const CompletedUnlockScroll = m('CompletedUnlockScroll')
/** Sent when the inert-others command completes. */
export const CompletedInertOthers = m('CompletedInertOthers')
/** Sent when the restore-inert command completes. */
export const CompletedRestoreInert = m('CompletedRestoreInert')
/** Sent when the focus-input command completes. */
export const CompletedFocusInput = m('CompletedFocusInput')
/** Sent when the scroll-into-view command completes after keyboard activation. */
export const CompletedScrollIntoView = m('CompletedScrollIntoView')
/** Sent when the programmatic item click command completes. */
export const CompletedClickItem = m('CompletedClickItem')
/** Sent when the items panel mounts and Floating UI has positioned it. Update no-ops; surfaces the positioning side effect for DevTools. */
export const CompletedAnchorCombobox = m('CompletedAnchorCombobox')
/** Sent when the items panel mounts and the capture-phase pointerdown listener is attached (with or without anchor). Update no-ops; surfaces the listener-attach side effect for DevTools. */
export const CompletedAttachComboboxPreventBlur = m(
  'CompletedAttachComboboxPreventBlur',
)
/** Sent when the input mounts and the focus listener that auto-selects on focus is attached. Update no-ops; surfaces the listener-attach side effect for DevTools. */
export const CompletedAttachComboboxSelectOnFocus = m(
  'CompletedAttachComboboxSelectOnFocus',
)
/** Sent when the combobox backdrop mounts and is portaled to the document body. Update no-ops; surfaces the portal side effect for DevTools. */
export const CompletedPortalComboboxBackdrop = m(
  'CompletedPortalComboboxBackdrop',
)
/** Wraps an Animation submodel message for delegation. */
export const GotAnimationMessage = m('GotAnimationMessage', {
  message: AnimationMessage,
})
/** Sent when the user types in the input. */
export const UpdatedInputValue = m('UpdatedInputValue', {
  value: S.String,
})
/** Sent when the optional toggle button is clicked. `restingInputValue` is what the input returns to when the press closes the combobox (the parent-owned selection's display text, or empty), computed by the view from `ViewInputs.restingInputValue`. `isClearable` carries whether a close from this press may emit `ClearedSelection`, which a read-only combobox denies. */
export const PressedToggleButton = m('PressedToggleButton', {
  restingInputValue: S.String,
  isClearable: S.Boolean,
})

/** Union of all messages the combobox component can produce. */
export const Message: S.Union<
  [
    typeof Opened,
    typeof Closed,
    typeof BlurredInput,
    typeof ActivatedItem,
    typeof DeactivatedItem,
    typeof SelectedItem,
    typeof MovedPointerOverItem,
    typeof RequestedItemClick,
    typeof SuppressedItemCommit,
    typeof CompletedLockScroll,
    typeof CompletedUnlockScroll,
    typeof CompletedInertOthers,
    typeof CompletedRestoreInert,
    typeof CompletedFocusInput,
    typeof CompletedScrollIntoView,
    typeof CompletedClickItem,
    typeof CompletedAnchorCombobox,
    typeof CompletedAttachComboboxPreventBlur,
    typeof CompletedAttachComboboxSelectOnFocus,
    typeof CompletedPortalComboboxBackdrop,
    typeof GotAnimationMessage,
    typeof UpdatedInputValue,
    typeof PressedToggleButton,
  ]
> = S.Union([
  Opened,
  Closed,
  BlurredInput,
  ActivatedItem,
  DeactivatedItem,
  SelectedItem,
  MovedPointerOverItem,
  RequestedItemClick,
  SuppressedItemCommit,
  CompletedLockScroll,
  CompletedUnlockScroll,
  CompletedInertOthers,
  CompletedRestoreInert,
  CompletedFocusInput,
  CompletedScrollIntoView,
  CompletedClickItem,
  CompletedAnchorCombobox,
  CompletedAttachComboboxPreventBlur,
  CompletedAttachComboboxSelectOnFocus,
  CompletedPortalComboboxBackdrop,
  GotAnimationMessage,
  UpdatedInputValue,
  PressedToggleButton,
])

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type BlurredInput = typeof BlurredInput.Type
export type ActivatedItem = typeof ActivatedItem.Type
export type DeactivatedItem = typeof DeactivatedItem.Type
export type SelectedItem = typeof SelectedItem.Type
export type MovedPointerOverItem = typeof MovedPointerOverItem.Type
export type RequestedItemClick = typeof RequestedItemClick.Type
export type SuppressedItemCommit = typeof SuppressedItemCommit.Type
export type CompletedLockScroll = typeof CompletedLockScroll.Type
export type CompletedUnlockScroll = typeof CompletedUnlockScroll.Type
export type CompletedInertOthers = typeof CompletedInertOthers.Type
export type CompletedRestoreInert = typeof CompletedRestoreInert.Type
export type CompletedFocusInput = typeof CompletedFocusInput.Type
export type CompletedScrollIntoView = typeof CompletedScrollIntoView.Type
export type CompletedClickItem = typeof CompletedClickItem.Type
export type UpdatedInputValue = typeof UpdatedInputValue.Type
export type PressedToggleButton = typeof PressedToggleButton.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent when the user activates an item. Carries the neutral fact that the item was activated; the parent owns the selection and decides what it means (single-select stores the value, nullable single-select toggles it, multi-select toggles the value's membership). Generic over `Value extends string`: the runtime schema stores `value: string`, but the type-level OutMessage exposes `value: Value` so consumers who supply `items: ReadonlyArray<MyUnion>` receive `value: MyUnion` from the factory's `update` without casting. */
export const Selected = m('Selected', {
  value: S.String,
})

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
}>

/** Sent when a nullable combobox closes with an empty input, meaning the user cleared it. The parent clears the selection it owns. */
export const ClearedSelection = m('ClearedSelection')

export type ClearedSelection = typeof ClearedSelection.Type

/** Union of out-messages the combobox component can produce. The parent folds `Selected` into the selection it owns and clears that selection on `ClearedSelection`. */
export const OutMessage = S.Union([Selected, ClearedSelection])

/** Generic over `Value extends string` so consumers who create the combobox
 *  via `Combobox.create<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage from the factory's `update`, instead of
 *  `value: string`. Defaults to `string`. */
export type OutMessage<Value extends string = string> =
  | Selected<Value>
  | ClearedSelection

// SELECTORS

/** Returns the bare DOM id of the combobox input, derived from the
 *  combobox's base id. Use this to associate an external label with the
 *  input via a native `<label for={Combobox.inputId(id)}>` or an
 *  `aria-labelledby` reference. Mirrors `inputSelector`, which returns the
 *  CSS selector form (`#${id}-input`) rather than the bare id. */
export const inputId = (id: string): string => `${id}-input`

export const inputSelector = (id: string): string => idSelector(`${id}-input`)
export const inputWrapperSelector = (id: string): string =>
  idSelector(`${id}-input-wrapper`)
export const itemsSelector = (id: string): string => idSelector(`${id}-items`)
export const itemSelector = (id: string, index: number): string =>
  idSelector(`${id}-item-${index}`)
export const itemId = (id: string, index: number): string =>
  `${id}-item-${index}`

// HELPERS

const constrainedEvo = makeConstrainedEvo<BaseModel>()

/** Resets only shared base fields to their closed state. Does not touch inputValue. That is variant-specific. */
export const closedBaseModel = <Model extends BaseModel>(model: Model): Model =>
  constrainedEvo(model, {
    isOpen: () => false,
    maybeActiveItemIndex: () => Option.none(),
    activationTrigger: () => 'Keyboard' as const,
    maybeLastPointerPosition: () => Option.none(),
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
}>

/** Prevents page scrolling while the combobox popup is open in modal mode. */
export const LockScroll = Command.define('LockScroll', {
  messages: [CompletedLockScroll],
  execute: Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
})
/** Re-enables page scrolling after the combobox popup closes. */
export const UnlockScroll = Command.define('UnlockScroll', {
  messages: [CompletedUnlockScroll],
  execute: Dom.unlockScroll.pipe(Effect.as(CompletedUnlockScroll())),
})
/** Marks all elements outside the combobox as inert for modal behavior. */
export const InertOthers = Command.define('InertOthers', {
  args: { id: S.String },
  messages: [CompletedInertOthers],
  execute: ({ id }) =>
    Dom.inertOthers(id, [inputWrapperSelector(id), itemsSelector(id)]).pipe(
      Effect.as(CompletedInertOthers()),
    ),
})
/** Removes the inert attribute from elements outside the combobox. */
export const RestoreInert = Command.define('RestoreInert', {
  args: { id: S.String },
  messages: [CompletedRestoreInert],
  execute: ({ id }) =>
    Dom.restoreInert(id).pipe(Effect.as(CompletedRestoreInert())),
})
/** Moves focus to the combobox input after selection or close. */
export const FocusInput = Command.define('FocusInput', {
  args: { id: S.String },
  messages: [CompletedFocusInput],
  execute: ({ id }) =>
    Dom.focus(inputSelector(id)).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusInput()),
    ),
})
/** Scrolls the active combobox item into view after keyboard navigation. */
export const ScrollIntoView = Command.define('ScrollIntoView', {
  args: { id: S.String, index: S.Number },
  messages: [CompletedScrollIntoView],
  execute: ({ id, index }) =>
    Dom.scrollIntoView(itemSelector(id, index)).pipe(
      Effect.ignore,
      Effect.as(CompletedScrollIntoView()),
    ),
})
/** Programmatically clicks the active combobox item's DOM element. */
export const ClickItem = Command.define('ClickItem', {
  args: { id: S.String, index: S.Number },
  messages: [CompletedClickItem],
  execute: ({ id, index }) =>
    Dom.clickElement(itemSelector(id, index)).pipe(
      Effect.ignore,
      Effect.as(CompletedClickItem()),
    ),
})
/** Detects whether the combobox input wrapper moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  {
    args: { id: S.String },
    messages: [GotAnimationMessage],
    execute: ({ id }) =>
      Effect.raceFirst(
        Dom.detectElementMovement(inputWrapperSelector(id)).pipe(
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

/** Creates a combobox update function from variant-specific handlers. Shared logic (open, close, activate, transition) is handled internally; only close, selection, and immediate-activation behavior varies by variant. */
export const makeUpdate = <Model extends BaseModel>(
  handlers: Readonly<{
    handleClose: (
      model: Model,
      restingInputValue: string,
      isClearable: boolean,
    ) => readonly [Model, Option.Option<OutMessage>]
    handleSelectedItem: (
      model: Model,
      item: string,
      displayText: string,
      wasSelected: boolean,
      context: SelectedItemContext<Model>,
    ) => readonly [
      Model,
      ReadonlyArray<Command.Command<Message>>,
      Option.Option<OutMessage>,
    ]
    handleImmediateActivation: (
      model: Model,
      item: string,
    ) => readonly [Model, Option.Option<OutMessage>]
  }>,
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

    const focusInput = FocusInput({ id: model.id })

    const closeWithFocusCommands = [
      focusInput,
      ...Array.getSomes([maybeUnlockScroll, maybeRestoreInert]),
    ]

    const closeWithoutFocusCommands = Array.getSomes([
      maybeUnlockScroll,
      maybeRestoreInert,
    ])

    const closeSelectedItemWithFocus = (
      nextModel: Model,
      maybeOutMessage: Option.Option<OutMessage> = Option.none(),
    ): UpdateReturn => {
      const didClose = model.isOpen && !nextModel.isOpen
      const commands = didClose ? closeWithFocusCommands : [focusInput]

      if (didClose && model.isAnimated) {
        const [transitionedModel, animationCommands] = foldAnimation(
          nextModel,
          AnimationHid(),
        )
        return [
          transitionedModel,
          [...commands, ...animationCommands],
          maybeOutMessage,
        ]
      }

      return [nextModel, commands, maybeOutMessage]
    }

    const openCombobox = (baseModel: Model): UpdateReturn => {
      if (model.isAnimated) {
        const [nextModel, animationCommands] = foldAnimation(
          baseModel,
          AnimationShowed(),
        )
        return [
          constrainedEvo(nextModel, { isOpen: () => true }),
          [
            ...Array.getSomes([maybeLockScroll, maybeInertOthers]),
            ...animationCommands,
          ],
          Option.none(),
        ]
      }

      return [
        constrainedEvo(baseModel, { isOpen: () => true }),
        Array.getSomes([maybeLockScroll, maybeInertOthers]),
        Option.none(),
      ]
    }

    const closeCombobox = (
      baseModel: Model,
      commands: ReadonlyArray<Command.Command<Message>>,
      restingInputValue: string,
      isClearable: boolean,
    ): UpdateReturn => {
      const [closed, maybeCloseOutMessage] = handlers.handleClose(
        baseModel,
        restingInputValue,
        isClearable,
      )

      if (model.isAnimated) {
        const [nextModel, animationCommands] = foldAnimation(
          closed,
          AnimationHid(),
        )
        return [
          nextModel,
          [...commands, ...animationCommands],
          maybeCloseOutMessage,
        ]
      }

      return [closed, commands, maybeCloseOutMessage]
    }

    return M.value(message).pipe(
      withUpdateReturn,
      M.tag(
        'CompletedLockScroll',
        'CompletedUnlockScroll',
        'CompletedInertOthers',
        'CompletedRestoreInert',
        'CompletedFocusInput',
        'CompletedScrollIntoView',
        'CompletedClickItem',
        'SuppressedItemCommit',
        'CompletedAnchorCombobox',
        'CompletedAttachComboboxPreventBlur',
        'CompletedAttachComboboxSelectOnFocus',
        'CompletedPortalComboboxBackdrop',
        () => [model, [], Option.none()],
      ),
      M.tagsExhaustive({
        Opened: ({ maybeActiveItemIndex }) =>
          openCombobox(
            constrainedEvo(model, {
              maybeActiveItemIndex: () => maybeActiveItemIndex,
              activationTrigger: () =>
                Option.match(maybeActiveItemIndex, {
                  onNone: () => 'Pointer' as const,
                  onSome: () => 'Keyboard' as const,
                }),
              maybeLastPointerPosition: () => Option.none(),
            }),
          ),

        // NOTE: guard on isOpen so a close-path message baked from a stale
        // render (a sub-frame blur after a selection already closed the
        // combobox) cannot rewrite inputValue with an outdated
        // restingInputValue or re-emit ClearedSelection while closed.
        Closed: ({ restingInputValue, isClearable }) =>
          model.isOpen
            ? closeCombobox(
                model,
                closeWithFocusCommands,
                restingInputValue,
                isClearable,
              )
            : [model, [], Option.none()],

        BlurredInput: ({ restingInputValue, isClearable }) =>
          model.isOpen
            ? closeCombobox(
                model,
                closeWithoutFocusCommands,
                restingInputValue,
                isClearable,
              )
            : [model, [], Option.none()],

        ActivatedItem: ({
          index,
          activationTrigger,
          maybeImmediateSelection,
        }) => {
          const highlightedModel = constrainedEvo(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => activationTrigger,
          })

          const skippedActivation: readonly [Model, Option.Option<OutMessage>] =
            [highlightedModel, Option.none()]

          const [nextModel, maybeOutMessage] = Option.match(
            maybeImmediateSelection,
            {
              onNone: () => skippedActivation,
              onSome: ({ item }) =>
                handlers.handleImmediateActivation(highlightedModel, item),
            },
          )

          return [
            nextModel,
            activationTrigger === 'Keyboard'
              ? [ScrollIntoView({ id: model.id, index })]
              : [],
            maybeOutMessage,
          ]
        },

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

        SelectedItem: ({ item, displayText, wasSelected }) =>
          handlers.handleSelectedItem(model, item, displayText, wasSelected, {
            closeWithFocus: closeSelectedItemWithFocus,
          }),

        RequestedItemClick: ({ index }) => [
          model,
          [ClickItem({ id: model.id, index })],
          Option.none(),
        ],

        UpdatedInputValue: ({ value }) => {
          if (model.isOpen) {
            return [
              constrainedEvo(model, {
                inputValue: () => value,
                maybeActiveItemIndex: () => Option.some(0),
                activationTrigger: () => 'Keyboard' as const,
              }),
              [],
              Option.none(),
            ]
          }

          return openCombobox(
            constrainedEvo(model, {
              inputValue: () => value,
              maybeActiveItemIndex: () => Option.some(0),
              activationTrigger: () => 'Keyboard' as const,
              maybeLastPointerPosition: () => Option.none(),
            }),
          )
        },

        PressedToggleButton: ({ restingInputValue, isClearable }) => {
          if (model.isOpen) {
            return closeCombobox(
              model,
              closeWithFocusCommands,
              restingInputValue,
              isClearable,
            )
          }

          const [nextModel, commands] = openCombobox(
            constrainedEvo(model, {
              maybeActiveItemIndex: () => Option.none(),
              activationTrigger: () => 'Pointer' as const,
              maybeLastPointerPosition: () => Option.none(),
            }),
          )

          return [nextModel, [focusInput, ...commands], Option.none()]
        },

        GotAnimationMessage: ({ message: animationMessage }) =>
          foldAnimation(model, animationMessage),
      }),
    )
  }

  return internalUpdate
}

/** The anchor-positioning Mount this Combobox renders on its items panel.
 *  The panel is always anchored to the input wrapper via Floating UI and
 *  portaled to the document body (opt out of portaling with
 *  `anchor.portal: false`), so it escapes ancestor stacking contexts and
 *  overflow clipping. The Mount also installs the `pointerdown`-cancelling
 *  capture listener that prevents input blur on item presses. Exposed so
 *  Scene tests can call
 *  `Scene.Mount.resolve(AnchorCombobox, CompletedAnchorCombobox())`. */
export const AnchorCombobox = Mount.define(
  'AnchorCombobox',
  { buttonId: S.String, anchor: AnchorConfig },
  CompletedAnchorCombobox,
)(
  ({ buttonId, anchor }) =>
    element =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            const preventBlur = (event: Event) => {
              event.preventDefault()
            }
            element.addEventListener('pointerdown', preventBlur, {
              capture: true,
            })
            const teardownAnchor = anchorSetup(element, {
              buttonId,
              anchor,
              interceptTab: false,
            })
            return () => {
              element.removeEventListener('pointerdown', preventBlur, {
                capture: true,
              })
              teardownAnchor()
            }
          }),
          cleanup => Effect.sync(cleanup),
        )
        return CompletedAnchorCombobox()
      }),
)

/** The Mount this Combobox renders to install a `pointerdown`-cancelling
 *  capture listener that prevents blur on item presses. Exposed so Scene
 *  tests can call
 *  `Scene.Mount.resolve(AttachComboboxPreventBlur, CompletedAttachComboboxPreventBlur())`. */
export const AttachComboboxPreventBlur = Mount.define(
  'AttachComboboxPreventBlur',
  CompletedAttachComboboxPreventBlur,
)(element =>
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const handler = (event: Event) => {
          event.preventDefault()
        }
        element.addEventListener('pointerdown', handler, { capture: true })
        return handler
      }),
      handler =>
        Effect.sync(() =>
          element.removeEventListener('pointerdown', handler, {
            capture: true,
          }),
        ),
    )
    return CompletedAttachComboboxPreventBlur()
  }),
)

/** The Mount this Combobox renders to install the input's select-on-focus
 *  behavior. Exposed so Scene tests can call
 *  `Scene.Mount.resolve(AttachComboboxSelectOnFocus, CompletedAttachComboboxSelectOnFocus())`. */
export const AttachComboboxSelectOnFocus = Mount.define(
  'AttachComboboxSelectOnFocus',
  CompletedAttachComboboxSelectOnFocus,
)(element =>
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const handler = () => {
          if (element instanceof HTMLInputElement) {
            element.select()
          }
        }
        element.addEventListener('focus', handler)
        return handler
      }),
      handler =>
        Effect.sync(() => element.removeEventListener('focus', handler)),
    )
    return CompletedAttachComboboxSelectOnFocus()
  }),
)

/** The backdrop-portaling Mount this Combobox renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalComboboxBackdrop, CompletedPortalComboboxBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalComboboxBackdrop = Mount.define(
  'PortalComboboxBackdrop',
  CompletedPortalComboboxBackdrop,
)(element =>
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => portalToContainingRoot(element)),
      cleanup => Effect.sync(cleanup),
    )
    return CompletedPortalComboboxBackdrop()
  }),
)

// VIEW TYPES

/** Configuration for an individual combobox item's appearance. */
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
 *  The Combobox emits a `Selected({ value })` OutMessage on commit.
 *  Consumers pattern-match this in their `GotComboboxMessage` handler:
 *  single-select stores the value, multi-select toggles the value's
 *  membership. `restingInputValue` is the text the input returns to on
 *  close (the selection's display text for single-select, empty for
 *  multi-select). Everything here except the selection itself; each
 *  variant composes its own selection field on top. */
export type BaseViewInputsCommon<Item extends string> = Readonly<{
  items: ReadonlyArray<Item>
  restingInputValue: string
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
  itemToValue: (item: Item, index: number) => Item
  itemToDisplayText: (item: Item, index: number) => string
  isItemDisabled?: (item: Item, index: number) => boolean
  inputClassName?: string
  inputAttributes?: ReadonlyArray<ChildAttribute>
  inputPlaceholder?: string
  inputWrapperClassName?: string
  inputWrapperAttributes?: ReadonlyArray<ChildAttribute>
  itemsClassName?: string
  itemsAttributes?: ReadonlyArray<ChildAttribute>
  itemsScrollClassName?: string
  itemsScrollAttributes?: ReadonlyArray<ChildAttribute>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<ChildAttribute>
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
  buttonContent?: Html
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<ChildAttribute>
  formName?: string
  /** Marks the Combobox unavailable with `aria-disabled="true"` on the input
   *  and the toggle button and `data-disabled` on both plus the wrapper, and
   *  removes their handlers so the dropdown cannot be opened. */
  isDisabled?: boolean
  /** Prevents committing a selection while exposing read-only semantics with
   *  the native `readonly` attribute plus `aria-readonly="true"` on the input,
   *  `aria-readonly="true"` on the items panel, and `data-readonly` on the
   *  wrapper, input, toggle button, items panel, and every item. The Combobox
   *  still opens, navigates, and closes, and the input still takes focus and
   *  allows text selection and copying. Typing is frozen, since the input
   *  value doubles as the display of the selection. Independent of
   *  `isDisabled`: setting both emits both attribute sets, and `isDisabled`
   *  still wins for interaction, since it drops every handler, so a Combobox
   *  that is both read-only and disabled cannot be opened at all. */
  isReadOnly?: boolean
  isInvalid?: boolean
  openOnFocus?: boolean
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

/** Per-render view inputs for the shared array-based Combobox view. The
 *  multi-select variant exposes this shape directly; the single-select
 *  variant swaps `selectedValues` for `maybeSelectedValue` at its public
 *  seam and adapts to this shape internally. */
export type BaseViewInputs<Item extends string> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  Marks items as selected and drives the hidden form inputs
     *  submitted under `formName`. */
    selectedValues: ReadonlyArray<Item>
  }>

// VIEW FACTORY

/** Variant-specific view behavior injected into the shared combobox view factory. */
export type ViewBehavior = Readonly<{
  ariaMultiSelectable: boolean
}>

/** Creates a combobox view function from variant-specific behavior. Shared rendering logic (input, items, transitions, keyboard navigation) is handled internally; only listbox multi-select semantics vary by variant. */
export const makeView = <Model extends BaseModel>(behavior: ViewBehavior) => {
  const impl = defineView<Model, Message, BaseViewInputs<string>>(
    (model, viewInputs, h): Html => {
      const {
        id,
        isOpen,
        immediate,
        animation: { transitionState },
        maybeActiveItemIndex,
      } = model

      const {
        items,
        selectedValues,
        restingInputValue,
        itemToConfig,
        itemToValue,
        itemToDisplayText,
        isItemDisabled,
        inputClassName,
        inputAttributes = [],
        inputPlaceholder,
        inputWrapperClassName,
        inputWrapperAttributes = [],
        itemsClassName,
        itemsAttributes = [],
        itemsScrollClassName,
        itemsScrollAttributes = [],
        backdropClassName,
        backdropAttributes = [],
        className,
        attributes = [],
        buttonContent,
        buttonClassName,
        buttonAttributes = [],
        formName,
        isDisabled,
        isReadOnly = false,
        isInvalid,
        openOnFocus,
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

      const resolveInputLabel = () => {
        if (Predicate.isNotUndefined(ariaLabel)) {
          return [h.AriaLabel(ariaLabel)]
        } else if (Predicate.isNotUndefined(ariaLabelledBy)) {
          return [h.AriaLabelledBy(ariaLabelledBy)]
        } else {
          return []
        }
      }

      const inputLabelAttributes = resolveInputLabel()

      const isValueSelected = (itemValue: string): boolean =>
        Array.contains(selectedValues, itemValue)

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

      const isDisabledAtIndex = (index: number): boolean =>
        Predicate.isNotUndefined(isItemDisabled) &&
        pipe(
          items,
          Array.get(index),
          Option.exists(item => isItemDisabled(item, index)),
        )

      const firstEnabledIndex = findFirstEnabledIndex(
        items.length,
        0,
        isDisabledAtIndex,
      )(0, 1)

      const lastEnabledIndex = findFirstEnabledIndex(
        items.length,
        0,
        isDisabledAtIndex,
      )(items.length - 1, -1)

      const resolveActiveIndex = keyToIndex(
        'ArrowDown',
        'ArrowUp',
        items.length,
        Option.getOrElse(maybeActiveItemIndex, () => -1),
        isDisabledAtIndex,
      )

      const resolveImmediateSelection = (
        targetIndex: number,
      ): Option.Option<{ item: string }> => {
        if (isReadOnly) {
          return Option.none()
        } else {
          return pipe(
            OptionExt.when(immediate, targetIndex),
            Option.flatMap(index => Array.get(items, index)),
            Option.map(targetItem => ({
              item: itemToValue(targetItem, targetIndex),
            })),
          )
        }
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

      const handleInputKeyDown = (key: string): Option.Option<Message> =>
        M.value(key).pipe(
          M.when('ArrowDown', () => {
            if (!isOpen) {
              return Option.some(
                Opened({
                  maybeActiveItemIndex: Option.some(firstEnabledIndex),
                }),
              )
            }
            const targetIndex = resolveActiveIndex('ArrowDown')
            return Option.some(
              ActivatedItem({
                index: targetIndex,
                activationTrigger: 'Keyboard',
                maybeImmediateSelection: resolveImmediateSelection(targetIndex),
              }),
            )
          }),
          M.when('ArrowUp', () => {
            if (!isOpen) {
              return Option.some(
                Opened({
                  maybeActiveItemIndex: Option.some(lastEnabledIndex),
                }),
              )
            }
            const targetIndex = resolveActiveIndex('ArrowUp')
            return Option.some(
              ActivatedItem({
                index: targetIndex,
                activationTrigger: 'Keyboard',
                maybeImmediateSelection: resolveImmediateSelection(targetIndex),
              }),
            )
          }),
          M.when('Enter', () => {
            if (!isOpen) {
              return Option.none()
            }
            return resolveCommitMessage()
          }),
          M.when('Escape', () => {
            if (!isOpen) {
              return Option.none()
            }
            return Option.some(
              Closed({ restingInputValue, isClearable: !isReadOnly }),
            )
          }),
          M.whenOr('Home', 'End', () => {
            if (!isOpen) {
              return Option.none()
            }
            const targetIndex = resolveActiveIndex(key)
            return Option.some(
              ActivatedItem({
                index: targetIndex,
                activationTrigger: 'Keyboard',
                maybeImmediateSelection: resolveImmediateSelection(targetIndex),
              }),
            )
          }),
          M.orElse(() => Option.none()),
        )

      const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
        onNone: () => [],
        onSome: index => [h.AriaActiveDescendant(itemId(id, index))],
      })

      const onInputAttributes = isReadOnly
        ? []
        : [h.OnInput(value => UpdatedInputValue({ value }))]

      const resolvedInputAttributes = [
        h.Id(`${id}-input`),
        h.Role('combobox'),
        h.AriaExpanded(isVisible),
        h.AriaControls(`${id}-items`),
        h.Attribute('aria-autocomplete', 'list'),
        h.Attribute('aria-haspopup', 'listbox'),
        ...inputLabelAttributes,
        h.Autocomplete('off'),
        h.Value(model.inputValue),
        ...maybeActiveDescendant,
        ...(inputPlaceholder ? [h.Placeholder(inputPlaceholder)] : []),
        ...(isDisabled
          ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
          : [
              ...onInputAttributes,
              h.OnKeyDownPreventDefault(handleInputKeyDown),
              h.OnBlur(
                BlurredInput({ restingInputValue, isClearable: !isReadOnly }),
              ),
              ...(openOnFocus
                ? [h.OnFocus(Opened({ maybeActiveItemIndex: Option.none() }))]
                : []),
            ]),
        ...(isReadOnly
          ? [
              h.Readonly(true),
              h.AriaReadonly(true),
              h.DataAttribute('readonly', ''),
            ]
          : []),
        ...(isInvalid
          ? [h.AriaInvalid(true), h.DataAttribute('invalid', '')]
          : []),
        ...(isVisible ? [h.DataAttribute('open', '')] : []),
        ...(model.selectInputOnFocus
          ? [h.OnMount(AttachComboboxSelectOnFocus())]
          : []),
        ...(inputClassName ? [h.Class(inputClassName)] : []),
        ...inputAttributes,
      ]

      const anchorAttributes = [
        h.Style({
          position: 'absolute',
          margin: '0',
          visibility: 'hidden',
        }),
        h.OnMount(
          AnchorCombobox({
            buttonId: `${id}-input-wrapper`,
            anchor,
          }),
        ),
      ]

      const itemsContainerAttributes = [
        h.Id(`${id}-items`),
        h.Role('listbox'),
        ...(behavior.ariaMultiSelectable ? [h.AriaMultiSelectable(true)] : []),
        h.AriaLabelledBy(`${id}-input`),
        h.Tabindex(-1),
        ...(isReadOnly
          ? [h.AriaReadonly(true), h.DataAttribute('readonly', '')]
          : []),
        ...anchorAttributes,
        ...animationAttributes,
        ...(itemsClassName ? [h.Class(itemsClassName)] : []),
        ...itemsAttributes,
      ]

      const comboboxItems = Array.map(items, (item, index) => {
        const isActiveItem = Option.exists(
          maybeActiveItemIndex,
          activeIndex => activeIndex === index,
        )
        const isDisabledItem = isDisabledAtIndex(index)
        const isSelectedItem = isValueSelected(itemToValue(item, index))
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
              ? [
                  h.OnClick(
                    SelectedItem({
                      item: itemToValue(item, index),
                      displayText: itemToDisplayText(item, index),
                      wasSelected: isValueSelected(itemToValue(item, index)),
                    }),
                  ),
                ]
              : []),
            ...(isHoverable
              ? [
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
          return comboboxItems
        }

        const segments = groupContiguous(comboboxItems, (_, index) =>
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
        h.OnMount(PortalComboboxBackdrop()),
        ...(isLeaving
          ? []
          : [
              h.OnClick(
                Closed({ restingInputValue, isClearable: !isReadOnly }),
              ),
            ]),
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

      const resolvedInputWrapperAttributes = [
        h.Id(`${id}-input-wrapper`),
        ...(inputWrapperClassName ? [h.Class(inputWrapperClassName)] : []),
        ...inputWrapperAttributes,
      ]

      const toggleButton = buttonContent
        ? [
            h.keyed('button')(
              `${id}-button`,
              [
                h.Id(`${id}-button`),
                h.Type('button'),
                h.Tabindex(-1),
                h.AriaControls(`${id}-items`),
                h.AriaExpanded(isVisible),
                h.Attribute('aria-haspopup', 'listbox'),
                ...(isDisabled
                  ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
                  : [
                      h.OnClick(
                        PressedToggleButton({
                          restingInputValue,
                          isClearable: !isReadOnly,
                        }),
                      ),
                    ]),
                ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
                h.OnMount(AttachComboboxPreventBlur()),
                ...(buttonClassName ? [h.Class(buttonClassName)] : []),
                ...buttonAttributes,
              ],
              [buttonContent],
            ),
          ]
        : []

      const hiddenInputs = formName
        ? Array.match(selectedValues, {
            onEmpty: () => [h.input([h.Type('hidden'), h.Name(formName)])],
            onNonEmpty: Array.map(selectedValue =>
              h.input([
                h.Type('hidden'),
                h.Name(formName),
                h.Value(selectedValue),
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
        h.div(resolvedInputWrapperAttributes, [
          h.input(resolvedInputAttributes),
          ...toggleButton,
        ]),
        ...(isVisible && Array.isReadonlyArrayNonEmpty(items)
          ? visibleContent
          : []),
        ...hiddenInputs,
      ])
    },
  )

  return <Item extends string>() =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    impl as unknown as SubmodelView<Model, Message, BaseViewInputs<Item>>
}

import {
  Array,
  Effect,
  Match as M,
  Option,
  Predicate,
  Result,
  Schema as S,
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
import { makeConstrainedEvo } from '../../struct/index.js'
import { AnchorConfig, anchorSetup, portalToBody } from '../anchor.js'
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
/** Sent when the combobox closes via Escape key or backdrop click. */
export const Closed = m('Closed')
/** Sent when the combobox input loses focus. */
export const BlurredInput = m('BlurredInput')
/** Sent when an item is highlighted via arrow keys or mouse hover. Includes activation trigger and optional immediate selection info. */
export const ActivatedItem = m('ActivatedItem', {
  index: S.Number,
  activationTrigger: ActivationTrigger,
  maybeImmediateSelection: S.Option(
    S.Struct({ item: S.String, displayText: S.String }),
  ),
})
/** Sent when the mouse leaves an enabled item. */
export const DeactivatedItem = m('DeactivatedItem')
/** Sent when an item is selected via Enter or click. Includes display text for restoring input value on close. */
export const SelectedItem = m('SelectedItem', {
  item: S.String,
  displayText: S.String,
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
/** Sent when the optional toggle button is clicked. */
export const PressedToggleButton = m('PressedToggleButton')

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

/** Sent when a single-select combobox commits a selection, or when a multi-select combobox toggles an item on. The `value` is the string key; consumers that need a richer domain type should look it up from their own state or, in the multi case, branch on `wasAdded` to distinguish add vs remove. */
export const Selected = m('Selected', {
  value: S.String,
  wasAdded: S.Boolean,
})

export type Selected<Value extends string = string> = Readonly<{
  readonly _tag: 'Selected'
  readonly value: Value
  readonly wasAdded: boolean
}>

/** Union of out-messages the combobox component can produce. Single-select comboboxes always emit `wasAdded: true`. Multi-select comboboxes emit `wasAdded: true` when adding to the selection and `wasAdded: false` when toggling off. */
export const OutMessage = S.Union([Selected])

/** Generic over `Value extends string` so consumers who create the combobox
 *  via `Ui.Combobox.create<MyUnion>()` receive `value: MyUnion` in the
 *  `Selected` OutMessage from the factory's `update`, instead of
 *  `value: string`. Defaults to `string`. */
export type OutMessage<Value extends string = string> = Selected<Value>

// SELECTORS

export const inputSelector = (id: string): string => `#${id}-input`
export const inputWrapperSelector = (id: string): string =>
  `#${id}-input-wrapper`
export const itemsSelector = (id: string): string => `#${id}-items`
export const itemSelector = (id: string, index: number): string =>
  `#${id}-item-${index}`
export const itemId = (id: string, index: number): string =>
  `${id}-item-${index}`

// HELPERS

const constrainedEvo = makeConstrainedEvo<BaseModel>()

/** Resets only shared base fields to their closed state. Does not touch inputValue or selection. Those are variant-specific. */
export const closedBaseModel = <Model extends BaseModel>(model: Model): Model =>
  constrainedEvo(model, {
    isOpen: () => false,
    maybeActiveItemIndex: () => Option.none(),
    activationTrigger: () => 'Keyboard' as const,
    maybeLastPointerPosition: () => Option.none(),
  })

// UPDATE FACTORY

/** Context passed to the `handleSelectedItem` handler with commands for focus management and modal cleanup. */
export type SelectedItemContext = Readonly<{
  focusInput: Command.Command<Message>
  maybeUnlockScroll: Option.Option<Command.Command<Message>>
  maybeRestoreInert: Option.Option<Command.Command<Message>>
}>

/** Prevents page scrolling while the combobox popup is open in modal mode. */
export const LockScroll = Command.define(
  'LockScroll',
  CompletedLockScroll,
)(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())))
/** Re-enables page scrolling after the combobox popup closes. */
export const UnlockScroll = Command.define(
  'UnlockScroll',
  CompletedUnlockScroll,
)(Dom.unlockScroll.pipe(Effect.as(CompletedUnlockScroll())))
/** Marks all elements outside the combobox as inert for modal behavior. */
export const InertOthers = Command.define(
  'InertOthers',
  { id: S.String },
  CompletedInertOthers,
)(({ id }) =>
  Dom.inertOthers(id, [inputWrapperSelector(id), itemsSelector(id)]).pipe(
    Effect.as(CompletedInertOthers()),
  ),
)
/** Removes the inert attribute from elements outside the combobox. */
export const RestoreInert = Command.define(
  'RestoreInert',
  { id: S.String },
  CompletedRestoreInert,
)(({ id }) => Dom.restoreInert(id).pipe(Effect.as(CompletedRestoreInert())))
/** Moves focus to the combobox input after selection or close. */
export const FocusInput = Command.define(
  'FocusInput',
  { id: S.String },
  CompletedFocusInput,
)(({ id }) =>
  Dom.focus(inputSelector(id)).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusInput()),
  ),
)
/** Scrolls the active combobox item into view after keyboard navigation. */
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
/** Programmatically clicks the active combobox item's DOM element. */
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
/** Detects whether the combobox input wrapper moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  { id: S.String },
  GotAnimationMessage,
)(({ id }) =>
  Effect.raceFirst(
    Dom.detectElementMovement(inputWrapperSelector(id)).pipe(
      Effect.as(GotAnimationMessage({ message: AnimationEndedAnimation() })),
    ),
    Dom.waitForAnimationSettled(itemsSelector(id)).pipe(
      Effect.as(GotAnimationMessage({ message: AnimationEndedAnimation() })),
    ),
  ),
)

const delegateToAnimation = <Model extends BaseModel>(
  model: Model,
  animationMessage: AnimationMessage,
): readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
] => {
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
    constrainedEvo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...additionalCommands],
    Option.none(),
  ]
}

/** Creates a combobox update function from variant-specific handlers. Shared logic (open, close, activate, transition) is handled internally; only close, selection, and immediate-activation behavior varies by variant. */
export const makeUpdate = <Model extends BaseModel>(
  handlers: Readonly<{
    handleClose: (model: Model) => Model
    handleSelectedItem: (
      model: Model,
      item: string,
      displayText: string,
      context: SelectedItemContext,
    ) => readonly [
      Model,
      ReadonlyArray<Command.Command<Message>>,
      Option.Option<OutMessage>,
    ]
    handleImmediateActivation: (
      model: Model,
      item: string,
      displayText: string,
    ) => Model
  }>,
) => {
  type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message>>,
    Option.Option<OutMessage>,
  ]
  const withUpdateReturn = M.withReturnType<UpdateReturn>()

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

    const openCombobox = (baseModel: Model): UpdateReturn => {
      if (model.isAnimated) {
        const [nextModel, animationCommands] = delegateToAnimation(
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
      maybeOutMessage: Option.Option<OutMessage> = Option.none(),
    ): UpdateReturn => {
      const closed = handlers.handleClose(baseModel)

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
        'CompletedLockScroll',
        'CompletedUnlockScroll',
        'CompletedInertOthers',
        'CompletedRestoreInert',
        'CompletedFocusInput',
        'CompletedScrollIntoView',
        'CompletedClickItem',
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

        Closed: () => closeCombobox(model, [focusInput]),

        BlurredInput: () => closeCombobox(model, []),

        ActivatedItem: ({
          index,
          activationTrigger,
          maybeImmediateSelection,
        }) => {
          const highlightedModel = constrainedEvo(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => activationTrigger,
          })

          const nextModel = Option.match(maybeImmediateSelection, {
            onNone: () => highlightedModel,
            onSome: ({ item, displayText }) =>
              handlers.handleImmediateActivation(
                highlightedModel,
                item,
                displayText,
              ),
          })

          return [
            nextModel,
            activationTrigger === 'Keyboard'
              ? [ScrollIntoView({ id: model.id, index })]
              : [],
            Option.none(),
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

        SelectedItem: ({ item, displayText }) => {
          const [nextModel, commands, maybeOutMessage] =
            handlers.handleSelectedItem(model, item, displayText, {
              focusInput,
              maybeUnlockScroll,
              maybeRestoreInert,
            })

          if (model.isOpen && !nextModel.isOpen && model.isAnimated) {
            const [transitionedModel, animationCommands] = delegateToAnimation(
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
        },

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

        PressedToggleButton: () => {
          if (model.isOpen) {
            return closeCombobox(model, [focusInput])
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
          delegateToAnimation(model, animationMessage),
      }),
    )
  }

  return internalUpdate
}

/** The anchor-positioning Mount this Combobox renders when an anchor is
 *  configured. Exposed so Scene tests can call
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
            const teardownAnchor = anchorSetup({
              buttonId,
              anchor,
              interceptTab: false,
            })(element)
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
      Effect.sync(() => portalToBody(element)),
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
 *  The Combobox emits a `Selected({ value, wasAdded })` OutMessage on
 *  commit (single-select always `wasAdded: true`, multi-select toggles).
 *  Consumers pattern-match this in their `GotComboboxMessage` handler. */
export type BaseViewInputs<Item extends string> = Readonly<{
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{
      isActive: boolean
      isDisabled: boolean
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
  isDisabled?: boolean
  isInvalid?: boolean
  openOnFocus?: boolean
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  groupAttributes?: ReadonlyArray<ChildAttribute>
  separatorClassName?: string
  separatorAttributes?: ReadonlyArray<ChildAttribute>
  anchor?: AnchorConfig
}>

// VIEW FACTORY

/** Variant-specific view behavior injected into the shared combobox view factory. */
export type ViewBehavior<Model extends BaseModel> = Readonly<{
  isItemSelected: (model: Model, itemValue: string) => boolean
  ariaMultiSelectable: boolean
}>

/** Creates a combobox view function from variant-specific behavior. Shared rendering logic (input, items, transitions, keyboard navigation) is handled internally; only selection display varies by variant. */
export const makeView = <Model extends BaseModel>(
  behavior: ViewBehavior<Model>,
) => {
  const impl = defineView<Model, Message, BaseViewInputs<string>>(
    (model, viewInputs): Html => {
      const h = html<Message>()

      const {
        id,
        isOpen,
        immediate,
        animation: { transitionState },
        maybeActiveItemIndex,
      } = model

      const {
        items,
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
        isInvalid,
        openOnFocus,
        itemGroupKey,
        groupToHeading,
        groupClassName,
        groupAttributes = [],
        separatorClassName,
        separatorAttributes = [],
        anchor,
      } = viewInputs

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
      ): Option.Option<{ item: string; displayText: string }> =>
        OptionExt.when(
          immediate,
          pipe(
            items,
            Array.get(targetIndex),
            Option.match({
              onNone: () => ({ item: '', displayText: '' }),
              onSome: targetItem => ({
                item: itemToValue(targetItem, targetIndex),
                displayText: itemToDisplayText(targetItem, targetIndex),
              }),
            }),
          ),
        )

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
            return Option.map(maybeActiveItemIndex, index =>
              RequestedItemClick({ index }),
            )
          }),
          M.when('Escape', () => {
            if (!isOpen) {
              return Option.none()
            }
            return Option.some(Closed())
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

      const resolvedInputAttributes = [
        h.Id(`${id}-input`),
        h.Role('combobox'),
        h.AriaExpanded(isVisible),
        h.AriaControls(`${id}-items`),
        h.Attribute('aria-autocomplete', 'list'),
        h.Attribute('aria-haspopup', 'listbox'),
        h.Autocomplete('off'),
        h.Value(model.inputValue),
        ...maybeActiveDescendant,
        ...(inputPlaceholder ? [h.Placeholder(inputPlaceholder)] : []),
        ...(isDisabled
          ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
          : [
              h.OnInput(value => UpdatedInputValue({ value })),
              h.OnKeyDownPreventDefault(handleInputKeyDown),
              h.OnBlur(BlurredInput()),
              ...(openOnFocus
                ? [h.OnFocus(Opened({ maybeActiveItemIndex: Option.none() }))]
                : []),
            ]),
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

      const anchorAttributes = anchor
        ? [
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
        : [h.OnMount(AttachComboboxPreventBlur())]

      const itemsContainerAttributes = [
        h.Id(`${id}-items`),
        h.Role('listbox'),
        ...(behavior.ariaMultiSelectable ? [h.AriaMultiSelectable(true)] : []),
        h.AriaLabelledBy(`${id}-input`),
        h.Tabindex(-1),
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
        const isSelectedItem = behavior.isItemSelected(
          model,
          itemToValue(item, index),
        )
        const itemConfig = itemToConfig(item, {
          isActive: isActiveItem,
          isDisabled: isDisabledItem,
          isSelected: isSelectedItem,
        })

        const isInteractive = !isDisabledItem && !isLeaving

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
            ...(isInteractive
              ? [
                  h.OnClick(
                    SelectedItem({
                      item: itemToValue(item, index),
                      displayText: itemToDisplayText(item, index),
                    }),
                  ),
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
          h.OnMount(PortalComboboxBackdrop()),
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
                  : [h.OnClick(PressedToggleButton())]),
                h.OnMount(AttachComboboxPreventBlur()),
                ...(buttonClassName ? [h.Class(buttonClassName)] : []),
                ...buttonAttributes,
              ],
              [buttonContent],
            ),
          ]
        : []

      const selectedValues = pipe(
        items,
        Array.filterMap((item, index) => {
          const value = itemToValue(item, index)
          return Result.fromOption(
            OptionExt.when(behavior.isItemSelected(model, value), value),
            () => undefined,
          )
        }),
      )

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

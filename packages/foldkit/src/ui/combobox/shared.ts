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
import * as Task from '../../task/index.js'
import { anchorSetup } from '../anchor.js'
import type { AnchorConfig } from '../anchor.js'
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

/** Schema for the activation trigger — whether the user interacted via mouse or keyboard. */
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
export const CompletedSetupInert = m('CompletedSetupInert')
/** Sent when the restore-inert command completes. */
export const CompletedTeardownInert = m('CompletedTeardownInert')
/** Sent when the focus-input command completes. */
export const CompletedFocusInput = m('CompletedFocusInput')
/** Sent when the scroll-into-view command completes after keyboard activation. */
export const CompletedScrollIntoView = m('CompletedScrollIntoView')
/** Sent when the programmatic item click command completes. */
export const CompletedClickItem = m('CompletedClickItem')
/** Sent when the items panel mounts and Floating UI has positioned it. Update no-ops; surfaces the positioning side effect for DevTools. */
export const CompletedAnchorMount = m('CompletedAnchorMount')
/** Sent when the items panel mounts and the capture-phase pointerdown listener is attached (with or without anchor). Update no-ops; surfaces the listener-attach side effect for DevTools. */
export const CompletedAttachPreventBlur = m('CompletedAttachPreventBlur')
/** Sent when the input mounts and the focus listener that auto-selects on focus is attached. Update no-ops; surfaces the listener-attach side effect for DevTools. */
export const CompletedAttachSelectOnFocus = m('CompletedAttachSelectOnFocus')
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
    typeof CompletedSetupInert,
    typeof CompletedTeardownInert,
    typeof CompletedFocusInput,
    typeof CompletedScrollIntoView,
    typeof CompletedClickItem,
    typeof CompletedAnchorMount,
    typeof CompletedAttachPreventBlur,
    typeof CompletedAttachSelectOnFocus,
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
  CompletedSetupInert,
  CompletedTeardownInert,
  CompletedFocusInput,
  CompletedScrollIntoView,
  CompletedClickItem,
  CompletedAnchorMount,
  CompletedAttachPreventBlur,
  CompletedAttachSelectOnFocus,
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
export type CompletedSetupInert = typeof CompletedSetupInert.Type
export type CompletedTeardownInert = typeof CompletedTeardownInert.Type
export type CompletedFocusInput = typeof CompletedFocusInput.Type
export type CompletedScrollIntoView = typeof CompletedScrollIntoView.Type
export type CompletedClickItem = typeof CompletedClickItem.Type
export type UpdatedInputValue = typeof UpdatedInputValue.Type
export type PressedToggleButton = typeof PressedToggleButton.Type

export type Message = typeof Message.Type

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

/** Resets only shared base fields to their closed state. Does not touch inputValue or selection — those are variant-specific. */
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
export const LockScroll = Command.define('LockScroll', CompletedLockScroll)
/** Re-enables page scrolling after the combobox popup closes. */
export const UnlockScroll = Command.define(
  'UnlockScroll',
  CompletedUnlockScroll,
)
/** Marks all elements outside the combobox as inert for modal behavior. */
export const InertOthers = Command.define('InertOthers', CompletedSetupInert)
/** Removes the inert attribute from elements outside the combobox. */
export const RestoreInert = Command.define(
  'RestoreInert',
  CompletedTeardownInert,
)
/** Moves focus to the combobox input after selection or close. */
export const FocusInput = Command.define('FocusInput', CompletedFocusInput)
/** Scrolls the active combobox item into view after keyboard navigation. */
export const ScrollIntoView = Command.define(
  'ScrollIntoView',
  CompletedScrollIntoView,
)
/** Programmatically clicks the active combobox item's DOM element. */
export const ClickItem = Command.define('ClickItem', CompletedClickItem)
/** Detects whether the combobox input wrapper moved or the leave animation ended — whichever comes first. Both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  GotAnimationMessage,
)

const delegateToAnimation = <Model extends BaseModel>(
  model: Model,
  animationMessage: AnimationMessage,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
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
              Task.detectElementMovement(inputWrapperSelector(model.id)).pipe(
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
    constrainedEvo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...additionalCommands],
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
    ) => [Model, ReadonlyArray<Command.Command<Message>>]
    handleImmediateActivation: (
      model: Model,
      item: string,
      displayText: string,
    ) => Model
  }>,
) => {
  type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
  const withUpdateReturn = M.withReturnType<UpdateReturn>()

  return (model: Model, message: Message): UpdateReturn => {
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
          inputWrapperSelector(model.id),
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

    const focusInput = FocusInput(
      Task.focus(inputSelector(model.id)).pipe(
        Effect.ignore,
        Effect.as(CompletedFocusInput()),
      ),
    )

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
        ]
      }

      return [
        constrainedEvo(baseModel, { isOpen: () => true }),
        Array.getSomes([maybeLockScroll, maybeInertOthers]),
      ]
    }

    const closeCombobox = (
      baseModel: Model,
      commands: ReadonlyArray<Command.Command<Message>>,
    ): UpdateReturn => {
      const closed = handlers.handleClose(baseModel)

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
              ? [
                  ScrollIntoView(
                    Task.scrollIntoView(itemSelector(model.id, index)).pipe(
                      Effect.ignore,
                      Effect.as(CompletedScrollIntoView()),
                    ),
                  ),
                ]
              : [],
          ]
        },

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

        SelectedItem: ({ item, displayText }) => {
          const [nextModel, commands] = handlers.handleSelectedItem(
            model,
            item,
            displayText,
            {
              focusInput,
              maybeUnlockScroll,
              maybeRestoreInert,
            },
          )

          if (model.isOpen && !nextModel.isOpen && model.isAnimated) {
            const [transitionedModel, animationCommands] = delegateToAnimation(
              nextModel,
              AnimationHid(),
            )
            return [transitionedModel, [...commands, ...animationCommands]]
          }

          return [nextModel, commands]
        },

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

        UpdatedInputValue: ({ value }) => {
          if (model.isOpen) {
            return [
              constrainedEvo(model, {
                inputValue: () => value,
                maybeActiveItemIndex: () => Option.some(0),
                activationTrigger: () => 'Keyboard' as const,
              }),
              [],
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

          return [nextModel, [focusInput, ...commands]]
        },

        GotAnimationMessage: ({ message: animationMessage }) =>
          delegateToAnimation(model, animationMessage),

        CompletedLockScroll: () => [model, []],
        CompletedUnlockScroll: () => [model, []],
        CompletedSetupInert: () => [model, []],
        CompletedTeardownInert: () => [model, []],
        CompletedFocusInput: () => [model, []],
        CompletedScrollIntoView: () => [model, []],
        CompletedClickItem: () => [model, []],
        CompletedAnchorMount: () => [model, []],
        CompletedAttachPreventBlur: () => [model, []],
        CompletedAttachSelectOnFocus: () => [model, []],
      }),
    )
  }
}

const ComboboxAnchor = Mount.define('ComboboxAnchor', CompletedAnchorMount)
const ComboboxAttachPreventBlur = Mount.define(
  'ComboboxAttachPreventBlur',
  CompletedAttachPreventBlur,
)
const ComboboxAttachSelectOnFocus = Mount.define(
  'ComboboxAttachSelectOnFocus',
  CompletedAttachSelectOnFocus,
)

const attachPreventBlurOnPointerDown = ComboboxAttachPreventBlur(
  (
    element,
  ): Effect.Effect<MountResult<typeof CompletedAttachPreventBlur.Type>> =>
    Effect.sync(() => {
      const handler = (event: Event) => {
        event.preventDefault()
      }
      element.addEventListener('pointerdown', handler, { capture: true })
      return {
        message: CompletedAttachPreventBlur(),
        cleanup: () =>
          element.removeEventListener('pointerdown', handler, {
            capture: true,
          }),
      }
    }),
)

const attachSelectOnFocus = ComboboxAttachSelectOnFocus(
  (
    element,
  ): Effect.Effect<MountResult<typeof CompletedAttachSelectOnFocus.Type>> =>
    Effect.sync(() => {
      const handler = () => {
        if (element instanceof HTMLInputElement) {
          element.select()
        }
      }
      element.addEventListener('focus', handler)
      return {
        message: CompletedAttachSelectOnFocus(),
        cleanup: () => element.removeEventListener('focus', handler),
      }
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

/** Configuration for rendering a combobox with `view`. */
export type BaseViewConfig<
  Message,
  Item extends string,
  Model extends BaseModel,
> = Readonly<{
  model: Model
  toParentMessage: (
    message:
      | Opened
      | Closed
      | BlurredInput
      | ActivatedItem
      | DeactivatedItem
      | SelectedItem
      | MovedPointerOverItem
      | RequestedItemClick
      | UpdatedInputValue
      | PressedToggleButton
      | typeof CompletedAnchorMount.Type
      | typeof CompletedAttachPreventBlur.Type
      | typeof CompletedAttachSelectOnFocus.Type,
  ) => Message
  onSelectedItem?: (value: string) => Message
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{
      isActive: boolean
      isDisabled: boolean
      isSelected: boolean
    }>,
  ) => ItemConfig
  itemToValue: (item: Item, index: number) => string
  itemToDisplayText: (item: Item, index: number) => string
  isItemDisabled?: (item: Item, index: number) => boolean
  inputClassName?: string
  inputAttributes?: ReadonlyArray<Attribute<Message>>
  inputPlaceholder?: string
  inputWrapperClassName?: string
  inputWrapperAttributes?: ReadonlyArray<Attribute<Message>>
  itemsClassName?: string
  itemsAttributes?: ReadonlyArray<Attribute<Message>>
  itemsScrollClassName?: string
  itemsScrollAttributes?: ReadonlyArray<Attribute<Message>>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<Attribute<Message>>
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
  buttonContent?: Html
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<Attribute<Message>>
  formName?: string
  isDisabled?: boolean
  isInvalid?: boolean
  openOnFocus?: boolean
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  groupAttributes?: ReadonlyArray<Attribute<Message>>
  separatorClassName?: string
  separatorAttributes?: ReadonlyArray<Attribute<Message>>
  anchor?: AnchorConfig
}>

// VIEW FACTORY

/** Variant-specific view behavior injected into the shared combobox view factory. */
export type ViewBehavior<Model extends BaseModel> = Readonly<{
  isItemSelected: (model: Model, itemValue: string) => boolean
  ariaMultiSelectable: boolean
}>

/** Creates a combobox view function from variant-specific behavior. Shared rendering logic (input, items, transitions, keyboard navigation) is handled internally; only selection display varies by variant. */
export const makeView =
  <Model extends BaseModel>(behavior: ViewBehavior<Model>) =>
  <Message, Item extends string>(
    config: BaseViewConfig<Message, Item, Model>,
  ): Html => {
    const {
      div,
      input,
      AriaActiveDescendant,
      AriaControls,
      AriaDisabled,
      AriaExpanded,
      AriaInvalid,
      AriaLabelledBy,
      AriaMultiSelectable,
      AriaSelected,
      Attribute,
      Autocomplete,
      Class,
      DataAttribute,
      Id,
      Name,
      OnBlur,
      OnClick,
      OnFocus,
      OnInput,
      OnKeyDownPreventDefault,
      OnMount,
      OnPointerLeave,
      OnPointerMove,
      Placeholder,
      Role,
      Style,
      Tabindex,
      Type,
      Value,
      keyed,
    } = html<Message>()

    const {
      model: {
        id,
        isOpen,
        immediate,
        animation: { transitionState },
        maybeActiveItemIndex,
      },
      toParentMessage,
      onSelectedItem,
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
    } = config

    const dispatchSelectedItem = (item: Item, index: number): Message =>
      onSelectedItem
        ? onSelectedItem(itemToValue(item, index))
        : toParentMessage(
            SelectedItem({
              item: itemToValue(item, index),
              displayText: itemToDisplayText(item, index),
            }),
          )

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
              toParentMessage(
                Opened({
                  maybeActiveItemIndex: Option.some(firstEnabledIndex),
                }),
              ),
            )
          }
          const targetIndex = resolveActiveIndex('ArrowDown')
          return Option.some(
            toParentMessage(
              ActivatedItem({
                index: targetIndex,
                activationTrigger: 'Keyboard',
                maybeImmediateSelection: resolveImmediateSelection(targetIndex),
              }),
            ),
          )
        }),
        M.when('ArrowUp', () => {
          if (!isOpen) {
            return Option.some(
              toParentMessage(
                Opened({
                  maybeActiveItemIndex: Option.some(lastEnabledIndex),
                }),
              ),
            )
          }
          const targetIndex = resolveActiveIndex('ArrowUp')
          return Option.some(
            toParentMessage(
              ActivatedItem({
                index: targetIndex,
                activationTrigger: 'Keyboard',
                maybeImmediateSelection: resolveImmediateSelection(targetIndex),
              }),
            ),
          )
        }),
        M.when('Enter', () => {
          if (!isOpen) {
            return Option.none()
          }
          return Option.map(maybeActiveItemIndex, index =>
            toParentMessage(RequestedItemClick({ index })),
          )
        }),
        M.when('Escape', () => {
          if (!isOpen) {
            return Option.none()
          }
          return Option.some(toParentMessage(Closed()))
        }),
        M.whenOr('Home', 'End', () => {
          if (!isOpen) {
            return Option.none()
          }
          const targetIndex = resolveActiveIndex(key)
          return Option.some(
            toParentMessage(
              ActivatedItem({
                index: targetIndex,
                activationTrigger: 'Keyboard',
                maybeImmediateSelection: resolveImmediateSelection(targetIndex),
              }),
            ),
          )
        }),
        M.orElse(() => Option.none()),
      )

    const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
      onNone: () => [],
      onSome: index => [AriaActiveDescendant(itemId(id, index))],
    })

    const resolvedInputAttributes = [
      Id(`${id}-input`),
      Role('combobox'),
      AriaExpanded(isVisible),
      AriaControls(`${id}-items`),
      Attribute('aria-autocomplete', 'list'),
      Attribute('aria-haspopup', 'listbox'),
      Autocomplete('off'),
      Value(config.model.inputValue),
      ...maybeActiveDescendant,
      ...(inputPlaceholder ? [Placeholder(inputPlaceholder)] : []),
      ...(isDisabled
        ? [AriaDisabled(true), DataAttribute('disabled', '')]
        : [
            OnInput(value => toParentMessage(UpdatedInputValue({ value }))),
            OnKeyDownPreventDefault(handleInputKeyDown),
            OnBlur(toParentMessage(BlurredInput())),
            ...(openOnFocus
              ? [
                  OnFocus(
                    toParentMessage(
                      Opened({ maybeActiveItemIndex: Option.none() }),
                    ),
                  ),
                ]
              : []),
          ]),
      ...(isInvalid ? [AriaInvalid(true), DataAttribute('invalid', '')] : []),
      ...(isVisible ? [DataAttribute('open', '')] : []),
      ...(config.model.selectInputOnFocus
        ? [OnMount(Mount.mapMessage(attachSelectOnFocus, toParentMessage))]
        : []),
      ...(inputClassName ? [Class(inputClassName)] : []),
      ...inputAttributes,
    ]

    const anchorAttributes = anchor
      ? [
          Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
          OnMount(
            Mount.mapMessage(
              ComboboxAnchor(
                (
                  items,
                ): Effect.Effect<
                  MountResult<typeof CompletedAnchorMount.Type>
                > =>
                  Effect.sync(() => {
                    const preventBlur = (event: Event) => {
                      event.preventDefault()
                    }
                    items.addEventListener('pointerdown', preventBlur, {
                      capture: true,
                    })
                    const teardownAnchor = anchorSetup({
                      buttonId: `${id}-input-wrapper`,
                      anchor,
                      interceptTab: false,
                    })(items)
                    return {
                      message: CompletedAnchorMount(),
                      cleanup: () => {
                        items.removeEventListener('pointerdown', preventBlur, {
                          capture: true,
                        })
                        teardownAnchor()
                      },
                    }
                  }),
              ),
              toParentMessage,
            ),
          ),
        ]
      : [
          OnMount(
            Mount.mapMessage(attachPreventBlurOnPointerDown, toParentMessage),
          ),
        ]

    const itemsContainerAttributes = [
      Id(`${id}-items`),
      Role('listbox'),
      ...(behavior.ariaMultiSelectable ? [AriaMultiSelectable(true)] : []),
      AriaLabelledBy(`${id}-input`),
      Tabindex(-1),
      ...anchorAttributes,
      ...animationAttributes,
      ...(itemsClassName ? [Class(itemsClassName)] : []),
      ...itemsAttributes,
    ]

    const comboboxItems = Array.map(items, (item, index) => {
      const isActiveItem = Option.exists(
        maybeActiveItemIndex,
        activeIndex => activeIndex === index,
      )
      const isDisabledItem = isDisabledAtIndex(index)
      const isSelectedItem = behavior.isItemSelected(
        config.model,
        itemToValue(item, index),
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
                OnClick(dispatchSelectedItem(item, index)),
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

    const resolvedInputWrapperAttributes = [
      Id(`${id}-input-wrapper`),
      ...(inputWrapperClassName ? [Class(inputWrapperClassName)] : []),
      ...inputWrapperAttributes,
    ]

    const toggleButton = buttonContent
      ? [
          keyed('button')(
            `${id}-button`,
            [
              Id(`${id}-button`),
              Type('button'),
              Tabindex(-1),
              AriaControls(`${id}-items`),
              AriaExpanded(isVisible),
              Attribute('aria-haspopup', 'listbox'),
              ...(isDisabled
                ? [AriaDisabled(true), DataAttribute('disabled', '')]
                : [OnClick(toParentMessage(PressedToggleButton()))]),
              OnMount(
                Mount.mapMessage(
                  attachPreventBlurOnPointerDown,
                  toParentMessage,
                ),
              ),
              ...(buttonClassName ? [Class(buttonClassName)] : []),
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
          OptionExt.when(behavior.isItemSelected(config.model, value), value),
          () => undefined,
        )
      }),
    )

    const hiddenInputs = formName
      ? Array.match(selectedValues, {
          onEmpty: () => [input([Type('hidden'), Name(formName)])],
          onNonEmpty: Array.map(selectedValue =>
            input([Type('hidden'), Name(formName), Value(selectedValue)]),
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
      div(resolvedInputWrapperAttributes, [
        input(resolvedInputAttributes),
        ...toggleButton,
      ]),
      ...(isVisible && Array.isReadonlyArrayNonEmpty(items)
        ? visibleContent
        : []),
      ...hiddenInputs,
    ])
  }

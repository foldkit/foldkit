import {
  Array,
  Effect,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  pipe,
} from 'effect'

import type { Command } from '../../command'
import { OptionExt } from '../../effectExtensions'
import { type Attribute, type Html, html } from '../../html'
import { m } from '../../message'
import { makeConstrainedEvo } from '../../struct'
import * as Task from '../../task'
import { anchorHooks } from '../anchor'
import type { AnchorConfig } from '../anchor'
import { groupContiguous } from '../group'
import { findFirstEnabledIndex, keyToIndex } from '../keyboard'
import { TransitionState } from '../transition'

export { groupContiguous }

// MODEL

/** Schema for the activation trigger — whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literal('Pointer', 'Keyboard')
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
  transitionState: TransitionState,
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
  activationTrigger: ActivationTrigger,
  inputValue: S.String,
  maybeLastPointerPosition: S.OptionFromSelf(
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
  transitionState: 'Idle',
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  inputValue: '',
  maybeLastPointerPosition: Option.none(),
})

// MESSAGE

/** Sent when the combobox popup opens. Contains an optional initial active item index. */
export const Opened = m('Opened', {
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
})
/** Sent when the combobox closes via Escape key or backdrop click. */
export const Closed = m('Closed')
/** Sent when focus leaves the input via Tab key or blur. */
export const ClosedByTab = m('ClosedByTab')
/** Sent when an item is highlighted via arrow keys or mouse hover. Includes activation trigger and optional immediate selection info. */
export const ActivatedItem = m('ActivatedItem', {
  index: S.Number,
  activationTrigger: ActivationTrigger,
  maybeImmediateSelection: S.OptionFromSelf(
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
export const CompletedScrollLock = m('CompletedScrollLock')
/** Sent when the scroll unlock command completes. */
export const CompletedScrollUnlock = m('CompletedScrollUnlock')
/** Sent when the inert-others command completes. */
export const CompletedInertSetup = m('CompletedInertSetup')
/** Sent when the restore-inert command completes. */
export const CompletedInertTeardown = m('CompletedInertTeardown')
/** Sent when the focus-input command completes. */
export const CompletedInputFocus = m('CompletedInputFocus')
/** Sent when the scroll-into-view command completes after keyboard activation. */
export const CompletedScrollIntoView = m('CompletedScrollIntoView')
/** Sent when the programmatic item click command completes. */
export const CompletedItemClick = m('CompletedItemClick')
/** Sent internally when a double-rAF completes, advancing the transition to its animating phase. */
export const AdvancedTransitionFrame = m('AdvancedTransitionFrame')
/** Sent internally when all CSS transitions on the items container have completed. */
export const EndedTransition = m('EndedTransition')
/** Sent internally when the input wrapper moves in the viewport during a leave transition, cancelling the animation. */
export const DetectedInputMovement = m('DetectedInputMovement')
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
    typeof ClosedByTab,
    typeof ActivatedItem,
    typeof DeactivatedItem,
    typeof SelectedItem,
    typeof MovedPointerOverItem,
    typeof RequestedItemClick,
    typeof CompletedScrollLock,
    typeof CompletedScrollUnlock,
    typeof CompletedInertSetup,
    typeof CompletedInertTeardown,
    typeof CompletedInputFocus,
    typeof CompletedScrollIntoView,
    typeof CompletedItemClick,
    typeof AdvancedTransitionFrame,
    typeof EndedTransition,
    typeof DetectedInputMovement,
    typeof UpdatedInputValue,
    typeof PressedToggleButton,
  ]
> = S.Union(
  Opened,
  Closed,
  ClosedByTab,
  ActivatedItem,
  DeactivatedItem,
  SelectedItem,
  MovedPointerOverItem,
  RequestedItemClick,
  CompletedScrollLock,
  CompletedScrollUnlock,
  CompletedInertSetup,
  CompletedInertTeardown,
  CompletedInputFocus,
  CompletedScrollIntoView,
  CompletedItemClick,
  AdvancedTransitionFrame,
  EndedTransition,
  DetectedInputMovement,
  UpdatedInputValue,
  PressedToggleButton,
)

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type ClosedByTab = typeof ClosedByTab.Type
export type ActivatedItem = typeof ActivatedItem.Type
export type DeactivatedItem = typeof DeactivatedItem.Type
export type SelectedItem = typeof SelectedItem.Type
export type MovedPointerOverItem = typeof MovedPointerOverItem.Type
export type RequestedItemClick = typeof RequestedItemClick.Type
export type CompletedScrollLock = typeof CompletedScrollLock.Type
export type CompletedScrollUnlock = typeof CompletedScrollUnlock.Type
export type CompletedInertSetup = typeof CompletedInertSetup.Type
export type CompletedInertTeardown = typeof CompletedInertTeardown.Type
export type CompletedInputFocus = typeof CompletedInputFocus.Type
export type CompletedScrollIntoView = typeof CompletedScrollIntoView.Type
export type CompletedItemClick = typeof CompletedItemClick.Type
export type AdvancedTransitionFrame = typeof AdvancedTransitionFrame.Type
export type EndedTransition = typeof EndedTransition.Type
export type DetectedInputMovement = typeof DetectedInputMovement.Type
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
    transitionState: () =>
      model.isAnimated ? ('LeaveStart' as const) : ('Idle' as const),
    maybeActiveItemIndex: () => Option.none(),
    activationTrigger: () => 'Keyboard' as const,
    maybeLastPointerPosition: () => Option.none(),
  })

// UPDATE FACTORY

/** Context passed to the `handleSelectedItem` handler with commands for focus management and modal cleanup. */
export type SelectedItemContext = Readonly<{
  focusInput: Command<Message>
  maybeNextFrame: Option.Option<Command<Message>>
  maybeUnlockScroll: Option.Option<Command<Message>>
  maybeRestoreInert: Option.Option<Command<Message>>
}>

/** Creates a combobox update function from variant-specific handlers. Shared logic (open, close, activate, transition) is handled internally; only close, selection, and immediate-activation behavior varies by variant. */
export const makeUpdate = <Model extends BaseModel>(
  handlers: Readonly<{
    handleClose: (model: Model) => Model
    handleSelectedItem: (
      model: Model,
      item: string,
      displayText: string,
      context: SelectedItemContext,
    ) => [Model, ReadonlyArray<Command<Message>>]
    handleImmediateActivation: (
      model: Model,
      item: string,
      displayText: string,
    ) => Model
  }>,
) => {
  type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
  const withUpdateReturn = M.withReturnType<UpdateReturn>()

  return (model: Model, message: Message): UpdateReturn => {
    const maybeNextFrame = OptionExt.when(
      model.isAnimated,
      Task.nextFrame.pipe(Effect.as(AdvancedTransitionFrame())),
    )

    const maybeLockScroll = OptionExt.when(
      model.isModal,
      Task.lockScroll.pipe(Effect.as(CompletedScrollLock())),
    )

    const maybeUnlockScroll = OptionExt.when(
      model.isModal,
      Task.unlockScroll.pipe(Effect.as(CompletedScrollUnlock())),
    )

    const maybeInertOthers = OptionExt.when(
      model.isModal,
      Task.inertOthers(model.id, [
        inputWrapperSelector(model.id),
        itemsSelector(model.id),
      ]).pipe(Effect.as(CompletedInertSetup())),
    )

    const maybeRestoreInert = OptionExt.when(
      model.isModal,
      Task.restoreInert(model.id).pipe(Effect.as(CompletedInertTeardown())),
    )

    const focusInput = Task.focus(inputSelector(model.id)).pipe(
      Effect.ignore,
      Effect.as(CompletedInputFocus()),
    )

    return M.value(message).pipe(
      withUpdateReturn,
      M.tagsExhaustive({
        Opened: ({ maybeActiveItemIndex }) => {
          const nextModel = constrainedEvo(model, {
            isOpen: () => true,
            transitionState: () =>
              model.isAnimated ? ('EnterStart' as const) : ('Idle' as const),
            maybeActiveItemIndex: () => maybeActiveItemIndex,
            activationTrigger: () =>
              Option.match(maybeActiveItemIndex, {
                onNone: () => 'Pointer' as const,
                onSome: () => 'Keyboard' as const,
              }),
            maybeLastPointerPosition: () => Option.none(),
          })

          return [
            nextModel,
            Array.getSomes([maybeNextFrame, maybeLockScroll, maybeInertOthers]),
          ]
        },

        Closed: () => [
          handlers.handleClose(model),
          pipe(
            Array.getSomes([
              maybeNextFrame,
              maybeUnlockScroll,
              maybeRestoreInert,
            ]),
            Array.prepend(focusInput),
          ),
        ],

        ClosedByTab: () => [
          handlers.handleClose(model),
          Array.getSomes([
            maybeNextFrame,
            maybeUnlockScroll,
            maybeRestoreInert,
          ]),
        ],

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
                  Task.scrollIntoView(itemSelector(model.id, index)).pipe(
                    Effect.ignore,
                    Effect.as(CompletedScrollIntoView()),
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

        SelectedItem: ({ item, displayText }) =>
          handlers.handleSelectedItem(model, item, displayText, {
            focusInput,
            maybeNextFrame,
            maybeUnlockScroll,
            maybeRestoreInert,
          }),

        RequestedItemClick: ({ index }) => [
          model,
          [
            Task.clickElement(itemSelector(model.id, index)).pipe(
              Effect.ignore,
              Effect.as(CompletedItemClick()),
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

          const nextModel = constrainedEvo(model, {
            isOpen: () => true,
            transitionState: () =>
              model.isAnimated ? ('EnterStart' as const) : ('Idle' as const),
            inputValue: () => value,
            maybeActiveItemIndex: () => Option.some(0),
            activationTrigger: () => 'Keyboard' as const,
            maybeLastPointerPosition: () => Option.none(),
          })

          return [
            nextModel,
            Array.getSomes([maybeNextFrame, maybeLockScroll, maybeInertOthers]),
          ]
        },

        PressedToggleButton: () => {
          if (model.isOpen) {
            return [
              handlers.handleClose(model),
              pipe(
                Array.getSomes([
                  maybeNextFrame,
                  maybeUnlockScroll,
                  maybeRestoreInert,
                ]),
                Array.prepend(focusInput),
              ),
            ]
          }

          const nextModel = constrainedEvo(model, {
            isOpen: () => true,
            transitionState: () =>
              model.isAnimated ? ('EnterStart' as const) : ('Idle' as const),
            maybeActiveItemIndex: () => Option.none(),
            activationTrigger: () => 'Pointer' as const,
            maybeLastPointerPosition: () => Option.none(),
          })

          return [
            nextModel,
            pipe(
              Array.getSomes([
                maybeNextFrame,
                maybeLockScroll,
                maybeInertOthers,
              ]),
              Array.prepend(focusInput),
            ),
          ]
        },

        AdvancedTransitionFrame: () =>
          M.value(model.transitionState).pipe(
            withUpdateReturn,
            M.when('EnterStart', () => [
              constrainedEvo(model, {
                transitionState: () => 'EnterAnimating' as const,
              }),
              [
                Task.waitForTransitions(itemsSelector(model.id)).pipe(
                  Effect.as(EndedTransition()),
                ),
              ],
            ]),
            M.when('LeaveStart', () => [
              constrainedEvo(model, {
                transitionState: () => 'LeaveAnimating' as const,
              }),
              [
                Effect.raceFirst(
                  Task.detectElementMovement(
                    inputWrapperSelector(model.id),
                  ).pipe(Effect.as(DetectedInputMovement())),
                  Task.waitForTransitions(itemsSelector(model.id)).pipe(
                    Effect.as(EndedTransition()),
                  ),
                ),
              ],
            ]),
            M.orElse(() => [model, []]),
          ),

        EndedTransition: () =>
          M.value(model.transitionState).pipe(
            withUpdateReturn,
            M.whenOr('EnterAnimating', 'LeaveAnimating', () => [
              constrainedEvo(model, {
                transitionState: () => 'Idle' as const,
              }),
              [],
            ]),
            M.orElse(() => [model, []]),
          ),

        DetectedInputMovement: () =>
          M.value(model.transitionState).pipe(
            withUpdateReturn,
            M.when('LeaveAnimating', () => [
              constrainedEvo(model, {
                transitionState: () => 'Idle' as const,
              }),
              [],
            ]),
            M.orElse(() => [model, []]),
          ),

        CompletedScrollLock: () => [model, []],
        CompletedScrollUnlock: () => [model, []],
        CompletedInertSetup: () => [model, []],
        CompletedInertTeardown: () => [model, []],
        CompletedInputFocus: () => [model, []],
        CompletedScrollIntoView: () => [model, []],
        CompletedItemClick: () => [model, []],
      }),
    )
  }
}

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
  toMessage: (
    message:
      | Opened
      | Closed
      | ClosedByTab
      | ActivatedItem
      | DeactivatedItem
      | SelectedItem
      | MovedPointerOverItem
      | RequestedItemClick
      | UpdatedInputValue
      | PressedToggleButton
      | CompletedScrollLock
      | CompletedScrollUnlock
      | CompletedInertSetup
      | CompletedInertTeardown
      | CompletedInputFocus
      | CompletedScrollIntoView
      | CompletedItemClick,
  ) => Message
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
      OnDestroy,
      OnFocus,
      OnInput,
      OnInsert,
      OnKeyDownPreventDefault,
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
      model: { id, isOpen, immediate, transitionState, maybeActiveItemIndex },
      toMessage,
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

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving

    const transitionAttributes: ReadonlyArray<
      ReturnType<typeof DataAttribute>
    > = M.value(transitionState).pipe(
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
              toMessage(
                Opened({
                  maybeActiveItemIndex: Option.some(firstEnabledIndex),
                }),
              ),
            )
          }
          const targetIndex = resolveActiveIndex('ArrowDown')
          return Option.some(
            toMessage(
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
              toMessage(
                Opened({
                  maybeActiveItemIndex: Option.some(lastEnabledIndex),
                }),
              ),
            )
          }
          const targetIndex = resolveActiveIndex('ArrowUp')
          return Option.some(
            toMessage(
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
            toMessage(RequestedItemClick({ index })),
          )
        }),
        M.when('Escape', () => {
          if (!isOpen) {
            return Option.none()
          }
          return Option.some(toMessage(Closed()))
        }),
        M.whenOr('Home', 'End', () => {
          if (!isOpen) {
            return Option.none()
          }
          const targetIndex = resolveActiveIndex(key)
          return Option.some(
            toMessage(
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

    const preventBlurOnPointerDown = (element: Element): void => {
      element.addEventListener(
        'pointerdown',
        (event: Event) => {
          event.preventDefault()
        },
        { capture: true },
      )
    }

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
            OnInput(value => toMessage(UpdatedInputValue({ value }))),
            OnKeyDownPreventDefault(handleInputKeyDown),
            OnBlur(toMessage(ClosedByTab())),
            ...(openOnFocus
              ? [
                  OnFocus(
                    toMessage(Opened({ maybeActiveItemIndex: Option.none() })),
                  ),
                ]
              : []),
          ]),
      ...(isInvalid ? [AriaInvalid(true), DataAttribute('invalid', '')] : []),
      ...(isVisible ? [DataAttribute('open', '')] : []),
      ...(config.model.selectInputOnFocus
        ? [
            OnInsert((element: Element) => {
              element.addEventListener('focus', () => {
                if (element instanceof HTMLInputElement) {
                  element.select()
                }
              })
            }),
          ]
        : []),
      ...(inputClassName ? [Class(inputClassName)] : []),
      ...inputAttributes,
    ]

    const hooks = anchor
      ? anchorHooks({
          buttonId: `${id}-input-wrapper`,
          anchor,
          interceptTab: false,
        })
      : undefined

    const anchorAttributes = hooks
      ? [
          Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
          OnInsert((element: Element) => {
            preventBlurOnPointerDown(element)
            hooks.onInsert(element)
          }),
          OnDestroy(hooks.onDestroy),
        ]
      : [OnInsert(preventBlurOnPointerDown)]

    const itemsContainerAttributes = [
      Id(`${id}-items`),
      Role('listbox'),
      ...(behavior.ariaMultiSelectable ? [AriaMultiSelectable(true)] : []),
      AriaLabelledBy(`${id}-input`),
      Tabindex(-1),
      ...anchorAttributes,
      ...transitionAttributes,
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
                OnClick(
                  toMessage(
                    SelectedItem({
                      item: itemToValue(item, index),
                      displayText: itemToDisplayText(item, index),
                    }),
                  ),
                ),
                ...(isActiveItem
                  ? []
                  : [
                      OnPointerMove((screenX, screenY, pointerType) =>
                        OptionExt.when(
                          pointerType !== 'touch',
                          toMessage(
                            MovedPointerOverItem({ index, screenX, screenY }),
                          ),
                        ),
                      ),
                    ]),
                OnPointerLeave(pointerType =>
                  OptionExt.when(
                    pointerType !== 'touch',
                    toMessage(DeactivatedItem()),
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
        const maybeHeading = Option.fromNullable(
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
            Array.isNonEmptyReadonlyArray(separatorAttributes))
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
        ...(isLeaving ? [] : [OnClick(toMessage(Closed()))]),
        ...(backdropClassName ? [Class(backdropClassName)] : []),
        ...backdropAttributes,
      ],
      [],
    )

    const renderedItems = renderGroupedItems()

    const scrollableItems =
      itemsScrollClassName ||
      Array.isNonEmptyReadonlyArray(itemsScrollAttributes)
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
                : [OnClick(toMessage(PressedToggleButton()))]),
              OnInsert(preventBlurOnPointerDown),
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
        return OptionExt.when(
          behavior.isItemSelected(config.model, value),
          value,
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
      ...(isVisible && Array.isNonEmptyReadonlyArray(items)
        ? visibleContent
        : []),
      ...hiddenInputs,
    ])
  }

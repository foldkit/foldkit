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
import { type Html, html } from '../../html'
import { createLazy } from '../../html/lazy'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
import { anchorHooks } from '../anchor'
import type { AnchorConfig } from '../anchor'
import { groupContiguous } from '../group'
import { findFirstEnabledIndex, keyToIndex } from '../keyboard'
import { TransitionState } from '../transition'

// MODEL

/** Schema for the activation trigger — whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literal('Pointer', 'Keyboard')
export type ActivationTrigger = typeof ActivationTrigger.Type

/** Schema for the combobox component's state, tracking open/closed status, active item, input value, and selected item. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  isModal: S.Boolean,
  transitionState: TransitionState,
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
  activationTrigger: ActivationTrigger,
  inputValue: S.String,
  maybeSelectedItem: S.OptionFromSelf(S.String),
  maybeSelectedDisplayText: S.OptionFromSelf(S.String),
  maybeLastPointerPosition: S.OptionFromSelf(
    S.Struct({ screenX: S.Number, screenY: S.Number }),
  ),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the combobox popup opens. Contains an optional initial active item index. */
export const Opened = m('Opened', {
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
})
/** Sent when the combobox closes via Escape key or backdrop click. */
export const Closed = m('Closed')
/** Sent when focus leaves the input via Tab key or blur. */
export const ClosedByTab = m('ClosedByTab')
/** Sent when an item is highlighted via arrow keys or mouse hover. */
export const ActivatedItem = m('ActivatedItem', {
  index: S.Number,
  activationTrigger: ActivationTrigger,
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
/** Placeholder message used when no action is needed. */
export const NoOp = m('NoOp')
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
export const Message = S.Union(
  Opened,
  Closed,
  ClosedByTab,
  ActivatedItem,
  DeactivatedItem,
  SelectedItem,
  MovedPointerOverItem,
  RequestedItemClick,
  NoOp,
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
export type NoOp = typeof NoOp.Type
export type AdvancedTransitionFrame = typeof AdvancedTransitionFrame.Type
export type EndedTransition = typeof EndedTransition.Type
export type DetectedInputMovement = typeof DetectedInputMovement.Type
export type UpdatedInputValue = typeof UpdatedInputValue.Type
export type PressedToggleButton = typeof PressedToggleButton.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
}>

/** Creates an initial combobox model from a config. Defaults to closed with no active item and empty input. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  transitionState: 'Idle',
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  inputValue: '',
  maybeSelectedItem: Option.none(),
  maybeSelectedDisplayText: Option.none(),
  maybeLastPointerPosition: Option.none(),
})

// UPDATE

const closedModel = (model: Model): Model =>
  evo(model, {
    isOpen: () => false,
    transitionState: () => (model.isAnimated ? 'LeaveStart' : 'Idle'),
    maybeActiveItemIndex: () => Option.none(),
    activationTrigger: () => 'Keyboard',
    inputValue: () =>
      Option.getOrElse(model.maybeSelectedDisplayText, () => ''),
    maybeLastPointerPosition: () => Option.none(),
  })

const inputSelector = (id: string): string => `#${id}-input`
const inputWrapperSelector = (id: string): string => `#${id}-input-wrapper`
const itemsSelector = (id: string): string => `#${id}-items`
const itemSelector = (id: string, index: number): string =>
  `#${id}-item-${index}`

type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Processes a combobox message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeNextFrame = OptionExt.when(
    model.isAnimated,
    Task.nextFrame.pipe(Effect.as(AdvancedTransitionFrame())),
  )

  const maybeLockScroll = OptionExt.when(
    model.isModal,
    Task.lockScroll.pipe(Effect.as(NoOp())),
  )

  const maybeUnlockScroll = OptionExt.when(
    model.isModal,
    Task.unlockScroll.pipe(Effect.as(NoOp())),
  )

  const maybeInertOthers = OptionExt.when(
    model.isModal,
    Task.inertOthers(model.id, [
      inputWrapperSelector(model.id),
      itemsSelector(model.id),
    ]).pipe(Effect.as(NoOp())),
  )

  const maybeRestoreInert = OptionExt.when(
    model.isModal,
    Task.restoreInert(model.id).pipe(Effect.as(NoOp())),
  )

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Opened: ({ maybeActiveItemIndex }) => {
        const nextModel = evo(model, {
          isOpen: () => true,
          transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
          maybeActiveItemIndex: () => maybeActiveItemIndex,
          activationTrigger: () =>
            Option.match(maybeActiveItemIndex, {
              onNone: () => 'Pointer',
              onSome: () => 'Keyboard',
            }),
          maybeLastPointerPosition: () => Option.none(),
        })

        return [
          nextModel,
          Array.getSomes([maybeNextFrame, maybeLockScroll, maybeInertOthers]),
        ]
      },

      Closed: () => [
        closedModel(model),
        pipe(
          Array.getSomes([
            maybeNextFrame,
            maybeUnlockScroll,
            maybeRestoreInert,
          ]),
          Array.prepend(
            Task.focus(inputSelector(model.id)).pipe(
              Effect.ignore,
              Effect.as(NoOp()),
            ),
          ),
        ),
      ],

      ClosedByTab: () => [
        closedModel(model),
        Array.getSomes([maybeNextFrame, maybeUnlockScroll, maybeRestoreInert]),
      ],

      ActivatedItem: ({ index, activationTrigger }) => [
        evo(model, {
          maybeActiveItemIndex: () => Option.some(index),
          activationTrigger: () => activationTrigger,
        }),
        activationTrigger === 'Keyboard'
          ? [
              Task.scrollIntoView(itemSelector(model.id, index)).pipe(
                Effect.ignore,
                Effect.as(NoOp()),
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
          evo(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => 'Pointer',
            maybeLastPointerPosition: () => Option.some({ screenX, screenY }),
          }),
          [],
        ]
      },

      DeactivatedItem: () =>
        model.activationTrigger === 'Pointer'
          ? [evo(model, { maybeActiveItemIndex: () => Option.none() }), []]
          : [model, []],

      SelectedItem: ({ item, displayText }) => {
        const nextModel = evo(model, {
          isOpen: () => false,
          transitionState: () => (model.isAnimated ? 'LeaveStart' : 'Idle'),
          maybeActiveItemIndex: () => Option.none(),
          activationTrigger: () => 'Keyboard',
          inputValue: () => displayText,
          maybeSelectedItem: () => Option.some(item),
          maybeSelectedDisplayText: () => Option.some(displayText),
          maybeLastPointerPosition: () => Option.none(),
        })

        return [
          nextModel,
          pipe(
            Array.getSomes([
              maybeNextFrame,
              maybeUnlockScroll,
              maybeRestoreInert,
            ]),
            Array.prepend(
              Task.focus(inputSelector(model.id)).pipe(
                Effect.ignore,
                Effect.as(NoOp()),
              ),
            ),
          ),
        ]
      },

      RequestedItemClick: ({ index }) => [
        model,
        [
          Task.clickElement(itemSelector(model.id, index)).pipe(
            Effect.ignore,
            Effect.as(NoOp()),
          ),
        ],
      ],

      UpdatedInputValue: ({ value }) => {
        if (model.isOpen) {
          return [
            evo(model, {
              inputValue: () => value,
              maybeActiveItemIndex: () => Option.some(0),
              activationTrigger: () => 'Keyboard',
            }),
            [],
          ]
        }

        const nextModel = evo(model, {
          isOpen: () => true,
          transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
          inputValue: () => value,
          maybeActiveItemIndex: () => Option.some(0),
          activationTrigger: () => 'Keyboard',
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
            closedModel(model),
            pipe(
              Array.getSomes([
                maybeNextFrame,
                maybeUnlockScroll,
                maybeRestoreInert,
              ]),
              Array.prepend(
                Task.focus(inputSelector(model.id)).pipe(
                  Effect.ignore,
                  Effect.as(NoOp()),
                ),
              ),
            ),
          ]
        }

        const nextModel = evo(model, {
          isOpen: () => true,
          transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
          maybeActiveItemIndex: () => Option.none(),
          activationTrigger: () => 'Pointer',
          maybeLastPointerPosition: () => Option.none(),
        })

        return [
          nextModel,
          pipe(
            Array.getSomes([maybeNextFrame, maybeLockScroll, maybeInertOthers]),
            Array.prepend(
              Task.focus(inputSelector(model.id)).pipe(
                Effect.ignore,
                Effect.as(NoOp()),
              ),
            ),
          ),
        ]
      },

      AdvancedTransitionFrame: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterStart', () => [
            evo(model, { transitionState: () => 'EnterAnimating' }),
            [
              Task.waitForTransitions(itemsSelector(model.id)).pipe(
                Effect.as(EndedTransition()),
              ),
            ],
          ]),
          M.when('LeaveStart', () => [
            evo(model, { transitionState: () => 'LeaveAnimating' }),
            [
              Effect.raceFirst(
                Task.detectElementMovement(inputWrapperSelector(model.id)).pipe(
                  Effect.as(DetectedInputMovement()),
                ),
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
            evo(model, { transitionState: () => 'Idle' }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      DetectedInputMovement: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      NoOp: () => [model, []],
    }),
  )
}

// VIEW

/** Configuration for an individual combobox item's appearance. */
export type ItemConfig = Readonly<{
  className: string
  content: Html
}>

/** Configuration for a group heading rendered above a group of items. */
export type GroupHeading = Readonly<{
  content: Html
  className: string
}>

/** Configuration for rendering a combobox with `view`. */
export type ViewConfig<Message, Item extends string> = Readonly<{
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
      | NoOp,
  ) => Message
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{ isActive: boolean; isDisabled: boolean }>,
  ) => ItemConfig
  itemToValue: (item: Item, index: number) => string
  itemToDisplayText: (item: Item, index: number) => string
  isItemDisabled?: (item: Item, index: number) => boolean
  inputClassName: string
  inputPlaceholder?: string
  itemsClassName: string
  itemsScrollClassName?: string
  backdropClassName: string
  className?: string
  inputWrapperClassName?: string
  buttonContent?: Html
  buttonClassName?: string
  formName?: string
  isDisabled?: boolean
  isInvalid?: boolean
  openOnFocus?: boolean
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  separatorClassName?: string
  anchor?: AnchorConfig
}>

export { groupContiguous }

const itemId = (id: string, index: number): string => `${id}-item-${index}`

/** Renders a headless combobox with keyboard navigation, aria-activedescendant focus management, and consumer-controlled filtering. */
export const view = <Message, Item extends string>(
  config: ViewConfig<Message, Item>,
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
    Role,
    Style,
    Tabindex,
    Type,
    Value,
    keyed,
  } = html<Message>()

  const {
    model: { id, isOpen, transitionState, maybeActiveItemIndex },
    toMessage,
    items,
    itemToConfig,
    itemToValue,
    itemToDisplayText,
    isItemDisabled,
    inputClassName,
    inputPlaceholder,
    itemsClassName,
    itemsScrollClassName,
    backdropClassName,
    className,
    inputWrapperClassName,
    buttonContent,
    buttonClassName,
    formName,
    isDisabled,
    isInvalid,
    openOnFocus,
    itemGroupKey,
    groupToHeading,
    groupClassName,
    separatorClassName,
    anchor,
  } = config

  const isLeaving =
    transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
  const isVisible = isOpen || isLeaving

  const transitionAttributes: ReadonlyArray<ReturnType<typeof DataAttribute>> =
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
        return Option.some(
          toMessage(
            ActivatedItem({
              index: resolveActiveIndex('ArrowDown'),
              activationTrigger: 'Keyboard',
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
        return Option.some(
          toMessage(
            ActivatedItem({
              index: resolveActiveIndex('ArrowUp'),
              activationTrigger: 'Keyboard',
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
        return Option.some(
          toMessage(
            ActivatedItem({
              index: resolveActiveIndex(key),
              activationTrigger: 'Keyboard',
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

  const inputAttributes = [
    Id(`${id}-input`),
    Role('combobox'),
    Class(inputClassName),
    AriaExpanded(isVisible),
    AriaControls(`${id}-items`),
    Attribute('aria-autocomplete', 'list'),
    Attribute('aria-haspopup', 'listbox'),
    Autocomplete('off'),
    Value(config.model.inputValue),
    ...maybeActiveDescendant,
    ...(inputPlaceholder ? [Attribute('placeholder', inputPlaceholder)] : []),
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
    AriaLabelledBy(`${id}-input`),
    Tabindex(-1),
    Class(itemsClassName),
    ...anchorAttributes,
    ...transitionAttributes,
  ]

  const comboboxItems = Array.map(items, (item, index) => {
    const isActiveItem = Option.exists(
      maybeActiveItemIndex,
      activeIndex => activeIndex === index,
    )
    const isDisabledItem = isDisabledAtIndex(index)
    const itemConfig = itemToConfig(item, {
      isActive: isActiveItem,
      isDisabled: isDisabledItem,
    })

    const isInteractive = !isDisabledItem && !isLeaving

    return keyed('div')(
      itemId(id, index),
      [
        Id(itemId(id, index)),
        Role('option'),
        Class(itemConfig.className),
        ...(isActiveItem ? [DataAttribute('active', '')] : []),
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
              OnPointerMove((screenX, screenY, pointerType) =>
                OptionExt.when(
                  pointerType !== 'touch',
                  toMessage(MovedPointerOverItem({ index, screenX, screenY })),
                ),
              ),
              OnPointerLeave(pointerType =>
                OptionExt.when(
                  pointerType !== 'touch',
                  toMessage(DeactivatedItem()),
                ),
              ),
            ]
          : []),
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
            [Id(headingId), Role('presentation'), Class(heading.className)],
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
        ],
        groupContent,
      )

      const separator =
        segmentIndex > 0 && separatorClassName
          ? [
              keyed('div')(
                `${id}-separator-${segmentIndex}`,
                [Role('separator'), Class(separatorClassName)],
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
      Class(backdropClassName),
      ...(isLeaving ? [] : [OnClick(toMessage(Closed()))]),
    ],
    [],
  )

  const renderedItems = renderGroupedItems()

  const scrollableItems = itemsScrollClassName
    ? [div([Class(itemsScrollClassName)], renderedItems)]
    : renderedItems

  const visibleContent = [
    backdrop,
    keyed('div')(
      `${id}-items-container`,
      itemsContainerAttributes,
      scrollableItems,
    ),
  ]

  const inputWrapperAttributes = [
    Id(`${id}-input-wrapper`),
    ...(inputWrapperClassName ? [Class(inputWrapperClassName)] : []),
  ]

  const toggleButton =
    buttonContent && buttonClassName
      ? [
          keyed('button')(
            `${id}-button`,
            [
              Id(`${id}-button`),
              Type('button'),
              Class(buttonClassName),
              Tabindex(-1),
              AriaControls(`${id}-items`),
              AriaExpanded(isVisible),
              Attribute('aria-haspopup', 'listbox'),
              ...(isDisabled
                ? [AriaDisabled(true), DataAttribute('disabled', '')]
                : [OnClick(toMessage(PressedToggleButton()))]),
              OnInsert(preventBlurOnPointerDown),
            ],
            [buttonContent],
          ),
        ]
      : []

  const hiddenInput = formName
    ? [
        input([
          Type('hidden'),
          Name(formName),
          Value(Option.getOrElse(config.model.maybeSelectedItem, () => '')),
        ]),
      ]
    : []

  const wrapperAttributes = [
    ...(className ? [Class(className)] : []),
    ...(isVisible ? [DataAttribute('open', '')] : []),
    ...(isDisabled ? [DataAttribute('disabled', '')] : []),
    ...(isInvalid ? [DataAttribute('invalid', '')] : []),
  ]

  return div(wrapperAttributes, [
    div(inputWrapperAttributes, [input(inputAttributes), ...toggleButton]),
    ...(isVisible && Array.isNonEmptyReadonlyArray(items)
      ? visibleContent
      : []),
    ...hiddenInput,
  ])
}

/** Creates a memoized combobox view. Static config is captured in a closure;
 *  only `model` and `toMessage` are compared per render via `createLazy`. */
export const lazy = <Message, Item extends string>(
  staticConfig: Omit<ViewConfig<Message, Item>, 'model' | 'toMessage'>,
): ((
  model: Model,
  toMessage: ViewConfig<Message, Item>['toMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message, Item>['toMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toMessage: currentToMessage,
        }),
      [model, toMessage],
    )
}

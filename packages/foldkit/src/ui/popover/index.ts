import { Array, Effect, Equal, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command'
import { OptionExt } from '../../effectExtensions'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
import { anchorHooks } from '../anchor'
import type { AnchorConfig } from '../anchor'
// NOTE: Transition imports are split across schema + update to avoid a circular
// dependency: transition → html → runtime → devtools → popover → transition.
// The barrel (../transition) imports from html, which starts the cycle.
import {
  EndedTransition as TransitionEndedTransition,
  Hid as TransitionHid,
  Message as TransitionMessage,
  Model as TransitionModel,
  type OutMessage as TransitionOutMessage,
  Showed as TransitionShowed,
  init as transitionInit,
} from '../transition/schema'
import { update as transitionUpdate } from '../transition/update'

// MODEL

/** Schema for the popover component's state, tracking open/closed status and transition animation. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  isModal: S.Boolean,
  transition: TransitionModel,
  maybeLastButtonPointerType: S.OptionFromSelf(S.String),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the popover opens via button click or keyboard activation. */
export const Opened = m('Opened')
/** Sent when the popover closes via Escape key or backdrop click. Returns focus to the button. */
export const Closed = m('Closed')
/** Sent when focus leaves the popover panel via Tab key. Does NOT return focus to the button. */
export const ClosedByTab = m('ClosedByTab')
/** Sent when the user presses a pointer device on the popover button. Records pointer type and toggles for mouse. */
export const PressedPointerOnButton = m('PressedPointerOnButton', {
  pointerType: S.String,
  button: S.Number,
})
/** Sent when the focus-panel command completes after opening the popover. */
export const CompletedFocusPanel = m('CompletedFocusPanel')
/** Sent when the focus-button command completes after closing. */
export const CompletedFocusButton = m('CompletedFocusButton')
/** Sent when the scroll lock command completes. */
export const CompletedLockScroll = m('CompletedLockScroll')
/** Sent when the scroll unlock command completes. */
export const CompletedUnlockScroll = m('CompletedUnlockScroll')
/** Sent when the inert-others command completes. */
export const CompletedSetupInert = m('CompletedSetupInert')
/** Sent when the restore-inert command completes. */
export const CompletedTeardownInert = m('CompletedTeardownInert')
/** Sent when a mouse click on the button is ignored because pointer-down already handled the toggle. */
export const IgnoredMouseClick = m('IgnoredMouseClick')
/** Sent when a Space key-up is captured to prevent page scrolling. */
export const SuppressedSpaceScroll = m('SuppressedSpaceScroll')
/** Wraps a Transition submodel message for delegation. */
export const GotTransitionMessage = m('GotTransitionMessage', {
  message: TransitionMessage,
})

/** Union of all messages the popover component can produce. */
export const Message: S.Union<
  [
    typeof Opened,
    typeof Closed,
    typeof ClosedByTab,
    typeof PressedPointerOnButton,
    typeof CompletedFocusPanel,
    typeof CompletedFocusButton,
    typeof CompletedLockScroll,
    typeof CompletedUnlockScroll,
    typeof CompletedSetupInert,
    typeof CompletedTeardownInert,
    typeof IgnoredMouseClick,
    typeof SuppressedSpaceScroll,
    typeof GotTransitionMessage,
  ]
> = S.Union(
  Opened,
  Closed,
  ClosedByTab,
  PressedPointerOnButton,
  CompletedFocusPanel,
  CompletedFocusButton,
  CompletedLockScroll,
  CompletedUnlockScroll,
  CompletedSetupInert,
  CompletedTeardownInert,
  IgnoredMouseClick,
  SuppressedSpaceScroll,
  GotTransitionMessage,
)

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type ClosedByTab = typeof ClosedByTab.Type
export type PressedPointerOnButton = typeof PressedPointerOnButton.Type
export type IgnoredMouseClick = typeof IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof SuppressedSpaceScroll.Type

export type Message = typeof Message.Type

// INIT

const LEFT_MOUSE_BUTTON = 0

/** Configuration for creating a popover model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
}>

/** Creates an initial popover model from a config. Defaults to closed. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  transition: transitionInit({ id: `${config.id}-panel` }),
  maybeLastButtonPointerType: Option.none(),
})

// UPDATE

const closedModel = (model: Model): Model =>
  evo(model, {
    isOpen: () => false,
    maybeLastButtonPointerType: () => Option.none(),
  })

const buttonSelector = (id: string): string => `#${id}-button`
const panelSelector = (id: string): string => `#${id}-panel`

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Prevents page scrolling while the popover is open in modal mode. */
export const LockScroll = Command.define('LockScroll', CompletedLockScroll)
/** Re-enables page scrolling after the popover closes. */
export const UnlockScroll = Command.define(
  'UnlockScroll',
  CompletedUnlockScroll,
)
/** Marks all elements outside the popover as inert for modal behavior. */
export const InertOthers = Command.define('InertOthers', CompletedSetupInert)
/** Removes the inert attribute from elements outside the popover. */
export const RestoreInert = Command.define(
  'RestoreInert',
  CompletedTeardownInert,
)
/** Moves focus to the popover panel after opening. */
export const FocusPanel = Command.define('FocusPanel', CompletedFocusPanel)
/** Moves focus back to the popover button after closing. */
export const FocusButton = Command.define('FocusButton', CompletedFocusButton)
/** Detects whether the popover button moved or the leave transition ended — whichever comes first. Both outcomes signal the Transition submodel that leave is complete. */
export const DetectMovementOrTransitionEnd = Command.define(
  'DetectMovementOrTransitionEnd',
  GotTransitionMessage,
)

const delegateToTransition = (
  model: Model,
  transitionMessage: TransitionMessage,
): UpdateReturn => {
  const [nextTransition, transitionCommands, maybeOutMessage] =
    transitionUpdate(model.transition, transitionMessage)

  const mappedCommands = transitionCommands.map(
    Command.mapEffect(Effect.map(message => GotTransitionMessage({ message }))),
  )

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<TransitionOutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          DetectMovementOrTransitionEnd(
            Effect.raceFirst(
              Task.detectElementMovement(buttonSelector(model.id)).pipe(
                Effect.as(
                  GotTransitionMessage({
                    message: TransitionEndedTransition(),
                  }),
                ),
              ),
              Task.waitForTransitions(panelSelector(model.id)).pipe(
                Effect.as(
                  GotTransitionMessage({
                    message: TransitionEndedTransition(),
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
    evo(model, { transition: () => nextTransition }),
    [...mappedCommands, ...additionalCommands],
  ]
}

/** Processes a popover message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn => {
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
        buttonSelector(model.id),
        panelSelector(model.id),
      ]).pipe(Effect.as(CompletedSetupInert())),
    ),
  )

  const maybeRestoreInert = OptionExt.when(
    model.isModal,
    RestoreInert(
      Task.restoreInert(model.id).pipe(Effect.as(CompletedTeardownInert())),
    ),
  )

  const focusPanel = FocusPanel(
    Task.focus(panelSelector(model.id)).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusPanel()),
    ),
  )

  const focusButton = FocusButton(
    Task.focus(buttonSelector(model.id)).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusButton()),
    ),
  )

  const openCommands = [
    focusPanel,
    ...Array.getSomes([maybeLockScroll, maybeInertOthers]),
  ]

  const closeWithFocusCommands = [
    focusButton,
    ...Array.getSomes([maybeUnlockScroll, maybeRestoreInert]),
  ]

  const closeWithoutFocusCommands = Array.getSomes([
    maybeUnlockScroll,
    maybeRestoreInert,
  ])

  const openPopover = (baseModel: Model): UpdateReturn => {
    if (model.isAnimated) {
      const [nextModel, transitionCommands] = delegateToTransition(
        baseModel,
        TransitionShowed(),
      )
      return [
        evo(nextModel, { isOpen: () => true }),
        [...openCommands, ...transitionCommands],
      ]
    }

    return [evo(baseModel, { isOpen: () => true }), openCommands]
  }

  const closePopover = (
    baseModel: Model,
    commands: ReadonlyArray<Command.Command<Message>>,
  ): UpdateReturn => {
    const closed = closedModel(baseModel)

    if (model.isAnimated) {
      const [nextModel, transitionCommands] = delegateToTransition(
        closed,
        TransitionHid(),
      )
      return [nextModel, [...commands, ...transitionCommands]]
    }

    return [closed, commands]
  }

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Opened: () => openPopover(model),

      Closed: () => closePopover(model, closeWithFocusCommands),

      ClosedByTab: () => {
        if (
          Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
        ) {
          return [model, []]
        }

        return closePopover(model, closeWithoutFocusCommands)
      },

      PressedPointerOnButton: ({ pointerType, button }) => {
        const withPointerType = evo(model, {
          maybeLastButtonPointerType: () => Option.some(pointerType),
        })

        if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
          return [withPointerType, []]
        }

        if (model.isOpen) {
          const [closed, commands] = closePopover(
            withPointerType,
            closeWithFocusCommands,
          )
          return [
            evo(closed, {
              maybeLastButtonPointerType: () => Option.some(pointerType),
            }),
            commands,
          ]
        }

        return openPopover(withPointerType)
      },

      GotTransitionMessage: ({ message: transitionMessage }) =>
        delegateToTransition(model, transitionMessage),

      CompletedFocusPanel: () => [model, []],
      CompletedFocusButton: () => [model, []],
      CompletedLockScroll: () => [model, []],
      CompletedUnlockScroll: () => [model, []],
      CompletedSetupInert: () => [model, []],
      CompletedTeardownInert: () => [model, []],
      IgnoredMouseClick: () => [
        evo(model, { maybeLastButtonPointerType: () => Option.none() }),
        [],
      ],
      SuppressedSpaceScroll: () => [model, []],
    }),
  )
}

/** Programmatically opens the popover, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers when the popover uses `onOpened`. */
export const open = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Opened())

/** Programmatically closes the popover, updating the model and returning
 *  focus and modal commands. Use this in domain-event handlers when the popover uses `onClosed`. */
export const close = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Closed())

// VIEW

/** Configuration for rendering a popover with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toParentMessage: (
    message:
      | Opened
      | Closed
      | ClosedByTab
      | PressedPointerOnButton
      | IgnoredMouseClick
      | SuppressedSpaceScroll,
  ) => Message
  onOpened?: () => Message
  onClosed?: () => Message
  anchor: AnchorConfig
  buttonContent: Html
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<Attribute<Message>>
  panelContent: Html
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<Message>>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<Attribute<Message>>
  isDisabled?: boolean
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
}>

/** Renders a headless popover with a trigger button and a floating panel. Uses the disclosure ARIA pattern (aria-expanded + aria-controls) with no role on the panel. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    div,
    AriaControls,
    AriaDisabled,
    AriaExpanded,
    Class,
    DataAttribute,
    Id,
    OnBlur,
    OnClick,
    OnDestroy,
    OnInsert,
    OnKeyDownPreventDefault,
    OnKeyUpPreventDefault,
    OnPointerDown,
    Style,
    Tabindex,
    Type,
    keyed,
  } = html<Message>()

  const {
    model: {
      id,
      isOpen,
      transition: { transitionState },
      maybeLastButtonPointerType,
    },
    toParentMessage,
    onOpened,
    onClosed,
    anchor,
    buttonContent,
    buttonClassName,
    buttonAttributes = [],
    panelContent,
    panelClassName,
    panelAttributes = [],
    backdropClassName,
    backdropAttributes = [],
    isDisabled,
    className,
    attributes = [],
  } = config

  const dispatchOpened = (): Message =>
    onOpened ? onOpened() : toParentMessage(Opened())

  const dispatchClosed = (): Message =>
    onClosed ? onClosed() : toParentMessage(Closed())

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

  const handleButtonKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.whenOr('Enter', ' ', 'ArrowDown', () =>
        Option.some(isOpen ? dispatchClosed() : dispatchOpened()),
      ),
      M.orElse(() => Option.none()),
    )

  const handleButtonPointerDown = (
    pointerType: string,
    button: number,
  ): Option.Option<Message> =>
    Option.some(
      toParentMessage(
        PressedPointerOnButton({
          pointerType,
          button,
        }),
      ),
    )

  const handleButtonClick = (): Message => {
    const isMouse = Option.exists(
      maybeLastButtonPointerType,
      type => type === 'mouse',
    )

    if (isMouse) {
      return toParentMessage(IgnoredMouseClick())
    } else if (isOpen) {
      return dispatchClosed()
    } else {
      return dispatchOpened()
    }
  }

  const handleSpaceKeyUp = (key: string): Option.Option<Message> =>
    OptionExt.when(key === ' ', toParentMessage(SuppressedSpaceScroll()))

  const handlePanelKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when('Escape', () => Option.some(dispatchClosed())),
      M.orElse(() => Option.none()),
    )

  const resolvedButtonAttributes = [
    Id(`${id}-button`),
    Type('button'),
    AriaExpanded(isVisible),
    AriaControls(`${id}-panel`),
    ...(isDisabled
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
    ...(buttonClassName ? [Class(buttonClassName)] : []),
    ...buttonAttributes,
  ]

  const hooks = anchorHooks({
    buttonId: `${id}-button`,
    anchor,
    interceptTab: false,
    focusAfterPosition: true,
  })

  const anchorAttributes = [
    Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
    OnInsert(hooks.onInsert),
    OnDestroy(hooks.onDestroy),
  ]

  const resolvedPanelAttributes = [
    Id(`${id}-panel`),
    Tabindex(0),
    ...anchorAttributes,
    ...transitionAttributes,
    ...(isLeaving
      ? []
      : [
          OnKeyDownPreventDefault(handlePanelKeyDown),
          OnBlur(toParentMessage(ClosedByTab())),
        ]),
    ...(panelClassName ? [Class(panelClassName)] : []),
    ...panelAttributes,
  ]

  const backdrop = keyed('div')(
    `${id}-backdrop`,
    [
      ...(isLeaving ? [] : [OnClick(dispatchClosed())]),
      ...(backdropClassName ? [Class(backdropClassName)] : []),
      ...backdropAttributes,
    ],
    [],
  )

  const visibleContent = [
    backdrop,
    keyed('div')(`${id}-panel-container`, resolvedPanelAttributes, [
      panelContent,
    ]),
  ]

  const wrapperAttributes = [
    ...(className ? [Class(className)] : []),
    ...attributes,
    ...(isVisible ? [DataAttribute('open', '')] : []),
  ]

  return div(wrapperAttributes, [
    keyed('button')(`${id}-button`, resolvedButtonAttributes, [buttonContent]),
    ...(isVisible ? visibleContent : []),
  ])
}

/** Creates a memoized popover view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<
    ViewConfig<Message>,
    'model' | 'toParentMessage' | 'onOpened' | 'onClosed'
  >,
): ((
  model: Model,
  toParentMessage: ViewConfig<Message>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
        }),
      [model, toParentMessage],
    )
}

import { Array, Effect, Match as M, Option, Schema as S, pipe } from 'effect'

import * as Command from '../../command'
import { OptionExt } from '../../effectExtensions'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
import { anchorHooks } from '../anchor'
import type { AnchorConfig } from '../anchor'
import { TransitionState } from '../transition'

// MODEL

/** Schema for the popover component's state, tracking open/closed status and transition animation. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  isModal: S.Boolean,
  transitionState: TransitionState,
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
/** Sent internally when a double-rAF completes, advancing the transition to its animating phase. */
export const AdvancedTransitionFrame = m('AdvancedTransitionFrame')
/** Sent internally when all CSS transitions on the popover panel have completed. */
export const EndedTransition = m('EndedTransition')
/** Sent internally when the popover button moves in the viewport during a leave transition, cancelling the animation. */
export const DetectedButtonMovement = m('DetectedButtonMovement')

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
    typeof AdvancedTransitionFrame,
    typeof EndedTransition,
    typeof DetectedButtonMovement,
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
  AdvancedTransitionFrame,
  EndedTransition,
  DetectedButtonMovement,
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
  transitionState: 'Idle',
  maybeLastButtonPointerType: Option.none(),
})

// UPDATE

const closedModel = (model: Model): Model =>
  evo(model, {
    isOpen: () => false,
    transitionState: () => (model.isAnimated ? 'LeaveStart' : 'Idle'),
    maybeLastButtonPointerType: () => Option.none(),
  })

const buttonSelector = (id: string): string => `#${id}-button`
const panelSelector = (id: string): string => `#${id}-panel`

type UpdateReturn = [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const RequestFrame = Command.define('RequestFrame')
const LockScroll = Command.define('LockScroll')
const UnlockScroll = Command.define('UnlockScroll')
const InertOthers = Command.define('InertOthers')
const RestoreInert = Command.define('RestoreInert')
const FocusPanel = Command.define('FocusPanel')
const FocusButton = Command.define('FocusButton')
const WaitForTransitions = Command.define('WaitForTransitions')
const DetectMovementOrTransitionEnd = Command.define(
  'DetectMovementOrTransitionEnd',
)

/** Processes a popover message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeNextFrame = OptionExt.when(
    model.isAnimated,
    RequestFrame(Task.nextFrame.pipe(Effect.as(AdvancedTransitionFrame()))),
  )

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

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Opened: () => {
        const nextModel = evo(model, {
          isOpen: () => true,
          transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
        })

        return [
          nextModel,
          pipe(
            Array.getSomes([maybeNextFrame, maybeLockScroll, maybeInertOthers]),
            Array.prepend(
              FocusPanel(
                Task.focus(panelSelector(model.id)).pipe(
                  Effect.ignore,
                  Effect.as(CompletedFocusPanel()),
                ),
              ),
            ),
          ),
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
            FocusButton(
              Task.focus(buttonSelector(model.id)).pipe(
                Effect.ignore,
                Effect.as(CompletedFocusButton()),
              ),
            ),
          ),
        ),
      ],

      ClosedByTab: () => [
        closedModel(model),
        Array.getSomes([maybeNextFrame, maybeUnlockScroll, maybeRestoreInert]),
      ],

      PressedPointerOnButton: ({ pointerType, button }) => {
        const withPointerType = evo(model, {
          maybeLastButtonPointerType: () => Option.some(pointerType),
        })

        if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
          return [withPointerType, []]
        }

        if (model.isOpen) {
          return [
            closedModel(withPointerType),
            pipe(
              Array.getSomes([
                maybeNextFrame,
                maybeUnlockScroll,
                maybeRestoreInert,
              ]),
              Array.prepend(
                FocusButton(
                  Task.focus(buttonSelector(model.id)).pipe(
                    Effect.ignore,
                    Effect.as(CompletedFocusButton()),
                  ),
                ),
              ),
            ),
          ]
        }

        const nextModel = evo(withPointerType, {
          isOpen: () => true,
          transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
        })

        return [
          nextModel,
          pipe(
            Array.getSomes([maybeNextFrame, maybeLockScroll, maybeInertOthers]),
            Array.prepend(
              FocusPanel(
                Task.focus(panelSelector(model.id)).pipe(
                  Effect.ignore,
                  Effect.as(CompletedFocusPanel()),
                ),
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
              WaitForTransitions(
                Task.waitForTransitions(panelSelector(model.id)).pipe(
                  Effect.as(EndedTransition()),
                ),
              ),
            ],
          ]),
          M.when('LeaveStart', () => [
            evo(model, { transitionState: () => 'LeaveAnimating' }),
            [
              DetectMovementOrTransitionEnd(
                Effect.raceFirst(
                  Task.detectElementMovement(buttonSelector(model.id)).pipe(
                    Effect.as(DetectedButtonMovement()),
                  ),
                  Task.waitForTransitions(panelSelector(model.id)).pipe(
                    Effect.as(EndedTransition()),
                  ),
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

      DetectedButtonMovement: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      CompletedFocusPanel: () => [model, []],
      CompletedFocusButton: () => [model, []],
      CompletedLockScroll: () => [model, []],
      CompletedUnlockScroll: () => [model, []],
      CompletedSetupInert: () => [model, []],
      CompletedTeardownInert: () => [model, []],
      IgnoredMouseClick: () => [model, []],
      SuppressedSpaceScroll: () => [model, []],
    }),
  )
}

// VIEW

/** Configuration for rendering a popover with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toMessage: (
    message:
      | Opened
      | Closed
      | ClosedByTab
      | PressedPointerOnButton
      | IgnoredMouseClick
      | SuppressedSpaceScroll,
  ) => Message
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
    model: { id, isOpen, transitionState, maybeLastButtonPointerType },
    toMessage,
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
        Option.some(toMessage(isOpen ? Closed() : Opened())),
      ),
      M.orElse(() => Option.none()),
    )

  const handleButtonPointerDown = (
    pointerType: string,
    button: number,
  ): Option.Option<Message> =>
    Option.some(
      toMessage(
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
      return toMessage(IgnoredMouseClick())
    } else if (isOpen) {
      return toMessage(Closed())
    } else {
      return toMessage(Opened())
    }
  }

  const handleSpaceKeyUp = (key: string): Option.Option<Message> =>
    OptionExt.when(key === ' ', toMessage(SuppressedSpaceScroll()))

  const handlePanelKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when('Escape', () => Option.some(toMessage(Closed()))),
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
    ...(isVisible ? [DataAttribute('open', '')] : []),
    ...(buttonClassName ? [Class(buttonClassName)] : []),
    ...buttonAttributes,
  ]

  const hooks = anchorHooks({
    buttonId: `${id}-button`,
    anchor,
    interceptTab: false,
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
          OnBlur(toMessage(ClosedByTab())),
        ]),
    ...(panelClassName ? [Class(panelClassName)] : []),
    ...panelAttributes,
  ]

  const backdrop = keyed('div')(
    `${id}-backdrop`,
    [
      ...(isLeaving ? [] : [OnClick(toMessage(Closed()))]),
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
 *  only `model` and `toMessage` are compared per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<ViewConfig<Message>, 'model' | 'toMessage'>,
): ((model: Model, toMessage: ViewConfig<Message>['toMessage']) => Html) => {
  const lazyView = createLazy()

  return (model, toMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toMessage: currentToMessage,
        }),
      [model, toMessage],
    )
}

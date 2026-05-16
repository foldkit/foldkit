import {
  Array,
  Effect,
  Equal,
  Match as M,
  Option,
  Queue,
  Schema as S,
  Stream,
} from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import { OptionExt } from '../../effectExtensions/index.js'
import {
  type Attribute,
  type Html,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import { evo } from '../../struct/index.js'
import { AnchorConfig, anchorSetup, portalToBody } from '../anchor.js'
// NOTE: Animation imports are split across schema + update to avoid a circular
// dependency: animation → html → runtime → devtools → popover → animation.
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

// MODEL

/** Schema for the popover component's state, tracking open/closed status and animation lifecycle. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  isModal: S.Boolean,
  contentFocus: S.Boolean,
  animation: AnimationModel,
  maybeLastButtonPointerType: S.Option(S.String),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the popover opens via button click or keyboard activation. */
export const Opened = m('Opened')
/** Sent when the popover closes via Escape key or backdrop click. Returns focus to the button. */
export const Closed = m('Closed')
/** Sent when the popover panel loses focus. Does NOT return focus to the button. */
export const BlurredPanel = m('BlurredPanel')
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
/** Sent when the popover panel mounts and Floating UI has positioned it. Update no-ops; the side effect is the act of positioning, surfaced for DevTools observability. */
export const CompletedAnchorPopover = m('CompletedAnchorPopover')
/** Sent when the popover backdrop mounts and is portaled to the document body. Update no-ops; surfaces the portal side effect for DevTools. */
export const CompletedPortalPopoverBackdrop = m(
  'CompletedPortalPopoverBackdrop',
)
/** Wraps an Animation submodel message for delegation. */
export const GotAnimationMessage = m('GotAnimationMessage', {
  message: AnimationMessage,
})

/** Union of all messages the popover component can produce. */
export const Message: S.Union<
  [
    typeof Opened,
    typeof Closed,
    typeof BlurredPanel,
    typeof PressedPointerOnButton,
    typeof CompletedFocusPanel,
    typeof CompletedFocusButton,
    typeof CompletedLockScroll,
    typeof CompletedUnlockScroll,
    typeof CompletedSetupInert,
    typeof CompletedTeardownInert,
    typeof IgnoredMouseClick,
    typeof SuppressedSpaceScroll,
    typeof CompletedAnchorPopover,
    typeof CompletedPortalPopoverBackdrop,
    typeof GotAnimationMessage,
  ]
> = S.Union([
  Opened,
  Closed,
  BlurredPanel,
  PressedPointerOnButton,
  CompletedFocusPanel,
  CompletedFocusButton,
  CompletedLockScroll,
  CompletedUnlockScroll,
  CompletedSetupInert,
  CompletedTeardownInert,
  IgnoredMouseClick,
  SuppressedSpaceScroll,
  CompletedAnchorPopover,
  CompletedPortalPopoverBackdrop,
  GotAnimationMessage,
])

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type BlurredPanel = typeof BlurredPanel.Type
export type PressedPointerOnButton = typeof PressedPointerOnButton.Type
export type IgnoredMouseClick = typeof IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof SuppressedSpaceScroll.Type

export type Message = typeof Message.Type

// INIT

const LEFT_MOUSE_BUTTON = 0

/** Configuration for creating a popover model with `init`. `isAnimated` enables animation coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). `contentFocus` hands focus ownership to the consumer — the panel is not focusable and does not close on blur, so the consumer must focus a descendant on open and close the popover on its own blur rules (default `false`). */
export type InitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
  contentFocus?: boolean
}>

/** Creates an initial popover model from a config. Defaults to closed. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  contentFocus: config.contentFocus ?? false,
  animation: animationInit({ id: `${config.id}-panel` }),
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
export const LockScroll = Command.define(
  'LockScroll',
  CompletedLockScroll,
)(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())))
/** Re-enables page scrolling after the popover closes. */
export const UnlockScroll = Command.define(
  'UnlockScroll',
  CompletedUnlockScroll,
)(Dom.unlockScroll.pipe(Effect.as(CompletedUnlockScroll())))
/** Marks all elements outside the popover as inert for modal behavior. */
export const InertOthers = Command.define(
  'InertOthers',
  { id: S.String },
  CompletedSetupInert,
)(({ id }) =>
  Dom.inertOthers(id, [buttonSelector(id), panelSelector(id)]).pipe(
    Effect.as(CompletedSetupInert()),
  ),
)
/** Removes the inert attribute from elements outside the popover. */
export const RestoreInert = Command.define(
  'RestoreInert',
  { id: S.String },
  CompletedTeardownInert,
)(({ id }) => Dom.restoreInert(id).pipe(Effect.as(CompletedTeardownInert())))
/** Moves focus to the popover panel after opening. */
export const FocusPanel = Command.define(
  'FocusPanel',
  { id: S.String },
  CompletedFocusPanel,
)(({ id }) =>
  Dom.focus(panelSelector(id)).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusPanel()),
  ),
)
/** Moves focus back to the popover button after closing. */
export const FocusButton = Command.define(
  'FocusButton',
  { id: S.String },
  CompletedFocusButton,
)(({ id }) =>
  Dom.focus(buttonSelector(id)).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusButton()),
  ),
)
/** Detects whether the popover button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation submodel that leave is complete. */
export const DetectMovementOrAnimationEnd = Command.define(
  'DetectMovementOrAnimationEnd',
  { id: S.String },
  GotAnimationMessage,
)(({ id }) =>
  Effect.raceFirst(
    Dom.detectElementMovement(buttonSelector(id)).pipe(
      Effect.as(GotAnimationMessage({ message: AnimationEndedAnimation() })),
    ),
    Dom.waitForAnimationSettled(panelSelector(id)).pipe(
      Effect.as(GotAnimationMessage({ message: AnimationEndedAnimation() })),
    ),
  ),
)

const delegateToAnimation = (
  model: Model,
  animationMessage: AnimationMessage,
): UpdateReturn => {
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
          DetectMovementOrAnimationEnd({ id: model.id }),
        ],
        TransitionedOut: () => [],
      }),
    ),
  })

  return [
    evo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...additionalCommands],
  ]
}

/** Processes a popover message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn => {
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

  const openCommands = Array.getSomes([maybeLockScroll, maybeInertOthers])

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
      const [nextModel, animationCommands] = delegateToAnimation(
        baseModel,
        AnimationShowed(),
      )
      return [
        evo(nextModel, { isOpen: () => true }),
        [...openCommands, ...animationCommands],
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
      Opened: () => openPopover(model),

      Closed: () => closePopover(model, closeWithFocusCommands),

      BlurredPanel: () => {
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

      GotAnimationMessage: ({ message: animationMessage }) =>
        delegateToAnimation(model, animationMessage),

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
      CompletedAnchorPopover: () => [model, []],
      CompletedPortalPopoverBackdrop: () => [model, []],
    }),
  )
}

/** The anchor-positioning Mount this Popover renders on its panel. Exposed so
 *  Scene tests can call `Scene.Mount.resolve(AnchorPopover, CompletedAnchorPopover())`
 *  to acknowledge the mount produced by the rendered panel. */
export const AnchorPopover = Mount.define(
  'AnchorPopover',
  {
    buttonId: S.String,
    anchor: AnchorConfig,
    focusSelector: S.optional(S.String),
  },
  CompletedAnchorPopover,
)(
  ({ buttonId, anchor, focusSelector }) =>
    element =>
      Stream.callback<typeof CompletedAnchorPopover.Type>(queue =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const cleanup = anchorSetup({
                buttonId,
                anchor,
                interceptTab: false,
                focusAfterPosition: true,
                ...(focusSelector !== undefined && { focusSelector }),
              })(element)
              Queue.offerUnsafe(queue, CompletedAnchorPopover())
              return cleanup
            }),
            cleanup => Effect.sync(cleanup),
          )
          return yield* Effect.never
        }),
      ),
)

/** The backdrop-portaling Mount this Popover renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalPopoverBackdrop, CompletedPortalPopoverBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalPopoverBackdrop = Mount.define(
  'PortalPopoverBackdrop',
  CompletedPortalPopoverBackdrop,
)(element =>
  Stream.callback<typeof CompletedPortalPopoverBackdrop.Type>(queue =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const cleanup = portalToBody(element)
          Queue.offerUnsafe(queue, CompletedPortalPopoverBackdrop())
          return cleanup
        }),
        cleanup => Effect.sync(cleanup),
      )
      return yield* Effect.never
    }),
  ),
)

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
export type ViewConfig<ParentMessage> = Readonly<{
  model: Model
  toParentMessage: (
    message:
      | Opened
      | Closed
      | BlurredPanel
      | PressedPointerOnButton
      | IgnoredMouseClick
      | SuppressedSpaceScroll
      | typeof CompletedAnchorPopover.Type
      | typeof CompletedPortalPopoverBackdrop.Type,
  ) => ParentMessage
  onOpened?: () => ParentMessage
  onClosed?: () => ParentMessage
  anchor: AnchorConfig
  buttonContent: Html
  buttonClassName?: string
  buttonAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  panelContent: Html
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<Attribute<ParentMessage>>
  isDisabled?: boolean
  focusSelector?: string
  className?: string
  attributes?: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Renders a headless popover with a trigger button and a floating panel. Uses the disclosure ARIA pattern (aria-expanded + aria-controls) with no role on the panel. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
  const h = html<ParentMessage>()

  const {
    model: {
      id,
      isOpen,
      contentFocus,
      animation: { transitionState },
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
    focusSelector,
    className,
    attributes = [],
  } = config

  const dispatchOpened = (): ParentMessage =>
    onOpened ? onOpened() : toParentMessage(Opened())

  const dispatchClosed = (): ParentMessage =>
    onClosed ? onClosed() : toParentMessage(Closed())

  const isLeaving =
    transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
  const isVisible = isOpen || isLeaving

  const animationAttributes: ReadonlyArray<ReturnType<typeof h.DataAttribute>> =
    M.value(transitionState).pipe(
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

  const handleButtonKeyDown = (key: string): Option.Option<ParentMessage> =>
    M.value(key).pipe(
      M.whenOr('Enter', ' ', 'ArrowDown', () =>
        Option.some(isOpen ? dispatchClosed() : dispatchOpened()),
      ),
      M.when('Escape', () => OptionExt.when(isOpen, dispatchClosed())),
      M.orElse(() => Option.none()),
    )

  const handleButtonPointerDown = (
    pointerType: string,
    button: number,
  ): Option.Option<ParentMessage> =>
    Option.some(
      toParentMessage(
        PressedPointerOnButton({
          pointerType,
          button,
        }),
      ),
    )

  const handleButtonClick = (): ParentMessage => {
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

  const handleSpaceKeyUp = (key: string): Option.Option<ParentMessage> =>
    OptionExt.when(key === ' ', toParentMessage(SuppressedSpaceScroll()))

  const handlePanelKeyDown = (key: string): Option.Option<ParentMessage> =>
    M.value(key).pipe(
      M.when('Escape', () => Option.some(dispatchClosed())),
      M.orElse(() => Option.none()),
    )

  const resolvedButtonAttributes = [
    h.Id(`${id}-button`),
    h.Type('button'),
    h.AriaExpanded(isVisible),
    h.AriaControls(`${id}-panel`),
    ...(isDisabled
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
    ...(buttonClassName ? [h.Class(buttonClassName)] : []),
    ...buttonAttributes,
  ]

  const anchorPopover = Mount.mapMessage(
    AnchorPopover({
      buttonId: `${id}-button`,
      anchor,
      ...(focusSelector !== undefined && { focusSelector }),
    }),
    toParentMessage,
  )

  const anchorAttributes = [
    h.Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
    h.OnMount(anchorPopover),
  ]

  const resolvedPanelAttributes = [
    h.Id(`${id}-panel`),
    ...(contentFocus ? [] : [h.Tabindex(0)]),
    ...anchorAttributes,
    ...animationAttributes,
    ...(isLeaving
      ? []
      : [
          h.OnKeyDownPreventDefault(handlePanelKeyDown),
          ...(contentFocus ? [] : [h.OnBlur(toParentMessage(BlurredPanel()))]),
        ]),
    ...(panelClassName ? [h.Class(panelClassName)] : []),
    ...panelAttributes,
  ]

  const backdrop = h.keyed('div')(
    `${id}-backdrop`,
    [
      h.OnMount(Mount.mapMessage(PortalPopoverBackdrop(), toParentMessage)),
      ...(isLeaving ? [] : [h.OnClick(dispatchClosed())]),
      ...(backdropClassName ? [h.Class(backdropClassName)] : []),
      ...backdropAttributes,
    ],
    [],
  )

  const visibleContent = [
    backdrop,
    h.keyed('div')(`${id}-panel-container`, resolvedPanelAttributes, [
      panelContent,
    ]),
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

/** Creates a memoized popover view. Static config is captured in a closure;
 *  only `model` and `toParentMessage` are compared per render via `createLazy`. */
export const lazy = <ParentMessage>(
  staticConfig: Omit<
    ViewConfig<ParentMessage>,
    'model' | 'toParentMessage' | 'onOpened' | 'onClosed'
  >,
): ((
  model: Model,
  toParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToParentMessage,
        }),
      [model, toParentMessage],
    )
}

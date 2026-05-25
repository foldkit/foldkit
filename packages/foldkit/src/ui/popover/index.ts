import { Array, Effect, Equal, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import { OptionExt } from '../../effectExtensions/index.js'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  defineView,
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

/** Sent when the popover should open via button click or keyboard activation. */
export const RequestedOpen = m('RequestedOpen')
/** Sent when the popover should close via Escape key or backdrop click. Returns focus to the button. */
export const RequestedClose = m('RequestedClose')
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
export const CompletedInertOthers = m('CompletedInertOthers')
/** Sent when the restore-inert command completes. */
export const CompletedRestoreInert = m('CompletedRestoreInert')
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
    typeof RequestedOpen,
    typeof RequestedClose,
    typeof BlurredPanel,
    typeof PressedPointerOnButton,
    typeof CompletedFocusPanel,
    typeof CompletedFocusButton,
    typeof CompletedLockScroll,
    typeof CompletedUnlockScroll,
    typeof CompletedInertOthers,
    typeof CompletedRestoreInert,
    typeof IgnoredMouseClick,
    typeof SuppressedSpaceScroll,
    typeof CompletedAnchorPopover,
    typeof CompletedPortalPopoverBackdrop,
    typeof GotAnimationMessage,
  ]
> = S.Union([
  RequestedOpen,
  RequestedClose,
  BlurredPanel,
  PressedPointerOnButton,
  CompletedFocusPanel,
  CompletedFocusButton,
  CompletedLockScroll,
  CompletedUnlockScroll,
  CompletedInertOthers,
  CompletedRestoreInert,
  IgnoredMouseClick,
  SuppressedSpaceScroll,
  CompletedAnchorPopover,
  CompletedPortalPopoverBackdrop,
  GotAnimationMessage,
])

export type RequestedOpen = typeof RequestedOpen.Type
export type RequestedClose = typeof RequestedClose.Type
export type BlurredPanel = typeof BlurredPanel.Type
export type PressedPointerOnButton = typeof PressedPointerOnButton.Type
export type IgnoredMouseClick = typeof IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof SuppressedSpaceScroll.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent after the popover transitions to its open state. Fires once `update` has processed `RequestedOpen` and `isOpen` reflects the new state. */
export const Opened = m('Opened')
/** Sent to the parent after the popover transitions to its closed state. */
export const Closed = m('Closed')

/** Union of out-messages the popover component can produce. Parents reacting to open/close transitions (e.g. to reset related state, fire analytics) read this from the third element of `update`'s return tuple. */
export const OutMessage = S.Union([Opened, Closed])
export type OutMessage = typeof OutMessage.Type

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type

// INIT

const LEFT_MOUSE_BUTTON = 0

/** Configuration for creating a popover model with `init`. `isAnimated` enables animation coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). `contentFocus` hands focus ownership to the consumer. The panel is not focusable and does not close on blur, so the consumer must focus a descendant on open and close the popover on its own blur rules (default `false`). */
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

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
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
  CompletedInertOthers,
)(({ id }) =>
  Dom.inertOthers(id, [buttonSelector(id), panelSelector(id)]).pipe(
    Effect.as(CompletedInertOthers()),
  ),
)
/** Removes the inert attribute from elements outside the popover. */
export const RestoreInert = Command.define(
  'RestoreInert',
  { id: S.String },
  CompletedRestoreInert,
)(({ id }) => Dom.restoreInert(id).pipe(Effect.as(CompletedRestoreInert())))
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
    evo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...additionalCommands],
    Option.none(),
  ]
}

/** Processes a popover message and returns the next model, commands, and optional OutMessage. */
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
        Option.some(Opened()),
      ]
    }

    return [
      evo(baseModel, { isOpen: () => true }),
      openCommands,
      Option.some(Opened()),
    ]
  }

  const closePopover = (
    baseModel: Model,
    commands: ReadonlyArray<Command.Command<Message>>,
  ): UpdateReturn => {
    if (!baseModel.isOpen) {
      return [baseModel, commands, Option.none()]
    }
    const closed = closedModel(baseModel)

    if (model.isAnimated) {
      const [nextModel, animationCommands] = delegateToAnimation(
        closed,
        AnimationHid(),
      )
      return [
        nextModel,
        [...commands, ...animationCommands],
        Option.some(Closed()),
      ]
    }

    return [closed, commands, Option.some(Closed())]
  }

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      RequestedOpen: () => openPopover(model),

      RequestedClose: () => closePopover(model, closeWithFocusCommands),

      BlurredPanel: () => {
        if (
          Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
        ) {
          return [model, [], Option.none()]
        }

        return closePopover(model, closeWithoutFocusCommands)
      },

      PressedPointerOnButton: ({ pointerType, button }) => {
        const withPointerType = evo(model, {
          maybeLastButtonPointerType: () => Option.some(pointerType),
        })

        if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
          return [withPointerType, [], Option.none()]
        }

        if (model.isOpen) {
          const [closed, commands, maybeOutMessage] = closePopover(
            withPointerType,
            closeWithFocusCommands,
          )
          return [
            evo(closed, {
              maybeLastButtonPointerType: () => Option.some(pointerType),
            }),
            commands,
            maybeOutMessage,
          ]
        }

        return openPopover(withPointerType)
      },

      GotAnimationMessage: ({ message: animationMessage }) =>
        delegateToAnimation(model, animationMessage),

      CompletedFocusPanel: () => [model, [], Option.none()],
      CompletedFocusButton: () => [model, [], Option.none()],
      CompletedLockScroll: () => [model, [], Option.none()],
      CompletedUnlockScroll: () => [model, [], Option.none()],
      CompletedInertOthers: () => [model, [], Option.none()],
      CompletedRestoreInert: () => [model, [], Option.none()],
      IgnoredMouseClick: () => [
        evo(model, { maybeLastButtonPointerType: () => Option.none() }),
        [],
        Option.none(),
      ],
      SuppressedSpaceScroll: () => [model, [], Option.none()],
      CompletedAnchorPopover: () => [model, [], Option.none()],
      CompletedPortalPopoverBackdrop: () => [model, [], Option.none()],
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
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            anchorSetup({
              buttonId,
              anchor,
              interceptTab: false,
              focusAfterPosition: true,
              ...(focusSelector !== undefined && { focusSelector }),
            })(element),
          ),
          cleanup => Effect.sync(cleanup),
        )
        return CompletedAnchorPopover()
      }),
)

/** The backdrop-portaling Mount this Popover renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalPopoverBackdrop, CompletedPortalPopoverBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalPopoverBackdrop = Mount.define(
  'PortalPopoverBackdrop',
  CompletedPortalPopoverBackdrop,
)(element =>
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => portalToBody(element)),
      cleanup => Effect.sync(cleanup),
    )
    return CompletedPortalPopoverBackdrop()
  }),
)

/** Programmatically opens the popover, updating the model and returning
 *  focus and modal commands plus an `Opened` OutMessage. */
export const open = (model: Model): UpdateReturn =>
  update(model, RequestedOpen())

/** Programmatically closes the popover, updating the model and returning
 *  focus and modal commands plus a `Closed` OutMessage when it was open. */
export const close = (model: Model): UpdateReturn =>
  update(model, RequestedClose())

// VIEW

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `button`: attribute bundle for the trigger button.
 *  - `panel`: attribute bundle for the floating panel. Includes the
 *    anchor Mount that positions the panel via Floating UI, ARIA
 *    linkage to the button, and panel keydown/blur handlers.
 *  - `backdrop`: attribute bundle for the modal backdrop. Includes the
 *    portal Mount that moves the backdrop to document.body. The
 *    backdrop's OnClick closes the popover.
 *  - `isVisible`: derived from `isOpen` and the Animation
 *    `transitionState`. The consumer renders the panel + backdrop only
 *    while this is true. */
export type RenderInfo = Readonly<{
  button: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
  backdrop: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  anchor: AnchorConfig
  toView: (render: RenderInfo) => Html
  isDisabled?: boolean
  focusSelector?: string
}>

/** Renders a headless popover with a trigger button and a floating panel. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const {
      id,
      isOpen,
      contentFocus,
      animation: { transitionState },
      maybeLastButtonPointerType,
    } = model
    const { anchor, toView, isDisabled, focusSelector } = viewInputs

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving

    const animationAttributes = M.value(transitionState).pipe(
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

    const handleButtonKeyDown = (
      key: string,
    ): Option.Option<RequestedOpen | RequestedClose> =>
      M.value(key).pipe(
        M.whenOr('Enter', ' ', 'ArrowDown', () =>
          Option.some(isOpen ? RequestedClose() : RequestedOpen()),
        ),
        M.when('Escape', () => OptionExt.when(isOpen, RequestedClose())),
        M.orElse(() => Option.none()),
      )

    const handleButtonPointerDown = (
      pointerType: string,
      button: number,
    ): Option.Option<PressedPointerOnButton> =>
      Option.some(PressedPointerOnButton({ pointerType, button }))

    const handleButtonClick = ():
      | RequestedOpen
      | RequestedClose
      | IgnoredMouseClick => {
      const isMouse = Option.exists(
        maybeLastButtonPointerType,
        type => type === 'mouse',
      )

      if (isMouse) {
        return IgnoredMouseClick()
      } else if (isOpen) {
        return RequestedClose()
      } else {
        return RequestedOpen()
      }
    }

    const handleSpaceKeyUp = (
      key: string,
    ): Option.Option<SuppressedSpaceScroll> =>
      OptionExt.when(key === ' ', SuppressedSpaceScroll())

    const handlePanelKeyDown = (key: string): Option.Option<RequestedClose> =>
      M.value(key).pipe(
        M.when('Escape', () => Option.some(RequestedClose())),
        M.orElse(() => Option.none()),
      )

    const buttonAttributes = [
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
    ]

    const panelAttributes = [
      h.Id(`${id}-panel`),
      ...(contentFocus ? [] : [h.Tabindex(0)]),
      h.Style({ position: 'absolute', margin: '0', visibility: 'hidden' }),
      h.OnMount(
        AnchorPopover({
          buttonId: `${id}-button`,
          anchor,
          ...(focusSelector !== undefined && { focusSelector }),
        }),
      ),
      ...animationAttributes,
      ...(isLeaving
        ? []
        : [
            h.OnKeyDownPreventDefault(handlePanelKeyDown),
            ...(contentFocus ? [] : [h.OnBlur(BlurredPanel())]),
          ]),
    ]

    const backdropAttributes = [
      h.OnMount(PortalPopoverBackdrop()),
      ...(isLeaving ? [] : [h.OnClick(RequestedClose())]),
    ]

    return toView({
      button: childAttributes(buttonAttributes),
      panel: childAttributes(panelAttributes),
      backdrop: childAttributes(backdropAttributes),
      isVisible,
    })
  },
)

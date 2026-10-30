import {
  Array,
  Effect,
  Equal,
  Layer,
  Match,
  Option,
  Predicate,
  Schema,
} from 'effect'
import { Block, Mount } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { AnchorConfig, anchorSetup, portalBackdrop } from '../anchor/index.js'
import * as Animation from '../animation/index.js'
import * as OptionExt from '../internal/optionExtensions.js'
import { idSelector } from '../internal/selectors.js'

// MODEL

/** Schema for the popover component's state, tracking open/closed status and animation lifecycle. */
export const Model = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  isAnimated: Schema.Boolean,
  isModal: Schema.Boolean,
  contentFocus: Schema.Boolean,
  animation: Animation.Animation,
  maybeLastButtonPointerType: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the popover component can produce. Send
 *  `RequestedOpen` and `RequestedClose` to open and close the Popover from
 *  its parent. */
export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  BlurredPanel: {},
  PressedPointerOnButton: {
    pointerType: Schema.String,
    button: Schema.Number,
  },
  CompletedFocusPopoverPanel: {},
  CompletedFocusPopoverButton: {},
  CompletedLockPopoverScroll: {},
  CompletedUnlockPopoverScroll: {},
  CompletedInertPopoverOthers: {},
  CompletedRestorePopoverInert: {},
  ClickedButton: {},
  IgnoredMouseClick: {},
  SuppressedSpaceScroll: {},
  CompletedAnchorPopover: {},
  CompletedPortalPopoverBackdrop: {},
  CompletedDetectPopoverMovementOrAnimationEnd: { generation: Schema.Number },
})
export type Message = typeof Message.Type

export type RequestedOpen = typeof Message.RequestedOpen.Type
export type RequestedClose = typeof Message.RequestedClose.Type
export type BlurredPanel = typeof Message.BlurredPanel.Type
export type PressedPointerOnButton = typeof Message.PressedPointerOnButton.Type
/** A click on the Popover trigger button. */
export type ClickedButton = typeof Message.ClickedButton.Type
export type IgnoredMouseClick = typeof Message.IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof Message.SuppressedSpaceScroll.Type

// OUT MESSAGE

/** Union of OutMessages the popover component can produce. Handle open and
 *  close transitions with `.on` on the Popover instance. */
export const OutMessage = defineMessageUnion({
  Opened: {},
  Closed: {},
})
export type OutMessage = typeof OutMessage.Type

export type Opened = typeof OutMessage.Opened.Type
export type Closed = typeof OutMessage.Closed.Type

// ARGS

const LEFT_MOUSE_BUTTON = 0

/** Constructor args for a Popover instance.
 *
 *  `id` is the base DOM id for the button, panel, and arrow. `isAnimated`
 *  enables animation coordination. `isModal` locks page scroll and marks
 *  other elements inert while the Popover is open. Both default to `false`.
 *
 *  With `contentFocus: true`, the panel has no tab stop and focus leaving
 *  it does not close the Popover. Focus a descendant when opening and
 *  handle focus leaving the content in the application. Defaults to `false`. */
export type PopoverArgs = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
  contentFocus?: boolean
}>

// COMMAND

const buttonSelector = (id: string): string => idSelector(`${id}-button`)
const panelSelector = (id: string): string => idSelector(`${id}-panel`)

/** Returns the bare DOM id of the popover trigger button, derived from the
 *  popover's base id. Use this to associate an external label with the
 *  trigger via a native `<label for={Popover.buttonId(id)}>` or an
 *  `aria-labelledby` reference. */
export const buttonId = (id: string): string => `${id}-button`

/** Returns the bare DOM id of the popover arrow, derived from the popover's
 *  base id. The `arrow` bundle already carries this id, so reach for this when
 *  you need the id on its own, such as asserting the panel Mount's `arrowId`
 *  argument in a Scene test. */
export const arrowId = (id: string): string => `${id}-arrow`

/** Prevents page scrolling while the popover is open in modal mode. */
export const LockPopoverScroll = Command.define('LockPopoverScroll', {
  messages: [Message.CompletedLockPopoverScroll],
})
/** Re-enables page scrolling after the popover closes. */
export const UnlockPopoverScroll = Command.define('UnlockPopoverScroll', {
  messages: [Message.CompletedUnlockPopoverScroll],
})
/** Marks all elements outside the popover as inert for modal behavior. */
export const InertPopoverOthers = Command.define('InertPopoverOthers', {
  args: { id: Schema.String },
  messages: [Message.CompletedInertPopoverOthers],
})
/** Removes the inert attribute from elements outside the Popover. */
export const RestorePopoverInert = Command.define('RestorePopoverInert', {
  args: { id: Schema.String },
  messages: [Message.CompletedRestorePopoverInert],
})
/** Moves focus to the popover panel after opening. */
export const FocusPopoverPanel = Command.define('FocusPopoverPanel', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusPopoverPanel],
})
/** Moves focus back to the popover button after closing. */
export const FocusPopoverButton = Command.define('FocusPopoverButton', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusPopoverButton],
})
/** Detects whether the popover button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation instance that leave is complete. */
export const DetectPopoverMovementOrAnimationEnd = Command.define(
  'DetectPopoverMovementOrAnimationEnd',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.CompletedDetectPopoverMovementOrAnimationEnd],
  },
)

// MOUNT

/** The anchor-positioning Mount this Popover renders on its panel. Exposed so
 *  Scene tests can call `Mount.resolve(AnchorPopover, CompletedAnchorPopover())`
 *  to acknowledge the mount produced by the rendered panel. */
export const AnchorPopover = Mount.define('AnchorPopover', {
  args: {
    buttonId: Schema.String,
    anchor: AnchorConfig,
    focusSelector: Schema.optional(Schema.String),
    arrowId: Schema.optional(Schema.String),
    arrowPadding: Schema.optional(Schema.Number),
  },
  messages: [Message.CompletedAnchorPopover],
})

/** The backdrop-portaling Mount this Popover renders. Exposed so Scene tests can
 *  call `Mount.resolve(PortalPopoverBackdrop, CompletedPortalPopoverBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalPopoverBackdrop = Mount.define('PortalPopoverBackdrop', {
  messages: [Message.CompletedPortalPopoverBackdrop],
})

/** Mount Definitions rendered by Popover views. */
export const mounts = [AnchorPopover, PortalPopoverBackdrop]

// UPDATE

const makeInitialModel = (
  args: PopoverArgs,
  animation: Animation.Animation,
): Model => ({
  id: args.id,
  isOpen: false,
  isAnimated: args.isAnimated ?? false,
  isModal: args.isModal ?? false,
  contentFocus: args.contentFocus ?? false,
  animation,
  maybeLastButtonPointerType: Option.none(),
})

const closedModel = (model: Model): Model =>
  modifyFields(model, {
    isOpen: () => false,
    maybeLastButtonPointerType: () => Option.none(),
  })

const isAfterMousePress = (model: Model): boolean =>
  Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))

const openCommands = (model: Model) =>
  Array.filter(
    [LockPopoverScroll(), InertPopoverOthers({ id: model.id })],
    () => model.isModal,
  )

const closeWithoutFocusCommands = (model: Model) =>
  Array.filter(
    [UnlockPopoverScroll(), RestorePopoverInert({ id: model.id })],
    () => model.isModal,
  )

const closeWithFocusCommands = (model: Model) => [
  FocusPopoverButton({ id: model.id }),
  ...closeWithoutFocusCommands(model),
]

type CloseCommands = ReturnType<typeof closeWithFocusCommands>

const animationMessages = (
  model: Model,
  message: typeof Animation.Animation.Message.Type,
) => Array.filter([model.animation.send(message)], () => model.isAnimated)

const openPopover = (model: Model) => {
  if (model.isOpen) {
    return { model }
  }

  return {
    model: modifyFields(model, { isOpen: () => true }),
    commands: openCommands(model),
    outMessage: OutMessage.Opened(),
    messages: animationMessages(
      model,
      Animation.Animation.Message.RequestedShow(),
    ),
  }
}

const startClosingPopover = (
  model: Model,
  nextModel: Model,
  commands: CloseCommands,
) => ({
  model: nextModel,
  commands,
  outMessage: OutMessage.Closed(),
  messages: animationMessages(
    model,
    Animation.Animation.Message.RequestedHide(),
  ),
})

const closePopover = (model: Model, commands: CloseCommands) => {
  if (model.isOpen) {
    return startClosingPopover(model, closedModel(model), commands)
  } else {
    return { model }
  }
}

const handlePressedPointerOnButton = (
  model: Model,
  { pointerType, button }: PressedPointerOnButton,
) => {
  const withPointerType = modifyFields(model, {
    maybeLastButtonPointerType: () => Option.some(pointerType),
  })

  if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
    return { model: withPointerType }
  }

  if (model.isOpen) {
    return startClosingPopover(
      model,
      modifyFields(closedModel(withPointerType), {
        maybeLastButtonPointerType: () => Option.some(pointerType),
      }),
      closeWithFocusCommands(model),
    )
  }

  return openPopover(withPointerType)
}

const handleClickedButton = (model: Model) => {
  if (isAfterMousePress(model)) {
    return {
      model: modifyFields(model, {
        maybeLastButtonPointerType: () => Option.none(),
      }),
    }
  }

  if (model.isOpen) {
    return closePopover(model, closeWithFocusCommands(model))
  }

  return openPopover(model)
}

const handleBlurredPanel = (model: Model) => {
  if (isAfterMousePress(model)) {
    return { model }
  }

  return closePopover(model, closeWithoutFocusCommands(model))
}

// VIEW

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `button`: attribute bundle for the trigger button.
 *  - `panel`: attribute bundle for the floating panel. Includes the
 *    anchor Mount that positions the panel via Floating UI, ARIA
 *    linkage to the button, and panel keydown and focus-leave handlers.
 *  - `backdrop`: attribute bundle for the modal backdrop. Includes the
 *    portal Mount that moves the backdrop to its containing root. Inside a
 *    `<dialog>`, it moves the backdrop to directly before the element it
 *    is rendered in, so render it inside the positioned wrapper that holds
 *    the button. The backdrop's OnClick closes the Popover.
 *  - `arrow`: attribute bundle for an arrow element inside the panel.
 *    Carries the id the anchor Mount resolves and hides the element from
 *    assistive technology. Spread it onto your own element and place it
 *    with the `--arrow-x` and `--arrow-y` custom properties Anchor
 *    publishes on the panel. Nothing renders until you do.
 *  - `isVisible`: derived from `isOpen` and the Animation
 *    `transitionState`. The consumer renders the panel + backdrop only
 *    while this is true. */
export type RenderInfo = Readonly<{
  button: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<
    ChildAttribute<Mount.RequirementsOf<typeof AnchorPopover>>
  >
  backdrop: ReadonlyArray<
    ChildAttribute<Mount.RequirementsOf<typeof PortalPopoverBackdrop>>
  >
  arrow: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render input a parent passes to `model.popover.view(...)`. */
export type ViewInput = Readonly<{
  anchor: AnchorConfig
  /** Renders the Popover from its attribute bundles. Runs as the parent. */
  toView: (render: RenderInfo) => Html
  isDisabled?: boolean
  focusSelector?: string
  arrowPadding?: number
  ariaLabel?: string
  ariaLabelledBy?: string
}>

// BLOCK

/** A headless popover with a trigger button and an anchored floating panel.
 *  Send it `Message.RequestedOpen` and `Message.RequestedClose` to open and
 *  close it from the parent, and handle `Opened` and `Closed` with `.on`. */
export class Popover extends Block<Popover, PopoverArgs, ViewInput>()(
  'Popover',
  {
    Model,
    Message,
    OutMessage,
    Command: [
      LockPopoverScroll,
      UnlockPopoverScroll,
      InertPopoverOthers,
      RestorePopoverInert,
      FocusPopoverPanel,
      FocusPopoverButton,
      DetectPopoverMovementOrAnimationEnd,
    ],
    Mount: mounts,
  },
) {}

/** Implements {@link Popover}. Provides `AnimationLive` to the Animation
 *  instance it creates. */
export const PopoverLive = Popover.make(
  Effect.fn(function* (_instanceId, args) {
    const animation = yield* new Animation.Animation('animation', {
      id: `${args.id}-panel`,
    })

    return {
      model: makeInitialModel(args, animation),

      update: {
        RequestedOpen: openPopover,
        RequestedClose: model =>
          closePopover(model, closeWithFocusCommands(model)),
        BlurredPanel: handleBlurredPanel,
        PressedPointerOnButton: handlePressedPointerOnButton,
        ClickedButton: handleClickedButton,
        IgnoredMouseClick: model => ({
          model: modifyFields(model, {
            maybeLastButtonPointerType: () => Option.none(),
          }),
        }),
        CompletedDetectPopoverMovementOrAnimationEnd: (
          model,
          { generation },
        ) => ({
          model,
          messages: [
            model.animation.send(
              Animation.Animation.Message.RequestedFinish({ generation }),
            ),
          ],
        }),
        CompletedFocusPopoverPanel: model => ({ model }),
        CompletedFocusPopoverButton: model => ({ model }),
        CompletedLockPopoverScroll: model => ({ model }),
        CompletedUnlockPopoverScroll: model => ({ model }),
        CompletedInertPopoverOthers: model => ({ model }),
        CompletedRestorePopoverInert: model => ({ model }),
        SuppressedSpaceScroll: model => ({ model }),
        CompletedAnchorPopover: model => ({ model }),
        CompletedPortalPopoverBackdrop: model => ({ model }),
        ...animation.on({
          StartedLeaveAnimating: (model, { generation }) => ({
            model,
            commands: [
              DetectPopoverMovementOrAnimationEnd({ id: model.id, generation }),
            ],
          }),
        }),
      },

      commands: {
        LockPopoverScroll: () =>
          Dom.lockScroll.pipe(Effect.as(Message.CompletedLockPopoverScroll())),
        UnlockPopoverScroll: () =>
          Dom.unlockScroll.pipe(
            Effect.as(Message.CompletedUnlockPopoverScroll()),
          ),
        InertPopoverOthers: ({ id }) =>
          Dom.inertOthers(id, [buttonSelector(id), panelSelector(id)]).pipe(
            Effect.as(Message.CompletedInertPopoverOthers()),
          ),
        RestorePopoverInert: ({ id }) =>
          Dom.restoreInert(id).pipe(
            Effect.as(Message.CompletedRestorePopoverInert()),
          ),
        FocusPopoverPanel: ({ id }) =>
          Dom.focus(panelSelector(id)).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusPopoverPanel()),
          ),
        FocusPopoverButton: ({ id }) =>
          Dom.focus(buttonSelector(id)).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusPopoverButton()),
          ),
        DetectPopoverMovementOrAnimationEnd: ({ id, generation }) =>
          Effect.raceFirst(
            Dom.detectElementMovement(buttonSelector(id)).pipe(
              Effect.as(
                Message.CompletedDetectPopoverMovementOrAnimationEnd({
                  generation,
                }),
              ),
            ),
            Dom.waitForAnimationSettled(panelSelector(id)).pipe(
              Effect.as(
                Message.CompletedDetectPopoverMovementOrAnimationEnd({
                  generation,
                }),
              ),
            ),
          ),
      },

      mounts: {
        AnchorPopover: ({
          element,
          buttonId,
          anchor,
          focusSelector,
          arrowId,
          arrowPadding,
        }) =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() =>
                anchorSetup(element, {
                  buttonId,
                  anchor,
                  interceptTab: false,
                  focusAfterPosition: true,
                  ...(focusSelector !== undefined && { focusSelector }),
                  ...(arrowId !== undefined && { arrowId }),
                  ...(arrowPadding !== undefined && { arrowPadding }),
                }),
              ),
              cleanup => Effect.sync(cleanup),
            )
            return Message.CompletedAnchorPopover()
          }),
        PortalPopoverBackdrop: ({ element }) =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => portalBackdrop(element)),
              cleanup => Effect.sync(cleanup),
            )
            return Message.CompletedPortalPopoverBackdrop()
          }),
      },

      view: (model, h, viewInput) => {
        const { id, isOpen, contentFocus } = model
        const { transitionState } = model.animation.model
        const {
          anchor,
          toView,
          isDisabled,
          focusSelector,
          arrowPadding,
          ariaLabel,
          ariaLabelledBy,
        } = viewInput

        const isLeaving = Animation.isLeaving(transitionState)
        const isVisible = isOpen || isLeaving

        const animationAttributes = Animation.transitionAttributes(
          h,
          transitionState,
        )

        const handleButtonKeyDown = (
          key: string,
        ): Option.Option<RequestedOpen | RequestedClose> =>
          Match.value(key).pipe(
            Match.whenOr('Enter', ' ', 'ArrowDown', () =>
              Option.some(
                isOpen ? Message.RequestedClose() : Message.RequestedOpen(),
              ),
            ),
            Match.when('Escape', () =>
              OptionExt.when(isOpen, Message.RequestedClose()),
            ),
            Match.orElse(() => Option.none()),
          )

        const handleButtonPointerDown = (
          pointerType: string,
          button: number,
        ): Option.Option<PressedPointerOnButton> =>
          Option.some(Message.PressedPointerOnButton({ pointerType, button }))

        const handleSpaceKeyUp = (
          key: string,
        ): Option.Option<SuppressedSpaceScroll> =>
          OptionExt.when(key === ' ', Message.SuppressedSpaceScroll())

        const handlePanelKeyDown = (
          key: string,
        ): Option.Option<RequestedClose> =>
          Match.value(key).pipe(
            Match.when('Escape', () => Option.some(Message.RequestedClose())),
            Match.orElse(() => Option.none()),
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

        const buttonAttributes = [
          h.Id(buttonId(id)),
          h.Type('button'),
          h.AriaExpanded(isVisible),
          ...(isVisible ? [h.AriaControls(`${id}-panel`)] : []),
          ...buttonLabelAttributes,
          ...(isDisabled
            ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
            : [
                h.OnPointerDown(handleButtonPointerDown),
                h.OnKeyDownPreventDefault(handleButtonKeyDown),
                h.OnKeyUpPreventDefault(handleSpaceKeyUp),
                h.OnClick(Message.ClickedButton()),
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
              buttonId: buttonId(id),
              anchor,
              ...(focusSelector !== undefined && { focusSelector }),
              arrowId: arrowId(id),
              ...(arrowPadding !== undefined && { arrowPadding }),
            }),
          ),
          ...animationAttributes,
          ...(isLeaving
            ? []
            : [
                h.OnKeyDownPreventDefault(handlePanelKeyDown),
                ...(contentFocus
                  ? []
                  : [h.OnFocusLeave(Message.BlurredPanel())]),
              ]),
        ]

        const backdropAttributes = [
          h.OnMount(PortalPopoverBackdrop()),
          ...(isLeaving ? [] : [h.OnClick(Message.RequestedClose())]),
        ]

        const arrowAttributes = [h.Id(arrowId(id)), h.AriaHidden(true)]

        return toView({
          button: childAttributes(buttonAttributes),
          panel: childAttributes(panelAttributes),
          backdrop: childAttributes(backdropAttributes),
          arrow: childAttributes(arrowAttributes),
          isVisible,
        })
      },
    }
  }),
).pipe(Layer.provide(Animation.AnimationLive))

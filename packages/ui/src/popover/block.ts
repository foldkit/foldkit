import {
  Array,
  Effect,
  Equal,
  Function,
  Layer,
  Match,
  Option,
  Predicate,
  Schema,
} from 'effect'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import type * as Mount from 'foldkit/mount'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

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
  animation: Animation.Model,
  maybeLastButtonPointerType: Schema.Option(Schema.String),
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the popover component can produce. */
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
  IgnoredMouseClick: {},
  SuppressedSpaceScroll: {},
  CompletedAnchorPopover: {},
  CompletedPortalPopoverBackdrop: {},
  CompletedDetectPopoverMovementOrAnimationEnd: { generation: Schema.Number },
  GotAnimationMessage: { message: Animation.Message },
})

export type RequestedOpen = typeof Message.RequestedOpen.Type
export type RequestedClose = typeof Message.RequestedClose.Type
export type BlurredPanel = typeof Message.BlurredPanel.Type
export type PressedPointerOnButton = typeof Message.PressedPointerOnButton.Type
export type IgnoredMouseClick = typeof Message.IgnoredMouseClick.Type
export type SuppressedSpaceScroll = typeof Message.SuppressedSpaceScroll.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Union of OutMessages the popover component can produce. Handle open and
 *  close transitions in the Popover connection's OutMessage fold. */
export const OutMessage = defineMessageUnion({
  Opened: {},
  Closed: {},
})
export type OutMessage = typeof OutMessage.Type

export type Opened = typeof OutMessage.Opened.Type
export type Closed = typeof OutMessage.Closed.Type

const Popover = Block.define('Popover', {
  Model,
  Message,
  OutMessage,
})

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
  animation: Animation.init({ id: `${config.id}-panel` }),
  maybeLastButtonPointerType: Option.none(),
})

// UPDATE

const closedModel = (model: Model): Model =>
  modifyFields(model, {
    isOpen: () => false,
    maybeLastButtonPointerType: () => Option.none(),
  })

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
export const LockPopoverScroll = Popover.command('LockPopoverScroll', {
  messages: [Message.CompletedLockPopoverScroll],
  handler: function* () {
    return () =>
      Dom.lockScroll.pipe(Effect.as(Message.CompletedLockPopoverScroll()))
  },
})
/** Re-enables page scrolling after the popover closes. */
export const UnlockPopoverScroll = Popover.command('UnlockPopoverScroll', {
  messages: [Message.CompletedUnlockPopoverScroll],
  handler: function* () {
    return () =>
      Dom.unlockScroll.pipe(Effect.as(Message.CompletedUnlockPopoverScroll()))
  },
})
/** Marks all elements outside the popover as inert for modal behavior. */
export const InertPopoverOthers = Popover.command('InertPopoverOthers', {
  args: { id: Schema.String },
  messages: [Message.CompletedInertPopoverOthers],
  handler: function* () {
    return ({ id }) =>
      Dom.inertOthers(id, [buttonSelector(id), panelSelector(id)]).pipe(
        Effect.as(Message.CompletedInertPopoverOthers()),
      )
  },
})
/** Removes the inert attribute from elements outside the Popover. */
export const RestorePopoverInert = Popover.command('RestorePopoverInert', {
  args: { id: Schema.String },
  messages: [Message.CompletedRestorePopoverInert],
  handler: function* () {
    return ({ id }) =>
      Dom.restoreInert(id).pipe(
        Effect.as(Message.CompletedRestorePopoverInert()),
      )
  },
})
/** Moves focus to the popover panel after opening. */
export const FocusPopoverPanel = Popover.command('FocusPopoverPanel', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusPopoverPanel],
  handler: function* () {
    return ({ id }) =>
      Dom.focus(panelSelector(id)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusPopoverPanel()),
      )
  },
})
/** Moves focus back to the popover button after closing. */
export const FocusPopoverButton = Popover.command('FocusPopoverButton', {
  args: { id: Schema.String },
  messages: [Message.CompletedFocusPopoverButton],
  handler: function* () {
    return ({ id }) =>
      Dom.focus(buttonSelector(id)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusPopoverButton()),
      )
  },
})
/** Detects whether the popover button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation block that leave is complete. */
export const DetectPopoverMovementOrAnimationEnd = Popover.command(
  'DetectPopoverMovementOrAnimationEnd',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.CompletedDetectPopoverMovementOrAnimationEnd],
    handler: function* () {
      return ({ id, generation }) =>
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
        )
    },
  },
)

/** The anchor-positioning Mount this Popover renders on its panel. Exposed so
 *  Scene tests can call `Scene.Mount.resolve(AnchorPopover, CompletedAnchorPopover())`
 *  to acknowledge the mount produced by the rendered panel. */
export const AnchorPopover = Popover.mount('AnchorPopover', {
  args: {
    buttonId: Schema.String,
    anchor: AnchorConfig,
    focusSelector: Schema.optional(Schema.String),
    arrowId: Schema.optional(Schema.String),
    arrowPadding: Schema.optional(Schema.Number),
  },
  messages: [Message.CompletedAnchorPopover],
  handler: function* () {
    return ({
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
      })
  },
})

/** The backdrop-portaling Mount this Popover renders. Exposed so Scene tests can
 *  call `Scene.Mount.resolve(PortalPopoverBackdrop, CompletedPortalPopoverBackdrop())` to
 *  acknowledge the mount produced by the rendered backdrop. */
export const PortalPopoverBackdrop = Popover.mount('PortalPopoverBackdrop', {
  messages: [Message.CompletedPortalPopoverBackdrop],
  handler: function* () {
    return ({ element }) =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => portalBackdrop(element)),
          cleanup => Effect.sync(cleanup),
        )
        return Message.CompletedPortalPopoverBackdrop()
      })
  },
})

/** Mount Definitions rendered by Popover views. */
export const mounts = [AnchorPopover, PortalPopoverBackdrop]

const detectPopoverMovementOrAnimationEnd = (generation: number) =>
  Popover.step(model => ({
    model,
    commands: [
      DetectPopoverMovementOrAnimationEnd({ id: model.id, generation }),
    ],
  }))

type AnimationOutMessageStep = ReturnType<
  typeof detectPopoverMovementOrAnimationEnd
>

const foldAnimationOutMessage =
  Animation.OutMessage.match<AnimationOutMessageStep>({
    StartedLeaveAnimating: ({ generation }) =>
      detectPopoverMovementOrAnimationEnd(generation),
    TransitionedOut: () => Popover.step(model => ({ model })),
  })

const AnimationBinding = Popover.bindChild(Animation.block, {
  field: 'animation',
  parentMessage: Message.GotAnimationMessage,
  init: false,
  outMessage: { fold: foldAnimationOutMessage },
})

const PopoverComposition = Popover.makeComposition({
  mounts,
  childBindings: [AnimationBinding],
})

type AuthoredMessage = Exclude<
  Message,
  ReturnType<typeof Message.GotAnimationMessage>
>

const internalUpdate = (model: Model, message: AuthoredMessage) => {
  const openCommands = Array.filter(
    [LockPopoverScroll(), InertPopoverOthers({ id: model.id })],
    () => model.isModal,
  )

  const closeWithoutFocusCommands = Array.filter(
    [UnlockPopoverScroll(), RestorePopoverInert({ id: model.id })],
    () => model.isModal,
  )

  const focusButton = FocusPopoverButton({ id: model.id })

  const closeWithFocusCommands = [focusButton, ...closeWithoutFocusCommands]

  const openPopover = (baseModel: Model) => {
    if (model.isAnimated) {
      return Popover.step(() =>
        Function.compose(
          Update.combine([
            () => ({ model: baseModel, commands: openCommands }),
            AnimationBinding.show(),
            stepModel => ({
              model: modifyFields(stepModel, { isOpen: () => true }),
            }),
          ]),
          Update.withOutMessage(OutMessage.Opened()),
        ),
      )
    }

    return {
      model: modifyFields(baseModel, { isOpen: () => true }),
      commands: openCommands,
      outMessage: OutMessage.Opened(),
    }
  }

  const closePopover = (
    baseModel: Model,
    commands: typeof closeWithFocusCommands,
  ) => {
    if (!baseModel.isOpen) {
      return { model: baseModel }
    }

    const closed = closedModel(baseModel)

    if (model.isAnimated) {
      return Popover.step(() =>
        Function.compose(
          Update.combine([
            () => ({ model: closed, commands }),
            AnimationBinding.hide(),
          ]),
          Update.withOutMessage(OutMessage.Closed()),
        ),
      )
    }

    return { model: closed, commands, outMessage: OutMessage.Closed() }
  }

  return Match.value(message).pipe(
    Match.tagsExhaustive({
      RequestedOpen: () => openPopover(model),

      RequestedClose: () => closePopover(model, closeWithFocusCommands),

      BlurredPanel: () => {
        if (
          Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
        ) {
          return { model }
        }

        return closePopover(model, closeWithoutFocusCommands)
      },

      PressedPointerOnButton: ({ pointerType, button }) => {
        const withPointerType = modifyFields(model, {
          maybeLastButtonPointerType: () => Option.some(pointerType),
        })

        if (pointerType !== 'mouse' || button !== LEFT_MOUSE_BUTTON) {
          return { model: withPointerType }
        }

        if (model.isOpen) {
          const closed = modifyFields(closedModel(withPointerType), {
            maybeLastButtonPointerType: () => Option.some(pointerType),
          })

          if (model.isAnimated) {
            return Popover.step(() =>
              Function.compose(
                Update.combine([
                  () => ({ model: closed, commands: closeWithFocusCommands }),
                  AnimationBinding.hide(),
                ]),
                Update.withOutMessage(OutMessage.Closed()),
              ),
            )
          }

          return {
            model: closed,
            commands: closeWithFocusCommands,
            outMessage: OutMessage.Closed(),
          }
        }

        return openPopover(withPointerType)
      },

      CompletedDetectPopoverMovementOrAnimationEnd: ({ generation }) =>
        AnimationBinding.finish(generation),

      CompletedFocusPopoverPanel: () => ({ model }),
      CompletedFocusPopoverButton: () => ({ model }),
      CompletedLockPopoverScroll: () => ({ model }),
      CompletedUnlockPopoverScroll: () => ({ model }),
      CompletedInertPopoverOthers: () => ({ model }),
      CompletedRestorePopoverInert: () => ({ model }),
      IgnoredMouseClick: () => ({
        model: modifyFields(model, {
          maybeLastButtonPointerType: () => Option.none(),
        }),
      }),
      SuppressedSpaceScroll: () => ({ model }),
      CompletedAnchorPopover: () => ({ model }),
      CompletedPortalPopoverBackdrop: () => ({ model }),
    }),
  )
}

const authoredUpdate = Popover.step(
  (model, message: Parameters<typeof internalUpdate>[1]) =>
    internalUpdate(model, message),
)

/** Processes a Popover Message and returns the next Model, optional Commands,
 *  and an optional OutMessage. */
export const update = PopoverComposition.makeUpdate((model, message) =>
  authoredUpdate(model, message),
)

/** Provides Popover's Command and Mount handlers. */
const EffectsLayer = Layer.mergeAll(
  LockPopoverScroll.layer,
  UnlockPopoverScroll.layer,
  InertPopoverOthers.layer,
  RestorePopoverInert.layer,
  FocusPopoverPanel.layer,
  FocusPopoverButton.layer,
  DetectPopoverMovementOrAnimationEnd.layer,
  AnchorPopover.layer,
  PortalPopoverBackdrop.layer,
)

/** Programmatically opens the Popover, updating the Model and returning
 *  focus and modal Commands plus an `Opened` OutMessage. */
const open = Popover.step(model => update(model, Message.RequestedOpen()))

/** Programmatically closes the Popover. When it was open, updates the Model
 *  and returns focus and modal Commands plus a `Closed` OutMessage. When it
 *  was already closed, it is a no-op: no Commands and no OutMessage. */
const close = Popover.step(model => update(model, Message.RequestedClose()))

// VIEW

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `button`: attribute bundle for the trigger button.
 *  - `panel`: attribute bundle for the floating panel. Includes the
 *    anchor Mount that positions the panel via Floating UI, ARIA
 *    linkage to the button, and panel keydown/blur handlers.
 *  - `backdrop`: attribute bundle for the modal backdrop. Includes the
 *    portal Mount that moves the backdrop to document.body. Inside a
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

/** Per-render view inputs passed to `view` via `h.block`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  anchor: AnchorConfig
  toView: (render: RenderInfo) => Html
  isDisabled?: boolean
  focusSelector?: string
  arrowPadding?: number
  ariaLabel?: string
  ariaLabelledBy?: string
}>

/** Renders a headless popover with a trigger button and a floating panel. */
export const view = PopoverComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
    const {
      id,
      isOpen,
      contentFocus,
      animation: { transitionState },
      maybeLastButtonPointerType,
    } = model
    const {
      anchor,
      toView,
      isDisabled,
      focusSelector,
      arrowPadding,
      ariaLabel,
      ariaLabelledBy,
    } = viewInputs

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isOpen || isLeaving

    const animationAttributes = Match.value(transitionState).pipe(
      Match.when('EnterStart', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('EnterAnimating', () => [
        h.DataAttribute('enter', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveStart', () => [
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.when('LeaveAnimating', () => [
        h.DataAttribute('closed', ''),
        h.DataAttribute('leave', ''),
        h.DataAttribute('transition', ''),
      ]),
      Match.orElse(() => []),
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

    const handleButtonClick = ():
      | RequestedOpen
      | RequestedClose
      | IgnoredMouseClick => {
      const isMouse = Option.exists(
        maybeLastButtonPointerType,
        type => type === 'mouse',
      )

      if (isMouse) {
        return Message.IgnoredMouseClick()
      } else if (isOpen) {
        return Message.RequestedClose()
      } else {
        return Message.RequestedOpen()
      }
    }

    const handleSpaceKeyUp = (
      key: string,
    ): Option.Option<SuppressedSpaceScroll> =>
      OptionExt.when(key === ' ', Message.SuppressedSpaceScroll())

    const handlePanelKeyDown = (key: string): Option.Option<RequestedClose> =>
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
      h.Id(`${id}-button`),
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
          arrowId: arrowId(id),
          ...(arrowPadding !== undefined && { arrowPadding }),
        }),
      ),
      ...animationAttributes,
      ...(isLeaving
        ? []
        : [
            h.OnKeyDownPreventDefault(handlePanelKeyDown),
            ...(contentFocus ? [] : [h.OnBlur(Message.BlurredPanel())]),
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
)

const implementation = {
  init: PopoverComposition.makeInit((config: InitConfig) => ({
    model: init(config),
  })),
  update,
  view,
  expose: { open, close },
  EffectsLayer,
}

/**
 * A completed Popover Block with its exact child, Mount, Layer, OutMessage,
 * operation, and default view contracts.
 */
export interface Completed extends Block.CompletedWithViewAndOutMessage<
  typeof PopoverComposition,
  typeof implementation
> {}

/** Complete Popover Block definition. */
export const block: Completed = PopoverComposition.makeBlock(implementation)

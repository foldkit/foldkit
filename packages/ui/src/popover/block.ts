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
  animation: Animation.AnimationBlock.Model,
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
 *  close transitions in the Popover connection's OutMessage fold. */
export const OutMessage = defineMessageUnion({
  Opened: {},
  Closed: {},
})
export type OutMessage = typeof OutMessage.Type

export type Opened = typeof OutMessage.Opened.Type
export type Closed = typeof OutMessage.Closed.Type

const PopoverDefinition = Block.makeDefinition('Popover', {
  Model,
  Message,
  OutMessage,
})

// INIT

const LEFT_MOUSE_BUTTON = 0

/** Configuration for creating a Popover Model with `init`.
 *
 *  `isAnimated` enables animation coordination. `isModal` locks page scroll
 *  and marks other elements inert while the Popover is open. Both default to
 *  `false`.
 *
 *  With `contentFocus: true`, the panel has no tab stop and focus leaving
 *  it does not close the Popover. Focus a descendant when opening and
 *  handle focus leaving the content in the application. Defaults to `false`. */
export type InitConfig = Readonly<{
  id: string
  isAnimated?: boolean
  isModal?: boolean
  contentFocus?: boolean
}>

const makeInitialModel = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  contentFocus: config.contentFocus ?? false,
  animation: Animation.AnimationBlock.init({ id: `${config.id}-panel` }).model,
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
export const LockPopoverScroll = PopoverDefinition.makeCommand(
  'LockPopoverScroll',
  {
    messages: [Message.CompletedLockPopoverScroll],
    handler: function* () {
      return () =>
        Dom.lockScroll.pipe(Effect.as(Message.CompletedLockPopoverScroll()))
    },
  },
)
/** Re-enables page scrolling after the popover closes. */
export const UnlockPopoverScroll = PopoverDefinition.makeCommand(
  'UnlockPopoverScroll',
  {
    messages: [Message.CompletedUnlockPopoverScroll],
    handler: function* () {
      return () =>
        Dom.unlockScroll.pipe(Effect.as(Message.CompletedUnlockPopoverScroll()))
    },
  },
)
/** Marks all elements outside the popover as inert for modal behavior. */
export const InertPopoverOthers = PopoverDefinition.makeCommand(
  'InertPopoverOthers',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedInertPopoverOthers],
    handler: function* () {
      return ({ id }) =>
        Dom.inertOthers(id, [buttonSelector(id), panelSelector(id)]).pipe(
          Effect.as(Message.CompletedInertPopoverOthers()),
        )
    },
  },
)
/** Removes the inert attribute from elements outside the Popover. */
export const RestorePopoverInert = PopoverDefinition.makeCommand(
  'RestorePopoverInert',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedRestorePopoverInert],
    handler: function* () {
      return ({ id }) =>
        Dom.restoreInert(id).pipe(
          Effect.as(Message.CompletedRestorePopoverInert()),
        )
    },
  },
)
/** Moves focus to the popover panel after opening. */
export const FocusPopoverPanel = PopoverDefinition.makeCommand(
  'FocusPopoverPanel',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedFocusPopoverPanel],
    handler: function* () {
      return ({ id }) =>
        Dom.focus(panelSelector(id)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusPopoverPanel()),
        )
    },
  },
)
/** Moves focus back to the popover button after closing. */
export const FocusPopoverButton = PopoverDefinition.makeCommand(
  'FocusPopoverButton',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedFocusPopoverButton],
    handler: function* () {
      return ({ id }) =>
        Dom.focus(buttonSelector(id)).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusPopoverButton()),
        )
    },
  },
)
/** Detects whether the popover button moved or the leave animation ended. Whichever comes first; both outcomes signal the Animation block that leave is complete. */
export const DetectPopoverMovementOrAnimationEnd =
  PopoverDefinition.makeCommand('DetectPopoverMovementOrAnimationEnd', {
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
  })

/** The anchor-positioning Mount this Popover renders on its panel. Exposed so
 *  Scene tests can call `Scene.Mount.resolve(AnchorPopover, CompletedAnchorPopover())`
 *  to acknowledge the mount produced by the rendered panel. */
export const AnchorPopover = PopoverDefinition.makeMount('AnchorPopover', {
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
export const PortalPopoverBackdrop = PopoverDefinition.makeMount(
  'PortalPopoverBackdrop',
  {
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
  },
)

/** Mount Definitions rendered by Popover views. */
export const mounts = [AnchorPopover, PortalPopoverBackdrop]

const detectPopoverMovementOrAnimationEndStep = (generation: number) =>
  PopoverDefinition.makeCommandsStep(model => [
    DetectPopoverMovementOrAnimationEnd({ id: model.id, generation }),
  ])

const foldAnimationOutMessage = PopoverDefinition.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: ({ generation }) =>
      detectPopoverMovementOrAnimationEndStep(generation),
    TransitionedOut: PopoverDefinition.makeNoopStep,
  },
)

const AnimationBinding = PopoverDefinition.makeBinding(
  Animation.AnimationBlock,
  {
    field: 'animation',
    init: false,
  },
).withOutMessagePolicy({ fold: foldAnimationOutMessage })

const PopoverComposition = PopoverDefinition.makeComposition({
  mounts,
  bindings: [AnimationBinding],
})

/** Creates an initial Popover Model and Commands from a config. Defaults to closed. */
export const init = PopoverComposition.makeInit((config: InitConfig) => ({
  model: makeInitialModel(config),
}))

type AuthoredMessage = Message

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
    if (baseModel.isOpen) {
      return { model: baseModel }
    }

    if (model.isAnimated) {
      return PopoverDefinition.makeStep(() =>
        Function.compose(
          Update.combineSteps([
            PopoverDefinition.makeStep(() => ({
              model: baseModel,
              commands: openCommands,
            })),
            AnimationBinding.requestShow(),
            PopoverDefinition.makeFieldsStep(() => ({ isOpen: () => true })),
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
      return PopoverDefinition.makeStep(() =>
        Function.compose(
          Update.combineSteps([
            PopoverDefinition.makeStep(() => ({ model: closed, commands })),
            AnimationBinding.requestHide(),
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
            return PopoverDefinition.makeStep(() =>
              Function.compose(
                Update.combineSteps([
                  PopoverDefinition.makeStep(() => ({
                    model: closed,
                    commands: closeWithFocusCommands,
                  })),
                  AnimationBinding.requestHide(),
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
        AnimationBinding.requestFinish(generation),

      CompletedFocusPopoverPanel: () => ({ model }),
      CompletedFocusPopoverButton: () => ({ model }),
      CompletedLockPopoverScroll: () => ({ model }),
      CompletedUnlockPopoverScroll: () => ({ model }),
      CompletedInertPopoverOthers: () => ({ model }),
      CompletedRestorePopoverInert: () => ({ model }),
      ClickedButton: () => {
        if (
          Option.exists(model.maybeLastButtonPointerType, Equal.equals('mouse'))
        ) {
          return {
            model: modifyFields(model, {
              maybeLastButtonPointerType: () => Option.none(),
            }),
          }
        }

        if (model.isOpen) {
          return closePopover(model, closeWithFocusCommands)
        }

        return openPopover(model)
      },
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

const authoredUpdateStep = PopoverDefinition.makeStep(
  (model, message: Parameters<typeof internalUpdate>[1]) =>
    internalUpdate(model, message),
)

/** Processes a Popover Message and returns the next Model, optional Commands,
 *  and an optional OutMessage. */
export const update = PopoverComposition.makeUpdate({
  RequestedOpen: authoredUpdateStep,
  RequestedClose: authoredUpdateStep,
  BlurredPanel: authoredUpdateStep,
  PressedPointerOnButton: authoredUpdateStep,
  CompletedFocusPopoverPanel: authoredUpdateStep,
  CompletedFocusPopoverButton: authoredUpdateStep,
  CompletedLockPopoverScroll: authoredUpdateStep,
  CompletedUnlockPopoverScroll: authoredUpdateStep,
  CompletedInertPopoverOthers: authoredUpdateStep,
  CompletedRestorePopoverInert: authoredUpdateStep,
  ClickedButton: authoredUpdateStep,
  IgnoredMouseClick: authoredUpdateStep,
  SuppressedSpaceScroll: authoredUpdateStep,
  CompletedAnchorPopover: authoredUpdateStep,
  CompletedPortalPopoverBackdrop: authoredUpdateStep,
  CompletedDetectPopoverMovementOrAnimationEnd: authoredUpdateStep,
})

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
            ...(contentFocus ? [] : [h.OnFocusLeave(Message.BlurredPanel())]),
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
  init,
  update,
  view,
  operations: {
    requestOpen: Message.RequestedOpen,
    requestClose: Message.RequestedClose,
  },
  EffectsLayer,
}

const prepare = () => PopoverComposition.prepareBlock(implementation)
/** Completed Popover Block contract. */
export interface PopoverBlock extends Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> {}
/** Complete Popover Block definition. */
export const PopoverBlock: PopoverBlock = Block.assemble(prepare)

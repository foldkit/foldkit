import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  defineView,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
// NOTE: Animation imports are split across schema + update to avoid a circular
// dependency: animation → html → runtime → devtools → dialog → animation.
// The barrel (../animation) imports from html, which starts the cycle.
import {
  Hid as AnimationHid,
  Message as AnimationMessage,
  Model as AnimationModel,
  type OutMessage as AnimationOutMessage,
  Showed as AnimationShowed,
  init as animationInit,
} from '../animation/schema.js'
import {
  defaultLeaveCommand as animationDefaultLeaveCommand,
  update as animationUpdate,
} from '../animation/update.js'

// MODEL

/** Schema for the dialog component's state, tracking its unique ID, open/closed status, animation support, and animation lifecycle phase. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  animation: AnimationModel,
  maybeFocusSelector: S.Option(S.String),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the dialog should open. Triggers the showModal command. */
export const RequestedOpen = m('RequestedOpen')
/** Sent when the dialog should close (Escape key, backdrop click, or programmatic). */
export const RequestedClose = m('RequestedClose')
/** Sent when the show-dialog command completes. */
export const CompletedShowDialog = m('CompletedShowDialog')
/** Sent when the close-dialog command completes. */
export const CompletedCloseDialog = m('CompletedCloseDialog')
/** Wraps an Animation submodel message for delegation. */
export const GotAnimationMessage = m('GotAnimationMessage', {
  message: AnimationMessage,
})

/** Union of all messages the dialog component can produce. */
export const Message: S.Union<
  [
    typeof RequestedOpen,
    typeof RequestedClose,
    typeof CompletedShowDialog,
    typeof CompletedCloseDialog,
    typeof GotAnimationMessage,
  ]
> = S.Union([
  RequestedOpen,
  RequestedClose,
  CompletedShowDialog,
  CompletedCloseDialog,
  GotAnimationMessage,
])

export type RequestedOpen = typeof RequestedOpen.Type
export type RequestedClose = typeof RequestedClose.Type
export type CompletedShowDialog = typeof CompletedShowDialog.Type
export type CompletedCloseDialog = typeof CompletedCloseDialog.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent once the dialog has transitioned to open. Fires after `update`
 *  has processed `RequestedOpen` and `isOpen` reflects the new state.
 *  Programmatic `Dialog.open` on an already-open model is a no-op that
 *  does not re-emit. */
export const Opened = m('Opened')

/** Sent once the dialog has transitioned to closed. Programmatic
 *  `Dialog.close` on an already-closed model is a no-op that does not
 *  re-emit; calling close while a leave animation is in progress is
 *  also a no-op. */
export const Closed = m('Closed')

/** Union of out-messages the dialog component can produce. */
export const OutMessage = S.Union([Opened, Closed])

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a dialog model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isOpen?: boolean
  isAnimated?: boolean
  focusSelector?: string
}>

/** Creates an initial dialog model from a config. Defaults to closed and non-animated. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: config.isOpen ?? false,
  isAnimated: config.isAnimated ?? false,
  animation: animationInit({
    id: `${config.id}-panel`,
    ...(config.isOpen !== undefined ? { isShowing: config.isOpen } : {}),
  }),
  maybeFocusSelector: Option.fromNullishOr(config.focusSelector),
})

// UPDATE

const dialogSelector = (id: string): string => `#${id}`

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Locks page scroll and calls `showModal()` on the native dialog element. */
export const ShowDialog = Command.define(
  'ShowDialog',
  { id: S.String, maybeFocusSelector: S.Option(S.String) },
  CompletedShowDialog,
)(({ id, maybeFocusSelector }) =>
  Dom.lockScroll.pipe(
    Effect.andThen(() =>
      Dom.showModal(
        dialogSelector(id),
        Option.match(maybeFocusSelector, {
          onNone: () => undefined,
          onSome: focusSelector => ({ focusSelector }),
        }),
      ),
    ),
    Effect.ignore,
    Effect.as(CompletedShowDialog()),
  ),
)

/** Calls `close()` on the native dialog element and unlocks page scroll. */
export const CloseDialog = Command.define(
  'CloseDialog',
  { id: S.String },
  CompletedCloseDialog,
)(({ id }) =>
  Dom.closeModal(dialogSelector(id)).pipe(
    Effect.andThen(() => Dom.unlockScroll),
    Effect.ignore,
    Effect.as(CompletedCloseDialog()),
  ),
)

const wrapAnimationMessage = (message: AnimationMessage): Message =>
  GotAnimationMessage({ message })

const delegateToAnimation = (
  model: Model,
  animationMessage: AnimationMessage,
): UpdateReturn => {
  const [nextAnimation, animationCommands, maybeOutMessage] = animationUpdate(
    model.animation,
    animationMessage,
  )

  const mappedCommands = Command.mapMessages(
    animationCommands,
    wrapAnimationMessage,
  )

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<AnimationOutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          Command.mapMessage(
            animationDefaultLeaveCommand(nextAnimation),
            wrapAnimationMessage,
          ),
        ],
        TransitionedOut: () => [CloseDialog({ id: model.id })],
      }),
    ),
  })

  return [
    evo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...additionalCommands],
    Option.none(),
  ]
}

/** Processes a dialog message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      RequestedOpen: () => {
        const wasClosed = !model.isOpen
        const maybeShow = Option.liftPredicate(
          ShowDialog({
            id: model.id,
            maybeFocusSelector: model.maybeFocusSelector,
          }),
          () => wasClosed,
        )
        const maybeOutMessage = wasClosed
          ? Option.some(Opened())
          : Option.none()

        if (model.isAnimated) {
          const [nextModel, animationCommands] = delegateToAnimation(
            model,
            AnimationShowed(),
          )

          return [
            evo(nextModel, { isOpen: () => true }),
            [...Option.toArray(maybeShow), ...animationCommands],
            maybeOutMessage,
          ]
        }

        return [
          evo(model, { isOpen: () => true }),
          Option.toArray(maybeShow),
          maybeOutMessage,
        ]
      },

      RequestedClose: () => {
        const { transitionState } = model.animation
        const isLeaving =
          transitionState === 'LeaveStart' ||
          transitionState === 'LeaveAnimating'

        if (isLeaving) {
          return [model, [], Option.none()]
        }

        const wasOpen = model.isOpen
        const maybeOutMessage = wasOpen ? Option.some(Closed()) : Option.none()

        if (model.isAnimated) {
          const [nextModel, animationCommands] = delegateToAnimation(
            evo(model, { isOpen: () => false }),
            AnimationHid(),
          )

          return [nextModel, animationCommands, maybeOutMessage]
        }

        const maybeClose = Option.liftPredicate(
          CloseDialog({ id: model.id }),
          () => wasOpen,
        )

        return [
          evo(model, { isOpen: () => false }),
          Option.toArray(maybeClose),
          maybeOutMessage,
        ]
      },

      GotAnimationMessage: ({ message: animationMessage }) =>
        delegateToAnimation(model, animationMessage),

      CompletedShowDialog: () => [model, [], Option.none()],
      CompletedCloseDialog: () => [model, [], Option.none()],
    }),
  )

/** Programmatically opens the dialog. */
export const open = (model: Model): UpdateReturn =>
  update(model, RequestedOpen())

/** Programmatically closes the dialog. */
export const close = (model: Model): UpdateReturn =>
  update(model, RequestedClose())

// VIEW

/** Returns the ID used for `aria-labelledby` on the dialog. Apply this to your title element. */
export const titleId = (model: Model): string => `${model.id}-title`

/** Returns the ID used for `aria-describedby` on the dialog. Apply this to your description element. */
export const descriptionId = (model: Model): string => `${model.id}-description`

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `dialog`: attributes for the native `<dialog>` element. Carries
 *    the id, ARIA labelling, `open` prop, positioning style, and the
 *    `OnCancel` handler that wires Escape to `RequestedClose`. The
 *    consumer MUST render an `h.dialog(...)` element so the framework's
 *    `showModal`/`close()` commands can target it.
 *  - `backdrop`: attributes for the backdrop element. Includes the
 *    Animation data attributes and the `OnClick` handler that closes
 *    the dialog on outside-click (suppressed while a leave animation
 *    is in progress).
 *  - `panel`: attributes for the panel element. Includes the panel id
 *    (`${model.id}-panel`) and the Animation data attributes.
 *  - `isVisible`: derived from `isOpen` and the Animation
 *    `transitionState`. The consumer renders backdrop + panel only
 *    while this is true. */
export type RenderInfo = Readonly<{
  dialog: ReadonlyArray<ChildAttribute>
  backdrop: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  toView: (render: RenderInfo) => Html
}>

/** Renders a headless dialog component backed by the native `<dialog>`
 *  element with `showModal()`. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const {
      id,
      isOpen,
      animation: { transitionState },
    } = model
    const { toView } = viewInputs

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

    const dialogAttributes = [
      h.Id(id),
      h.AriaLabelledBy(`${id}-title`),
      h.AriaDescribedBy(`${id}-description`),
      h.OnCancel(RequestedClose()),
      h.Open(isVisible),
      h.Style({
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        padding: '0',
        border: 'none',
        background: 'transparent',
        ...(isVisible
          ? { position: 'fixed', inset: '0', zIndex: '2147483600' }
          : {}),
      }),
      ...(isVisible ? [h.DataAttribute('open', '')] : []),
    ]

    const backdropAttributes = [
      h.Style({ minHeight: '100vh' }),
      ...animationAttributes,
      ...(isLeaving ? [] : [h.OnClick(RequestedClose())]),
    ]

    const panelAttributes = [h.Id(`${id}-panel`), ...animationAttributes]

    return toView({
      dialog: childAttributes(dialogAttributes),
      backdrop: childAttributes(backdropAttributes),
      panel: childAttributes(panelAttributes),
      isVisible,
    })
  },
)

import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import { defineView } from 'foldkit/submodel'
import * as Update from 'foldkit/update'

// NOTE: Animation imports are split across schema + update to avoid a circular
// dependency: animation → html → runtime → devtools → dialog → animation.
// The barrel (../animation) imports from html, which starts the cycle.
import {
  Message as AnimationMessage,
  Model as AnimationModel,
  OutMessage as AnimationOutMessage,
  init as animationInit,
} from '../animation/schema.js'
import {
  defaultLeaveCommand as animationDefaultLeaveCommand,
  update as animationUpdate,
} from '../animation/update.js'
import { idSelector } from '../internal/selectors.js'

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

/** Union of all messages the dialog component can produce. */
export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  CompletedShowDialog: {},
  CompletedCloseDialog: {},
  Unmounted: {},
  CompletedReleaseDialogResources: {},
  GotAnimationMessage: { message: AnimationMessage },
})

export type RequestedOpen = typeof Message.RequestedOpen.Type
export type RequestedClose = typeof Message.RequestedClose.Type
export type CompletedShowDialog = typeof Message.CompletedShowDialog.Type
export type CompletedCloseDialog = typeof Message.CompletedCloseDialog.Type
export type Unmounted = typeof Message.Unmounted.Type
export type CompletedReleaseDialogResources =
  typeof Message.CompletedReleaseDialogResources.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Union of out-messages the dialog component can produce. */
export const OutMessage = defineMessageUnion({
  Opened: {},
  Closed: {},
})

export type Opened = typeof OutMessage.Opened.Type
export type Closed = typeof OutMessage.Closed.Type
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a dialog model with `init`. The `id` must be
 *  non-empty and unique within the document: it keys the dialog element, its
 *  ARIA references, and the framework's per-dialog resource cleanup, so a
 *  duplicate or empty id breaks cleanup accounting.
 *
 *  The dialog derives framework-managed ids from this `id`: `-dialog-title`,
 *  `-dialog-description`, and `-panel` (the animation panel). Spread
 *  `RenderInfo`'s `title` / `description` onto your heading and description
 *  elements rather than constructing those ids yourself. */
export type InitConfig = Readonly<{
  id: string
  isOpen?: boolean
  isAnimated?: boolean
  /** CSS selector for the element that receives focus when the dialog opens.
   *  A selector-based override of the `initialFocus` RenderInfo marker, for the
   *  cases a spread-on marker cannot express: an element whose id you do not
   *  own, or a descendant selector. Takes precedence over `initialFocus`. With
   *  neither set, focus falls to the first focusable element. */
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

const dialogSelector = (id: string): string => idSelector(id)

/** Data attribute the dialog places on the `initialFocus` RenderInfo group and
 *  focuses on open. */
export const initialFocusMarkerAttribute = 'foldkit-dialog-initial-focus'

/** Selector for {@link initialFocusMarkerAttribute}, focused against the open
 *  dialog when no `focusSelector` is configured. */
export const initialFocusMarkerSelector = `[data-${initialFocusMarkerAttribute}]`

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

/** Locks page scroll and opens the native dialog element through
 *  `Dom.showDialog`, which calls `show()` (not native `showModal()`) so other
 *  high-z-index overlays stay interactive. It layers the dialog with a high
 *  z-index, traps focus, and dispatches a `cancel` event on Esc. The Dialog
 *  component supplies its own backdrop. */
export const ShowDialog = Command.define('ShowDialog', {
  args: { id: S.String, focusSelector: S.String },
  messages: [Message.CompletedShowDialog],
  execute: ({ id, focusSelector }) =>
    Dom.lockScroll.pipe(
      Effect.andThen(() =>
        Dom.showDialog(dialogSelector(id), { focusSelector }),
      ),
      Effect.ignore,
      Effect.as(Message.CompletedShowDialog()),
    ),
})

/** Calls `close()` on the native dialog element and unlocks page scroll. */
export const CloseDialog = Command.define('CloseDialog', {
  args: { id: S.String },
  messages: [Message.CompletedCloseDialog],
  execute: ({ id }) =>
    Dom.closeDialog(dialogSelector(id)).pipe(
      Effect.andThen(() => Dom.unlockScroll),
      Effect.ignore,
      Effect.as(Message.CompletedCloseDialog()),
    ),
})

/** Releases the framework hygiene the dialog holds while open (scroll lock,
 *  focus trap, return focus, stack entry) when the element unmounts without a
 *  purposeful close. Idempotent: a no-op if the dialog already released its
 *  resources through `CloseDialog`. */
export const ReleaseDialogResources = Command.define('ReleaseDialogResources', {
  args: { id: S.String },
  messages: [Message.CompletedReleaseDialogResources],
  execute: ({ id }) =>
    Dom.releaseDialogResources(id).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedReleaseDialogResources()),
    ),
})

const wrapAnimationMessage = (message: AnimationMessage): Message =>
  Message.GotAnimationMessage({ message })

const foldAnimationOutMessage: (
  outMessage: AnimationOutMessage,
  context: Update.FoldContext<AnimationMessage, Message>,
) => Update.Step<Model, Message> = (outMessage, { liftCommand }) =>
  AnimationOutMessage.match<Update.Step<Model, Message>>(outMessage, {
    StartedLeaveAnimating: () => model => ({
      model,
      commands: [liftCommand(animationDefaultLeaveCommand(model.animation))],
    }),
    TransitionedOut: () => model => ({
      model,
      commands: [CloseDialog({ id: model.id })],
    }),
  })

const foldAnimation = Update.foldChild({
  update: animationUpdate,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    evo(model, { animation: () => nextAnimation }),
  toParentMessage: wrapAnimationMessage,
  toParentOutMessage: () => undefined,
  foldOutMessage: foldAnimationOutMessage,
})

/** Processes a dialog message and returns the next model and commands. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    RequestedOpen: () => {
      const wasClosed = !model.isOpen
      const maybeShow = Option.liftPredicate(
        ShowDialog({
          id: model.id,
          focusSelector: Option.getOrElse(
            model.maybeFocusSelector,
            () => initialFocusMarkerSelector,
          ),
        }),
        () => wasClosed,
      )
      if (model.isAnimated) {
        const foldAnimationResult = foldAnimation(
          model,
          AnimationMessage.Showed(),
        )
        const commands = [
          ...Option.toArray(maybeShow),
          ...(foldAnimationResult.commands ?? []),
        ]
        const updateResult: UpdateReturn = Array.isArrayNonEmpty(commands)
          ? {
              model: evo(foldAnimationResult.model, { isOpen: () => true }),
              commands,
            }
          : {
              model: evo(foldAnimationResult.model, { isOpen: () => true }),
            }
        return wasClosed
          ? { ...updateResult, outMessage: OutMessage.Opened() }
          : updateResult
      }

      const commands = Option.toArray(maybeShow)
      const updateResult: UpdateReturn = Array.isArrayNonEmpty(commands)
        ? { model: evo(model, { isOpen: () => true }), commands }
        : { model: evo(model, { isOpen: () => true }) }
      return wasClosed
        ? { ...updateResult, outMessage: OutMessage.Opened() }
        : updateResult
    },

    RequestedClose: () => {
      const { transitionState } = model.animation
      const isLeaving =
        transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'

      if (isLeaving) {
        return { model }
      }

      const wasOpen = model.isOpen
      if (model.isAnimated) {
        const closeAnimation = foldAnimation(
          evo(model, { isOpen: () => false }),
          AnimationMessage.Hid(),
        )
        return wasOpen
          ? { ...closeAnimation, outMessage: OutMessage.Closed() }
          : closeAnimation
      }

      const maybeClose = Option.liftPredicate(
        CloseDialog({ id: model.id }),
        () => wasOpen,
      )

      const commands = Option.toArray(maybeClose)
      const updateResult: UpdateReturn = Array.isArrayNonEmpty(commands)
        ? { model: evo(model, { isOpen: () => false }), commands }
        : { model: evo(model, { isOpen: () => false }) }
      return wasOpen
        ? { ...updateResult, outMessage: OutMessage.Closed() }
        : updateResult
    },

    GotAnimationMessage: ({ message: animationMessage }) =>
      foldAnimation(model, animationMessage),

    Unmounted: () => {
      const isHoldingResources =
        model.isOpen || model.animation.transitionState !== 'Idle'

      if (isHoldingResources) {
        const nextModel = evo(model, {
          isOpen: () => false,
          animation: () => animationInit({ id: `${model.id}-panel` }),
        })

        return {
          model: nextModel,
          commands: [ReleaseDialogResources({ id: model.id })],
        }
      } else {
        return { model }
      }
    },

    CompletedShowDialog: () => ({ model }),
    CompletedCloseDialog: () => ({ model }),
    CompletedReleaseDialogResources: () => ({ model }),
  })

/** Programmatically opens the dialog. */
export const open = (model: Model): UpdateReturn =>
  update(model, Message.RequestedOpen())

/** Programmatically closes the dialog. */
export const close = (model: Model): UpdateReturn =>
  update(model, Message.RequestedClose())

// VIEW

/** Returns the framework-managed id the dialog's `aria-labelledby` points at,
 *  the `-dialog-title` suffix on `model.id`.
 *
 *  The primary path is spreading `RenderInfo`'s `title` onto your heading
 *  (`h.h2([...title], [...])`), which carries this id for you. Reach for this
 *  helper only when you need the id as a value outside `toView`: a Command that
 *  calls `getElementById`, a cross-element `aria-describedby`, or a test. Do not
 *  hand-roll the id string. */
export const titleId = (model: Model): string => `${model.id}-dialog-title`

/** Returns the framework-managed id the dialog's `aria-describedby` points at,
 *  the `-dialog-description` suffix on `model.id`.
 *
 *  The primary path is spreading `RenderInfo`'s `description` onto your
 *  description element (`h.p([...description], [...])`), which carries this id
 *  for you. Reach for this helper only when you need the id as a value outside
 *  `toView`: a Command that calls `getElementById`, a cross-element
 *  `aria-describedby`, or a test. Do not hand-roll the id string. */
export const descriptionId = (model: Model): string =>
  `${model.id}-dialog-description`

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `dialog`: attributes for the native `<dialog>` element. Carries
 *    the id, ARIA labelling, `open` prop, positioning style, the
 *    `OnCancel` handler that wires Escape to `RequestedClose`, and an
 *    `OnUnmount` backstop that releases framework hygiene (scroll lock,
 *    focus trap, return focus) if the element is removed from the DOM
 *    while still open, such as navigating away from a route-keyed subtree.
 *    The consumer MUST render an `h.dialog(...)` element so the framework
 *    can open and close it, and so the unmount backstop can fire.
 *  - `backdrop`: attributes for the backdrop element. Includes the
 *    Animation data attributes and the `OnClick` handler that closes
 *    the dialog on outside-click (suppressed while a leave animation
 *    is in progress).
 *  - `panel`: attributes for the panel element. Includes the panel id
 *    (`${model.id}-panel`) and the Animation data attributes.
 *  - `title`: attributes for the accessible-name heading. Carries the
 *    framework-managed id the dialog's `aria-labelledby` points at. Spread
 *    onto your heading element (`h.h2([...title], [...])`) so labelling
 *    wires up without hand-rolling the id.
 *  - `description`: attributes for the description element. Carries the
 *    framework-managed id the dialog's `aria-describedby` points at. Spread
 *    onto your description element (`h.p([...description], [...])`).
 *  - `initialFocus`: attributes for the element that should receive focus when
 *    the dialog opens. Spread onto that element (`h.input([...initialFocus])`).
 *    A configured `focusSelector` (see `init`) takes precedence, and focus
 *    falls back to the default when no element carries the group.
 *  - `closeButton`: attributes for an in-panel close control such as a Cancel
 *    or dismiss button. Carries the `OnClick` handler that closes the
 *    dialog (suppressed while a leave animation is in progress). Spread
 *    onto your own button so a plain close needs no parent message. Sets
 *    `type="button"` so that a close control inside a `form` element in the
 *    panel closes without also submitting the form. Spread a later `h.Type`
 *    to override it.
 *  - `isVisible`: derived from `isOpen` and the Animation
 *    `transitionState`. The consumer renders backdrop + panel only
 *    while this is true. */
export type RenderInfo = Readonly<{
  dialog: ReadonlyArray<ChildAttribute>
  backdrop: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
  title: ReadonlyArray<ChildAttribute>
  description: ReadonlyArray<ChildAttribute>
  initialFocus: ReadonlyArray<ChildAttribute>
  closeButton: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  toView: (render: RenderInfo) => Html
}>

/** Renders a headless dialog component backed by the native `<dialog>`
 *  element. `ShowDialog` opens it through `Dom.showDialog`, which uses `show()`
 *  (not native `showModal()`) with a high z-index, a focus trap, a
 *  component-supplied backdrop, and a `cancel` event dispatched on Esc. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
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
      h.AriaLabelledBy(titleId(model)),
      h.AriaDescribedBy(descriptionId(model)),
      h.OnCancel(Message.RequestedClose()),
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
      ...(isVisible
        ? [h.DataAttribute('open', ''), h.OnUnmount(Message.Unmounted())]
        : []),
    ]

    const backdropAttributes = [
      h.Style({ minHeight: '100vh' }),
      ...animationAttributes,
      ...(isLeaving ? [] : [h.OnClick(Message.RequestedClose())]),
    ]

    const panelAttributes = [h.Id(`${id}-panel`), ...animationAttributes]

    const titleAttributes = [h.Id(titleId(model))]
    const descriptionAttributes = [h.Id(descriptionId(model))]
    const initialFocusAttributes = [
      h.DataAttribute(initialFocusMarkerAttribute, ''),
    ]

    const closeButtonAttributes = [
      h.Type('button'),
      ...(isLeaving ? [] : [h.OnClick(Message.RequestedClose())]),
    ]

    return toView({
      dialog: childAttributes(dialogAttributes),
      backdrop: childAttributes(backdropAttributes),
      panel: childAttributes(panelAttributes),
      title: childAttributes(titleAttributes),
      description: childAttributes(descriptionAttributes),
      initialFocus: childAttributes(initialFocusAttributes),
      closeButton: childAttributes(closeButtonAttributes),
      isVisible,
    })
  },
)

import { Effect, Match, Option, Schema, pipe } from 'effect'
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
import * as Animation from '../animation/schema.js'
import {
  defaultLeaveCommand as animationDefaultLeaveCommand,
  hide as animationHide,
  show as animationShow,
  update as animationUpdate,
} from '../animation/update.js'
import { idSelector } from '../internal/selectors.js'

// MODEL

/** Schema for the dialog component's state, tracking its unique ID, open/closed status, animation support, and animation lifecycle phase. */
export const Model = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  isAnimated: Schema.Boolean,
  animation: Animation.Model,
  maybeFocusSelector: Schema.Option(Schema.String),
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the dialog component can produce. */
export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  SucceededShowDialog: {},
  FailedShowDialog: {},
  CompletedCloseDialog: {},
  Unmounted: {},
  CompletedReleaseDialogResources: {},
  GotAnimationMessage: { message: Animation.Message },
})

export type RequestedOpen = typeof Message.RequestedOpen.Type
export type RequestedClose = typeof Message.RequestedClose.Type
export type SucceededShowDialog = typeof Message.SucceededShowDialog.Type
export type FailedShowDialog = typeof Message.FailedShowDialog.Type
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
  animation: Animation.init({
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
 *  component supplies its own backdrop. If the dialog element is gone by the
 *  time the show runs, the lock is released and the Command reports
 *  `FailedShowDialog`. A closed dialog has no `OnUnmount`, so nothing else
 *  would release the lock. The update function then closes the Model. Without
 *  this close, the dialog would render open with no lock and no focus trap.
 *  The lock is also released if the Command is interrupted while it waits. */
export const ShowDialog = Command.define('ShowDialog', {
  args: { id: Schema.String, focusSelector: Schema.String },
  messages: [Message.SucceededShowDialog, Message.FailedShowDialog],
  execute: ({ id, focusSelector }) =>
    Dom.lockScroll.pipe(
      Effect.andThen(() =>
        Dom.showDialog(dialogSelector(id), { focusSelector }).pipe(
          Effect.onError(() => Dom.unlockScroll),
          Effect.as(Message.SucceededShowDialog()),
          Effect.catch(() => Effect.succeed(Message.FailedShowDialog())),
        ),
      ),
    ),
})

/** Calls `close()` on the native dialog element and unlocks page scroll when
 *  the close released the resources `ShowDialog` installed. A close that runs
 *  before the show has installed them leaves the lock alone. When the show
 *  then fails, it releases the lock itself. When the show succeeds, update
 *  closes the dialog again. If the dialog element is gone by the time the
 *  close runs, the Command calls `Dom.releaseDialogResources` instead. That
 *  releases the scroll lock, focus trap, return focus, and stack entry if the
 *  dialog still holds them. */
export const CloseDialog = Command.define('CloseDialog', {
  args: { id: Schema.String },
  messages: [Message.CompletedCloseDialog],
  execute: ({ id }) =>
    Dom.closeDialog(dialogSelector(id)).pipe(
      Effect.andThen(isReleased =>
        isReleased ? Dom.unlockScroll : Effect.void,
      ),
      Effect.catch(() => Dom.releaseDialogResources(id)),
      Effect.as(Message.CompletedCloseDialog()),
    ),
})

/** Releases the framework hygiene the dialog holds while open (scroll lock,
 *  focus trap, return focus, stack entry) when the element unmounts without a
 *  purposeful close. Idempotent: a no-op if the dialog already released its
 *  resources through `CloseDialog`. */
export const ReleaseDialogResources = Command.define('ReleaseDialogResources', {
  args: { id: Schema.String },
  messages: [Message.CompletedReleaseDialogResources],
  execute: ({ id }) =>
    Dom.releaseDialogResources(id).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedReleaseDialogResources()),
    ),
})

const isLeaving = (model: Model): boolean =>
  model.animation.transitionState === 'LeaveStart' ||
  model.animation.transitionState === 'LeaveAnimating'

const isOpenOrAnimating = (model: Model): boolean =>
  model.isOpen || model.animation.transitionState !== 'Idle'

const resetToClosed = (model: Model): Model =>
  evo(model, {
    isOpen: () => false,
    animation: () => Animation.init({ id: `${model.id}-panel` }),
  })

const wrapAnimationMessage = (message: Animation.Message): Message =>
  Message.GotAnimationMessage({ message })

const foldAnimationOutMessage: (
  outMessage: Animation.OutMessage,
  context: Update.FoldContext<Animation.Message, Message>,
) => Update.Step<Model, Message> = (outMessage, { liftCommand }) =>
  Animation.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
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
  foldOutMessage: foldAnimationOutMessage,
})

const foldAnimationShow = Update.foldChildStep({
  update: animationShow,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    evo(model, { animation: () => nextAnimation }),
  toParentMessage: wrapAnimationMessage,
})

const foldAnimationHide = Update.foldChildStep({
  update: animationHide,
  read: (model: Model) => Option.some(model.animation),
  write: (model, nextAnimation) =>
    evo(model, { animation: () => nextAnimation }),
  toParentMessage: wrapAnimationMessage,
})

/** Processes a Dialog Message and returns the next Model and optional Commands. */
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
      const commands = Option.toArray(maybeShow)
      const dialogOpen: Update.Return<Model, Message> = model.isAnimated
        ? Update.combine(model, [
            stepModel => ({ model: stepModel, commands }),
            foldAnimationShow,
            stepModel => ({
              model: evo(stepModel, { isOpen: () => true }),
            }),
          ])
        : { model: evo(model, { isOpen: () => true }), commands }

      return wasClosed
        ? pipe(dialogOpen, Update.withOutMessage(OutMessage.Opened()))
        : dialogOpen
    },

    RequestedClose: () => {
      if (isLeaving(model)) {
        return { model }
      }

      const wasOpen = model.isOpen
      if (model.isAnimated) {
        const dialogClose = Update.combine(model, [
          stepModel => ({
            model: evo(stepModel, { isOpen: () => false }),
          }),
          foldAnimationHide,
        ])

        return wasOpen
          ? pipe(dialogClose, Update.withOutMessage(OutMessage.Closed()))
          : dialogClose
      }

      const maybeClose = Option.liftPredicate(
        CloseDialog({ id: model.id }),
        () => wasOpen,
      )

      const commands = Option.toArray(maybeClose)
      const dialogClose: Update.Return<Model, Message> = {
        model: evo(model, { isOpen: () => false }),
        commands,
      }
      return wasOpen
        ? pipe(dialogClose, Update.withOutMessage(OutMessage.Closed()))
        : dialogClose
    },

    GotAnimationMessage: ({ message: animationMessage }) =>
      foldAnimation(model, animationMessage),

    Unmounted: () => {
      if (isOpenOrAnimating(model)) {
        return {
          model: resetToClosed(model),
          commands: [ReleaseDialogResources({ id: model.id })],
        }
      } else {
        return { model }
      }
    },

    SucceededShowDialog: () => {
      if (model.isOpen || isLeaving(model)) {
        return { model }
      } else {
        return { model, commands: [CloseDialog({ id: model.id })] }
      }
    },

    FailedShowDialog: () => {
      if (isOpenOrAnimating(model)) {
        return { model: resetToClosed(model) }
      } else {
        return { model }
      }
    },

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

    const isVisible = isOpen || isLeaving(model)

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
      ...(isLeaving(model) ? [] : [h.OnClick(Message.RequestedClose())]),
    ]

    const panelAttributes = [h.Id(`${id}-panel`), ...animationAttributes]

    const titleAttributes = [h.Id(titleId(model))]
    const descriptionAttributes = [h.Id(descriptionId(model))]
    const initialFocusAttributes = [
      h.DataAttribute(initialFocusMarkerAttribute, ''),
    ]

    const closeButtonAttributes = [
      h.Type('button'),
      ...(isLeaving(model) ? [] : [h.OnClick(Message.RequestedClose())]),
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

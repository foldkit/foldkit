import { Array, Effect, Layer, Match, Option, Schema, pipe } from 'effect'
import * as Block from 'foldkit/block'
import { DEVTOOLS_HOST_ID } from 'foldkit/devtools-host'
import * as Dom from 'foldkit/dom'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import type * as Mount from 'foldkit/mount'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import * as Animation from '../animation/index.js'
import { idSelector } from '../internal/selectors.js'

// MODEL

/** Schema for the dialog component's state, tracking its unique ID, open/closed status, animation support, and animation lifecycle phase. */
export const Model = Schema.Struct({
  id: Schema.String,
  isOpen: Schema.Boolean,
  isAnimated: Schema.Boolean,
  animation: Animation.AnimationBlock.Model,
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
  SucceededAcquireResources: {},
  FailedAcquireResources: {},
  CompletedCloseDialog: {},
  Unmounted: {},
  CompletedReleaseDialogResources: {},
})

export type RequestedOpen = typeof Message.RequestedOpen.Type
export type RequestedClose = typeof Message.RequestedClose.Type
export type SucceededShowDialog = typeof Message.SucceededShowDialog.Type
export type FailedShowDialog = typeof Message.FailedShowDialog.Type
export type SucceededAcquireResources =
  typeof Message.SucceededAcquireResources.Type
export type FailedAcquireResources = typeof Message.FailedAcquireResources.Type
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
  CompletedClose: {},
})

export type Opened = typeof OutMessage.Opened.Type
export type Closed = typeof OutMessage.Closed.Type
export type CompletedClose = typeof OutMessage.CompletedClose.Type

const DialogDefinition = Block.makeDefinition('Dialog', {
  Model,
  Message,
  OutMessage,
})

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
  isAnimated?: boolean
  /** CSS selector for the element that receives focus when the dialog opens.
   *  A selector-based override of the `initialFocus` RenderInfo marker, for the
   *  cases a spread-on marker cannot express: an element whose id you do not
   *  own, or a descendant selector. Takes precedence over `initialFocus`. With
   *  neither set, focus falls to the first focusable element. */
  focusSelector?: string
}>

const makeInitialModel = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  animation: Animation.AnimationBlock.init({
    id: `${config.id}-panel`,
  }).model,
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

const acquireDialogResources = (
  id: string,
  focusSelector: string,
): Effect.Effect<boolean, Dom.ElementNotFound> =>
  Effect.uninterruptibleMask(restore =>
    restore(
      Dom.showDialog(dialogSelector(id), {
        focusSelector,
        isModal: true,
        allowedOutsideSelectors: [`#${DEVTOOLS_HOST_ID}`],
      }),
    ).pipe(
      Effect.tap(isAcquired => (isAcquired ? Dom.lockScroll : Effect.void)),
    ),
  )

const acquireDialogResourcesResult = (
  id: string,
  focusSelector: string,
): Effect.Effect<SucceededShowDialog | FailedShowDialog> =>
  acquireDialogResources(id, focusSelector).pipe(
    Effect.as(Message.SucceededShowDialog()),
    Effect.catch(() => Effect.succeed(Message.FailedShowDialog())),
  )

/** Opens the native dialog element through `Dom.showDialog`, then locks page
 *  scroll when that call acquired the dialog resources. `Dom.showDialog`
 *  makes the background inert while leaving DevTools available as a separate
 *  developer overlay. It calls `show()` rather than `showModal()` so DevTools
 *  can stay interactive, layers the dialog with a high z-index, and traps
 *  focus. For an unhandled Escape on the topmost Dialog, the
 *  helper dispatches a `CustomEvent` named `cancel`; the Dialog view maps that
 *  signal to `RequestedClose` while suppressing native `cancel` events. The
 *  Dialog component supplies its own backdrop. If the dialog element is gone
 *  by the time the show runs, the Command reports `FailedShowDialog` without
 *  taking the scroll lock. The update function then closes the Model. The
 *  acquisition becomes uninterruptible after the committed element is found,
 *  so modal resources and the scroll lock cannot split. A concurrent
 *  lifecycle acquisition reuses the resources already held by the id. */
export const ShowDialog = DialogDefinition.makeCommand('ShowDialog', {
  args: { id: Schema.String, focusSelector: Schema.String },
  messages: [Message.SucceededShowDialog, Message.FailedShowDialog],
  handler: function* () {
    return ({ id, focusSelector }) =>
      acquireDialogResourcesResult(id, focusSelector)
  },
})

/** Reacquires an initially visible Dialog's framework resources when its
 *  element mounts, including after development Model preservation restores an
 *  open Dialog without replaying initialization Commands. A successful
 *  acquisition also resumes a preserved animation transition from its current
 *  phase. */
export const AcquireResources = DialogDefinition.makeMount('AcquireResources', {
  args: { id: Schema.String, focusSelector: Schema.String },
  messages: [Message.SucceededAcquireResources, Message.FailedAcquireResources],
  handler: function* () {
    return ({ element, id, focusSelector }) => {
      if (!(element instanceof HTMLDialogElement) || element.id !== id) {
        return Effect.succeed(Message.FailedAcquireResources())
      }

      const acquisition = acquireDialogResources(id, focusSelector).pipe(
        Effect.map(isAcquired => ({
          isAcquired,
          message: Message.SucceededAcquireResources(),
        })),
        Effect.catch(() =>
          Effect.succeed({
            isAcquired: false,
            message: Message.FailedAcquireResources(),
          }),
        ),
      )

      return Effect.acquireRelease(acquisition, ({ isAcquired }) =>
        isAcquired
          ? Dom.releaseDialogResources(id).pipe(Effect.ignore)
          : Effect.void,
      ).pipe(Effect.map(({ message }) => message))
    }
  },
})

/** Calls `close()` on the native dialog element and unlocks page scroll when
 *  the close released the resources `ShowDialog` installed. A close that runs
 *  before the show has installed them leaves the lock alone. When the show
 *  then fails, it releases the lock itself. When the show succeeds, update
 *  closes the dialog again. If the dialog element is gone by the time the
 *  close runs, the Command calls `Dom.releaseDialogResources` instead. That
 *  releases the scroll lock, focus trap, return focus, and stack entry if the
 *  dialog still holds them. The background is restored before return focus. */
export const CloseDialog = DialogDefinition.makeCommand('CloseDialog', {
  args: { id: Schema.String },
  messages: [Message.CompletedCloseDialog],
  handler: function* () {
    return ({ id }) =>
      Dom.closeDialog(dialogSelector(id)).pipe(
        Effect.andThen(isReleased =>
          isReleased ? Dom.unlockScroll : Effect.void,
        ),
        Effect.catch(() => Dom.releaseDialogResources(id)),
        Effect.as(Message.CompletedCloseDialog()),
      )
  },
})

/** Releases the framework hygiene the dialog holds while open (scroll lock,
 *  focus trap, return focus, stack entry, background isolation) when the
 *  element unmounts without a purposeful close. Calling it after
 *  `CloseDialog` released those resources is a no-op. */
export const ReleaseDialogResources = DialogDefinition.makeCommand(
  'ReleaseDialogResources',
  {
    args: { id: Schema.String },
    messages: [Message.CompletedReleaseDialogResources],
    handler: function* () {
      return ({ id }) =>
        Dom.releaseDialogResources(id).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedReleaseDialogResources()),
        )
    },
  },
)

/** Mount definitions rendered by Dialog. */
export const mounts = [AcquireResources]

const EffectsLayer = Layer.mergeAll(
  ShowDialog.layer,
  CloseDialog.layer,
  ReleaseDialogResources.layer,
  AcquireResources.layer,
)

const isLeaving = (model: Model): boolean =>
  model.animation.transitionState === 'LeaveStart' ||
  model.animation.transitionState === 'LeaveAnimating'

const isOpenOrAnimating = (model: Model): boolean =>
  model.isOpen || model.animation.transitionState !== 'Idle'

const AnimationBinding = DialogDefinition.makeBinding(
  Animation.AnimationBlock,
  {
    field: 'animation',
    init: false,
  },
)

const foldTransitionedOutStep = DialogDefinition.makeCommandsStep(model => [
  CloseDialog({ id: model.id }),
])

const foldAnimationOutMessage = DialogDefinition.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: () =>
      AnimationBinding.requestWaitForLeaveSettlement(),
    TransitionedOut: () => foldTransitionedOutStep,
  },
)

const resumeAnimationAfterAcquisitionStep = AnimationBinding.requestResume()
const resetAnimationImmediatelyStep = AnimationBinding.requestImmediateReset()
const closeDialogModelStep = DialogDefinition.makeFieldsStep(() => ({
  isOpen: () => false,
}))
const resetToClosedStep = DialogDefinition.makeStep(() =>
  Update.combineSteps([closeDialogModelStep, resetAnimationImmediatelyStep]),
)

const DialogComposition = DialogDefinition.makeComposition({
  mounts,
  bindings: [
    AnimationBinding.withOutMessagePolicy({ fold: foldAnimationOutMessage }),
  ],
})

/** Creates a closed Dialog Model and its Commands from a config. */
export const init = DialogComposition.makeInit((config: InitConfig) => ({
  model: makeInitialModel(config),
}))

const leaveDialogUnchangedStep = DialogDefinition.makeNoopStep()
const completeCloseStep = DialogDefinition.makeOutMessageStep(() =>
  OutMessage.CompletedClose(),
)

/** Processes a Dialog Message and returns the next Model and optional Commands. */
export const update = DialogComposition.makeUpdate({
  RequestedOpen: model => {
    const wasClosed = !model.isOpen
    const commands = Array.filter(
      [
        ShowDialog({
          id: model.id,
          focusSelector: Option.getOrElse(
            model.maybeFocusSelector,
            () => initialFocusMarkerSelector,
          ),
        }),
      ],
      () => wasClosed,
    )
    const dialogOpen = model.isAnimated
      ? Update.combineSteps(model, [
          DialogDefinition.makeCommandsStep(() => commands),
          AnimationBinding.requestShow(),
          DialogDefinition.makeFieldsStep(() => ({ isOpen: () => true })),
        ])
      : DialogDefinition.makeStep(stepModel => ({
          model: modifyFields(stepModel, { isOpen: () => true }),
          commands,
        }))(model)

    return wasClosed
      ? pipe(dialogOpen, Update.withOutMessage(OutMessage.Opened()))
      : dialogOpen
  },

  RequestedClose: model => {
    if (isLeaving(model)) {
      return leaveDialogUnchangedStep(model)
    }

    const wasOpen = model.isOpen
    if (model.isAnimated) {
      const dialogClose = Update.combineSteps(model, [
        closeDialogModelStep,
        AnimationBinding.requestHide(),
      ])

      return wasOpen
        ? pipe(dialogClose, Update.withOutMessage(OutMessage.Closed()))
        : dialogClose
    }

    const commands = Array.filter(
      [CloseDialog({ id: model.id })],
      () => wasOpen,
    )
    const dialogClose = DialogDefinition.makeStep(stepModel => ({
      model: modifyFields(stepModel, { isOpen: () => false }),
      commands,
    }))(model)
    return wasOpen
      ? pipe(dialogClose, Update.withOutMessage(OutMessage.Closed()))
      : dialogClose
  },

  Unmounted: model => {
    if (isOpenOrAnimating(model)) {
      return Update.combineSteps(model, [
        resetToClosedStep,
        DialogDefinition.makeCommandsStep(stepModel => [
          ReleaseDialogResources({ id: stepModel.id }),
        ]),
      ])
    } else {
      return leaveDialogUnchangedStep(model)
    }
  },

  SucceededShowDialog: model => {
    if (model.isOpen || isLeaving(model)) {
      return leaveDialogUnchangedStep(model)
    } else {
      return DialogDefinition.makeCommandsStep(stepModel => [
        CloseDialog({ id: stepModel.id }),
      ])(model)
    }
  },

  FailedShowDialog: model => {
    if (isOpenOrAnimating(model)) {
      return resetToClosedStep(model)
    } else {
      return leaveDialogUnchangedStep(model)
    }
  },

  SucceededAcquireResources: model => {
    if (model.isOpen || isLeaving(model)) {
      return resumeAnimationAfterAcquisitionStep(model)
    } else {
      return DialogDefinition.makeCommandsStep(stepModel => [
        CloseDialog({ id: stepModel.id }),
      ])(model)
    }
  },

  FailedAcquireResources: model => {
    if (isOpenOrAnimating(model)) {
      return resetToClosedStep(model)
    } else {
      return leaveDialogUnchangedStep(model)
    }
  },

  CompletedCloseDialog: completeCloseStep,
  CompletedReleaseDialogResources: leaveDialogUnchangedStep,
})

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

/** Returns the framework-managed description id, the
 *  `-dialog-description` suffix on `model.id`.
 *
 *  The primary path is spreading `RenderInfo`'s `description` onto your
 *  description element (`h.p([...description], [...])`), which carries this id
 *  for you. Reach for this helper only when you need the id as a value outside
 *  `toView`: a Command that calls `getElementById`, a cross-element
 *  `aria-describedby`, or a test. When the description is rendered, set
 *  `ViewInputs.hasDescription` so the dialog points at this id. Do not
 *  hand-roll the id string. */
export const descriptionId = (model: Model): string =>
  `${model.id}-dialog-description`

/** Render-time payload published to the consumer's `toView`.
 *
 *  - `dialog`: attributes for the native `<dialog>` element. Carries
 *    the id, ARIA labelling and modal state, `open` prop, positioning style, a `cancel` handler
 *    that prevents a file picker's native cancellation from closing the dialog
 *    while mapping `Dom.showDialog`'s Escape signal to `RequestedClose`,
 *    an `OnMount` acquisition that restores modal resources for an initially
 *    visible or development-preserved Dialog, and an `OnUnmount` backstop that
 *    releases framework hygiene (scroll lock, focus trap, background
 *    isolation, return focus) if the element is removed from the DOM while
 *    still open, such as navigating away from a route-keyed subtree.
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
 *    framework-managed id referenced by `aria-describedby` when
 *    `ViewInputs.hasDescription` is true. Spread onto your description element
 *    (`h.p([...description], [...])`).
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
  dialog: ReadonlyArray<ChildAttribute<Mount.RequirementsOf<typeof mounts>>>
  backdrop: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
  title: ReadonlyArray<ChildAttribute>
  description: ReadonlyArray<ChildAttribute>
  initialFocus: ReadonlyArray<ChildAttribute>
  closeButton: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render view inputs passed to `view` via `h.block`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  toView: (render: RenderInfo) => Html
  hasDescription?: boolean
}>

/** Renders a headless modal dialog backed by the native `<dialog>` element.
 *  `ShowDialog` and the dialog's Mount open it through `Dom.showDialog`,
 *  isolate the background, trap focus, and handle Escape on the topmost
 *  Dialog. The component supplies its own backdrop. */
export const view = DialogComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
    const {
      id,
      isOpen,
      animation: { transitionState },
    } = model
    const { toView, hasDescription = false } = viewInputs

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

    const describedByAttributes = hasDescription
      ? [h.AriaDescribedBy(descriptionId(model))]
      : []

    const dialogAttributes = [
      h.Id(id),
      h.AriaLabelledBy(titleId(model)),
      ...describedByAttributes,
      ...(isVisible ? [h.AriaModal(true)] : []),
      // NOTE: Chromium reports canceling a file picker as a native `cancel`
      // event observed by the containing Dialog. Dom.showDialog uses a
      // CustomEvent for its unhandled-Escape signal, so the two are separable.
      h.OnCancelPreventDefault(Message.RequestedClose()),
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
        ? [
            h.DataAttribute('open', ''),
            h.OnMount(
              AcquireResources({
                id,
                focusSelector: Option.getOrElse(
                  model.maybeFocusSelector,
                  () => initialFocusMarkerSelector,
                ),
              }),
            ),
            h.OnUnmount(Message.Unmounted()),
          ]
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

const prepare = () => DialogComposition.prepareBlock(implementation)
/** Completed Dialog Block contract. */
export interface DialogBlock extends Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> {}
/** Complete Dialog Block definition. */
export const DialogBlock: DialogBlock = Block.assemble(prepare)

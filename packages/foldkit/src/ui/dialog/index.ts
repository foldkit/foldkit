import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
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
} from '../animation/schema'
import {
  defaultLeaveCommand as animationDefaultLeaveCommand,
  update as animationUpdate,
} from '../animation/update'

// MODEL

/** Schema for the dialog component's state, tracking its unique ID, open/closed status, animation support, and animation lifecycle phase. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  animation: AnimationModel,
  maybeFocusSelector: S.OptionFromSelf(S.String),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the dialog should open. Triggers the showModal command. */
export const Opened = m('Opened')
/** Sent when the dialog should close (Escape key, backdrop click, or programmatic). Triggers the closeModal command. */
export const Closed = m('Closed')
/** Sent when the show-dialog command completes (scroll lock + showModal). */
export const CompletedShowDialog = m('CompletedShowDialog')
/** Sent when the close-dialog command completes (closeModal + scroll unlock). */
export const CompletedCloseDialog = m('CompletedCloseDialog')
/** Wraps an Animation submodel message for delegation. */
export const GotAnimationMessage = m('GotAnimationMessage', {
  message: AnimationMessage,
})

/** Union of all messages the dialog component can produce. */
export const Message: S.Union<
  [
    typeof Opened,
    typeof Closed,
    typeof CompletedShowDialog,
    typeof CompletedCloseDialog,
    typeof GotAnimationMessage,
  ]
> = S.Union(
  Opened,
  Closed,
  CompletedShowDialog,
  CompletedCloseDialog,
  GotAnimationMessage,
)

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type CompletedShowDialog = typeof CompletedShowDialog.Type
export type CompletedCloseDialog = typeof CompletedCloseDialog.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a dialog model with `init`. `isAnimated` enables animation coordination (default `false`). */
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
  maybeFocusSelector: Option.fromNullable(config.focusSelector),
})

// UPDATE

const dialogSelector = (id: string): string => `#${id}`

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Locks page scroll and calls `showModal()` on the native dialog element. */
export const ShowDialog = Command.define('ShowDialog', CompletedShowDialog)
/** Calls `close()` on the native dialog element and unlocks page scroll. */
export const CloseDialog = Command.define('CloseDialog', CompletedCloseDialog)

const closeDialog = (id: string): Command.Command<Message> =>
  CloseDialog(
    Task.closeModal(dialogSelector(id)).pipe(
      Effect.andThen(() => Task.unlockScroll),
      Effect.ignore,
      Effect.as(CompletedCloseDialog()),
    ),
  )

const toParentMessage = (message: AnimationMessage): Message =>
  GotAnimationMessage({ message })

const delegateToAnimation = (
  model: Model,
  animationMessage: AnimationMessage,
): UpdateReturn => {
  const [nextAnimation, animationCommands, maybeOutMessage] = animationUpdate(
    model.animation,
    animationMessage,
  )

  const mappedCommands = animationCommands.map(
    Command.mapEffect(Effect.map(toParentMessage)),
  )

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<AnimationOutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          Command.mapEffect(
            animationDefaultLeaveCommand(nextAnimation),
            Effect.map(toParentMessage),
          ),
        ],
        TransitionedOut: () => [closeDialog(model.id)],
      }),
    ),
  })

  return [
    evo(model, { animation: () => nextAnimation }),
    [...mappedCommands, ...additionalCommands],
  ]
}

/** Processes a dialog message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Opened: () => {
        const focusOptions = Option.match(model.maybeFocusSelector, {
          onNone: () => undefined,
          onSome: focusSelector => ({ focusSelector }),
        })

        const maybeShow = Option.liftPredicate(
          ShowDialog(
            Task.lockScroll.pipe(
              Effect.andThen(() =>
                Task.showModal(dialogSelector(model.id), focusOptions),
              ),
              Effect.ignore,
              Effect.as(CompletedShowDialog()),
            ),
          ),
          () => !model.isOpen,
        )

        if (model.isAnimated) {
          const [nextModel, animationCommands] = delegateToAnimation(
            model,
            AnimationShowed(),
          )

          return [
            evo(nextModel, { isOpen: () => true }),
            [...Option.toArray(maybeShow), ...animationCommands],
          ]
        }

        return [evo(model, { isOpen: () => true }), Option.toArray(maybeShow)]
      },

      Closed: () => {
        const { transitionState } = model.animation
        const isLeaving =
          transitionState === 'LeaveStart' ||
          transitionState === 'LeaveAnimating'

        if (isLeaving) {
          return [model, []]
        }

        if (model.isAnimated) {
          const [nextModel, animationCommands] = delegateToAnimation(
            evo(model, { isOpen: () => false }),
            AnimationHid(),
          )

          return [nextModel, animationCommands]
        }

        const maybeClose = Option.liftPredicate(
          closeDialog(model.id),
          () => model.isOpen,
        )

        return [evo(model, { isOpen: () => false }), Option.toArray(maybeClose)]
      },

      GotAnimationMessage: ({ message: animationMessage }) =>
        delegateToAnimation(model, animationMessage),

      CompletedShowDialog: () => [model, []],
      CompletedCloseDialog: () => [model, []],
    }),
  )

// VIEW

/** Returns the ID used for `aria-labelledby` on the dialog. Apply this to your title element. */
export const titleId = (model: Model): string => `${model.id}-title`

/** Returns the ID used for `aria-describedby` on the dialog. Apply this to your description element. */
export const descriptionId = (model: Model): string => `${model.id}-description`

/** Configuration for rendering a dialog with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toParentMessage: (
    message: Closed | CompletedShowDialog | CompletedCloseDialog,
  ) => Message
  onClosed?: () => Message
  panelContent: Html
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<Message>>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<Attribute<Message>>
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
}>

/** Programmatically opens the dialog, updating the model and returning
 *  show commands. Use this in domain-event handlers to open the dialog. */
export const open = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Opened())

/** Programmatically closes the dialog, updating the model and returning
 *  close commands. Use this in domain-event handlers when the dialog uses `onClosed`. */
export const close = (
  model: Model,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  update(model, Closed())

/** Renders a headless dialog component backed by the native `<dialog>` element with `showModal()`. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    AriaDescribedBy,
    AriaLabelledBy,
    Class,
    DataAttribute,
    Id,
    OnCancel,
    OnClick,
    Open,
    Style,
    keyed,
  } = html<Message>()

  const {
    model: {
      id,
      isOpen,
      animation: { transitionState },
    },
    toParentMessage,
    onClosed,
    panelContent,
    panelClassName,
    panelAttributes = [],
    backdropClassName,
    backdropAttributes = [],
    className,
    attributes = [],
  } = config

  const dispatchClosed = (): Message =>
    onClosed ? onClosed() : toParentMessage(Closed())

  const isLeaving =
    transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
  const isVisible = isOpen || isLeaving

  const animationAttributes: ReadonlyArray<ReturnType<typeof DataAttribute>> =
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

  const dialogAttributes = [
    Id(id),
    AriaLabelledBy(`${id}-title`),
    AriaDescribedBy(`${id}-description`),
    OnCancel(dispatchClosed()),
    Open(isVisible),
    Style({
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
    ...(isVisible ? [DataAttribute('open', '')] : []),
    ...(className ? [Class(className)] : []),
    ...attributes,
  ]

  const backdrop = keyed('div')(
    `${id}-backdrop`,
    [
      Style({ minHeight: '100vh' }),
      ...animationAttributes,
      ...(isLeaving ? [] : [OnClick(dispatchClosed())]),
      ...(backdropClassName ? [Class(backdropClassName)] : []),
      ...backdropAttributes,
    ],
    [],
  )

  const panel = keyed('div')(
    `${id}-panel`,
    [
      Id(`${id}-panel`),
      ...animationAttributes,
      ...(panelClassName ? [Class(panelClassName)] : []),
      ...panelAttributes,
    ],
    [panelContent],
  )

  const content = isVisible ? [backdrop, panel] : []

  return keyed('dialog')(id, dialogAttributes, content)
}

/** Creates a memoized dialog view. Static config (className, panelClassName,
 *  etc.) is captured in a closure. Dynamic fields — `model`, `toParentMessage`,
 *  and `panelContent` — are compared by reference per render via `createLazy`.
 *  When any of them change, the view re-renders; otherwise the cached VNode is
 *  reused and snabbdom skips the entire subtree. */
export const lazy = <Message>(
  staticConfig: Omit<
    ViewConfig<Message>,
    'model' | 'toParentMessage' | 'onClosed' | 'panelContent'
  >,
): ((
  model: Model,
  toParentMessage: ViewConfig<Message>['toParentMessage'],
  panelContent: Html,
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage, panelContent) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toParentMessage'],
        currentPanelContent: Html,
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
          panelContent: currentPanelContent,
        }),
      [model, toParentMessage, panelContent],
    )
}

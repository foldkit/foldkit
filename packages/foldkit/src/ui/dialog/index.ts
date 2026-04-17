import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
// NOTE: Transition imports are split across schema + update to avoid a circular
// dependency: transition → html → runtime → devtools → dialog → transition.
// The barrel (../transition) imports from html, which starts the cycle.
import {
  Hid as TransitionHid,
  Message as TransitionMessage,
  Model as TransitionModel,
  type OutMessage as TransitionOutMessage,
  Showed as TransitionShowed,
  init as transitionInit,
} from '../transition/schema'
import {
  defaultLeaveCommand as transitionDefaultLeaveCommand,
  update as transitionUpdate,
} from '../transition/update'

// MODEL

/** Schema for the dialog component's state, tracking its unique ID, open/closed status, animation support, and transition phase. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  transition: TransitionModel,
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
/** Wraps a Transition submodel message for delegation. */
export const GotTransitionMessage = m('GotTransitionMessage', {
  message: TransitionMessage,
})

/** Union of all messages the dialog component can produce. */
export const Message: S.Union<
  [
    typeof Opened,
    typeof Closed,
    typeof CompletedShowDialog,
    typeof CompletedCloseDialog,
    typeof GotTransitionMessage,
  ]
> = S.Union(
  Opened,
  Closed,
  CompletedShowDialog,
  CompletedCloseDialog,
  GotTransitionMessage,
)

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type CompletedShowDialog = typeof CompletedShowDialog.Type
export type CompletedCloseDialog = typeof CompletedCloseDialog.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a dialog model with `init`. `isAnimated` enables CSS transition coordination (default `false`). */
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
  transition: transitionInit({
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

const toParentMessage = (message: TransitionMessage): Message =>
  GotTransitionMessage({ message })

const delegateToTransition = (
  model: Model,
  transitionMessage: TransitionMessage,
): UpdateReturn => {
  const [nextTransition, transitionCommands, maybeOutMessage] =
    transitionUpdate(model.transition, transitionMessage)

  const mappedCommands = transitionCommands.map(
    Command.mapEffect(Effect.map(toParentMessage)),
  )

  const additionalCommands = Option.match(maybeOutMessage, {
    onNone: () => [],
    onSome: M.type<TransitionOutMessage>().pipe(
      M.tagsExhaustive({
        StartedLeaveAnimating: () => [
          Command.mapEffect(
            transitionDefaultLeaveCommand(nextTransition),
            Effect.map(toParentMessage),
          ),
        ],
        TransitionedOut: () => [closeDialog(model.id)],
      }),
    ),
  })

  return [
    evo(model, { transition: () => nextTransition }),
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
          const [nextModel, transitionCommands] = delegateToTransition(
            model,
            TransitionShowed(),
          )

          return [
            evo(nextModel, { isOpen: () => true }),
            [...Option.toArray(maybeShow), ...transitionCommands],
          ]
        }

        return [evo(model, { isOpen: () => true }), Option.toArray(maybeShow)]
      },

      Closed: () => {
        const { transitionState } = model.transition
        const isLeaving =
          transitionState === 'LeaveStart' ||
          transitionState === 'LeaveAnimating'

        if (isLeaving) {
          return [model, []]
        }

        if (model.isAnimated) {
          const [nextModel, transitionCommands] = delegateToTransition(
            evo(model, { isOpen: () => false }),
            TransitionHid(),
          )

          return [nextModel, transitionCommands]
        }

        const maybeClose = Option.liftPredicate(
          closeDialog(model.id),
          () => model.isOpen,
        )

        return [evo(model, { isOpen: () => false }), Option.toArray(maybeClose)]
      },

      GotTransitionMessage: ({ message: transitionMessage }) =>
        delegateToTransition(model, transitionMessage),

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
      transition: { transitionState },
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

  const transitionAttributes: ReadonlyArray<ReturnType<typeof DataAttribute>> =
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
      ...transitionAttributes,
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
      ...transitionAttributes,
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

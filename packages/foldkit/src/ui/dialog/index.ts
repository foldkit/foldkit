import { Array, Effect, Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command'
import { OptionExt } from '../../effectExtensions'
import { type Attribute, type Html, createLazy, html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
import { TransitionState } from '../transition'

// MODEL

/** Schema for the dialog component's state, tracking its unique ID, open/closed status, animation support, and transition phase. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  transitionState: TransitionState,
  maybeFocusSelector: S.OptionFromSelf(S.String),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the dialog should open. Triggers the showModal command. */
export const Opened = m('Opened')
/** Sent when the dialog should close (Escape key, backdrop click, or programmatic). Triggers the closeModal command. */
export const Closed = m('Closed')
/** Sent when the show-dialog command completes (scroll lock + showModal). */
export const CompletedDialogShow = m('CompletedDialogShow')
/** Sent when the close-dialog command completes (closeModal + scroll unlock). */
export const CompletedDialogClose = m('CompletedDialogClose')
/** Sent internally when a double-rAF completes, advancing the transition to its animating phase. */
export const AdvancedTransitionFrame = m('AdvancedTransitionFrame')
/** Sent internally when all CSS transitions on the dialog panel have completed. */
export const EndedTransition = m('EndedTransition')

/** Union of all messages the dialog component can produce. */
export const Message: S.Union<
  [
    typeof Opened,
    typeof Closed,
    typeof CompletedDialogShow,
    typeof CompletedDialogClose,
    typeof AdvancedTransitionFrame,
    typeof EndedTransition,
  ]
> = S.Union(
  Opened,
  Closed,
  CompletedDialogShow,
  CompletedDialogClose,
  AdvancedTransitionFrame,
  EndedTransition,
)

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type CompletedDialogShow = typeof CompletedDialogShow.Type
export type CompletedDialogClose = typeof CompletedDialogClose.Type

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
  transitionState: 'Idle',
  maybeFocusSelector: Option.fromNullable(config.focusSelector),
})

// UPDATE

const dialogSelector = (id: string): string => `#${id}`
const panelSelector = (id: string): string => `#${id}-panel`

type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Processes a dialog message and returns the next model and commands. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeNextFrame = OptionExt.when(
    model.isAnimated,
    Task.nextFrame.pipe(Effect.as(AdvancedTransitionFrame())),
  )

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Opened: () => {
        const focusOptions = Option.match(model.maybeFocusSelector, {
          onNone: () => undefined,
          onSome: focusSelector => ({ focusSelector }),
        })

        const maybeShow = Option.liftPredicate(
          Task.lockScroll.pipe(
            Effect.andThen(() =>
              Task.showModal(dialogSelector(model.id), focusOptions),
            ),
            Effect.ignore,
            Effect.as(CompletedDialogShow()),
          ),
          () => !model.isOpen,
        )

        return [
          evo(model, {
            isOpen: () => true,
            transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
          }),
          Array.getSomes([maybeShow, maybeNextFrame]),
        ]
      },

      Closed: () => {
        const isLeaving =
          model.transitionState === 'LeaveStart' ||
          model.transitionState === 'LeaveAnimating'

        if (isLeaving) {
          return [model, []]
        }

        if (model.isAnimated) {
          return [
            evo(model, {
              isOpen: () => false,
              transitionState: () => 'LeaveStart',
            }),
            Option.toArray(maybeNextFrame),
          ]
        }

        const maybeClose = Option.liftPredicate(
          Task.closeModal(dialogSelector(model.id)).pipe(
            Effect.andThen(() => Task.unlockScroll),
            Effect.ignore,
            Effect.as(CompletedDialogClose()),
          ),
          () => model.isOpen,
        )

        return [evo(model, { isOpen: () => false }), Option.toArray(maybeClose)]
      },

      AdvancedTransitionFrame: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterStart', () => [
            evo(model, { transitionState: () => 'EnterAnimating' }),
            [
              Task.waitForTransitions(panelSelector(model.id)).pipe(
                Effect.as(EndedTransition()),
              ),
            ],
          ]),
          M.when('LeaveStart', () => [
            evo(model, { transitionState: () => 'LeaveAnimating' }),
            [
              Task.waitForTransitions(panelSelector(model.id)).pipe(
                Effect.as(EndedTransition()),
              ),
            ],
          ]),
          M.orElse(() => [model, []]),
        ),

      EndedTransition: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
          ]),
          M.when('LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [
              Task.closeModal(dialogSelector(model.id)).pipe(
                Effect.andThen(() => Task.unlockScroll),
                Effect.ignore,
                Effect.as(CompletedDialogClose()),
              ),
            ],
          ]),
          M.orElse(() => [model, []]),
        ),

      CompletedDialogShow: () => [model, []],
      CompletedDialogClose: () => [model, []],
    }),
  )
}

// VIEW

/** Returns the ID used for `aria-labelledby` on the dialog. Apply this to your title element. */
export const titleId = (model: Model): string => `${model.id}-title`

/** Returns the ID used for `aria-describedby` on the dialog. Apply this to your description element. */
export const descriptionId = (model: Model): string => `${model.id}-description`

/** Configuration for rendering a dialog with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toMessage: (
    message: Closed | CompletedDialogShow | CompletedDialogClose,
  ) => Message
  panelContent: Html
  panelClassName?: string
  panelAttributes?: ReadonlyArray<Attribute<Message>>
  backdropClassName?: string
  backdropAttributes?: ReadonlyArray<Attribute<Message>>
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
}>

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
    Style,
    keyed,
  } = html<Message>()

  const {
    model: { id, isOpen, transitionState },
    toMessage,
    panelContent,
    panelClassName,
    panelAttributes = [],
    backdropClassName,
    backdropAttributes = [],
    className,
    attributes = [],
  } = config

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
    OnCancel(toMessage(Closed())),
    Style({
      overflow: 'hidden',
      maxWidth: '100%',
      maxHeight: '100%',
      padding: '0',
      border: 'none',
      background: 'transparent',
    }),
    ...(isVisible ? [DataAttribute('open', '')] : []),
    ...(className ? [Class(className)] : []),
    ...attributes,
  ]

  const backdrop = keyed('div')(
    `${id}-backdrop`,
    [
      ...transitionAttributes,
      ...(isLeaving ? [] : [OnClick(toMessage(Closed()))]),
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

/** Creates a memoized dialog view. Static config is captured in a closure;
 *  only `model` and `toMessage` are compared per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<ViewConfig<Message>, 'model' | 'toMessage'>,
): ((model: Model, toMessage: ViewConfig<Message>['toMessage']) => Html) => {
  const lazyView = createLazy()

  return (model, toMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toMessage: currentToMessage,
        }),
      [model, toMessage],
    )
}

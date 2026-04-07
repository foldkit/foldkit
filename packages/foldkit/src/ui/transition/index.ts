import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command'
import {
  type Attribute,
  type Html,
  type TagName,
  createLazy,
  html,
} from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'
import * as Task from '../../task'
import { TransitionState } from '../transition'

// MODEL

/** Schema for the transition component's state, tracking its unique ID, visibility intent, and animation phase. */
export const Model = S.Struct({
  id: S.String,
  isShowing: S.Boolean,
  transitionState: TransitionState,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the transition should enter (become visible). Starts the enter animation sequence. */
export const Showed = m('Showed')
/** Sent when the transition should leave (become hidden). Starts the leave animation sequence. */
export const Hidden = m('Hidden')
/** Sent internally when a double-rAF completes, advancing the transition to its animating phase. */
export const AdvancedTransitionFrame = m('AdvancedTransitionFrame')
/** Sent internally when all CSS transitions on the transition element have completed. */
export const EndedTransition = m('EndedTransition')

/** Union of all messages the transition component can produce. */
export const Message: S.Union<
  [
    typeof Showed,
    typeof Hidden,
    typeof AdvancedTransitionFrame,
    typeof EndedTransition,
  ]
> = S.Union(Showed, Hidden, AdvancedTransitionFrame, EndedTransition)

export type Showed = typeof Showed.Type
export type Hidden = typeof Hidden.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Sent to the parent when the leave animation completes. The parent can use this to unmount content or update its own state. */
export const TransitionedOut = m('TransitionedOut')

export const OutMessage = S.Union(TransitionedOut)
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a transition model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isShowing?: boolean
}>

/** Creates an initial transition model from a config. Defaults to hidden. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isShowing: config.isShowing ?? false,
  transitionState: 'Idle',
})

// UPDATE

const elementSelector = (id: string): string => `#${id}`

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Advances the transition's enter/leave animation by waiting a double-rAF. */
export const RequestFrame = Command.define(
  'RequestFrame',
  AdvancedTransitionFrame,
)
/** Waits for all CSS transitions on the transition element to complete. */
export const WaitForTransitions = Command.define(
  'WaitForTransitions',
  EndedTransition,
)

/** Processes a transition message and returns the next model, commands, and optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeNextFrame = RequestFrame(
    Task.nextFrame.pipe(Effect.as(AdvancedTransitionFrame())),
  )

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Showed: () => {
        if (model.isShowing) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, {
            isShowing: () => true,
            transitionState: () => 'EnterStart',
          }),
          [maybeNextFrame],
          Option.none(),
        ]
      },

      Hidden: () => {
        const isLeaving =
          model.transitionState === 'LeaveStart' ||
          model.transitionState === 'LeaveAnimating'

        if (isLeaving || !model.isShowing) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, {
            isShowing: () => false,
            transitionState: () => 'LeaveStart',
          }),
          [maybeNextFrame],
          Option.none(),
        ]
      },

      AdvancedTransitionFrame: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterStart', () => [
            evo(model, { transitionState: () => 'EnterAnimating' }),
            [
              WaitForTransitions(
                Task.waitForTransitions(elementSelector(model.id)).pipe(
                  Effect.as(EndedTransition()),
                ),
              ),
            ],
            Option.none(),
          ]),
          M.when('LeaveStart', () => [
            evo(model, { transitionState: () => 'LeaveAnimating' }),
            [
              WaitForTransitions(
                Task.waitForTransitions(elementSelector(model.id)).pipe(
                  Effect.as(EndedTransition()),
                ),
              ),
            ],
            Option.none(),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      EndedTransition: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
            Option.none(),
          ]),
          M.when('LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
            Option.some(TransitionedOut()),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),
    }),
  )
}

// VIEW

/** Configuration for rendering a transition with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toParentMessage: (message: Showed | Hidden) => Message
  content: Html
  className?: string
  attributes?: ReadonlyArray<Attribute<Message>>
  element?: TagName
  /** When true, wraps content in a CSS grid container that smoothly animates
   *  height via `grid-template-rows: 0fr → 1fr`. The element stays in the DOM
   *  when hidden (collapsed to zero height) instead of being removed. */
  animateSize?: boolean
}>

/** Renders a headless transition wrapper that coordinates CSS transitions via data attributes.
 *
 *  Data attributes reflect the current transition phase:
 *  - `data-closed` — element is in its hidden/initial state
 *  - `data-enter` — enter animation is active
 *  - `data-leave` — leave animation is active
 *  - `data-transition` — any animation is active
 */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const { AriaHidden, Class, DataAttribute, Id, Style, div, empty, keyed } =
    html<Message>()

  const {
    model: { id, isShowing, transitionState },
    content,
    className,
    attributes = [],
    element = 'div',
    animateSize = false,
  } = config

  const isLeaving =
    transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
  const isVisible = isShowing || isLeaving

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

  if (animateSize) {
    const isClosed =
      transitionState === 'EnterStart' ||
      transitionState === 'LeaveAnimating' ||
      !isVisible

    return div(
      [
        Style({
          display: 'grid',
          gridTemplateRows: isClosed ? '0fr' : '1fr',
          transition: 'grid-template-rows 200ms ease-out',
          overflow: 'hidden',
        }),
      ],
      [
        keyed(element)(
          id,
          [
            Id(id),
            Style({ minHeight: '0px', overflow: 'hidden' }),
            ...(isClosed && transitionState === 'Idle'
              ? [DataAttribute('closed', '')]
              : []),
            ...transitionAttributes,
            ...(className ? [Class(className)] : []),
            ...(!isVisible ? [AriaHidden(true)] : []),
            ...attributes,
          ],
          [content],
        ),
      ],
    )
  }

  if (!isVisible) {
    return empty
  }

  return keyed(element)(
    id,
    [
      Id(id),
      ...transitionAttributes,
      ...(className ? [Class(className)] : []),
      ...attributes,
    ],
    [content],
  )
}

/** Creates a memoized transition view. Static config (className, element, etc.)
 *  is captured in a closure. Dynamic fields — `model`, `toParentMessage`,
 *  and `content` — are compared by reference per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<
    ViewConfig<Message>,
    'model' | 'toParentMessage' | 'content'
  >,
): ((
  model: Model,
  toParentMessage: ViewConfig<Message>['toParentMessage'],
  content: Html,
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage, content) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<Message>['toParentMessage'],
        currentContent: Html,
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
          content: currentContent,
        }),
      [model, toParentMessage, content],
    )
}

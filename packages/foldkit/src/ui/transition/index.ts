import { Match as M } from 'effect'

import {
  type Attribute,
  type Html,
  type TagName,
  createLazy,
  html,
} from '../../html/index.js'
import {
  AdvancedTransitionFrame,
  EndedTransition,
  Hid,
  Message,
  Model,
  OutMessage,
  Showed,
  StartedLeaveAnimating,
  TransitionState,
  TransitionedOut,
  init,
} from './schema.js'
import {
  RequestFrame,
  WaitForTransitions,
  defaultLeaveCommand,
  update,
} from './update.js'

export type { InitConfig } from './schema.js'
export {
  AdvancedTransitionFrame,
  EndedTransition,
  Hid,
  init,
  Message,
  Model,
  OutMessage,
  Showed,
  StartedLeaveAnimating,
  TransitionState,
  TransitionedOut,
}

export { RequestFrame, WaitForTransitions, defaultLeaveCommand, update }

// VIEW

/** Configuration for rendering a transition with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
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
        div(
          [
            Style({ minHeight: '0px', overflow: 'hidden' }),
            ...(!isVisible ? [AriaHidden(true)] : []),
          ],
          [
            keyed(element)(
              id,
              [
                Id(id),
                ...(isClosed && transitionState === 'Idle'
                  ? [DataAttribute('closed', '')]
                  : []),
                ...transitionAttributes,
                ...(className ? [Class(className)] : []),
                ...attributes,
              ],
              [content],
            ),
          ],
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
 *  is captured in a closure. Dynamic fields — `model` and `content` — are
 *  compared by reference per render via `createLazy`. */
export const lazy = <Message>(
  staticConfig: Omit<ViewConfig<Message>, 'model' | 'content'>,
): ((model: Model, content: Html) => Html) => {
  const lazyView = createLazy()

  return (model, content) =>
    lazyView(
      (currentModel: Model, currentContent: Html) =>
        view({
          ...staticConfig,
          model: currentModel,
          content: currentContent,
        }),
      [model, content],
    )
}

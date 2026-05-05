import { Match as M } from 'effect'

import {
  type Attribute,
  type Html,
  type TagName,
  createLazy,
  html,
} from '../../html/index.js'
import {
  AdvancedAnimationFrame,
  EndedAnimation,
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
  WaitForAnimationSettled,
  defaultLeaveCommand,
  update,
} from './update.js'

export type { InitConfig } from './schema.js'
export {
  AdvancedAnimationFrame,
  EndedAnimation,
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

export { RequestFrame, WaitForAnimationSettled, defaultLeaveCommand, update }

// VIEW

/** Configuration for rendering an animation with `view`. */
export type ViewConfig<ParentMessage> = Readonly<{
  model: Model
  content: Html
  className?: string
  attributes?: ReadonlyArray<Attribute<ParentMessage>>
  element?: TagName
  /** When true, wraps content in a CSS grid container that smoothly animates
   *  height via `grid-template-rows: 0fr → 1fr`. The element stays in the DOM
   *  when hidden (collapsed to zero height) instead of being removed. */
  animateSize?: boolean
}>

/** Renders a headless animation wrapper that coordinates CSS transitions and
 *  CSS keyframe animations via data attributes.
 *
 *  Data attributes reflect the current lifecycle phase:
 *  - `data-closed` — element is in its hidden/initial state
 *  - `data-enter` — enter animation is active
 *  - `data-leave` — leave animation is active
 *  - `data-transition` — any animation is active
 */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
  const { AriaHidden, Class, DataAttribute, Id, Style, div, empty, keyed } =
    html<ParentMessage>()

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

/** Creates a memoized animation view. Static config (className, element, etc.)
 *  is captured in a closure. Dynamic fields — `model` and `content` — are
 *  compared by reference per render via `createLazy`. */
export const lazy = <ParentMessage>(
  staticConfig: Omit<ViewConfig<ParentMessage>, 'model' | 'content'>,
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

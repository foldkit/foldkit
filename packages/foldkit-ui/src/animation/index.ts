import { Match as M } from 'effect'
import {
  type ChildAttribute,
  type Html,
  type TagName,
  html,
} from 'foldkit/html'
import { defineView } from 'foldkit/submodel'

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

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  content: Html
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
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
 *  - `data-closed`: element is in its hidden/initial state
 *  - `data-enter`: enter animation is active
 *  - `data-leave`: leave animation is active
 *  - `data-transition`: any animation is active
 */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, isShowing, transitionState } = model
    const {
      content,
      className,
      attributes = [],
      element = 'div',
      animateSize = false,
    } = viewInputs

    const isLeaving =
      transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
    const isVisible = isShowing || isLeaving

    const transitionAttributes: ReadonlyArray<
      ReturnType<typeof h.DataAttribute>
    > = M.value(transitionState).pipe(
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

    if (animateSize) {
      const isClosed =
        transitionState === 'EnterStart' ||
        transitionState === 'LeaveAnimating' ||
        !isVisible

      return h.div(
        [
          h.Style({
            display: 'grid',
            gridTemplateRows: isClosed ? '0fr' : '1fr',
            transition: 'grid-template-rows 200ms ease-out',
            overflow: 'hidden',
          }),
        ],
        [
          h.div(
            [
              h.Style({ minHeight: '0px', overflow: 'hidden' }),
              ...(!isVisible ? [h.AriaHidden(true)] : []),
            ],
            [
              h.keyed(element)(
                id,
                [
                  h.Id(id),
                  ...(isClosed && transitionState === 'Idle'
                    ? [h.DataAttribute('closed', '')]
                    : []),
                  ...transitionAttributes,
                  ...(className ? [h.Class(className)] : []),
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
      return h.empty
    }

    return h.keyed(element)(
      id,
      [
        h.Id(id),
        ...transitionAttributes,
        ...(className ? [h.Class(className)] : []),
        ...attributes,
      ],
      [content],
    )
  },
)

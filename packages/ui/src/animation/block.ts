import { Match } from 'effect'
import type { ChildAttribute, Html, TagName } from 'foldkit/html'

import {
  type InitConfig,
  Message,
  Model,
  OutMessage,
  TransitionState,
  init,
} from './schema.js'
import {
  AnimationComposition,
  EffectsLayer,
  WaitForAnimationSettled,
  WaitForPaint,
  defaultLeaveCommand,
  finish,
  hide,
  resume,
  show,
  toggle,
  update,
} from './update.js'

export type { Hid, InitConfig, Showed } from './schema.js'
export { init, Message, Model, OutMessage, TransitionState }

export {
  WaitForAnimationSettled,
  WaitForPaint,
  EffectsLayer,
  defaultLeaveCommand,
  hide,
  resume,
  show,
  toggle,
  update,
}

// VIEW

/** Per-render view inputs passed to `view` via `h.block`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  content: Html
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
  element?: Exclude<TagName, 'textarea'>
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
export const view = AnimationComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
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
    > = Match.value(transitionState).pipe(
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

/** Complete Animation Block definition for connecting to a parent. */
export const block = AnimationComposition.makeBlock({
  init: AnimationComposition.makeInit((config: InitConfig) => ({
    model: init(config),
  })),
  update,
  view,
  expose: { show, hide, finish, toggle, resume },
  EffectsLayer,
})

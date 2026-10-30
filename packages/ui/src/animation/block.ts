import { Effect, Match } from 'effect'
import { Block } from 'foldkit'
import * as Dom from 'foldkit/dom'
import type { ChildAttribute, Html, HtmlBuilder, TagName } from 'foldkit/html'
import * as Render from 'foldkit/render'

import { idSelector } from '../internal/selectors.js'
import {
  type AnimationArgs,
  Message,
  Model,
  OutMessage,
  TransitionState,
} from './schema.js'
import {
  WaitForAnimationSettled,
  WaitForPaint,
  completeWaitForPaint,
  finishTransition,
  hideTransition,
  resetImmediately,
  resumeTransition,
  showTransition,
  toggleTransition,
  waitForLeaveSettlement,
} from './update.js'

export type { AnimationArgs, Hid, Showed } from './schema.js'
export { Message, Model, OutMessage, TransitionState }
export { WaitForAnimationSettled, WaitForPaint }

// VIEW HELPERS

/** Returns whether the transition state is a phase of the leave lifecycle. */
export const isLeaving = (transitionState: TransitionState): boolean =>
  transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'

/** Returns the data attributes that reflect a transition state:
 *  - `data-closed`: element is in its hidden/initial state
 *  - `data-enter`: enter animation is active
 *  - `data-leave`: leave animation is active
 *  - `data-transition`: any animation is active
 *
 *  Components that render their own animated element spread these onto it. */
export const transitionAttributes = <ParentMessage, MountRequirements>(
  h: HtmlBuilder<ParentMessage, MountRequirements>,
  transitionState: TransitionState,
): ReadonlyArray<
  ReturnType<HtmlBuilder<ParentMessage, MountRequirements>['DataAttribute']>
> =>
  Match.value(transitionState).pipe(
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

// BLOCK

/** Per-render input a parent passes to `model.animation.view(...)`. */
export type ViewInput = Readonly<{
  /** Renders the animated content. Runs as the parent. */
  toView: () => Html
  className?: string
  attributes?: ReadonlyArray<ChildAttribute>
  element?: Exclude<TagName, 'textarea'>
  /** When true, wraps content in a CSS grid container that smoothly animates
   *  height via `grid-template-rows: 0fr → 1fr`. The element stays in the DOM
   *  when hidden (collapsed to zero height) instead of being removed. */
  animateSize?: boolean
}>

/** Headless animation Block that coordinates CSS transitions and CSS keyframe
 *  animations via data attributes. Send it `Animation.Message.RequestedShow`,
 *  `RequestedHide`, and the other `Requested*` Messages to drive the
 *  lifecycle, and handle `StartedLeaveAnimating` and `TransitionedOut` with
 *  `.on`. */
export class Animation extends Block<Animation, AnimationArgs, ViewInput>()(
  'Animation',
  {
    Model,
    Message,
    OutMessage,
    Command: [WaitForPaint, WaitForAnimationSettled],
  },
) {}

const elementSelector = (id: string): string => idSelector(id)

/** Implements {@link Animation}. Results from an earlier transition generation
 *  leave the Model unchanged. */
export const AnimationLive = Animation.make(
  Effect.fn(function* (instanceId, { id = instanceId, isShowing = false }) {
    return {
      model: {
        id,
        isShowing,
        transitionState: 'Idle',
        transitionGeneration: 0,
      },

      update: {
        Showed: showTransition,
        Hid: hideTransition,
        RequestedShow: showTransition,
        RequestedHide: hideTransition,
        RequestedWaitForLeaveSettlement: waitForLeaveSettlement,
        RequestedFinish: (model, { generation }) =>
          finishTransition(model, generation),
        RequestedToggle: toggleTransition,
        RequestedResume: resumeTransition,
        RequestedImmediateReset: resetImmediately,
        CompletedWaitForPaint: (model, { generation }) =>
          completeWaitForPaint(model, generation),
        EndedAnimation: (model, { generation }) =>
          finishTransition(model, generation),
      },

      commands: {
        WaitForPaint: ({ generation }) =>
          Render.afterPaint.pipe(
            Effect.as(Message.CompletedWaitForPaint({ generation })),
          ),
        WaitForAnimationSettled: ({ id: elementId, generation }) =>
          Dom.waitForAnimationSettled(elementSelector(elementId)).pipe(
            Effect.as(Message.EndedAnimation({ generation })),
          ),
      },

      view: (model, h, viewInput) => {
        const { transitionState } = model
        const {
          toView,
          className,
          attributes = [],
          element = 'div',
          animateSize = false,
        } = viewInput

        const isVisible = model.isShowing || isLeaving(transitionState)
        const dataAttributes = transitionAttributes(h, transitionState)

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
                    model.id,
                    [
                      h.Id(model.id),
                      ...(isClosed && transitionState === 'Idle'
                        ? [h.DataAttribute('closed', '')]
                        : []),
                      ...dataAttributes,
                      ...(className ? [h.Class(className)] : []),
                      ...attributes,
                    ],
                    [toView()],
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
          model.id,
          [
            h.Id(model.id),
            ...dataAttributes,
            ...(className ? [h.Class(className)] : []),
            ...attributes,
          ],
          [toView()],
        )
      },
    }
  }),
)

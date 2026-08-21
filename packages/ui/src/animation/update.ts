import { Effect, Match as M, Schema as S } from 'effect'
import { type Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import * as Render from 'foldkit/render'
import { evo } from 'foldkit/struct'

import { idSelector } from '../internal/selectors.js'
import { Message, type Model, OutMessage } from './schema.js'

// UPDATE

const elementSelector = (id: string): string => idSelector(id)

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Waits for paint via double-rAF before the enter/leave lifecycle advances. */
export const WaitForPaint = Command.define('WaitForPaint', {
  messages: [Message.CompletedWaitForPaint],
  execute: Render.afterPaint.pipe(Effect.as(Message.CompletedWaitForPaint())),
})
/** Waits for all CSS animations on the element to settle. Covers both CSS transitions and CSS keyframe animations. */
export const WaitForAnimationSettled = Command.define(
  'WaitForAnimationSettled',
  {
    args: { id: S.String },
    messages: [Message.EndedAnimation],
    execute: ({ id }) =>
      Dom.waitForAnimationSettled(elementSelector(id)).pipe(
        Effect.as(Message.EndedAnimation()),
      ),
  },
)

/** Processes an animation message and returns the next model, commands, and optional OutMessage. */
export const update = (model: Model, message: Message) => {
  const maybeNextFrame = WaitForPaint()

  return Message.match<UpdateReturn>(message, {
    Showed: () => {
      if (model.isShowing) {
        return { model }
      }

      return {
        model: evo(model, {
          isShowing: () => true,
          transitionState: () => 'EnterStart',
        }),
        commands: [maybeNextFrame],
      }
    },

    Hid: () => {
      const isLeaving =
        model.transitionState === 'LeaveStart' ||
        model.transitionState === 'LeaveAnimating'

      if (isLeaving || !model.isShowing) {
        return { model }
      }

      return {
        model: evo(model, {
          isShowing: () => false,
          transitionState: () => 'LeaveStart',
        }),
        commands: [maybeNextFrame],
      }
    },

    CompletedWaitForPaint: () =>
      M.value(model.transitionState).pipe(
        withUpdateReturn,
        M.when('EnterStart', () => ({
          model: evo(model, { transitionState: () => 'EnterAnimating' }),
          commands: [WaitForAnimationSettled({ id: model.id })],
        })),
        M.when('LeaveStart', () => ({
          model: evo(model, { transitionState: () => 'LeaveAnimating' }),
          outMessage: OutMessage.StartedLeaveAnimating(),
        })),
        M.orElse(() => ({ model })),
      ),

    EndedAnimation: () =>
      M.value(model.transitionState).pipe(
        withUpdateReturn,
        M.when('EnterAnimating', () => ({
          model: evo(model, { transitionState: () => 'Idle' }),
        })),
        M.when('LeaveAnimating', () => ({
          model: evo(model, { transitionState: () => 'Idle' }),
          outMessage: OutMessage.TransitionedOut(),
        })),
        M.orElse(() => ({ model })),
      ),
  })
}

/** Creates the standard leave-phase command that waits for CSS animations on the element to settle. Use this when handling the `StartedLeaveAnimating` OutMessage for components that don't need custom leave behavior. */
export const defaultLeaveCommand = (model: Model): Command.Command<Message> =>
  WaitForAnimationSettled({ id: model.id })

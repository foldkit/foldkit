import { Effect, Match, Schema } from 'effect'
import { type Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import * as Render from 'foldkit/render'
import { evo } from 'foldkit/struct'

import { idSelector } from '../internal/selectors.js'
import {
  type Hid,
  Message,
  type Model,
  OutMessage,
  type Showed,
} from './schema.js'

// UPDATE

const elementSelector = (id: string): string => idSelector(id)

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>
const withUpdateReturn = Match.withReturnType<UpdateReturn>()

/** Waits for paint via double-rAF before the enter/leave lifecycle advances. */
export const WaitForPaint = Command.define('WaitForPaint', {
  messages: [Message.CompletedWaitForPaint],
  execute: Render.afterPaint.pipe(Effect.as(Message.CompletedWaitForPaint())),
})
/** Waits for all CSS animations on the element to settle. Covers both CSS transitions and CSS keyframe animations. */
export const WaitForAnimationSettled = Command.define(
  'WaitForAnimationSettled',
  {
    args: { id: Schema.String },
    messages: [Message.EndedAnimation],
    execute: ({ id }) =>
      Dom.waitForAnimationSettled(elementSelector(id)).pipe(
        Effect.as(Message.EndedAnimation()),
      ),
  },
)

/** Processes an Animation Message and returns the next Model, optional
 *  Commands, and an optional OutMessage. `Showed` and `Hid` start a transition
 *  but cannot finish one, so direct calls with either Message return a plain
 *  update result. */
export function update(
  model: Model,
  message: Showed | Hid,
): Update.Return<Model, Message>
export function update(model: Model, message: Message): UpdateReturn
export function update(model: Model, message: Message): UpdateReturn {
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
      Match.value(model.transitionState).pipe(
        withUpdateReturn,
        Match.when('EnterStart', () => ({
          model: evo(model, { transitionState: () => 'EnterAnimating' }),
          commands: [WaitForAnimationSettled({ id: model.id })],
        })),
        Match.when('LeaveStart', () => ({
          model: evo(model, { transitionState: () => 'LeaveAnimating' }),
          outMessage: OutMessage.StartedLeaveAnimating(),
        })),
        Match.orElse(() => ({ model })),
      ),

    EndedAnimation: () =>
      Match.value(model.transitionState).pipe(
        withUpdateReturn,
        Match.when('EnterAnimating', () => ({
          model: evo(model, { transitionState: () => 'Idle' }),
        })),
        Match.when('LeaveAnimating', () => ({
          model: evo(model, { transitionState: () => 'Idle' }),
          outMessage: OutMessage.TransitionedOut(),
        })),
        Match.orElse(() => ({ model })),
      ),
  })
}

/** Programmatically starts the enter lifecycle. */
export const show = (model: Model): Update.Return<Model, Message> =>
  update(model, Message.Showed())

/** Programmatically starts the leave lifecycle. */
export const hide = (model: Model): Update.Return<Model, Message> =>
  update(model, Message.Hid())

/** Toggles the animation between its shown and hidden states. */
export const toggle = (model: Model): Update.Return<Model, Message> => {
  if (model.isShowing) {
    return hide(model)
  } else {
    return show(model)
  }
}

/** Creates the standard leave-phase command that waits for CSS animations on the element to settle. Use this when handling the `StartedLeaveAnimating` OutMessage for components that don't need custom leave behavior. */
export const defaultLeaveCommand = (model: Model): Command.Command<Message> =>
  WaitForAnimationSettled({ id: model.id })

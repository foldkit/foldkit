import { Effect, Layer, Match, Number, Schema } from 'effect'
import { Update } from 'foldkit'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import * as Render from 'foldkit/render'
import { modifyFields } from 'foldkit/struct'

import { idSelector } from '../internal/selectors.js'
import { type Hid, Message, Model, OutMessage, type Showed } from './schema.js'

/** Authored Animation Block definition shared by its implementation modules. */
export const Animation = Block.define('Animation', {
  Model,
  Message,
  OutMessage,
})

export const AnimationComposition = Animation.makeComposition()

// UPDATE

const elementSelector = (id: string): string => idSelector(id)

/** Waits for paint via double-rAF, then reports the transition generation that
 *  scheduled the wait. */
export const WaitForPaint = Animation.command('WaitForPaint', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedWaitForPaint],
  handler: function* () {
    return ({ generation }) =>
      Render.afterPaint.pipe(
        Effect.as(Message.CompletedWaitForPaint({ generation })),
      )
  },
})

/** Waits for all CSS transitions and keyframe animations on the element to
 *  settle, then reports the transition generation that scheduled the wait. */
export const WaitForAnimationSettled = Animation.command(
  'WaitForAnimationSettled',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.EndedAnimation],
    handler: function* () {
      return ({ id, generation }) =>
        Dom.waitForAnimationSettled(elementSelector(id)).pipe(
          Effect.as(Message.EndedAnimation({ generation })),
        )
    },
  },
)

/** Effect providers used by the Animation component. */
export const EffectsLayer = Layer.mergeAll(
  WaitForPaint.layer,
  WaitForAnimationSettled.layer,
)

const showTransition = (model: Model) => {
  if (model.isShowing) {
    return { model }
  }

  const nextTransitionGeneration = Number.increment(model.transitionGeneration)

  return {
    model: modifyFields(model, {
      isShowing: () => true,
      transitionState: () => 'EnterStart',
      transitionGeneration: () => nextTransitionGeneration,
    }),
    commands: [WaitForPaint({ generation: nextTransitionGeneration })],
  }
}

const hideTransition = (model: Model) => {
  const isLeaving =
    model.transitionState === 'LeaveStart' ||
    model.transitionState === 'LeaveAnimating'

  if (isLeaving || !model.isShowing) {
    return { model }
  }

  const nextTransitionGeneration = Number.increment(model.transitionGeneration)

  return {
    model: modifyFields(model, {
      isShowing: () => false,
      transitionState: () => 'LeaveStart',
      transitionGeneration: () => nextTransitionGeneration,
    }),
    commands: [WaitForPaint({ generation: nextTransitionGeneration })],
  }
}

/** Processes an Animation Message and returns the next Model, optional
 *  Commands, and an optional OutMessage. `Showed` and `Hid` start a transition
 *  but cannot finish one, so direct calls with either Message return a plain
 *  update result. Results from an earlier transition generation leave the Model
 *  unchanged. */
const updateInferred = AnimationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    Showed: () => showTransition(model),

    Hid: () => hideTransition(model),

    CompletedWaitForPaint: ({ generation }) => {
      if (generation !== model.transitionGeneration) {
        return { model }
      }

      return Match.value(model.transitionState).pipe(
        Match.when('EnterStart', () => ({
          model: modifyFields(model, {
            transitionState: () => 'EnterAnimating',
          }),
          commands: [
            WaitForAnimationSettled({
              id: model.id,
              generation: model.transitionGeneration,
            }),
          ],
        })),
        Match.when('LeaveStart', () => ({
          model: modifyFields(model, {
            transitionState: () => 'LeaveAnimating',
          }),
          outMessage: OutMessage.StartedLeaveAnimating({
            generation: model.transitionGeneration,
          }),
        })),
        Match.orElse(() => ({ model })),
      )
    },

    EndedAnimation: ({ generation }) => {
      if (generation !== model.transitionGeneration) {
        return { model }
      }

      return Match.value(model.transitionState).pipe(
        Match.when('EnterAnimating', () => ({
          model: modifyFields(model, { transitionState: () => 'Idle' }),
        })),
        Match.when('LeaveAnimating', () => ({
          model: modifyFields(model, { transitionState: () => 'Idle' }),
          outMessage: OutMessage.TransitionedOut(),
        })),
        Match.orElse(() => ({ model })),
      )
    },
  }),
)

type UpdateRequirements = Update.RequirementsOf<typeof updateInferred>
type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  UpdateRequirements
>

export function update(
  model: Model,
  message: Showed | Hid,
): Update.Return<Model, Message, UpdateRequirements>
export function update(model: Model, message: Message): UpdateReturn
export function update(model: Model, message: Message): UpdateReturn {
  return updateInferred(model, message)
}

/** Programmatically starts the enter lifecycle. */
export const show = Animation.step(showTransition)

/** Programmatically starts the leave lifecycle. */
export const hide = Animation.step(hideTransition)

/** Completes the current transition generation. Results from an earlier
 * generation leave the Model unchanged. */
export const finish = Animation.step((model, generation: number) =>
  update(model, Message.EndedAnimation({ generation })),
)

/** Toggles the animation between its shown and hidden states. */
export const toggle = Animation.step(model => {
  if (model.isShowing) {
    return hide(model)
  } else {
    return show(model)
  }
})

/** Resumes the pending transition Command after a mounted parent reacquires
 *  lifecycle resources for a preserved Animation Model. */
export const resume = Animation.step(model =>
  Match.value(model.transitionState).pipe(
    Match.when('Idle', () => ({ model })),
    Match.whenOr('EnterStart', 'LeaveStart', () => ({
      model,
      commands: [WaitForPaint({ generation: model.transitionGeneration })],
    })),
    Match.whenOr('EnterAnimating', 'LeaveAnimating', () => ({
      model,
      commands: [defaultLeaveCommand(model)],
    })),
    Match.exhaustive,
  ),
)

/** Creates the standard leave Command for the Model's current transition. Use
 *  this when handling `StartedLeaveAnimating` unless the component needs its
 *  own settlement strategy. */
export const defaultLeaveCommand = (model: Model) =>
  WaitForAnimationSettled({
    id: model.id,
    generation: model.transitionGeneration,
  })

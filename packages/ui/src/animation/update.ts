import { Match, Number, Schema } from 'effect'
import * as Command from 'foldkit/command'
import { modifyFields } from 'foldkit/struct'

import { Message, type Model, OutMessage } from './schema.js'

// COMMAND

/** Waits for paint via double-rAF, then reports the transition generation that
 *  scheduled the wait. */
export const WaitForPaint = Command.define('WaitForPaint', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedWaitForPaint],
})

/** Waits for all CSS transitions and keyframe animations on the element to
 *  settle, then reports the transition generation that scheduled the wait. */
export const WaitForAnimationSettled = Command.define(
  'WaitForAnimationSettled',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.EndedAnimation],
  },
)

// UPDATE

/** Starts the enter lifecycle unless Animation is already showing. */
export const showTransition = (model: Model) => {
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

/** Starts the leave lifecycle unless Animation is hidden or already leaving. */
export const hideTransition = (model: Model) => {
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

/** Completes the current transition generation. A leave completion reports
 *  `TransitionedOut`. Other generations leave the Model unchanged. */
export const finishTransition = (model: Model, generation: number) => {
  if (generation !== model.transitionGeneration) {
    return { model }
  }

  if (model.transitionState === 'EnterAnimating') {
    return {
      model: modifyFields(model, { transitionState: () => 'Idle' }),
    }
  } else if (model.transitionState === 'LeaveAnimating') {
    return {
      model: modifyFields(model, { transitionState: () => 'Idle' }),
      outMessage: OutMessage.TransitionedOut(),
    }
  } else {
    return { model }
  }
}

/** Waits for the leave animation to settle while leave is animating. */
export const waitForLeaveSettlement = (model: Model) => {
  if (model.transitionState !== 'LeaveAnimating') {
    return { model }
  }

  return {
    model,
    commands: [
      WaitForAnimationSettled({
        id: model.id,
        generation: model.transitionGeneration,
      }),
    ],
  }
}

/** Shows a hidden Animation or hides a showing one. */
export const toggleTransition = (model: Model) => {
  if (model.isShowing) {
    return hideTransition(model)
  } else {
    return showTransition(model)
  }
}

/** Requests the wait that the current transition phase is pending on. */
export const resumeTransition = (model: Model) =>
  Match.value(model.transitionState).pipe(
    Match.when('Idle', () => ({ model })),
    Match.whenOr('EnterStart', 'LeaveStart', () => ({
      model,
      commands: [WaitForPaint({ generation: model.transitionGeneration })],
    })),
    Match.whenOr('EnterAnimating', 'LeaveAnimating', () => ({
      model,
      commands: [
        WaitForAnimationSettled({
          id: model.id,
          generation: model.transitionGeneration,
        }),
      ],
    })),
    Match.exhaustive,
  )

/** Hides Animation immediately without completing the current transition. */
export const resetImmediately = (model: Model) => ({
  model: modifyFields(model, {
    isShowing: () => false,
    transitionState: () => 'Idle',
  }),
})

/** Advances a transition after paint. Results from an earlier transition
 *  generation leave the Model unchanged. */
export const completeWaitForPaint = (model: Model, generation: number) => {
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
}

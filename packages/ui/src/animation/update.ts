import { Match, Number } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { WaitForAnimationSettled, WaitForPaint } from './command.js'
import { AnimationComposition } from './composition.js'
import { AnimationBlock } from './definition.js'
import { type Model, OutMessage } from './schema.js'

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

const finishTransition = (model: Model, generation: number) => {
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

const waitForLeaveSettlement = (model: Model) => {
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

const toggleTransition = (model: Model) => {
  if (model.isShowing) {
    return hideTransition(model)
  } else {
    return showTransition(model)
  }
}

const resumeTransition = (model: Model) =>
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

const resetImmediately = AnimationBlock.makeFieldsStep(() => ({
  isShowing: () => false,
  transitionState: () => 'Idle',
}))

/** Processes an Animation Message and returns the next Model, optional
 *  Commands, and an optional OutMessage. Results from an earlier transition
 *  generation leave the Model unchanged. */
export const update = AnimationComposition.makeUpdate({
  Showed: showTransition,

  Hid: hideTransition,

  RequestedFinish: (model, { generation }) =>
    finishTransition(model, generation),

  CompletedWaitForPaint: (model, { generation }) => {
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

  EndedAnimation: (model, { generation }) =>
    finishTransition(model, generation),
})

/** Applies parent requests through the same owned transition Steps. */
export const inMessageUpdate = AnimationComposition.makeInMessageUpdate({
  RequestedShow: showTransition,

  RequestedHide: hideTransition,

  RequestedWaitForLeaveSettlement: waitForLeaveSettlement,

  RequestedToggle: toggleTransition,

  RequestedResume: resumeTransition,

  RequestedImmediateReset: resetImmediately,
})

export {
  WaitForPaint,
  WaitForAnimationSettled,
  EffectsLayer,
} from './command.js'

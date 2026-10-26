import { Effect, Layer, Match, Number, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import * as Render from 'foldkit/render'
import { modifyFields } from 'foldkit/struct'

import { idSelector } from '../internal/selectors.js'
import {
  type InitConfig,
  Message,
  Model,
  OutMessage,
  makeInitialModel,
} from './schema.js'

/** Authored Animation Block definition shared by its implementation modules. */
export const AnimationDefinition = Block.makeDefinition('Animation', {
  Model,
  Message,
  OutMessage,
})

export const AnimationComposition = AnimationDefinition.makeComposition()

/** Creates the initial Animation Model and Commands. Defaults to hidden. */
export const init = AnimationComposition.makeInit((config: InitConfig) => ({
  model: makeInitialModel(config),
}))

// UPDATE

const elementSelector = (id: string): string => idSelector(id)

/** Waits for paint via double-rAF, then reports the transition generation that
 *  scheduled the wait. */
export const WaitForPaint = AnimationDefinition.makeCommand('WaitForPaint', {
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
export const WaitForAnimationSettled = AnimationDefinition.makeCommand(
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

const resetImmediatelyStep = AnimationDefinition.makeFieldsStep(() => ({
  isShowing: () => false,
  transitionState: () => 'Idle',
}))

/** Processes an Animation Message and returns the next Model, optional
 *  Commands, and an optional OutMessage. Results from an earlier transition
 *  generation leave the Model unchanged. */
export const update = AnimationComposition.makeUpdate({
  Showed: showTransition,

  Hid: hideTransition,

  RequestedShow: showTransition,

  RequestedHide: hideTransition,

  RequestedWaitForLeaveSettlement: waitForLeaveSettlement,

  RequestedFinish: (model, { generation }) =>
    finishTransition(model, generation),

  RequestedToggle: toggleTransition,

  RequestedResume: resumeTransition,

  RequestedImmediateReset: resetImmediatelyStep,

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

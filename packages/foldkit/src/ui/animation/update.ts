import { Effect, Match as M, Option } from 'effect'

import * as Command from '../../command'
import { evo } from '../../struct'
import * as Task from '../../task'
import {
  AdvancedAnimationFrame,
  EndedAnimation,
  type Message,
  type Model,
  type OutMessage,
  StartedLeaveAnimating,
  TransitionedOut,
} from './schema'

// UPDATE

const elementSelector = (id: string): string => `#${id}`

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Advances the enter/leave lifecycle by waiting a double-rAF. */
export const RequestFrame = Command.define(
  'RequestFrame',
  AdvancedAnimationFrame,
)
/** Waits for all CSS animations on the element to settle. Covers both CSS transitions and CSS keyframe animations. */
export const WaitForAnimationSettled = Command.define(
  'WaitForAnimationSettled',
  EndedAnimation,
)

/** Processes an animation message and returns the next model, commands, and optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeNextFrame = RequestFrame(
    Task.nextFrame.pipe(Effect.as(AdvancedAnimationFrame())),
  )

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Showed: () => {
        if (model.isShowing) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, {
            isShowing: () => true,
            transitionState: () => 'EnterStart',
          }),
          [maybeNextFrame],
          Option.none(),
        ]
      },

      Hid: () => {
        const isLeaving =
          model.transitionState === 'LeaveStart' ||
          model.transitionState === 'LeaveAnimating'

        if (isLeaving || !model.isShowing) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, {
            isShowing: () => false,
            transitionState: () => 'LeaveStart',
          }),
          [maybeNextFrame],
          Option.none(),
        ]
      },

      AdvancedAnimationFrame: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterStart', () => [
            evo(model, { transitionState: () => 'EnterAnimating' }),
            [
              WaitForAnimationSettled(
                Task.waitForAnimationSettled(elementSelector(model.id)).pipe(
                  Effect.as(EndedAnimation()),
                ),
              ),
            ],
            Option.none(),
          ]),
          M.when('LeaveStart', () => [
            evo(model, { transitionState: () => 'LeaveAnimating' }),
            [],
            Option.some(StartedLeaveAnimating()),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      EndedAnimation: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
            Option.none(),
          ]),
          M.when('LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
            Option.some(TransitionedOut()),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),
    }),
  )
}

/** Creates the standard leave-phase command that waits for CSS animations on the element to settle. Use this when handling the `StartedLeaveAnimating` OutMessage for components that don't need custom leave behavior. */
export const defaultLeaveCommand = (model: Model): Command.Command<Message> =>
  WaitForAnimationSettled(
    Task.waitForAnimationSettled(elementSelector(model.id)).pipe(
      Effect.as(EndedAnimation()),
    ),
  )

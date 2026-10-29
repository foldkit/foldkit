import { Array, Match, Number, flow } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { checkoutMachine } from './machine'
import { type Message } from './message'
import type { Model, TransitionLogEntry } from './model'

export const TRANSITION_LOG_LIMIT = 20

const resultToTransitionSummary = (
  result: ReturnType<typeof checkoutMachine.step>,
): string =>
  Match.value(result).pipe(
    Match.tagsExhaustive({
      Transitioned: ({ from, messageTag, target }) =>
        `${from} -> ${target} on ${messageTag}`,
      Ignored: ({ messageTag, stateTag }) =>
        `${messageTag} ignored in ${stateTag}`,
    }),
  )

export const stepMachine = (message: Message) => (model: Model) => {
  const result = checkoutMachine.step(model.checkout, message)

  const { state: nextCheckout } = result

  const transitionCommands = Match.value(result).pipe(
    Match.tagsExhaustive({
      Transitioned: ({ commands }) => commands,
      Ignored: () => [],
    }),
  )

  const transitionLogEntry: TransitionLogEntry = {
    id: model.nextTransitionLogId,
    summary: resultToTransitionSummary(result),
  }

  return {
    model: modifyFields(model, {
      checkout: () => nextCheckout,
      transitionLog: flow(
        Array.prepend(transitionLogEntry),
        Array.take(TRANSITION_LOG_LIMIT),
      ),
      nextTransitionLogId: Number.increment,
    }),
    commands: transitionCommands,
  }
}

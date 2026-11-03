import { Predicate } from 'effect'

import type { SimulationUpdateReturn } from '../../../test/internal.js'

/** A passive input cause resolved against a Block-aware test's acquired graph. */
export interface InMessageStep<Input> {
  readonly _tag: 'BlockInMessageStep'
  readonly input: Input
}

/** Delivers a decoded InMessage through the acquired Block's pure receiver.
 * Commands remain pending and their results continue through local update. */
export const inMessage = <const Input>(input: Input): InMessageStep<Input> =>
  Object.freeze({ _tag: 'BlockInMessageStep', input })

type InputExecutor = (model: unknown, input: unknown) => unknown
const executions = new WeakMap<object, (model: unknown) => unknown>()

/** @internal Binds reusable input causes to one acquired test without mutating them. */
export const resolveInMessageSteps = (
  steps: ReadonlyArray<unknown>,
  inMessageUpdate: InputExecutor,
): ReadonlyArray<unknown> => {
  const resolve = (step: unknown): unknown => {
    if (Predicate.isTagged(step, 'BlockInMessageStep')) {
      const input: unknown = Reflect.get(step, 'input')
      const resolved = inMessage(input)
      executions.set(resolved, model => inMessageUpdate(model, input))
      return resolved
    }

    if (
      Predicate.isTagged(step, 'StoryStepsStep') ||
      Predicate.isTagged(step, 'InsideStep')
    ) {
      const nested: unknown = Reflect.get(step, 'steps')

      if (globalThis.Array.isArray(nested)) {
        return { ...step, steps: nested.map(resolve) }
      }
    }

    return step
  }

  return steps.map(resolve)
}

/** @internal Applies only an input cause resolved by a Block-aware test. */
export const runInMessageStep = <Model, OutMessage>(
  step: object,
  model: Model,
): SimulationUpdateReturn<Model, OutMessage> => {
  const execute = executions.get(step)

  if (execute === undefined) {
    throw new Error(
      '[foldkit] inMessage requires a Block-aware Story or Scene to acquire its receiver.',
    )
  }

  const result = execute(model)

  if (!Predicate.isObject(result) || !Object.hasOwn(result, 'model')) {
    throw new Error(
      '[foldkit] A test receiver must return a transition result.',
    )
  }

  const commands: unknown = Reflect.get(result, 'commands')

  if (commands !== undefined && !globalThis.Array.isArray(commands)) {
    throw new Error(
      '[foldkit] A test receiver commands field must be an array.',
    )
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return result as SimulationUpdateReturn<Model, OutMessage>
}

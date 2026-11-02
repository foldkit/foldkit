import { outMessagePoliciesOf } from './outMessagePolicyRuntime.js'

/** @internal Supplies constructor-owned recipe connections to an executable Composition. */
export const ExecutionEnvironmentTypeId = Symbol(
  'foldkit/Block/ExecutionEnvironment',
)

let currentChildBindings: ReadonlyArray<object> | undefined
const compositionGraphs = new WeakMap<object, ReadonlyArray<object>>()

/** @internal Associates a Composition with its frozen normalized child graph. */
export const registerCompositionOperationGraph = (
  composition: object,
  bindings: ReadonlyArray<object>,
): void => {
  if (!Object.isFrozen(bindings) || compositionGraphs.has(composition)) {
    throw new Error(
      '[foldkit] A Composition must retain one frozen operation graph.',
    )
  }

  compositionGraphs.set(composition, bindings)
}

/** @internal Reuses the original child identities and policies for every executor. */
export const compositionOperationGraphOf = (
  composition: object,
): ReadonlyArray<object> => {
  const graph = compositionGraphs.get(composition)

  if (graph === undefined) {
    throw new Error(
      '[foldkit] Operation execution requires an original Composition graph.',
    )
  }

  return graph
}

/** @internal Reads a Binding's policy from the active exact Composition graph. */
export const activeBindingOutMessagePolicy = (
  binding: object,
  placement: string,
) => {
  const policy =
    currentChildBindings === undefined
      ? undefined
      : outMessagePoliciesOf(currentChildBindings)?.get(binding)

  if (policy === undefined) {
    throw new Error(
      `[foldkit] Binding "${placement}" has no OutMessage policy in the active Composition graph.`,
    )
  }

  return policy
}

/** @internal Runs a synchronous Block operation with its direct child graph active. */
export const withOperationGraph = <Value>(
  bindings: ReadonlyArray<object>,
  operation: () => Value,
): Value => {
  const previousChildBindings = currentChildBindings
  currentChildBindings = bindings

  try {
    return operation()
  } finally {
    currentChildBindings = previousChildBindings
  }
}

/** @internal Rejects a bound operation outside its exact registered parent graph. */
export const assertRegisteredBinding = (
  binding: object,
  placement: string,
): void => {
  if (
    currentChildBindings === undefined ||
    !currentChildBindings.includes(binding)
  ) {
    throw new Error(
      `[foldkit] The child binding at placement "${placement}" is not registered in the current Block graph.`,
    )
  }
}

/** @internal Checks whether a Binding belongs to the active exact graph. */
export const isRegisteredBinding = (binding: object): boolean =>
  currentChildBindings !== undefined && currentChildBindings.includes(binding)

/** @internal Requires initialization to execute within an exact registered graph. */
export const assertRegisteredInitialization = (
  binding: object,
  placement: string,
): void => {
  if (currentChildBindings === undefined) {
    throw new Error(
      `[foldkit] Initializing child Binding "${placement}" requires its registered Composition.`,
    )
  }
  assertRegisteredBinding(binding, placement)
}

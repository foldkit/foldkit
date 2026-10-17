let currentChildBindings: ReadonlyArray<object> | undefined

/** @internal Runs a synchronous Block operation with its direct child graph active. */
export const withOperationGraph = <Value>(
  childBindings: ReadonlyArray<object>,
  operation: () => Value,
): Value => {
  const previousChildBindings = currentChildBindings
  currentChildBindings = childBindings

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

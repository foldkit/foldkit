import { Predicate } from 'effect'

import { registerBindingAlias, runtimeBindingOf } from './composition.js'
import { activeBindingOutMessagePolicy } from './operationGraph.js'
import {
  isOutMessageHandler,
  validateOutMessageHandler,
} from './outMessageHandlers.js'
import type { RuntimeOutMessagePolicy } from './outMessagePolicyRuntime.js'

type RuntimeBinding = Readonly<{ placement: string }>

/** @internal One policy-equipped value and its original child occurrence. */
export type SelectedBindingOutMessagePolicy = Readonly<{
  binding: RuntimeBinding
  outMessage: RuntimeOutMessagePolicy
}>

const bindingsRequiringPolicy = new WeakSet<object>()
const selectedPolicies = new WeakMap<object, SelectedBindingOutMessagePolicy>()

const snapshotPolicy = (
  binding: RuntimeBinding,
  value: unknown,
  isKeyed: boolean,
): RuntimeOutMessagePolicy => {
  if (!Predicate.isObject(value) || globalThis.Array.isArray(value)) {
    throw new Error(
      `[foldkit] Binding "${binding.placement}" withOutMessagePolicy requires a policy object.`,
    )
  }

  for (const field of Reflect.ownKeys(value)) {
    if (field !== 'fold' && field !== 'forward') {
      throw new Error(
        `[foldkit] Binding "${binding.placement}" OutMessage policy does not support "${globalThis.String(field)}".`,
      )
    }
  }

  const fold = Reflect.get(value, 'fold')
  const forward = Reflect.get(value, 'forward')

  if (fold === undefined && forward === undefined) {
    throw new Error(
      `[foldkit] Binding "${binding.placement}" OutMessage policy requires fold or forward.`,
    )
  }

  if (fold !== undefined && !Predicate.isFunction(fold)) {
    throw new Error(
      `[foldkit] Binding "${binding.placement}" outMessage.fold must be a function. Use Definition.makeOutMessageFold to author exhaustive handlers.`,
    )
  }

  if (forward !== undefined && !Predicate.isFunction(forward)) {
    throw new Error(
      `[foldkit] Binding "${binding.placement}" outMessage.forward must be a function. Use Definition.makeOutMessageForward to author exhaustive handlers.`,
    )
  }

  if (
    forward !== undefined &&
    runtimeBindingOf(binding).parentContract?.OutMessage === undefined
  ) {
    throw new Error(
      `[foldkit] Binding "${binding.placement}" forwarding requires an OutMessage Schema on its parent Definition.`,
    )
  }

  const child = runtimeBindingOf(binding).block
  validateOutMessageHandler(fold, child, 'fold')
  validateOutMessageHandler(forward, child, 'forward')

  return Object.freeze({
    ...(fold === undefined
      ? {}
      : {
          fold: (...args: ReadonlyArray<any>) => {
            if (!isKeyed) {
              return Reflect.apply(fold, undefined, args)
            }

            const [_key, outMessage, context] = args

            if (isOutMessageHandler(fold)) {
              return fold(outMessage, context)
            }

            const step = Reflect.apply(fold, undefined, args)

            if (isOutMessageHandler(step)) {
              validateOutMessageHandler(step, child, 'fold')

              return step(outMessage, context)
            }

            return step
          },
        }),
    ...(forward === undefined
      ? {}
      : {
          forward: (...args: ReadonlyArray<any>) =>
            Reflect.apply(forward, undefined, args),
        }),
  })
}

/** @internal Installs immutable policy selection without replacing Binding methods. */
export const attachOutMessagePolicy = (
  binding: RuntimeBinding,
  isKeyed: boolean,
): void => {
  bindingsRequiringPolicy.add(binding)

  Object.defineProperty(binding, 'withOutMessagePolicy', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: (policy: unknown): object => {
      const outMessage = snapshotPolicy(binding, policy, isKeyed)
      const configured: object = Object.create(
        Object.getPrototypeOf(binding),
        Object.getOwnPropertyDescriptors(binding),
      )

      registerBindingAlias(configured, binding)
      selectedPolicies.set(configured, { binding, outMessage })

      return Object.freeze(configured)
    },
  })
}

/** @internal Reads the policy selected by a full Binding value. */
export const selectedBindingOutMessagePolicyOf = (
  value: object,
): SelectedBindingOutMessagePolicy | undefined => selectedPolicies.get(value)

/** @internal Whether an original Binding needs a policy before registration. */
export const bindingRequiresOutMessagePolicy = (binding: object): boolean =>
  bindingsRequiringPolicy.has(binding)

/** @internal Defers OutMessage handling until a Composition selects its policy. */
export const deferredOutMessagePolicy = (
  readBinding: () => RuntimeBinding,
): RuntimeOutMessagePolicy => ({
  fold: (...args) => {
    const binding = readBinding()
    const policy = activeBindingOutMessagePolicy(binding, binding.placement)

    if (policy.fold === undefined) {
      return (model: unknown) => ({ model })
    }

    return policy.fold(...args)
  },
  forward: (...args) => {
    const binding = readBinding()
    const policy = activeBindingOutMessagePolicy(binding, binding.placement)

    return policy.forward?.(...args)
  },
})

/** @internal Reuses an already validated immutable policy on a connected occurrence. */
export const copyBindingOutMessagePolicy = (
  source: object,
  target: RuntimeBinding,
): object => {
  const selection = selectedPolicies.get(source)
  if (selection === undefined) {
    return target
  }

  const configured: object = Object.create(
    Object.getPrototypeOf(target),
    Object.getOwnPropertyDescriptors(target),
  )
  registerBindingAlias(configured, target)
  selectedPolicies.set(configured, {
    binding: target,
    outMessage: selection.outMessage,
  })
  return Object.freeze(configured)
}

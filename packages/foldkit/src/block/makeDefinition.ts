import { Predicate } from 'effect'

import {
  makeDefinition as makeContractDefinition,
  makeDefinitionRuntime,
} from '../experimental/contracted/runtime.js'
import { makeDefinition as makeNativeDefinition } from './define.js'

/** @internal Dispatches a canonical declaration without changing namespace ownership. */
export const defineWithNamespace = (
  id: string,
  config: unknown,
  makeNative: (config: unknown) => object,
): any => {
  if (Predicate.isObject(config) && ('key' in config || 'Init' in config)) {
    if (!('key' in config) || !('Init' in config)) {
      throw new Error(
        '[foldkit] An independent Block Definition requires both a unique symbol key and an Init contract.',
      )
    }

    const sourceDefinition = makeNative({
      Model: Reflect.get(config, 'Model'),
      Message: Reflect.get(config, 'Message'),
      OutMessage: Reflect.get(config, 'OutMessage'),
      ChildInitContext: Reflect.get(config, 'ChildInitContext'),
    })

    return Reflect.apply(makeDefinitionRuntime, undefined, [
      id,
      config,
      true,
      sourceDefinition,
    ])
  }

  return makeNative(config)
}

/**
 * Establishes one Block's typed authoring contracts. A declaration with a
 * unique `key` and `Init` contract supports independently supplied construction
 * through `Definition.makeBlock`. Schema-only declarations retain native
 * Composition preparation and assembly.
 *
 * An optional `InMessage` Schema declares parent requests separately from local
 * `Message` facts. Author its exhaustive handlers with `Composition.makeReceive`
 * and return `receive` from the constructor. Bindings generate `requestX` and
 * `informX` methods from `RequestedX` and `InformedOfX` variants.
 */
export const makeDefinition: typeof makeContractDefinition &
  typeof makeNativeDefinition = (
  id: string,
  config: unknown,
  ...validation: ReadonlyArray<unknown>
): any => {
  if (Predicate.isObject(config) && ('key' in config || 'Init' in config)) {
    if (!('key' in config) || !('Init' in config)) {
      throw new Error(
        '[foldkit] An independent Block Definition requires both a unique symbol key and an Init contract.',
      )
    }

    return Reflect.apply(makeContractDefinition, undefined, [
      id,
      config,
      ...validation,
    ])
  }

  return Reflect.apply(makeNativeDefinition, undefined, [id, config])
}

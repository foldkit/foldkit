import { Predicate } from 'effect'

import {
  makeDefinition as makeContractDefinition,
  makeDefinitionRuntime,
  snapshotDefinitionConfiguration,
} from '../experimental/contracted/runtime.js'
import { makeDefinition as makeNativeDefinition } from './define.js'

/** @internal Dispatches a canonical declaration without changing namespace ownership. */
export const defineWithNamespace = (
  id: string,
  config: unknown,
  makeNative: (config: unknown) => object,
): any => {
  if (Predicate.isObject(config) && ('key' in config || 'InitArgs' in config)) {
    const snapshot = Reflect.apply(snapshotDefinitionConfiguration, undefined, [
      config,
    ])

    if (!('key' in snapshot) || !('InitArgs' in snapshot)) {
      throw new Error(
        '[foldkit] An independent Block Definition requires both a unique symbol key and an InitArgs contract.',
      )
    }

    const sourceDefinition = makeNative({
      Model: Reflect.get(snapshot, 'Model'),
      Message: Reflect.get(snapshot, 'Message'),
      OutMessage: Reflect.get(snapshot, 'OutMessage'),
      ChildInitContext: Reflect.get(snapshot, 'ChildInitContext'),
    })

    return Reflect.apply(makeDefinitionRuntime, undefined, [
      id,
      snapshot,
      true,
      sourceDefinition,
    ])
  }

  return makeNative(config)
}

/**
 * Establishes one Block's typed authoring contracts. A declaration with a
 * unique `key` and `InitArgs` contract supports independently supplied construction
 * through `Definition.makeBlock`. Schema-only declarations retain native
 * Composition preparation and assembly.
 *
 * An optional `InMessage` Schema declares parent requests separately from local
 * `Message` facts. Author its exhaustive handlers with `Composition.makeInMessageUpdate`
 * and return `inMessageUpdate` from the constructor. Bindings generate `requestX` and
 * `informOfX` methods from `RequestedX` and `InformedOfX` variants.
 */
export const makeDefinition: typeof makeContractDefinition &
  typeof makeNativeDefinition = (
  id: string,
  config: unknown,
  ...validation: ReadonlyArray<unknown>
): any => {
  if (Predicate.isObject(config) && ('key' in config || 'InitArgs' in config)) {
    const snapshot = Reflect.apply(snapshotDefinitionConfiguration, undefined, [
      config,
    ])

    if (!('key' in snapshot) || !('InitArgs' in snapshot)) {
      throw new Error(
        '[foldkit] An independent Block Definition requires both a unique symbol key and an InitArgs contract.',
      )
    }

    return Reflect.apply(makeContractDefinition, undefined, [
      id,
      snapshot,
      ...validation,
    ])
  }

  return Reflect.apply(makeNativeDefinition, undefined, [id, config])
}

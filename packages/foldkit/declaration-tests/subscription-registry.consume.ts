import { Layer } from 'effect'

import {
  type EmptyRegistryLayer,
  type ExactLayerProof,
  type RegistryLayer,
  aggregated,
  gatedDependencies,
  lifted,
  lowLevelGated,
  registryBlock,
} from './subscription-registry.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type AggregateLayerIsExact = Expect<
  Equal<RegistryLayer, ExactLayerProof>
>
export type EmptyLayerIsExact = Expect<
  Equal<EmptyRegistryLayer, Layer.Layer<never>>
>
export type AggregateKeysAreEntries = Expect<
  Equal<keyof typeof aggregated, 'clock' | 'logger'>
>
export type LiftedKeysAreEntries = Expect<
  Equal<keyof typeof lifted, 'clock' | 'logger'>
>
export type BlockKeysAreEntries = Expect<
  Equal<keyof typeof registryBlock.subscriptions, 'clock' | 'logger'>
>
export type GatedProjectionIsExact = Expect<
  Equal<
    ReturnType<typeof gatedDependencies.count.modelToDependencies>,
    Readonly<{ count: number }>
  >
>
export type GatedKeepAliveReadIsExact = Expect<
  Equal<
    ReturnType<
      Parameters<typeof gatedDependencies.retainedCount.dependenciesToStream>[1]
    >,
    Readonly<{ count: number }>
  >
>
export type GatedHostContractIsExact = Expect<
  Equal<
    ReturnType<typeof lowLevelGated.clock.modelToDependencies>,
    Record<string, never>
  >
>

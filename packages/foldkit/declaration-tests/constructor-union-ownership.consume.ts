import { type Layer } from 'effect'

import {
  alignedLayer,
  alignedParentLayer,
  correlatedEffectsLayer,
  correlatedInputLayer,
  firstLayer,
} from './constructor-union-ownership.accepted.js'

type Assert<Value extends true> = Value
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

export type NoConstructorError = Assert<
  Equal<Layer.Error<ReturnType<typeof alignedLayer>>, never>
>
export type NoConstructorRequirements = Assert<
  Equal<Layer.Services<typeof firstLayer>, never>
>
export const selectedLayer = alignedLayer(true)
export type NoParentConstructorRequirements = Assert<
  Equal<Layer.Services<ReturnType<typeof alignedParentLayer>>, never>
>
export type CorrelatedConstructorRequirements = Assert<
  Equal<Layer.Services<ReturnType<typeof correlatedEffectsLayer>>, never>
>
export type CorrelatedConstructorErrors = Assert<
  Equal<Layer.Error<ReturnType<typeof correlatedEffectsLayer>>, never>
>
export type CorrelatedInputRequirements = Assert<
  Equal<Layer.Services<ReturnType<typeof correlatedInputLayer>>, never>
>

import { Effect, Layer } from 'effect'

import {
  FirstBuild,
  FirstBuildFailure,
  Parent,
  SecondBuild,
  SecondBuildFailure,
  acquireParentChildren,
  fullyProvidedParentLayer,
  parentInit,
  parentUpdate,
  selectedParentLayer,
} from './accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Expect<Value extends true> = Value

export type ExactSelectedErrors = Expect<
  Equal<
    Layer.Error<typeof selectedParentLayer>,
    FirstBuildFailure | SecondBuildFailure
  >
>
export type ExactSelectedRequirements = Expect<
  Equal<Layer.Services<typeof selectedParentLayer>, FirstBuild | SecondBuild>
>
export type FullyProvidedErrors = Expect<
  Equal<
    Layer.Error<typeof fullyProvidedParentLayer>,
    FirstBuildFailure | SecondBuildFailure
  >
>
export type FullyProvidedRequirements = Expect<
  Equal<Layer.Services<typeof fullyProvidedParentLayer>, never>
>

export const relocatedExtractedLayer = Parent.makeLayer(
  Effect.gen(function* () {
    const children = yield* acquireParentChildren()

    return { children, init: parentInit, update: parentUpdate }
  }),
)

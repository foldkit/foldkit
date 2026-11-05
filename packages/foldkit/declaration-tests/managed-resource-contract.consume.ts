import type { Effect, Layer } from 'effect'
import type * as Block from 'foldkit/block'
import type * as ManagedResource from 'foldkit/managedResource'

import {
  Construction,
  ConstructionUnavailable,
  HandlerUnavailable,
  Session,
  SessionBlock,
  Store,
  inspect,
  layer,
} from './managed-resource-contract.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
type SessionService = ManagedResource.ServiceOf<typeof Session>
type Facts = Block.FactsOf<typeof SessionBlock>
type Runtime = Block.RuntimeCapability<typeof SessionBlock.owner>

export type ExactManagedResources = Assert<
  Equal<Facts['effectsLayerRequirements'], SessionService | Store>
>
export type ExactOperationRequirements = Assert<
  Equal<Facts['operations']['read']['requirements'], SessionService | Runtime>
>
export type ExactInputRequirements = Assert<
  Equal<
    Facts['operations']['requestRefresh']['requirements'],
    SessionService | Runtime
  >
>
export type ExactHandlerFailure = Assert<
  Equal<Facts['effectsLayerError'], HandlerUnavailable>
>
export type ExactConstructionService = Assert<
  Equal<Layer.Services<typeof layer>, Construction>
>
export type ExactConstructionFailure = Assert<
  Equal<Layer.Error<typeof layer>, ConstructionUnavailable>
>
export type PureInspectionDoesNotConstructHandlers = Assert<
  Equal<Effect.Services<typeof inspect>, Construction>
>
export type PureInspectionKeepsConstructionFailure = Assert<
  Equal<Effect.Error<typeof inspect>, ConstructionUnavailable>
>

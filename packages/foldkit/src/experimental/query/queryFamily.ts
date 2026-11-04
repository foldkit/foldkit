import { Context, type Effect, type Layer } from 'effect'

import type { ValidateConstructionRequirements } from '../../block/scope.js'
import {
  type FamilySpecializationLayer,
  resolveFamily,
} from '../contracted/familyLayer.js'
import * as Contracted from '../contracted/public.js'
import type { QueryConfig } from './queryContract.js'
import {
  type QueryAuthoring,
  type SilentQueryAuthoring,
  defineQuery,
  defineSilentQuery,
} from './queryDefinition.js'

/** Passive Fetch construction and Model accessors shared by Query descriptors. */
export interface QueryMembers<Name extends string, A, AI, E, EI> {
  readonly Fetch: QueryAuthoring<Name, A, AI, E, EI>['Fetch']
  readonly read: QueryAuthoring<Name, A, AI, E, EI>['accessors']['read']
  readonly isFresh: QueryAuthoring<Name, A, AI, E, EI>['accessors']['isFresh']
  readonly run: QueryAuthoring<Name, A, AI, E, EI>['fetchApi']['run']
  readonly toLayer: QueryAuthoring<Name, A, AI, E, EI>['fetchApi']['toLayer']
}

/** Query descriptor members retaining the exact selected Fetch Layer. */
export interface AttachedQueryMembers<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Handlers extends Layer.Any,
> extends QueryMembers<Name, A, AI, E, EI> {
  /** Original attached Fetch recipe, retained after handler reselection.
   * The acquired Block's EffectsLayer reflects the current selection. */
  readonly EffectsLayer: Handlers
}

/** @internal A universal checked constructor for every Query specialization. */
export interface QueryConstructor {
  <Name extends string, A, AI, E, EI>(
    authoring: QueryAuthoring<Name, A, AI, E, EI>,
  ): FamilySpecializationLayer<
    Contracted.FamilyContractOf<
      QueryAuthoring<Name, A, AI, E, EI>['Definition']
    >,
    never,
    never,
    QueryAuthoring<Name, A, AI, E, EI>['Fetch']
  >
  <Name extends string, A, AI, E, EI>(
    authoring: SilentQueryAuthoring<Name, A, AI, E, EI>,
  ): FamilySpecializationLayer<
    Contracted.FamilyContractOf<
      SilentQueryAuthoring<Name, A, AI, E, EI>['Definition']
    >,
    never,
    never,
    SilentQueryAuthoring<Name, A, AI, E, EI>['Fetch']
  >
}

/** @internal Scoped implementation supplied by the shared Query Layer. */
export interface QueryImplementation extends Contracted.FamilyLifetime {
  readonly construct: QueryConstructor
}

/** @internal Private provider identity for ordinary Query construction. */
export class QueryFamily extends Context.Service<
  QueryFamily,
  QueryImplementation
>()('foldkit/Query') {}

const makeNotifyingHostQuery = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, true>,
) => {
  const authoring = defineQuery(config)
  const members: QueryMembers<Name, A, AI, E, EI> = {
    Fetch: authoring.Fetch,
    ...authoring.accessors,
    ...authoring.fetchApi,
  }
  return resolveFamily(
    authoring.Definition,
    QueryFamily,
    implementation => implementation.construct<Name, A, AI, E, EI>(authoring),
    {
      hostHandlers: [authoring.Fetch],
      members,
    },
  )
}

const makeSilentHostQuery = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, false>,
) => {
  const authoring = defineSilentQuery(config)
  const members: QueryMembers<Name, A, AI, E, EI> = {
    Fetch: authoring.Fetch,
    ...authoring.accessors,
    ...authoring.fetchApi,
  }
  return resolveFamily(
    authoring.Definition,
    QueryFamily,
    implementation => implementation.construct<Name, A, AI, E, EI>(authoring),
    {
      hostHandlers: [authoring.Fetch],
      members,
    },
  )
}

const makeNotifyingQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  HandlerConstructorError = never,
  HandlerConstructorRequirements = never,
>(
  config: QueryConfig<Name, A, AI, E, EI, true>,
  build: Effect.Effect<
    () => Effect.Effect<A, E, HandlerRequirements>,
    HandlerConstructorError,
    HandlerConstructorRequirements
  > &
    ValidateConstructionRequirements<HandlerConstructorRequirements>,
) => {
  const authoring = defineQuery(config)
  const handlers = authoring.fetchApi.toLayer(build)
  const members: AttachedQueryMembers<Name, A, AI, E, EI, typeof handlers> = {
    Fetch: authoring.Fetch,
    ...authoring.accessors,
    ...authoring.fetchApi,
    EffectsLayer: handlers,
  }

  return resolveFamily(
    authoring.Definition,
    QueryFamily,
    implementation => implementation.construct<Name, A, AI, E, EI>(authoring),
    { hostHandlers: [authoring.Fetch], handlers, members },
  )
}

const makeSilentQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  HandlerConstructorError = never,
  HandlerConstructorRequirements = never,
>(
  config: QueryConfig<Name, A, AI, E, EI, false>,
  build: Effect.Effect<
    () => Effect.Effect<A, E, HandlerRequirements>,
    HandlerConstructorError,
    HandlerConstructorRequirements
  > &
    ValidateConstructionRequirements<HandlerConstructorRequirements>,
) => {
  const authoring = defineSilentQuery(config)
  const handlers = authoring.fetchApi.toLayer(build)
  const members: AttachedQueryMembers<Name, A, AI, E, EI, typeof handlers> = {
    Fetch: authoring.Fetch,
    ...authoring.accessors,
    ...authoring.fetchApi,
    EffectsLayer: handlers,
  }

  return resolveFamily(
    authoring.Definition,
    QueryFamily,
    implementation => implementation.construct<Name, A, AI, E, EI>(authoring),
    { hostHandlers: [authoring.Fetch], handlers, members },
  )
}

/** A passive Query descriptor whose host selects the original Fetch implementation. */
export type HostQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean = false,
> = Notify extends true
  ? ReturnType<typeof makeNotifyingHostQuery<Name, A, AI, E, EI>>
  : ReturnType<typeof makeSilentHostQuery<Name, A, AI, E, EI>>

/** A passive Query descriptor with an attached Fetch handler recipe. */
export type AttachedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  HandlerConstructorError = never,
  HandlerConstructorRequirements = never,
  Notify extends boolean = false,
> = Notify extends true
  ? ReturnType<
      typeof makeNotifyingQuery<
        Name,
        A,
        AI,
        E,
        EI,
        HandlerRequirements,
        HandlerConstructorError,
        HandlerConstructorRequirements
      >
    >
  : ReturnType<
      typeof makeSilentQuery<
        Name,
        A,
        AI,
        E,
        EI,
        HandlerRequirements,
        HandlerConstructorError,
        HandlerConstructorRequirements
      >
    >

/** @internal Constructs the silent or notifying host-owned Query descriptor. */
export function makeHostQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  const Notify extends boolean = false,
>(
  config: QueryConfig<Name, A, AI, E, EI, Notify>,
): HostQuery<Name, A, AI, E, EI, Notify>
export function makeHostQuery<Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
) {
  if (config.notifyOnCompletion === true) {
    return makeNotifyingHostQuery({ ...config, notifyOnCompletion: true })
  } else {
    return makeSilentHostQuery({ ...config, notifyOnCompletion: false })
  }
}

/** @internal Selects the attached Fetch recipe before exposing the Query descriptor. */
export function makeQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  HandlerConstructorError = never,
  HandlerConstructorRequirements = never,
  const Notify extends boolean = false,
>(
  config: QueryConfig<Name, A, AI, E, EI, Notify>,
  build: Effect.Effect<
    () => Effect.Effect<A, E, HandlerRequirements>,
    HandlerConstructorError,
    HandlerConstructorRequirements
  > &
    ValidateConstructionRequirements<HandlerConstructorRequirements>,
): AttachedQuery<
  Name,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  HandlerConstructorError,
  HandlerConstructorRequirements,
  Notify
>
export function makeQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  HandlerConstructorError,
  HandlerConstructorRequirements,
>(
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
  build: Effect.Effect<
    () => Effect.Effect<A, E, HandlerRequirements>,
    HandlerConstructorError,
    HandlerConstructorRequirements
  > &
    ValidateConstructionRequirements<HandlerConstructorRequirements>,
) {
  if (config.notifyOnCompletion === true) {
    return makeNotifyingQuery({ ...config, notifyOnCompletion: true }, build)
  } else {
    return makeSilentQuery({ ...config, notifyOnCompletion: false }, build)
  }
}

import { Context, type Effect, type Layer, type Schema } from 'effect'

import type { ValidateConstructionRequirements } from '../../block/scope.js'
import {
  type FamilySpecializationLayer,
  resolveFamily,
} from '../contracted/familyLayer.js'
import * as Contracted from '../contracted/public.js'
import type { KeyedQueryConfig, SyncFields } from './keyedQueryContract.js'
import {
  type KeyedQueryAuthoring,
  type SilentKeyedQueryAuthoring,
  defineKeyedQuery,
  defineSilentKeyedQuery,
} from './keyedQueryDefinition.js'

/** Passive keyed Fetch construction and Model accessors. */
export interface KeyedQueryMembers<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> {
  readonly Fetch: KeyedQueryAuthoring<Name, A, AI, E, EI, Fields>['Fetch']
  readonly read: KeyedQueryAuthoring<
    Name,
    A,
    AI,
    E,
    EI,
    Fields
  >['accessors']['read']
  readonly isFresh: KeyedQueryAuthoring<
    Name,
    A,
    AI,
    E,
    EI,
    Fields
  >['accessors']['isFresh']
  readonly pendingArgs: KeyedQueryAuthoring<
    Name,
    A,
    AI,
    E,
    EI,
    Fields
  >['accessors']['pendingArgs']
  readonly run: KeyedQueryAuthoring<
    Name,
    A,
    AI,
    E,
    EI,
    Fields
  >['fetchApi']['run']
  readonly toLayer: KeyedQueryAuthoring<
    Name,
    A,
    AI,
    E,
    EI,
    Fields
  >['fetchApi']['toLayer']
}

/** Keyed descriptor members retaining the exact selected Fetch Layer. */
export interface AttachedKeyedQueryMembers<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Handlers extends Layer.Any,
> extends KeyedQueryMembers<Name, A, AI, E, EI, Fields> {
  /** Original attached Fetch recipe, retained after handler reselection.
   * The acquired Block's EffectsLayer reflects the current selection. */
  readonly EffectsLayer: Handlers
}

/** @internal A universal checked constructor for every keyed specialization. */
export interface KeyedQueryConstructor {
  <Name extends string, A, AI, E, EI, Fields extends SyncFields>(
    authoring: KeyedQueryAuthoring<Name, A, AI, E, EI, Fields>,
  ): FamilySpecializationLayer<
    Contracted.FamilyContractOf<
      KeyedQueryAuthoring<Name, A, AI, E, EI, Fields>['Definition']
    >,
    never,
    never,
    KeyedQueryAuthoring<Name, A, AI, E, EI, Fields>['Fetch']
  >
  <Name extends string, A, AI, E, EI, Fields extends SyncFields>(
    authoring: SilentKeyedQueryAuthoring<Name, A, AI, E, EI, Fields>,
  ): FamilySpecializationLayer<
    Contracted.FamilyContractOf<
      SilentKeyedQueryAuthoring<Name, A, AI, E, EI, Fields>['Definition']
    >,
    never,
    never,
    SilentKeyedQueryAuthoring<Name, A, AI, E, EI, Fields>['Fetch']
  >
}

/** @internal Scoped implementation supplied by the shared keyed Layer. */
export interface KeyedQueryImplementation extends Contracted.FamilyLifetime {
  readonly construct: KeyedQueryConstructor
}

/** @internal Private provider identity for keyed Query construction. */
export class KeyedQueryFamily extends Context.Service<
  KeyedQueryFamily,
  KeyedQueryImplementation
>()('foldkit/KeyedQuery') {}

const makeNotifyingHostKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, true>,
) => {
  const authoring = defineKeyedQuery<Name, A, AI, E, EI, Fields>(config)
  const members: KeyedQueryMembers<Name, A, AI, E, EI, Fields> = {
    Fetch: authoring.Fetch,
    read: authoring.accessors.read,
    isFresh: authoring.accessors.isFresh,
    pendingArgs: authoring.accessors.pendingArgs,
    ...authoring.fetchApi,
  }
  return resolveFamily(
    authoring.Definition,
    KeyedQueryFamily,
    implementation =>
      implementation.construct<Name, A, AI, E, EI, Fields>(authoring),
    {
      hostHandlers: [authoring.Fetch],
      members,
    },
  )
}

const makeSilentHostKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, false>,
) => {
  const authoring = defineSilentKeyedQuery<Name, A, AI, E, EI, Fields>(config)
  const members: KeyedQueryMembers<Name, A, AI, E, EI, Fields> = {
    Fetch: authoring.Fetch,
    read: authoring.accessors.read,
    isFresh: authoring.accessors.isFresh,
    pendingArgs: authoring.accessors.pendingArgs,
    ...authoring.fetchApi,
  }
  return resolveFamily(
    authoring.Definition,
    KeyedQueryFamily,
    implementation =>
      implementation.construct<Name, A, AI, E, EI, Fields>(authoring),
    {
      hostHandlers: [authoring.Fetch],
      members,
    },
  )
}

const makeNotifyingKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  HandlerConstructorError = never,
  HandlerConstructorRequirements = never,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, true>,
  build: Effect.Effect<
    (
      args: Schema.Struct.Type<Fields>,
    ) => Effect.Effect<A, E, HandlerRequirements>,
    HandlerConstructorError,
    HandlerConstructorRequirements
  > &
    ValidateConstructionRequirements<HandlerConstructorRequirements>,
) => {
  const authoring = defineKeyedQuery<Name, A, AI, E, EI, Fields>(config)
  const handlers = authoring.fetchApi.toLayer(build)
  const members: AttachedKeyedQueryMembers<
    Name,
    A,
    AI,
    E,
    EI,
    Fields,
    typeof handlers
  > = {
    Fetch: authoring.Fetch,
    read: authoring.accessors.read,
    isFresh: authoring.accessors.isFresh,
    pendingArgs: authoring.accessors.pendingArgs,
    ...authoring.fetchApi,
    EffectsLayer: handlers,
  }

  return resolveFamily(
    authoring.Definition,
    KeyedQueryFamily,
    implementation =>
      implementation.construct<Name, A, AI, E, EI, Fields>(authoring),
    { hostHandlers: [authoring.Fetch], handlers, members },
  )
}

const makeSilentKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  HandlerConstructorError = never,
  HandlerConstructorRequirements = never,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, false>,
  build: Effect.Effect<
    (
      args: Schema.Struct.Type<Fields>,
    ) => Effect.Effect<A, E, HandlerRequirements>,
    HandlerConstructorError,
    HandlerConstructorRequirements
  > &
    ValidateConstructionRequirements<HandlerConstructorRequirements>,
) => {
  const authoring = defineSilentKeyedQuery<Name, A, AI, E, EI, Fields>(config)
  const handlers = authoring.fetchApi.toLayer(build)
  const members: AttachedKeyedQueryMembers<
    Name,
    A,
    AI,
    E,
    EI,
    Fields,
    typeof handlers
  > = {
    Fetch: authoring.Fetch,
    read: authoring.accessors.read,
    isFresh: authoring.accessors.isFresh,
    pendingArgs: authoring.accessors.pendingArgs,
    ...authoring.fetchApi,
    EffectsLayer: handlers,
  }

  return resolveFamily(
    authoring.Definition,
    KeyedQueryFamily,
    implementation =>
      implementation.construct<Name, A, AI, E, EI, Fields>(authoring),
    { hostHandlers: [authoring.Fetch], handlers, members },
  )
}

/** A keyed Query descriptor whose host selects the original Fetch implementation. */
export type HostKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Notify extends boolean = false,
> = Notify extends true
  ? ReturnType<typeof makeNotifyingHostKeyedQuery<Name, A, AI, E, EI, Fields>>
  : ReturnType<typeof makeSilentHostKeyedQuery<Name, A, AI, E, EI, Fields>>

/** A keyed Query descriptor with an attached Fetch handler recipe. */
export type AttachedKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  HandlerConstructorError = never,
  HandlerConstructorRequirements = never,
  Notify extends boolean = false,
> = Notify extends true
  ? ReturnType<
      typeof makeNotifyingKeyedQuery<
        Name,
        A,
        AI,
        E,
        EI,
        Fields,
        HandlerRequirements,
        HandlerConstructorError,
        HandlerConstructorRequirements
      >
    >
  : ReturnType<
      typeof makeSilentKeyedQuery<
        Name,
        A,
        AI,
        E,
        EI,
        Fields,
        HandlerRequirements,
        HandlerConstructorError,
        HandlerConstructorRequirements
      >
    >

/** @internal Constructs a silent or notifying keyed host descriptor. */
export function makeHostKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  const Notify extends boolean = false,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, Notify>,
): HostKeyedQuery<Name, A, AI, E, EI, Fields, Notify>
export function makeHostKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>) {
  if (config.notifyOnCompletion === true) {
    return makeNotifyingHostKeyedQuery({ ...config, notifyOnCompletion: true })
  } else {
    return makeSilentHostKeyedQuery({ ...config, notifyOnCompletion: false })
  }
}

/** @internal Selects an attached Fetch recipe for a keyed descriptor. */
export function makeKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  HandlerConstructorError = never,
  HandlerConstructorRequirements = never,
  const Notify extends boolean = false,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, Notify>,
  build: Effect.Effect<
    (
      args: Schema.Struct.Type<Fields>,
    ) => Effect.Effect<A, E, HandlerRequirements>,
    HandlerConstructorError,
    HandlerConstructorRequirements
  > &
    ValidateConstructionRequirements<HandlerConstructorRequirements>,
): AttachedKeyedQuery<
  Name,
  A,
  AI,
  E,
  EI,
  Fields,
  HandlerRequirements,
  HandlerConstructorError,
  HandlerConstructorRequirements,
  Notify
>
export function makeKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  HandlerConstructorError,
  HandlerConstructorRequirements,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>,
  build: Effect.Effect<
    (
      args: Schema.Struct.Type<Fields>,
    ) => Effect.Effect<A, E, HandlerRequirements>,
    HandlerConstructorError,
    HandlerConstructorRequirements
  > &
    ValidateConstructionRequirements<HandlerConstructorRequirements>,
) {
  if (config.notifyOnCompletion === true) {
    return makeNotifyingKeyedQuery(
      { ...config, notifyOnCompletion: true },
      build,
    )
  } else {
    return makeSilentKeyedQuery({ ...config, notifyOnCompletion: false }, build)
  }
}

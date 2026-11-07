import { Effect, Layer, Predicate } from 'effect'

import * as Contracted from '../contracted/public.js'
import { makeKeyedQueryApi } from './keyedQuery.js'
import type { SyncFields } from './keyedQueryContract.js'
import type {
  KeyedQueryAuthoring,
  SilentKeyedQueryAuthoring,
} from './keyedQueryDefinition.js'
import {
  type KeyedQueryConstructor,
  KeyedQueryFamily,
} from './keyedQueryFamily.js'

const constructNotifyingKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>({
  Definition,
  Fetch,
  Args,
  config,
}: KeyedQueryAuthoring<Name, A, AI, E, EI, Fields>) => {
  const api = makeKeyedQueryApi(
    config,
    Args,
    Definition.Model,
    Definition.Message,
    Fetch,
    Definition.OutMessage,
  )
  const Composition = Definition.makeComposition()
  const init = Composition.makeInit(api.init)
  const { RequestedReset, ...updateHandlers } = api.notifyingUpdateHandlers
  const update = Composition.makeUpdate(updateHandlers)
  const inMessageUpdate = Composition.makeInMessageUpdate({ RequestedReset })
  return Definition.makeLayer({
    init,
    update,
    inMessageUpdate,
    EffectsLayer: Layer.empty,
    hostHandlers: [Fetch],
  })
}

const constructSilentKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>({
  Definition,
  Fetch,
  Args,
  config,
}: SilentKeyedQueryAuthoring<Name, A, AI, E, EI, Fields>) => {
  const api = makeKeyedQueryApi(
    config,
    Args,
    Definition.Model,
    Definition.Message,
    Fetch,
  )
  const Composition = Definition.makeComposition()
  const init = Composition.makeInit(api.init)
  const { RequestedReset, ...updateHandlers } = api.updateHandlers
  const update = Composition.makeUpdate(updateHandlers)
  const inMessageUpdate = Composition.makeInMessageUpdate({ RequestedReset })
  return Definition.makeLayer({
    init,
    update,
    inMessageUpdate,
    EffectsLayer: Layer.empty,
    hostHandlers: [Fetch],
  })
}

function constructKeyedQueryRecipe<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  authoring: KeyedQueryAuthoring<Name, A, AI, E, EI, Fields>,
): ReturnType<typeof constructNotifyingKeyedQuery<Name, A, AI, E, EI, Fields>>
function constructKeyedQueryRecipe<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  authoring: SilentKeyedQueryAuthoring<Name, A, AI, E, EI, Fields>,
): ReturnType<typeof constructSilentKeyedQuery<Name, A, AI, E, EI, Fields>>
function constructKeyedQueryRecipe<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  authoring:
    | KeyedQueryAuthoring<Name, A, AI, E, EI, Fields>
    | SilentKeyedQueryAuthoring<Name, A, AI, E, EI, Fields>,
) {
  if (Predicate.hasProperty(authoring, 'OutMessage')) {
    return constructNotifyingKeyedQuery(authoring)
  } else {
    return constructSilentKeyedQuery(authoring)
  }
}

/** @internal Completes keyed specializations through their original contracts. */
export const constructKeyedQuery: KeyedQueryConstructor =
  constructKeyedQueryRecipe

/** @internal Supplies the universal keyed constructor under one scoped lifetime. */
export const KeyedQueryLayer = Layer.effect(KeyedQueryFamily)(
  Effect.gen(function* () {
    const lifetime = yield* Contracted.familyLifetime

    return { ...lifetime, construct: constructKeyedQuery }
  }),
)

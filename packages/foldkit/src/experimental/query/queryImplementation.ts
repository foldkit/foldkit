import { Effect, Layer, Predicate } from 'effect'

import * as Contracted from '../contracted/public.js'
import { makeQueryApi } from './query.js'
import type { QueryAuthoring, SilentQueryAuthoring } from './queryDefinition.js'
import { type QueryConstructor, QueryFamily } from './queryFamily.js'

const constructNotifyingQuery = <Name extends string, A, AI, E, EI>({
  Definition,
  Fetch,
  config,
}: QueryAuthoring<Name, A, AI, E, EI>) => {
  const api = makeQueryApi(
    config,
    Definition.Model,
    Definition.Message,
    Fetch,
    Definition.OutMessage,
  )
  const Composition = Definition.makeComposition()
  const init = Composition.makeInit(api.init)
  const update = Composition.makeUpdate({
    RequestedLoadIfStale: api.notifyingUpdateHandlers.RequestedLoadIfStale,
    CompletedFetch: api.notifyingUpdateHandlers.CompletedFetch,
    CompletedCancelFetch: api.notifyingUpdateHandlers.CompletedCancelFetch,
  })
  const inMessageUpdate = Composition.makeInMessageUpdate({
    RequestedReset: api.reset,
    RequestedRevalidation: api.revalidate,
    RequestedRevalidationOrLoad: api.revalidateOrLoad,
    RequestedLoadIfMissing: api.loadIfMissing,
    RequestedCancel: api.cancel,
  })
  return Definition.makeLayer(
    Effect.succeed({
      children: [],
      init,
      update,
      inMessageUpdate,
      EffectsLayer: Layer.empty,
      hostHandlers: [Fetch],
    }),
  )
}

const constructSilentQuery = <Name extends string, A, AI, E, EI>({
  Definition,
  Fetch,
  config,
}: SilentQueryAuthoring<Name, A, AI, E, EI>) => {
  const api = makeQueryApi(config, Definition.Model, Definition.Message, Fetch)
  const Composition = Definition.makeComposition()
  const init = Composition.makeInit(api.init)
  const update = Composition.makeUpdate({
    RequestedLoadIfStale: api.updateHandlers.RequestedLoadIfStale,
    CompletedFetch: api.updateHandlers.CompletedFetch,
    CompletedCancelFetch: api.updateHandlers.CompletedCancelFetch,
  })
  const inMessageUpdate = Composition.makeInMessageUpdate({
    RequestedReset: api.reset,
    RequestedRevalidation: api.revalidate,
    RequestedRevalidationOrLoad: api.revalidateOrLoad,
    RequestedLoadIfMissing: api.loadIfMissing,
    RequestedCancel: api.cancel,
  })
  return Definition.makeLayer(
    Effect.succeed({
      children: [],
      init,
      update,
      inMessageUpdate,
      EffectsLayer: Layer.empty,
      hostHandlers: [Fetch],
    }),
  )
}

function constructQueryRecipe<Name extends string, A, AI, E, EI>(
  authoring: QueryAuthoring<Name, A, AI, E, EI>,
): ReturnType<typeof constructNotifyingQuery<Name, A, AI, E, EI>>
function constructQueryRecipe<Name extends string, A, AI, E, EI>(
  authoring: SilentQueryAuthoring<Name, A, AI, E, EI>,
): ReturnType<typeof constructSilentQuery<Name, A, AI, E, EI>>
function constructQueryRecipe<Name extends string, A, AI, E, EI>(
  authoring:
    | QueryAuthoring<Name, A, AI, E, EI>
    | SilentQueryAuthoring<Name, A, AI, E, EI>,
) {
  if (Predicate.hasProperty(authoring, 'OutMessage')) {
    return constructNotifyingQuery(authoring)
  } else {
    return constructSilentQuery(authoring)
  }
}

/** @internal Completes Query specializations through their original authoring contracts. */
export const constructQuery: QueryConstructor = constructQueryRecipe

/** @internal Supplies the universal Query constructor under one scoped lifetime. */
export const QueryLayer = Layer.effect(QueryFamily)(
  Effect.gen(function* () {
    const lifetime = yield* Contracted.familyLifetime

    return { ...lifetime, construct: constructQuery }
  }),
)

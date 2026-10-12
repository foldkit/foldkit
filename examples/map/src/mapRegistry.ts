import { Context, Effect, HashMap, Layer, Option, Ref } from 'effect'
import type { Map as MapInstance } from 'maplibre-gl'

type MapRegistryShape = Readonly<{
  get: (hostId: string) => Effect.Effect<Option.Option<MapInstance>>
  set: (hostId: string, instance: MapInstance) => Effect.Effect<void>
  remove: (hostId: string, instance: MapInstance) => Effect.Effect<void>
}>

export class MapRegistry extends Context.Service<
  MapRegistry,
  MapRegistryShape
>()('map/MapRegistry') {}

export const MapRegistryLayer = Layer.effect(
  MapRegistry,
  Effect.gen(function* () {
    const instancesByHostId = yield* Ref.make(
      HashMap.empty<string, MapInstance>(),
    )

    return {
      get: hostId =>
        Ref.get(instancesByHostId).pipe(Effect.map(HashMap.get(hostId))),
      set: (hostId, instance) =>
        Ref.update(instancesByHostId, HashMap.set(hostId, instance)),
      remove: (hostId, instance) =>
        Ref.update(instancesByHostId, instances => {
          const maybeInstance = HashMap.get(instances, hostId)

          if (
            Option.isSome(maybeInstance) &&
            maybeInstance.value === instance
          ) {
            return HashMap.remove(instances, hostId)
          } else {
            return instances
          }
        }),
    }
  }),
)

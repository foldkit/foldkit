import type { EChartsType } from 'echarts/core'
import { Context, Effect, HashMap, Layer, Option, Ref } from 'effect'

type ChartRegistryShape = Readonly<{
  get: (hostId: string) => Effect.Effect<Option.Option<EChartsType>>
  set: (hostId: string, instance: EChartsType) => Effect.Effect<void>
  remove: (hostId: string, instance: EChartsType) => Effect.Effect<void>
}>

export class ChartRegistry extends Context.Service<
  ChartRegistry,
  ChartRegistryShape
>()('charting/ChartRegistry') {}

export const ChartRegistryLayer = Layer.effect(
  ChartRegistry,
  Effect.gen(function* () {
    const instancesByHostId = yield* Ref.make(
      HashMap.empty<string, EChartsType>(),
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

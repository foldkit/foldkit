import { Function, Option } from 'effect'
import type { Map as MapInstance } from 'maplibre-gl'

const mapsByHostId = new Map<string, MapInstance>()

let nextId = 0

/** Generates a unique id for a Map instance. The id flows through the Mount
 *  Message into the Model, where Subscriptions can use it to look up the
 *  live Map instance via {@link getMap}.
 *
 *  This example only mounts one map, but the function is shaped for the
 *  multi-map case so the same pattern scales to a route with multiple maps
 *  or a master/detail layout that mounts maps in side-by-side panels. */
export const nextHostId = (): string => `map-host-${++nextId}`

/** Stash a live Map instance against an id so Subscriptions and Commands
 *  can reach it without putting the (mutable, unfreezable) instance in the
 *  Model. Cleanup is paired in `OnMount`'s cleanup. */
export const setMap = (hostId: string, instance: MapInstance): void => {
  mapsByHostId.set(hostId, instance)
}

export const getMap = (hostId: string): Option.Option<MapInstance> =>
  Option.fromNullable(mapsByHostId.get(hostId))

export const removeMap = (hostId: string): void =>
  Option.match(getMap(hostId), {
    onNone: Function.constVoid,
    onSome: map => {
      map.remove()
      mapsByHostId.delete(hostId)
    },
  })

import { Array, Effect, Queue, Schema, Stream } from 'effect'
import type { Map as MapInstance } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

import { ApplicationDefinition } from './definition'
import { featuredLocations } from './locations'
import { MapRegistry } from './mapRegistry'
import { Message } from './message'
import type {
  ClickedMarker,
  FailedMountMap,
  MovedMap,
  SucceededMountMap,
} from './message'
import type { Bounds } from './model'

const INITIAL_MAP_ZOOM = 1

type MountMapMessage =
  | SucceededMountMap
  | FailedMountMap
  | MovedMap
  | ClickedMarker
const toMapMountError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(`Failed to mount map: ${error}`)

const addLocationMarkers = (
  map: MapInstance,
  maplibre: typeof import('maplibre-gl'),
) =>
  Effect.try({
    try: () =>
      Array.forEach(featuredLocations, ({ id, lng, lat }) => {
        const markerElement = document.createElement('button')
        markerElement.setAttribute('data-location-id', id)
        markerElement.setAttribute('aria-label', `Marker: ${id}`)
        markerElement.className = markerStyle
        new maplibre.Marker({ element: markerElement })
          .setLngLat([lng, lat])
          .addTo(map)
      }),
    catch: toMapMountError,
  })

const listenToMapMovesAndMarkerClicks = (
  map: MapInstance,
  queue: Queue.Enqueue<MountMapMessage>,
) =>
  Effect.acquireRelease(
    Effect.try({
      try: () => {
        const container = map.getContainer()
        const onMoveEnd = () => {
          Queue.offerUnsafe(
            queue,
            Message.MovedMap({ bounds: boundsFromMap(map) }),
          )
        }
        const onContainerClick = (event: MouseEvent) => {
          const target = event.target
          if (!(target instanceof Element)) {
            return
          }
          const marker = target.closest('[data-location-id]')
          if (!(marker instanceof HTMLElement)) {
            return
          }
          const locationId = marker.dataset['locationId']
          if (locationId !== undefined) {
            Queue.offerUnsafe(queue, Message.ClickedMarker({ locationId }))
          }
        }

        try {
          map.on('moveend', onMoveEnd)
          container.addEventListener('click', onContainerClick)
          return { container, onMoveEnd, onContainerClick }
        } catch (error) {
          map.off('moveend', onMoveEnd)
          container.removeEventListener('click', onContainerClick)
          throw error
        }
      },
      catch: toMapMountError,
    }),
    ({ container, onMoveEnd, onContainerClick }) =>
      Effect.sync(() => {
        map.off('moveend', onMoveEnd)
        container.removeEventListener('click', onContainerClick)
      }),
  )

export const MountMap = ApplicationDefinition.makeMountStream('MountMap', {
  args: { hostId: Schema.String },
  messages: [
    Message.SucceededMountMap,
    Message.FailedMountMap,
    Message.MovedMap,
    Message.ClickedMarker,
  ],
  handler: function* () {
    const maps = yield* MapRegistry

    return ({ element, hostId }) =>
      Stream.callback<MountMapMessage>(queue =>
        Effect.gen(function* () {
          if (!(element instanceof HTMLElement)) {
            Queue.offerUnsafe(
              queue,
              Message.FailedMountMap({
                reason: 'Map host is not an HTMLElement.',
              }),
            )
            return yield* Effect.never
          }

          const mapResource = yield* Effect.acquireRelease(
            Effect.gen(function* () {
              const maplibre = yield* Effect.tryPromise(
                () => import('maplibre-gl'),
              )
              const map = yield* Effect.try({
                try: () => {
                  maplibre.setWorkerUrl(maplibreWorkerUrl)
                  return new maplibre.Map({
                    container: element,
                    style: 'https://demotiles.maplibre.org/style.json',
                    center: [0, 20],
                    zoom: INITIAL_MAP_ZOOM,
                  })
                },
                catch: toMapMountError,
              })
              return { map, maplibre }
            }),
            ({ map }) =>
              Effect.sync(() => map.remove()).pipe(
                Effect.ensuring(maps.remove(hostId, map)),
              ),
          )
          const { map, maplibre } = mapResource

          yield* addLocationMarkers(map, maplibre)
          yield* maps.set(hostId, map)

          yield* listenToMapMovesAndMarkerClicks(map, queue)

          Queue.offerUnsafe(queue, Message.SucceededMountMap({ hostId }))
          Queue.offerUnsafe(
            queue,
            Message.MovedMap({ bounds: boundsFromMap(map) }),
          )
          return yield* Effect.never
        }).pipe(
          Effect.catch(error =>
            Effect.sync(() =>
              Queue.offerUnsafe(
                queue,
                Message.FailedMountMap({
                  reason: toMapMountError(error).message,
                }),
              ),
            ),
          ),
        ),
      )
  },
})
const boundsFromMap = (map: MapInstance): Bounds => {
  const bounds = map.getBounds()
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  }
}
const markerStyle =
  'block w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white shadow cursor-pointer hover:bg-rose-600 transition'

import { Array, Effect, Equal, Option, Queue, Schema, Stream } from 'effect'
import { Block, Command, Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'
import type { Map as MapInstance } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

import { Button } from '@foldkit/ui'

import { LngLat, Location, featuredLocations } from './domain/location'
import { MapRegistry } from './services'
import { Sidebar } from './sidebar'

const HOST_ID = 'map-host-1'
const INITIAL_MAP_ZOOM = 1
const SELECTED_LOCATION_ZOOM = 12
const USER_LOCATION_ZOOM = 13
const GEOLOCATION_TIMEOUT_MS = 10_000

// MODEL

export const Bounds = Schema.Struct({
  west: Schema.Number,
  south: Schema.Number,
  east: Schema.Number,
  north: Schema.Number,
})
export type Bounds = typeof Bounds.Type

export const GeolocateState = defineTaggedUnion({
  Idle: {},
  Locating: {},
  Failed: { reason: Schema.String },
})
export type GeolocateState = typeof GeolocateState.Type

export const Model = Schema.Struct({
  sidebar: Sidebar,
  locations: Schema.Array(Location),
  maybeMapHostId: Schema.Option(Schema.String),
  maybeMapError: Schema.Option(Schema.String),
  maybeBounds: Schema.Option(Bounds),
  maybeSelectedLocationId: Schema.Option(Schema.String),
  maybeUserLocation: Schema.Option(LngLat),
  geolocateState: GeolocateState,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  SucceededMountMap: { hostId: Schema.String },
  FailedMountMap: { reason: Schema.String },
  MovedMap: { bounds: Bounds },
  ClickedMarker: { locationId: Schema.String },
  DismissedGeolocate: {},
  SucceededGeolocate: { lng: Schema.Number, lat: Schema.Number },
  FailedGeolocate: { reason: Schema.String },
  SucceededFlyTo: {},
  FailedFlyTo: { reason: Schema.String },
  CompletedLockBodyScroll: {},
  CompletedUnlockBodyScroll: {},
})
export type Message = typeof Message.Type
type SucceededFlyTo = typeof Message.SucceededFlyTo.Type
type FailedFlyTo = typeof Message.FailedFlyTo.Type
type MountMapMessage =
  | typeof Message.SucceededMountMap.Type
  | typeof Message.FailedMountMap.Type
  | typeof Message.MovedMap.Type
  | typeof Message.ClickedMarker.Type

// COMMAND

export const FlyTo = Command.define('FlyTo', {
  args: {
    maybeHostId: Schema.Option(Schema.String),
    lng: Schema.Number,
    lat: Schema.Number,
    zoom: Schema.Number,
  },
  messages: [Message.SucceededFlyTo, Message.FailedFlyTo],
})

export const Geolocate = Command.define('Geolocate', {
  messages: [Message.SucceededGeolocate, Message.FailedGeolocate],
})

export const LockBodyScroll = Command.define('LockBodyScroll', {
  messages: [Message.CompletedLockBodyScroll],
})

export const UnlockBodyScroll = Command.define('UnlockBodyScroll', {
  messages: [Message.CompletedUnlockBodyScroll],
})

// MOUNT

export const MountMap = Mount.defineStream('MountMap', {
  args: { hostId: Schema.String },
  messages: [
    Message.SucceededMountMap,
    Message.FailedMountMap,
    Message.MovedMap,
    Message.ClickedMarker,
  ],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [FlyTo, Geolocate, LockBodyScroll, UnlockBodyScroll],
  Mount: [MountMap],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const maps = yield* MapRegistry
    const sidebar = yield* new Sidebar('sidebar')

    return {
      model: {
        sidebar,
        locations: featuredLocations,
        maybeMapHostId: Option.none(),
        maybeMapError: Option.none(),
        maybeBounds: Option.none(),
        maybeSelectedLocationId: Option.none(),
        maybeUserLocation: Option.none(),
        geolocateState: GeolocateState.Idle(),
      },

      update: {
        ...sidebar.on({
          SelectedLocation: (model, { locationId }) =>
            Option.match(findLocation(model, locationId), {
              onNone: () => ({ model }),
              onSome: ({ lng, lat }) => ({
                model: modifyFields(model, {
                  maybeSelectedLocationId: () => Option.some(locationId),
                }),
                commands: [
                  FlyTo({
                    maybeHostId: model.maybeMapHostId,
                    lng,
                    lat,
                    zoom: SELECTED_LOCATION_ZOOM,
                  }),
                ],
              }),
            }),

          RequestedGeolocate: model => ({
            model: modifyFields(model, {
              geolocateState: () => GeolocateState.Locating(),
            }),
            commands: [LockBodyScroll(), Geolocate()],
          }),
        }),

        SucceededMountMap: (model, { hostId }) => ({
          model: modifyFields(model, {
            maybeMapHostId: () => Option.some(hostId),
          }),
        }),

        FailedMountMap: (model, { reason }) => ({
          model: modifyFields(model, {
            maybeMapError: () => Option.some(reason),
          }),
        }),

        MovedMap: (model, { bounds }) => ({
          model: modifyFields(model, {
            maybeBounds: () => Option.some(bounds),
          }),
        }),

        ClickedMarker: (model, { locationId }) => ({
          model: modifyFields(model, {
            maybeSelectedLocationId: () => Option.some(locationId),
          }),
        }),

        DismissedGeolocate: model => ({
          model: modifyFields(model, {
            geolocateState: () => GeolocateState.Idle(),
          }),
          commands: [UnlockBodyScroll()],
        }),

        SucceededGeolocate: (model, { lng, lat }) => ({
          model: modifyFields(model, {
            maybeUserLocation: () => Option.some({ lng, lat }),
            geolocateState: () => GeolocateState.Idle(),
          }),
          commands: [
            UnlockBodyScroll(),
            FlyTo({
              maybeHostId: model.maybeMapHostId,
              lng,
              lat,
              zoom: USER_LOCATION_ZOOM,
            }),
          ],
        }),

        FailedGeolocate: (model, { reason }) => ({
          model: modifyFields(model, {
            geolocateState: () => GeolocateState.Failed({ reason }),
          }),
        }),

        SucceededFlyTo: model => ({ model }),
        FailedFlyTo: model => ({ model }),
        CompletedLockBodyScroll: model => ({ model }),
        CompletedUnlockBodyScroll: model => ({ model }),
      },

      commands: {
        FlyTo: flyTo(maps),
        Geolocate: geolocate,
        LockBodyScroll: lockBodyScroll,
        UnlockBodyScroll: unlockBodyScroll,
      },

      mounts: {
        MountMap: mountMap(maps),
      },

      view: (model, h) => ({
        title: 'Foldkit Map',
        body: h.div(
          [h.Class('h-screen w-screen flex bg-slate-100 text-slate-900')],
          [
            model.sidebar.view({
              locations: model.locations,
              maybeSelectedLocationId: model.maybeSelectedLocationId,
              maybeUserLocation: model.maybeUserLocation,
              isLocating: model.geolocateState._tag === 'Locating',
            }),
            mapPaneView(model, h),
            geolocateOverlayView(model.geolocateState, h),
          ],
        ),
      }),
    }
  }),
)

// COMMAND HANDLERS

const flyToMap = (
  maps: typeof MapRegistry.Service,
  hostId: string,
  lng: number,
  lat: number,
  zoom: number,
): Effect.Effect<SucceededFlyTo | FailedFlyTo> =>
  Effect.gen(function* () {
    const maybeMap = yield* maps.get(hostId)

    return yield* Option.match(maybeMap, {
      onNone: () =>
        Effect.succeed(
          Message.FailedFlyTo({
            reason: `Could not find a live map for hostId ${hostId}.`,
          }),
        ),
      onSome: map =>
        Effect.sync(() => {
          map.flyTo({ center: [lng, lat], zoom, essential: true })
          return Message.SucceededFlyTo()
        }),
    })
  })

const flyTo =
  (maps: typeof MapRegistry.Service) =>
  ({
    maybeHostId,
    lng,
    lat,
    zoom,
  }: Readonly<{
    maybeHostId: Option.Option<string>
    lng: number
    lat: number
    zoom: number
  }>): Effect.Effect<SucceededFlyTo | FailedFlyTo> =>
    Option.match(maybeHostId, {
      onNone: () =>
        Effect.succeed(
          Message.FailedFlyTo({
            reason: 'FlyTo dispatched before the map mounted.',
          }),
        ),
      onSome: hostId => flyToMap(maps, hostId, lng, lat, zoom),
    })

const geolocate = () =>
  Effect.gen(function* () {
    const position = yield* Effect.callback<GeolocationPosition, Error>(
      resume => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          resume(
            Effect.fail(
              new Error(
                'Geolocation is not available in this browser context.',
              ),
            ),
          )
          return
        }
        navigator.geolocation.getCurrentPosition(
          position => resume(Effect.succeed(position)),
          error => resume(Effect.fail(new Error(error.message))),
          {
            enableHighAccuracy: false,
            timeout: GEOLOCATION_TIMEOUT_MS,
          },
        )
      },
    )
    return Message.SucceededGeolocate({
      lng: position.coords.longitude,
      lat: position.coords.latitude,
    })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        Message.FailedGeolocate({
          reason: error instanceof Error ? error.message : `${error}`,
        }),
      ),
    ),
  )

const lockBodyScroll = () =>
  Effect.sync(() => {
    document.body.classList.add('overflow-hidden')
    return Message.CompletedLockBodyScroll()
  })

const unlockBodyScroll = () =>
  Effect.sync(() => {
    document.body.classList.remove('overflow-hidden')
    return Message.CompletedUnlockBodyScroll()
  })

// MOUNT HANDLER

const markerStyle =
  'block w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white shadow cursor-pointer hover:bg-rose-600 transition'

const toMapMountError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(`Failed to mount map: ${error}`)

const boundsFromMap = (map: MapInstance): Bounds => {
  const bounds = map.getBounds()
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  }
}

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

export const mountMap =
  (maps: typeof MapRegistry.Service) =>
  ({
    element,
    hostId,
  }: Readonly<{
    element: Element
    hostId: string
  }>): Stream.Stream<MountMapMessage> =>
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

// VIEW

type ApplicationViewBuilder = HtmlBuilder<
  Message,
  Mount.RequirementsOf<typeof MountMap>
>

const mapErrorBannerView = (
  maybeReason: Option.Option<string>,
  h: ApplicationViewBuilder,
): Html =>
  Option.match(maybeReason, {
    onNone: () => h.empty,
    onSome: reason =>
      h.div(
        [
          h.AriaLabel('Map failed to load'),
          h.Class(
            'absolute top-3 left-1/2 -translate-x-1/2 max-w-md bg-rose-50 border border-rose-200 text-rose-900 rounded-md shadow-sm px-4 py-3 text-sm',
          ),
        ],
        [
          h.div([h.Class('font-semibold mb-0.5')], ['Could not load the map.']),
          h.div([h.Class('text-xs text-rose-700')], [reason]),
        ],
      ),
  })

const boundsBadgeView = (
  maybeBounds: Option.Option<Bounds>,
  h: ApplicationViewBuilder,
): Html =>
  Option.match(maybeBounds, {
    onNone: () => h.empty,
    onSome: bounds =>
      h.div(
        [
          h.Class(
            'absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-md shadow-sm px-3 py-2 text-xs font-mono text-slate-700 border border-slate-200',
          ),
        ],
        [
          h.div([], [`N ${bounds.north.toFixed(2)}`]),
          h.div([], [`S ${bounds.south.toFixed(2)}`]),
          h.div([], [`E ${bounds.east.toFixed(2)}`]),
          h.div([], [`W ${bounds.west.toFixed(2)}`]),
        ],
      ),
  })

const mapPaneView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.main(
    [h.Class('flex-1 relative')],
    [
      h.div([
        h.Class('h-full w-full'),
        h.AriaLabel('Map'),
        h.OnMount(MountMap({ hostId: HOST_ID })),
      ]),
      mapErrorBannerView(model.maybeMapError, h),
      boundsBadgeView(model.maybeBounds, h),
    ],
  )

const spinnerView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('flex justify-center mt-4')],
    [
      h.span([
        h.Class(
          'inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full motion-safe:animate-spin',
        ),
        h.AriaLabel('Loading'),
      ]),
    ],
  )

const geolocateOverlayShellView = (
  content: Html,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [
      h.Class(
        'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40',
      ),
      h.AriaLabel('Geolocation'),
    ],
    [content],
  )

const geolocateLocatingContentView = (h: ApplicationViewBuilder): Html =>
  h.article(
    [
      h.Class(
        'bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 px-6 py-5 text-center',
      ),
    ],
    [
      h.h2([h.Class('text-base font-semibold mb-1')], ['Locating you…']),
      h.p(
        [h.Class('text-sm text-slate-500')],
        ['Asking your browser for permission to use your location.'],
      ),
      spinnerView(h),
    ],
  )

const geolocateFailedContentView = (
  reason: string,
  h: ApplicationViewBuilder,
): Html =>
  h.article(
    [
      h.Class(
        'bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 px-6 py-5 text-center',
      ),
    ],
    [
      h.h2(
        [h.Class('text-base font-semibold mb-1 text-rose-700')],
        ['Could not locate you'],
      ),
      h.p([h.Class('text-sm text-slate-600')], [reason]),
      Button.view(
        {
          onClick: Message.DismissedGeolocate(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'mt-4 px-4 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800',
                ),
              ],
              ['Dismiss'],
            ),
        },
        h,
      ),
    ],
  )

const geolocateOverlayView = (
  state: GeolocateState,
  h: ApplicationViewBuilder,
): Html =>
  GeolocateState.match(state, {
    Idle: () => h.empty,
    Locating: () =>
      geolocateOverlayShellView(geolocateLocatingContentView(h), h),
    Failed: ({ reason }) =>
      geolocateOverlayShellView(geolocateFailedContentView(reason, h), h),
  })

// UPDATE

const findLocation = (
  model: Model,
  locationId: string,
): Option.Option<Location> =>
  Array.findFirst(model.locations, ({ id }) => Equal.equals(id, locationId))

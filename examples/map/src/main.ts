import {
  Array,
  Effect,
  Equal,
  Function,
  Match as M,
  Option,
  Queue,
  Schema as S,
  Stream,
  String,
} from 'effect'
import { Command, Mount, Runtime, Subscription } from 'foldkit'
import * as Dom from 'foldkit/dom'
import type { Document, Html } from 'foldkit/html'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import type { Map as MapInstance } from 'maplibre-gl'

import { Location, featuredLocations } from './locations'
import { getMap, removeMap, setMap } from './mapHost'

// CONSTANT

const INITIAL_MAP_ZOOM = 1
const SELECTED_LOCATION_ZOOM = 12
const USER_LOCATION_ZOOM = 13
const GEOLOCATION_TIMEOUT_MS = 10_000

// MODEL

const Bounds = S.Struct({
  west: S.Number,
  south: S.Number,
  east: S.Number,
  north: S.Number,
})
type Bounds = typeof Bounds.Type

const LngLat = S.Struct({ lng: S.Number, lat: S.Number })
type LngLat = typeof LngLat.Type

export const GeolocateIdle = ts('GeolocateIdle')
export const GeolocateLocating = ts('GeolocateLocating')
export const GeolocateFailed = ts('GeolocateFailed', { reason: S.String })

const GeolocateState = S.Union([
  GeolocateIdle,
  GeolocateLocating,
  GeolocateFailed,
])
type GeolocateState = typeof GeolocateState.Type

export const Model = S.Struct({
  locations: S.Array(Location),
  searchQuery: S.String,
  maybeMapHostId: S.Option(S.String),
  maybeMapError: S.Option(S.String),
  maybeBounds: S.Option(Bounds),
  maybeSelectedLocationId: S.Option(S.String),
  maybeUserLocation: S.Option(LngLat),
  geolocateState: GeolocateState,
})
export type Model = typeof Model.Type

// MESSAGE

export const SucceededMountMap = m('SucceededMountMap', { hostId: S.String })
export const FailedMountMap = m('FailedMountMap', { reason: S.String })
export const MovedMap = m('MovedMap', { bounds: Bounds })
export const ClickedMarker = m('ClickedMarker', { locationId: S.String })
export const ClickedLocation = m('ClickedLocation', { locationId: S.String })
export const UpdatedSearchQuery = m('UpdatedSearchQuery', { value: S.String })
export const ClickedFindMe = m('ClickedFindMe')
export const DismissedGeolocate = m('DismissedGeolocate')
export const SucceededGeolocate = m('SucceededGeolocate', {
  lng: S.Number,
  lat: S.Number,
})
export const FailedGeolocate = m('FailedGeolocate', { reason: S.String })
export const SucceededFlyTo = m('SucceededFlyTo')
export const FailedFlyTo = m('FailedFlyTo', { reason: S.String })
export const CompletedFocusSearchInput = m('CompletedFocusSearchInput')
export const CompletedLockBodyScroll = m('CompletedLockBodyScroll')
export const CompletedUnlockBodyScroll = m('CompletedUnlockBodyScroll')

export const Message = S.Union([
  SucceededMountMap,
  FailedMountMap,
  MovedMap,
  ClickedMarker,
  ClickedLocation,
  UpdatedSearchQuery,
  ClickedFindMe,
  DismissedGeolocate,
  SucceededGeolocate,
  FailedGeolocate,
  SucceededFlyTo,
  FailedFlyTo,
  CompletedFocusSearchInput,
  CompletedLockBodyScroll,
  CompletedUnlockBodyScroll,
])
export type Message = typeof Message.Type

// COMMAND

const flyToMap = (
  hostId: string,
  lng: number,
  lat: number,
  zoom: number,
): Effect.Effect<typeof SucceededFlyTo.Type | typeof FailedFlyTo.Type> =>
  Option.match(getMap(hostId), {
    onNone: () =>
      Effect.succeed(
        FailedFlyTo({
          reason: `Could not find a live map for hostId ${hostId}.`,
        }),
      ),
    onSome: map =>
      Effect.sync(() => {
        map.flyTo({ center: [lng, lat], zoom, essential: true })
        return SucceededFlyTo()
      }),
  })

export const FlyTo = Command.define(
  'FlyTo',
  {
    maybeHostId: S.Option(S.String),
    lng: S.Number,
    lat: S.Number,
    zoom: S.Number,
  },
  SucceededFlyTo,
  FailedFlyTo,
)(({ maybeHostId, lng, lat, zoom }) =>
  Option.match(maybeHostId, {
    onNone: () =>
      Effect.succeed(
        FailedFlyTo({
          reason: 'FlyTo dispatched before the map mounted.',
        }),
      ),
    onSome: hostId => flyToMap(hostId, lng, lat, zoom),
  }),
)

export const Geolocate = Command.define(
  'Geolocate',
  SucceededGeolocate,
  FailedGeolocate,
)(
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
    return SucceededGeolocate({
      lng: position.coords.longitude,
      lat: position.coords.latitude,
    })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        FailedGeolocate({
          reason: error instanceof Error ? error.message : `${error}`,
        }),
      ),
    ),
  ),
)

const SEARCH_INPUT_ID = 'map-search-input'

export const FocusSearchInput = Command.define(
  'FocusSearchInput',
  CompletedFocusSearchInput,
)(
  Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusSearchInput()),
  ),
)

export const LockBodyScroll = Command.define(
  'LockBodyScroll',
  CompletedLockBodyScroll,
)(
  Effect.sync(() => {
    document.body.classList.add('overflow-hidden')
    return CompletedLockBodyScroll()
  }),
)

export const UnlockBodyScroll = Command.define(
  'UnlockBodyScroll',
  CompletedUnlockBodyScroll,
)(
  Effect.sync(() => {
    document.body.classList.remove('overflow-hidden')
    return CompletedUnlockBodyScroll()
  }),
)

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const findLocation = (
  model: Model,
  locationId: string,
): Option.Option<Location> =>
  Array.findFirst(model.locations, ({ id }) => Equal.equals(id, locationId))

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      SucceededMountMap: ({ hostId }) => [
        evo(model, { maybeMapHostId: () => Option.some(hostId) }),
        [],
      ],

      FailedMountMap: ({ reason }) => [
        evo(model, { maybeMapError: () => Option.some(reason) }),
        [],
      ],

      MovedMap: ({ bounds }) => [
        evo(model, { maybeBounds: () => Option.some(bounds) }),
        [],
      ],

      ClickedMarker: ({ locationId }) => [
        evo(model, {
          maybeSelectedLocationId: () => Option.some(locationId),
        }),
        [],
      ],

      ClickedLocation: ({ locationId }) =>
        Option.match(findLocation(model, locationId), {
          onNone: () => [model, []],
          onSome: ({ lng, lat }) => [
            evo(model, {
              maybeSelectedLocationId: () => Option.some(locationId),
            }),
            [
              FlyTo({
                maybeHostId: model.maybeMapHostId,
                lng: lng,
                lat: lat,
                zoom: SELECTED_LOCATION_ZOOM,
              }),
            ],
          ],
        }),

      UpdatedSearchQuery: ({ value }) => [
        evo(model, { searchQuery: () => value }),
        [],
      ],

      ClickedFindMe: () => [
        evo(model, { geolocateState: () => GeolocateLocating() }),
        [LockBodyScroll(), Geolocate()],
      ],

      DismissedGeolocate: () => [
        evo(model, { geolocateState: () => GeolocateIdle() }),
        [UnlockBodyScroll()],
      ],

      SucceededGeolocate: ({ lng, lat }) => [
        evo(model, {
          maybeUserLocation: () => Option.some({ lng, lat }),
          geolocateState: () => GeolocateIdle(),
        }),
        [
          UnlockBodyScroll(),
          FlyTo({
            maybeHostId: model.maybeMapHostId,
            lng: lng,
            lat: lat,
            zoom: USER_LOCATION_ZOOM,
          }),
        ],
      ],

      FailedGeolocate: ({ reason }) => [
        evo(model, { geolocateState: () => GeolocateFailed({ reason }) }),
        [],
      ],

      SucceededFlyTo: () => [model, []],
      FailedFlyTo: () => [model, []],
      CompletedFocusSearchInput: () => [model, []],
      CompletedLockBodyScroll: () => [model, []],
      CompletedUnlockBodyScroll: () => [model, []],
    }),
  )

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  {
    locations: featuredLocations,
    searchQuery: '',
    maybeMapHostId: Option.none(),
    maybeMapError: Option.none(),
    maybeBounds: Option.none(),
    maybeSelectedLocationId: Option.none(),
    maybeUserLocation: Option.none(),
    geolocateState: GeolocateIdle(),
  },
  [FocusSearchInput()],
]

// MAP MOUNT

export const MountMap = Mount.define(
  'MountMap',
  { hostId: S.String },
  SucceededMountMap,
  FailedMountMap,
)(
  ({ hostId }) =>
    element =>
      Effect.gen(function* () {
        if (!(element instanceof HTMLElement)) {
          return FailedMountMap({ reason: 'Map host is not an HTMLElement.' })
        }
        return yield* Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.gen(function* () {
              const maplibre = yield* Effect.tryPromise(
                () => import('maplibre-gl'),
              )
              const map = new maplibre.Map({
                container: element,
                style: 'https://demotiles.maplibre.org/style.json',
                center: [0, 20],
                zoom: INITIAL_MAP_ZOOM,
              })

              Array.forEach(featuredLocations, ({ id, lng, lat }) => {
                const markerElement = document.createElement('button')
                markerElement.setAttribute('data-location-id', id)
                markerElement.setAttribute('aria-label', `Marker: ${id}`)
                markerElement.className = markerStyle
                new maplibre.Marker({ element: markerElement })
                  .setLngLat([lng, lat])
                  .addTo(map)
              })

              setMap(hostId, map)
              return map
            }),
            () => Effect.sync(() => removeMap(hostId)),
          )

          return SucceededMountMap({ hostId })
        }).pipe(
          Effect.catch(error =>
            Effect.succeed(
              FailedMountMap({
                reason: error instanceof Error ? error.message : `${error}`,
              }),
            ),
          ),
        )
      }),
)

// SUBSCRIPTIONS

const boundsFromMap = (map: MapInstance): Bounds => {
  const bounds = map.getBounds()
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  }
}

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  mapEvents: entry(
    { maybeMapHostId: S.Option(S.String) },
    {
      modelToDependencies: model => ({
        maybeMapHostId: model.maybeMapHostId,
      }),
      dependenciesToStream: ({ maybeMapHostId }) =>
        Option.match(maybeMapHostId, {
          onNone: () => Stream.empty,
          onSome: hostId =>
            Stream.callback<Message>(queue =>
              Effect.acquireRelease(
                Effect.sync(() =>
                  Option.map(getMap(hostId), map => {
                    const onMoveEnd = () => {
                      Queue.offerUnsafe(
                        queue,
                        MovedMap({ bounds: boundsFromMap(map) }),
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
                        Queue.offerUnsafe(queue, ClickedMarker({ locationId }))
                      }
                    }

                    map.on('moveend', onMoveEnd)
                    map
                      .getContainer()
                      .addEventListener('click', onContainerClick)
                    Queue.offerUnsafe(
                      queue,
                      MovedMap({ bounds: boundsFromMap(map) }),
                    )

                    return { map, onMoveEnd, onContainerClick }
                  }),
                ),
                maybeHandle =>
                  Effect.sync(() =>
                    Option.match(maybeHandle, {
                      onNone: Function.constVoid,
                      onSome: ({ map, onMoveEnd, onContainerClick }) => {
                        map.off('moveend', onMoveEnd)
                        map
                          .getContainer()
                          .removeEventListener('click', onContainerClick)
                      },
                    }),
                  ),
              ).pipe(Effect.flatMap(() => Effect.never)),
            ),
        }),
    },
  ),
}))

// VIEW

const HOST_ID = 'map-host-1'

const filterLocations = (
  locations: ReadonlyArray<Location>,
  query: string,
): ReadonlyArray<Location> => {
  const trimmed = query.trim().toLowerCase()
  if (String.isEmpty(trimmed)) {
    return locations
  } else {
    return Array.filter(
      locations,
      location =>
        location.name.toLowerCase().includes(trimmed) ||
        location.region.toLowerCase().includes(trimmed),
    )
  }
}

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'Foldkit Map',
    body: h.div(
      [h.Class('h-screen w-screen flex bg-slate-100 text-slate-900')],
      [
        sidebarView(model),
        mapPaneView(model),
        geolocateOverlayView(model.geolocateState),
      ],
    ),
  }
}

const sidebarView = (model: Model): Html => {
  const h = html<Message>()

  const visible = filterLocations(model.locations, model.searchQuery)
  return h.aside(
    [
      h.Class(
        'w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full',
      ),
    ],
    [
      h.header(
        [h.Class('px-5 py-4 border-b border-slate-200')],
        [
          h.h1(
            [h.Class('text-lg font-semibold tracking-tight')],
            ['Foldkit Map'],
          ),
          h.p(
            [h.Class('text-xs text-slate-500 mt-1')],
            ['Pan, zoom, and click a marker.'],
          ),
        ],
      ),
      h.div(
        [h.Class('px-5 py-3 border-b border-slate-200')],
        [
          h.input([
            h.Id(SEARCH_INPUT_ID),
            h.Type('search'),
            h.Placeholder('Filter locations'),
            h.AriaLabel('Filter locations'),
            h.Class(
              'w-full px-3 py-2 text-sm rounded-md border border-slate-300 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200',
            ),
            h.Value(model.searchQuery),
            h.OnInput(value => UpdatedSearchQuery({ value })),
          ]),
        ],
      ),
      h.ul(
        [h.Class('flex-1 overflow-y-auto'), h.AriaLabel('Locations')],
        Array.match(visible, {
          onEmpty: () => [emptySidebarView(model.searchQuery)],
          onNonEmpty: Array.map(
            locationListItemView(model.maybeSelectedLocationId),
          ),
        }),
      ),
      footerView(model),
    ],
  )
}

const emptySidebarView = (searchQuery: string): Html => {
  const h = html<Message>()

  return h.li(
    [h.Class('px-5 py-6 text-sm text-slate-500')],
    [
      String.isEmpty(searchQuery.trim())
        ? 'No locations available.'
        : `No locations match "${searchQuery.trim()}".`,
    ],
  )
}

const locationListItemView =
  (maybeSelectedId: Option.Option<string>) =>
  (location: Location): Html => {
    const h = html<Message>()

    const isSelected = Option.exists(maybeSelectedId, Equal.equals(location.id))
    return h.li(
      [],
      [
        h.button(
          [
            h.Type('button'),
            h.AriaPressed(isSelected ? 'true' : 'false'),
            h.OnClick(ClickedLocation({ locationId: location.id })),
            h.Class(
              isSelected
                ? 'w-full text-left px-5 py-3 cursor-pointer bg-slate-100 border-l-2 border-slate-900'
                : 'w-full text-left px-5 py-3 cursor-pointer hover:bg-slate-100 border-l-2 border-transparent',
            ),
          ],
          [
            h.div([h.Class('text-sm font-medium')], [location.name]),
            h.div(
              [h.Class('text-xs text-slate-500 mt-0.5')],
              [location.region],
            ),
          ],
        ),
      ],
    )
  }

const footerView = (model: Model): Html => {
  const h = html<Message>()

  const isLocating = model.geolocateState._tag === 'GeolocateLocating'
  return h.div(
    [h.Class('border-t border-slate-200 px-5 py-3 space-y-2')],
    [
      h.button(
        [
          h.Type('button'),
          h.OnClick(ClickedFindMe()),
          h.Disabled(isLocating),
          h.Class(
            'w-full px-3 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed',
          ),
        ],
        [isLocating ? 'Locating…' : 'Find my location'],
      ),
      Option.match(model.maybeUserLocation, {
        onNone: () => h.empty,
        onSome: ({ lng, lat }) =>
          h.p(
            [h.Class('text-xs text-slate-500')],
            [`You are near ${lat.toFixed(3)}, ${lng.toFixed(3)}.`],
          ),
      }),
    ],
  )
}

const mapPaneView = (model: Model): Html => {
  const h = html<Message>()

  return h.main(
    [h.Class('flex-1 relative')],
    [
      h.div(
        [
          h.Class('h-full w-full'),
          h.AriaLabel('Map'),
          h.OnMount(MountMap({ hostId: HOST_ID })),
        ],
        [],
      ),
      mapErrorBannerView(model.maybeMapError),
      boundsBadgeView(model.maybeBounds),
    ],
  )
}

const mapErrorBannerView = (maybeReason: Option.Option<string>): Html => {
  const h = html<Message>()

  return Option.match(maybeReason, {
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
}

const boundsBadgeView = (maybeBounds: Option.Option<Bounds>): Html => {
  const h = html<Message>()

  return Option.match(maybeBounds, {
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
}

const geolocateOverlayView = (state: GeolocateState): Html => {
  const h = html<Message>()

  return M.value(state).pipe(
    M.tagsExhaustive({
      GeolocateIdle: () => h.empty,
      GeolocateLocating: () =>
        geolocateOverlayShellView(geolocateLocatingContentView()),
      GeolocateFailed: ({ reason }) =>
        geolocateOverlayShellView(geolocateFailedContentView(reason)),
    }),
  )
}

const geolocateOverlayShellView = (content: Html): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    'Geolocate()-overlay',
    [
      h.Class(
        'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40',
      ),
      h.AriaLabel('Geolocation'),
    ],
    [content],
  )
}

const geolocateLocatingContentView = (): Html => {
  const h = html<Message>()

  return h.keyed('article')(
    'Geolocate()-locating',
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
      spinnerView(),
    ],
  )
}

const geolocateFailedContentView = (reason: string): Html => {
  const h = html<Message>()

  return h.keyed('article')(
    'Geolocate()-failed',
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
      h.button(
        [
          h.Type('button'),
          h.OnClick(DismissedGeolocate()),
          h.Class(
            'mt-4 px-4 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800',
          ),
        ],
        ['Dismiss'],
      ),
    ],
  )
}

const spinnerView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex justify-center mt-4')],
    [
      h.span(
        [
          h.Class(
            'inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full motion-safe:animate-spin',
          ),
          h.AriaLabel('Loading'),
        ],
        [],
      ),
    ],
  )
}

// STYLE

const markerStyle =
  'block w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white shadow cursor-pointer hover:bg-rose-600 transition'

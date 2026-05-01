import {
  Array,
  Effect,
  Equal,
  Function,
  Match as M,
  Option,
  Schema as S,
  Stream,
  String,
} from 'effect'
import { Command, Mount, Runtime, Subscription } from 'foldkit'
import type { Document, Html, MountResult } from 'foldkit/html'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import type { Map as MapInstance } from 'maplibre-gl'

import { Location, featuredLocations } from './locations'
import { getMap, nextHostId, removeMap, setMap } from './mapHost'

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

const GeolocateState = S.Union(
  GeolocateIdle,
  GeolocateLocating,
  GeolocateFailed,
)
type GeolocateState = typeof GeolocateState.Type

export const Model = S.Struct({
  locations: S.Array(Location),
  searchQuery: S.String,
  maybeMapHostId: S.OptionFromSelf(S.String),
  maybeMapError: S.OptionFromSelf(S.String),
  maybeBounds: S.OptionFromSelf(Bounds),
  maybeSelectedLocationId: S.OptionFromSelf(S.String),
  maybeUserLocation: S.OptionFromSelf(LngLat),
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

export const Message = S.Union(
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
)
export type Message = typeof Message.Type

// COMMAND

export const FlyTo = Command.define('FlyTo', SucceededFlyTo, FailedFlyTo)

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

const flyTo = (
  maybeHostId: Option.Option<string>,
  lng: number,
  lat: number,
  zoom: number,
) =>
  FlyTo(
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
)

const geolocate = Geolocate(
  Effect.gen(function* () {
    const position = yield* Effect.async<GeolocationPosition, Error>(resume => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resume(
          Effect.fail(
            new Error('Geolocation is not available in this browser context.'),
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
    })
    return SucceededGeolocate({
      lng: position.coords.longitude,
      lat: position.coords.latitude,
    })
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(
        FailedGeolocate({
          reason: error instanceof Error ? error.message : `${error}`,
        }),
      ),
    ),
  ),
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
            [flyTo(model.maybeMapHostId, lng, lat, SELECTED_LOCATION_ZOOM)],
          ],
        }),

      UpdatedSearchQuery: ({ value }) => [
        evo(model, { searchQuery: () => value }),
        [],
      ],

      ClickedFindMe: () => [
        evo(model, { geolocateState: () => GeolocateLocating() }),
        [geolocate],
      ],

      DismissedGeolocate: () => [
        evo(model, { geolocateState: () => GeolocateIdle() }),
        [],
      ],

      SucceededGeolocate: ({ lng, lat }) => [
        evo(model, {
          maybeUserLocation: () => Option.some({ lng, lat }),
          geolocateState: () => GeolocateIdle(),
        }),
        [flyTo(model.maybeMapHostId, lng, lat, USER_LOCATION_ZOOM)],
      ],

      FailedGeolocate: ({ reason }) => [
        evo(model, { geolocateState: () => GeolocateFailed({ reason }) }),
        [],
      ],

      SucceededFlyTo: () => [model, []],
      FailedFlyTo: () => [model, []],
      CompletedFocusSearchInput: () => [model, []],
      CompletedLockBodyScroll: () => [model, []],
    }),
  )

// INIT

const init: Runtime.ProgramInit<Model, Message> = () => [
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
  [],
]

// MAP MOUNT

const MountMap = Mount.define('MountMap', SucceededMountMap, FailedMountMap)

const mountMap = (hostId: string) =>
  MountMap(
    (
      element: Element,
    ): Effect.Effect<
      MountResult<typeof SucceededMountMap.Type | typeof FailedMountMap.Type>
    > => {
      if (!(element instanceof HTMLElement)) {
        return Effect.succeed({
          message: FailedMountMap({
            reason: 'Map host is not an HTMLElement.',
          }),
          cleanup: Function.constVoid,
        })
      } else {
        return Effect.gen(function* () {
          const maplibre = yield* Effect.tryPromise(() => import('maplibre-gl'))
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

          return {
            message: SucceededMountMap({ hostId }),
            cleanup: () => removeMap(hostId),
          }
        }).pipe(
          Effect.catchAll(error =>
            Effect.succeed({
              message: FailedMountMap({
                reason: error instanceof Error ? error.message : `${error}`,
              }),
              cleanup: Function.constVoid,
            }),
          ),
        )
      }
    },
  )

// SUBSCRIPTIONS

const SubscriptionDeps = S.Struct({
  mapEvents: S.OptionFromSelf(S.String),
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

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  mapEvents: {
    modelToDependencies: model => model.maybeMapHostId,
    dependenciesToStream: maybeHostId =>
      Option.match(maybeHostId, {
        onNone: () => Stream.empty,
        onSome: hostId =>
          Stream.async<Message>(emit =>
            Option.match(getMap(hostId), {
              onNone: Function.constVoid,
              onSome: map => {
                const onMoveEnd = () => {
                  emit.single(MovedMap({ bounds: boundsFromMap(map) }))
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
                    emit.single(ClickedMarker({ locationId }))
                  }
                }

                map.on('moveend', onMoveEnd)
                map.getContainer().addEventListener('click', onContainerClick)
                emit.single(MovedMap({ bounds: boundsFromMap(map) }))

                return Effect.sync(() =>
                  Option.match(getMap(hostId), {
                    onNone: Function.constVoid,
                    onSome: currentMap => {
                      currentMap.off('moveend', onMoveEnd)
                      currentMap
                        .getContainer()
                        .removeEventListener('click', onContainerClick)
                    },
                  }),
                )
              },
            }),
          ),
      }),
  },
})

// LIFECYCLE ACTIONS

const FocusSearchInput = Mount.define(
  'FocusSearchInput',
  CompletedFocusSearchInput,
)

const focusSearchInput = FocusSearchInput(
  (
    element,
  ): Effect.Effect<MountResult<typeof CompletedFocusSearchInput.Type>> =>
    Effect.sync(() => {
      if (element instanceof HTMLElement) {
        element.focus()
      }
      return {
        message: CompletedFocusSearchInput(),
        cleanup: Function.constVoid,
      }
    }),
)

const LockBodyScroll = Mount.define('LockBodyScroll', CompletedLockBodyScroll)

const lockBodyScroll = LockBodyScroll(
  (): Effect.Effect<MountResult<typeof CompletedLockBodyScroll.Type>> =>
    Effect.sync(() => {
      document.body.classList.add('overflow-hidden')
      return {
        message: CompletedLockBodyScroll(),
        cleanup: () => {
          document.body.classList.remove('overflow-hidden')
        },
      }
    }),
)

// VIEW

const {
  aside,
  button,
  div,
  empty,
  h1,
  h2,
  header,
  input,
  keyed,
  li,
  main,
  p,
  span,
  ul,
  AriaLabel,
  AriaPressed,
  Class,
  Disabled,
  OnClick,
  OnInput,
  OnMount,
  Placeholder,
  Type,
  Value,
} = html<Message>()

const HOST_ID = nextHostId()

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

export const view = (model: Model): Document => ({
  title: 'Foldkit Map',
  body: div(
    [Class('h-screen w-screen flex bg-slate-100 text-slate-900')],
    [
      sidebarView(model),
      mapPaneView(model),
      geolocateOverlayView(model.geolocateState),
    ],
  ),
})

const sidebarView = (model: Model): Html => {
  const visible = filterLocations(model.locations, model.searchQuery)
  return aside(
    [
      Class(
        'w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full',
      ),
    ],
    [
      header(
        [Class('px-5 py-4 border-b border-slate-200')],
        [
          h1([Class('text-lg font-semibold tracking-tight')], ['Foldkit Map']),
          p(
            [Class('text-xs text-slate-500 mt-1')],
            ['Pan, zoom, and click a marker.'],
          ),
        ],
      ),
      div(
        [Class('px-5 py-3 border-b border-slate-200')],
        [
          input([
            Type('search'),
            Placeholder('Filter locations'),
            AriaLabel('Filter locations'),
            Class(
              'w-full px-3 py-2 text-sm rounded-md border border-slate-300 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200',
            ),
            Value(model.searchQuery),
            OnInput(value => UpdatedSearchQuery({ value })),
            OnMount(focusSearchInput),
          ]),
        ],
      ),
      ul(
        [Class('flex-1 overflow-y-auto'), AriaLabel('Locations')],
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

const emptySidebarView = (searchQuery: string): Html =>
  li(
    [Class('px-5 py-6 text-sm text-slate-500')],
    [
      String.isEmpty(searchQuery.trim())
        ? 'No locations available.'
        : `No locations match "${searchQuery.trim()}".`,
    ],
  )

const locationListItemView =
  (maybeSelectedId: Option.Option<string>) =>
  (location: Location): Html => {
    const isSelected = Option.exists(maybeSelectedId, Equal.equals(location.id))
    return li(
      [],
      [
        button(
          [
            Type('button'),
            AriaPressed(isSelected ? 'true' : 'false'),
            OnClick(ClickedLocation({ locationId: location.id })),
            Class(
              isSelected
                ? 'w-full text-left px-5 py-3 cursor-pointer bg-slate-100 border-l-2 border-slate-900'
                : 'w-full text-left px-5 py-3 cursor-pointer hover:bg-slate-100 border-l-2 border-transparent',
            ),
          ],
          [
            div([Class('text-sm font-medium')], [location.name]),
            div([Class('text-xs text-slate-500 mt-0.5')], [location.region]),
          ],
        ),
      ],
    )
  }

const footerView = (model: Model): Html => {
  const isLocating = model.geolocateState._tag === 'GeolocateLocating'
  return div(
    [Class('border-t border-slate-200 px-5 py-3 space-y-2')],
    [
      button(
        [
          Type('button'),
          OnClick(ClickedFindMe()),
          Disabled(isLocating),
          Class(
            'w-full px-3 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed',
          ),
        ],
        [isLocating ? 'Locating…' : 'Find my location'],
      ),
      Option.match(model.maybeUserLocation, {
        onNone: () => empty,
        onSome: ({ lng, lat }) =>
          p(
            [Class('text-xs text-slate-500')],
            [`You are near ${lat.toFixed(3)}, ${lng.toFixed(3)}.`],
          ),
      }),
    ],
  )
}

const mapPaneView = (model: Model): Html =>
  main(
    [Class('flex-1 relative')],
    [
      div(
        [Class('h-full w-full'), AriaLabel('Map'), OnMount(mountMap(HOST_ID))],
        [],
      ),
      mapErrorBannerView(model.maybeMapError),
      boundsBadgeView(model.maybeBounds),
    ],
  )

const mapErrorBannerView = (maybeReason: Option.Option<string>): Html =>
  Option.match(maybeReason, {
    onNone: () => empty,
    onSome: reason =>
      div(
        [
          AriaLabel('Map failed to load'),
          Class(
            'absolute top-3 left-1/2 -translate-x-1/2 max-w-md bg-rose-50 border border-rose-200 text-rose-900 rounded-md shadow-sm px-4 py-3 text-sm',
          ),
        ],
        [
          div([Class('font-semibold mb-0.5')], ['Could not load the map.']),
          div([Class('text-xs text-rose-700')], [reason]),
        ],
      ),
  })

const boundsBadgeView = (maybeBounds: Option.Option<Bounds>): Html =>
  Option.match(maybeBounds, {
    onNone: () => empty,
    onSome: bounds =>
      div(
        [
          Class(
            'absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-md shadow-sm px-3 py-2 text-xs font-mono text-slate-700 border border-slate-200',
          ),
        ],
        [
          div([], [`N ${bounds.north.toFixed(2)}`]),
          div([], [`S ${bounds.south.toFixed(2)}`]),
          div([], [`E ${bounds.east.toFixed(2)}`]),
          div([], [`W ${bounds.west.toFixed(2)}`]),
        ],
      ),
  })

const geolocateOverlayView = (state: GeolocateState): Html =>
  M.value(state).pipe(
    M.tagsExhaustive({
      GeolocateIdle: () => empty,
      GeolocateLocating: () =>
        geolocateOverlayShellView(geolocateLocatingContentView()),
      GeolocateFailed: ({ reason }) =>
        geolocateOverlayShellView(geolocateFailedContentView(reason)),
    }),
  )

const geolocateOverlayShellView = (content: Html): Html =>
  keyed('div')(
    'geolocate-overlay',
    [
      Class(
        'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40',
      ),
      AriaLabel('Geolocation'),
      OnMount(lockBodyScroll),
    ],
    [content],
  )

const geolocateLocatingContentView = (): Html =>
  keyed('article')(
    'geolocate-locating',
    [
      Class(
        'bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 px-6 py-5 text-center',
      ),
    ],
    [
      h2([Class('text-base font-semibold mb-1')], ['Locating you…']),
      p(
        [Class('text-sm text-slate-500')],
        ['Asking your browser for permission to use your location.'],
      ),
      spinnerView(),
    ],
  )

const geolocateFailedContentView = (reason: string): Html =>
  keyed('article')(
    'geolocate-failed',
    [
      Class(
        'bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 px-6 py-5 text-center',
      ),
    ],
    [
      h2(
        [Class('text-base font-semibold mb-1 text-rose-700')],
        ['Could not locate you'],
      ),
      p([Class('text-sm text-slate-600')], [reason]),
      button(
        [
          Type('button'),
          OnClick(DismissedGeolocate()),
          Class(
            'mt-4 px-4 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800',
          ),
        ],
        ['Dismiss'],
      ),
    ],
  )

const spinnerView = (): Html =>
  div(
    [Class('flex justify-center mt-4')],
    [
      span(
        [
          Class(
            'inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full motion-safe:animate-spin',
          ),
          AriaLabel('Loading'),
        ],
        [],
      ),
    ],
  )

// STYLE

const markerStyle =
  'block w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white shadow cursor-pointer hover:bg-rose-600 transition'

// RUN

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root')!,
  devTools: {
    Message,
  },
})

Runtime.run(program)

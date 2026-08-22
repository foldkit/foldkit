import clsx from 'clsx'
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
import { Command, Mount, Runtime, Subscription, type Update } from 'foldkit'
import * as Dom from 'foldkit/dom'
import type { Document, Html } from 'foldkit/html'
import { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import type { Map as MapInstance } from 'maplibre-gl'

import { Button, Input } from '@foldkit/ui'

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

export const Message = defineMessageUnion({
  SucceededMountMap: { hostId: S.String },
  FailedMountMap: { reason: S.String },
  MovedMap: { bounds: Bounds },
  ClickedMarker: { locationId: S.String },
  ClickedLocation: { locationId: S.String },
  UpdatedSearchQuery: { value: S.String },
  ClickedFindMe: {},
  DismissedGeolocate: {},
  SucceededGeolocate: {
    lng: S.Number,
    lat: S.Number,
  },
  FailedGeolocate: { reason: S.String },
  SucceededFlyTo: {},
  FailedFlyTo: { reason: S.String },
  CompletedFocusSearchInput: {},
  CompletedLockBodyScroll: {},
  CompletedUnlockBodyScroll: {},
})

export type Message = typeof Message.Type

// COMMAND

const flyToMap = (
  hostId: string,
  lng: number,
  lat: number,
  zoom: number,
): Effect.Effect<
  typeof Message.SucceededFlyTo.Type | typeof Message.FailedFlyTo.Type
> =>
  Option.match(getMap(hostId), {
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

export const FlyTo = Command.define('FlyTo', {
  args: {
    maybeHostId: S.Option(S.String),
    lng: S.Number,
    lat: S.Number,
    zoom: S.Number,
  },
  messages: [Message.SucceededFlyTo, Message.FailedFlyTo],
  execute: ({ maybeHostId, lng, lat, zoom }) =>
    Option.match(maybeHostId, {
      onNone: () =>
        Effect.succeed(
          Message.FailedFlyTo({
            reason: 'FlyTo dispatched before the map mounted.',
          }),
        ),
      onSome: hostId => flyToMap(hostId, lng, lat, zoom),
    }),
})

export const Geolocate = Command.define('Geolocate', {
  messages: [Message.SucceededGeolocate, Message.FailedGeolocate],
  execute: Effect.gen(function* () {
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
  ),
})

const SEARCH_INPUT_ID = 'map-search-input'

export const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  execute: Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusSearchInput()),
  ),
})

export const LockBodyScroll = Command.define('LockBodyScroll', {
  messages: [Message.CompletedLockBodyScroll],
  execute: Effect.sync(() => {
    document.body.classList.add('overflow-hidden')
    return Message.CompletedLockBodyScroll()
  }),
})

export const UnlockBodyScroll = Command.define('UnlockBodyScroll', {
  messages: [Message.CompletedUnlockBodyScroll],
  execute: Effect.sync(() => {
    document.body.classList.remove('overflow-hidden')
    return Message.CompletedUnlockBodyScroll()
  }),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const findLocation = (
  model: Model,
  locationId: string,
): Option.Option<Location> =>
  Array.findFirst(model.locations, ({ id }) => Equal.equals(id, locationId))

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SucceededMountMap: ({ hostId }) => ({
      model: evo(model, { maybeMapHostId: () => Option.some(hostId) }),
    }),

    FailedMountMap: ({ reason }) => ({
      model: evo(model, { maybeMapError: () => Option.some(reason) }),
    }),

    MovedMap: ({ bounds }) => ({
      model: evo(model, { maybeBounds: () => Option.some(bounds) }),
    }),

    ClickedMarker: ({ locationId }) => ({
      model: evo(model, {
        maybeSelectedLocationId: () => Option.some(locationId),
      }),
    }),

    ClickedLocation: ({ locationId }) =>
      Option.match(findLocation(model, locationId), {
        onNone: () => ({ model }),
        onSome: ({ lng, lat }) => ({
          model: evo(model, {
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

    UpdatedSearchQuery: ({ value }) => ({
      model: evo(model, { searchQuery: () => value }),
    }),

    ClickedFindMe: () => ({
      model: evo(model, { geolocateState: () => GeolocateLocating() }),
      commands: [LockBodyScroll(), Geolocate()],
    }),

    DismissedGeolocate: () => ({
      model: evo(model, { geolocateState: () => GeolocateIdle() }),
      commands: [UnlockBodyScroll()],
    }),

    SucceededGeolocate: ({ lng, lat }) => ({
      model: evo(model, {
        maybeUserLocation: () => Option.some({ lng, lat }),
        geolocateState: () => GeolocateIdle(),
      }),
      commands: [
        UnlockBodyScroll(),
        FlyTo({
          maybeHostId: model.maybeMapHostId,
          lng: lng,
          lat: lat,
          zoom: USER_LOCATION_ZOOM,
        }),
      ],
    }),

    FailedGeolocate: ({ reason }) => ({
      model: evo(model, { geolocateState: () => GeolocateFailed({ reason }) }),
    }),

    SucceededFlyTo: () => ({ model }),
    FailedFlyTo: () => ({ model }),
    CompletedFocusSearchInput: () => ({ model }),
    CompletedLockBodyScroll: () => ({ model }),
    CompletedUnlockBodyScroll: () => ({ model }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    locations: featuredLocations,
    searchQuery: '',
    maybeMapHostId: Option.none(),
    maybeMapError: Option.none(),
    maybeBounds: Option.none(),
    maybeSelectedLocationId: Option.none(),
    maybeUserLocation: Option.none(),
    geolocateState: GeolocateIdle(),
  },
  commands: [FocusSearchInput()],
})

// MAP MOUNT

export const MountMap = Mount.define(
  'MountMap',
  { hostId: S.String },
  Message.SucceededMountMap,
  Message.FailedMountMap,
)(
  ({ hostId }) =>
    element =>
      Effect.gen(function* () {
        if (!(element instanceof HTMLElement)) {
          return Message.FailedMountMap({
            reason: 'Map host is not an HTMLElement.',
          })
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

          return Message.SucceededMountMap({ hostId })
        }).pipe(
          Effect.catch(error =>
            Effect.succeed(
              Message.FailedMountMap({
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

const streamMapEvents = (hostId: string) =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() =>
        Option.map(getMap(hostId), map => {
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

          map.on('moveend', onMoveEnd)
          map.getContainer().addEventListener('click', onContainerClick)
          Queue.offerUnsafe(
            queue,
            Message.MovedMap({ bounds: boundsFromMap(map) }),
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
              map.getContainer().removeEventListener('click', onContainerClick)
            },
          }),
        ),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

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
          onSome: streamMapEvents,
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

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Foldkit Map',
  body: h.div(
    [h.Class('h-screen w-screen flex bg-slate-100 text-slate-900')],
    [
      sidebarView(model, h),
      mapPaneView(model, h),
      geolocateOverlayView(model.geolocateState, h),
    ],
  ),
})

const sidebarView = (model: Model, h: HtmlBuilder<Message>): Html => {
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
          Input.view(
            {
              id: SEARCH_INPUT_ID,
              type: 'search',
              value: model.searchQuery,
              placeholder: 'Filter locations',
              onInput: value => Message.UpdatedSearchQuery({ value }),
              toView: attributes =>
                h.input([
                  ...attributes.input,
                  h.AriaLabel('Filter locations'),
                  h.Class(
                    'w-full px-3 py-2 text-sm rounded-md border border-slate-300 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200',
                  ),
                ]),
            },
            h,
          ),
        ],
      ),
      h.ul(
        [h.Class('flex-1 overflow-y-auto'), h.AriaLabel('Locations')],
        Array.match(visible, {
          onEmpty: () => [emptySidebarView(model.searchQuery, h)],
          onNonEmpty: Array.map(location =>
            locationListItemView(model.maybeSelectedLocationId)(location, h),
          ),
        }),
      ),
      footerView(model, h),
    ],
  )
}

const emptySidebarView = (searchQuery: string, h: HtmlBuilder<Message>): Html =>
  h.li(
    [h.Class('px-5 py-6 text-sm text-slate-500')],
    [
      String.isEmpty(searchQuery.trim())
        ? 'No locations available.'
        : `No locations match "${searchQuery.trim()}".`,
    ],
  )

const locationListItemView =
  (maybeSelectedId: Option.Option<string>) =>
  (location: Location, h: HtmlBuilder<Message>): Html => {
    const isSelected = Option.exists(maybeSelectedId, Equal.equals(location.id))
    return h.li(
      [],
      [
        Button.view(
          {
            onClick: Message.ClickedLocation({ locationId: location.id }),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.AriaPressed(isSelected ? 'true' : 'false'),
                  h.Class(
                    clsx(
                      'w-full text-left px-5 py-3 cursor-pointer border-l-2',
                      isSelected
                        ? 'bg-slate-100 border-slate-900'
                        : 'hover:bg-slate-100 border-transparent',
                    ),
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
          },
          h,
        ),
      ],
    )
  }

const footerView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isLocating = model.geolocateState._tag === 'GeolocateLocating'
  return h.div(
    [h.Class('border-t border-slate-200 px-5 py-3 space-y-2')],
    [
      Button.view(
        {
          onClick: Message.ClickedFindMe(),
          isDisabled: isLocating,
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'w-full px-3 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
                ),
              ],
              [isLocating ? 'Locating…' : 'Find my location'],
            ),
        },
        h,
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

const mapPaneView = (model: Model, h: HtmlBuilder<Message>): Html =>
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

const mapErrorBannerView = (
  maybeReason: Option.Option<string>,
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
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

const geolocateOverlayView = (
  state: GeolocateState,
  h: HtmlBuilder<Message>,
): Html =>
  M.value(state).pipe(
    M.tagsExhaustive({
      GeolocateIdle: () => h.empty,
      GeolocateLocating: () =>
        geolocateOverlayShellView(geolocateLocatingContentView(h), h),
      GeolocateFailed: ({ reason }) =>
        geolocateOverlayShellView(geolocateFailedContentView(reason, h), h),
    }),
  )

const geolocateOverlayShellView = (
  content: Html,
  h: HtmlBuilder<Message>,
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

const geolocateLocatingContentView = (h: HtmlBuilder<Message>): Html =>
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
  h: HtmlBuilder<Message>,
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

const spinnerView = (h: HtmlBuilder<Message>): Html =>
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

// STYLE

const markerStyle =
  'block w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white shadow cursor-pointer hover:bg-rose-600 transition'

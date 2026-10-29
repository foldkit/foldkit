import clsx from 'clsx'
import { Array, Equal, Option, String } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'

import { SEARCH_INPUT_ID } from './command'
import { ApplicationComposition } from './composition'
import type { ApplicationViewBuilder } from './composition'
import { type Location } from './locations'
import { Message } from './message'
import { type Bounds, GeolocateState, type Model } from './model'
import { MountMap } from './mount'

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

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Foldkit Map',
  body: h.div(
    [h.Class('h-screen w-screen flex bg-slate-100 text-slate-900')],
    [
      sidebarView(model, h),
      mapPaneView(model, h),
      geolocateOverlayView(model.geolocateState, h),
    ],
  ),
}))

const sidebarView = (model: Model, h: ApplicationViewBuilder): Html => {
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

const emptySidebarView = (
  searchQuery: string,
  h: ApplicationViewBuilder,
): Html =>
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
  (location: Location, h: ApplicationViewBuilder): Html => {
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

const footerView = (model: Model, h: ApplicationViewBuilder): Html => {
  const isLocating = model.geolocateState._tag === 'Locating'
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

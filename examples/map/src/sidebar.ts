import clsx from 'clsx'
import { Array, Effect, Equal, Option, Schema, String } from 'effect'
import { Block, Command } from 'foldkit'
import * as Dom from 'foldkit/dom'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

import type { LngLat, Location } from './domain/location'

const SEARCH_INPUT_ID = 'map-search-input'

const Model = Schema.Struct({
  searchQuery: Schema.String,
})

export const Message = defineMessageUnion({
  UpdatedSearchQuery: { value: Schema.String },
  ClickedLocation: { locationId: Schema.String },
  ClickedFindMe: {},
  CompletedFocusSearchInput: {},
})
export type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  SelectedLocation: { locationId: Schema.String },
  RequestedGeolocate: {},
})

const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
})

type ViewInput = Readonly<{
  locations: ReadonlyArray<Location>
  maybeSelectedLocationId: Option.Option<string>
  maybeUserLocation: Option.Option<LngLat>
  isLocating: boolean
}>

export class Sidebar extends Block<Sidebar, void, ViewInput>()('Sidebar', {
  Model,
  Message,
  OutMessage,
  Command: [FocusSearchInput],
}) {}

export const SidebarLive = Sidebar.make(
  Effect.fn(function* () {
    return {
      model: { searchQuery: '' },

      start: [FocusSearchInput()],

      update: {
        UpdatedSearchQuery: (model, { value }) => ({
          model: modifyFields(model, {
            searchQuery: () => value,
          }),
        }),

        ClickedLocation: (model, { locationId }) => ({
          model,
          outMessage: OutMessage.SelectedLocation({ locationId }),
        }),

        ClickedFindMe: model => ({
          model,
          outMessage: OutMessage.RequestedGeolocate(),
        }),

        CompletedFocusSearchInput: model => ({ model }),
      },

      commands: {
        FocusSearchInput: () =>
          Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusSearchInput()),
          ),
      },

      view: (model, h, input) => {
        const visible = filterLocations(input.locations, model.searchQuery)

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
                onEmpty: () => [emptyListView(model.searchQuery, h)],
                onNonEmpty: Array.map(location =>
                  locationListItemView(input.maybeSelectedLocationId)(
                    location,
                    h,
                  ),
                ),
              }),
            ),
            footerView(input, h),
          ],
        )
      },
    }
  }),
)

type SidebarViewBuilder = HtmlBuilder<Message>

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

const emptyListView = (searchQuery: string, h: SidebarViewBuilder): Html =>
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
  (location: Location, h: SidebarViewBuilder): Html => {
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

const footerView = (
  { isLocating, maybeUserLocation }: ViewInput,
  h: SidebarViewBuilder,
): Html =>
  h.div(
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
      Option.match(maybeUserLocation, {
        onNone: () => h.empty,
        onSome: ({ lng, lat }) =>
          h.p(
            [h.Class('text-xs text-slate-500')],
            [`You are near ${lat.toFixed(3)}, ${lng.toFixed(3)}.`],
          ),
      }),
    ],
  )

import { Effect, Option, Schema } from 'effect'
import * as Dom from 'foldkit/dom'

import { ApplicationDefinition } from './definition'
import { MapRegistry } from './mapRegistry'
import { Message } from './message'
import type { FailedFlyTo, SucceededFlyTo } from './message'

export const SELECTED_LOCATION_ZOOM = 12
export const USER_LOCATION_ZOOM = 13
const GEOLOCATION_TIMEOUT_MS = 10_000
export const SEARCH_INPUT_ID = 'map-search-input'

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

export const FlyTo = ApplicationDefinition.makeCommand('FlyTo', {
  args: {
    maybeHostId: Schema.Option(Schema.String),
    lng: Schema.Number,
    lat: Schema.Number,
    zoom: Schema.Number,
  },
  messages: [Message.SucceededFlyTo, Message.FailedFlyTo],
  handler: function* () {
    const maps = yield* MapRegistry

    return ({ maybeHostId, lng, lat, zoom }) =>
      Option.match(maybeHostId, {
        onNone: () =>
          Effect.succeed(
            Message.FailedFlyTo({
              reason: 'FlyTo dispatched before the map mounted.',
            }),
          ),
        onSome: hostId => flyToMap(maps, hostId, lng, lat, zoom),
      })
  },
})

export const Geolocate = ApplicationDefinition.makeCommand('Geolocate', {
  messages: [Message.SucceededGeolocate, Message.FailedGeolocate],
  handler: function* () {
    return () =>
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
  },
})

export const FocusSearchInput = ApplicationDefinition.makeCommand(
  'FocusSearchInput',
  {
    messages: [Message.CompletedFocusSearchInput],
    handler: function* () {
      return () =>
        Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusSearchInput()),
        )
    },
  },
)

export const LockBodyScroll = ApplicationDefinition.makeCommand(
  'LockBodyScroll',
  {
    messages: [Message.CompletedLockBodyScroll],
    handler: function* () {
      return () =>
        Effect.sync(() => {
          document.body.classList.add('overflow-hidden')
          return Message.CompletedLockBodyScroll()
        })
    },
  },
)

export const UnlockBodyScroll = ApplicationDefinition.makeCommand(
  'UnlockBodyScroll',
  {
    messages: [Message.CompletedUnlockBodyScroll],
    handler: function* () {
      return () =>
        Effect.sync(() => {
          document.body.classList.remove('overflow-hidden')
          return Message.CompletedUnlockBodyScroll()
        })
    },
  },
)

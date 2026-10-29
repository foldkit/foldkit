import { Array, Equal, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  FlyTo,
  Geolocate,
  LockBodyScroll,
  SELECTED_LOCATION_ZOOM,
  USER_LOCATION_ZOOM,
  UnlockBodyScroll,
} from './command'
import { ApplicationComposition } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'
import type { Location } from './locations'
import { GeolocateState, type Model } from './model'

const findLocation = (
  model: Model,
  locationId: string,
): Option.Option<Location> =>
  Array.findFirst(model.locations, ({ id }) => Equal.equals(id, locationId))

export const update = ApplicationComposition.makeUpdate({
  SucceededMountMap: makeFieldsStep.fromMessage(({ hostId }) => ({
    maybeMapHostId: () => Option.some(hostId),
  })),

  FailedMountMap: makeFieldsStep.fromMessage(({ reason }) => ({
    maybeMapError: () => Option.some(reason),
  })),

  MovedMap: makeFieldsStep.fromMessage(({ bounds }) => ({
    maybeBounds: () => Option.some(bounds),
  })),

  ClickedMarker: makeFieldsStep.fromMessage(({ locationId }) => ({
    maybeSelectedLocationId: () => Option.some(locationId),
  })),

  ClickedLocation: (model, { locationId }) =>
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

  UpdatedSearchQuery: makeFieldsStep.fromMessage(({ value }) => ({
    searchQuery: () => value,
  })),

  ClickedFindMe: model => ({
    model: modifyFields(model, {
      geolocateState: () => GeolocateState.Locating(),
    }),
    commands: [LockBodyScroll(), Geolocate()],
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
        lng: lng,
        lat: lat,
        zoom: USER_LOCATION_ZOOM,
      }),
    ],
  }),

  FailedGeolocate: makeFieldsStep.fromMessage(({ reason }) => ({
    geolocateState: () => GeolocateState.Failed({ reason }),
  })),

  SucceededFlyTo: makeNoopStep(),
  FailedFlyTo: makeNoopStep(),
  CompletedFocusSearchInput: makeNoopStep(),
  CompletedLockBodyScroll: makeNoopStep(),
  CompletedUnlockBodyScroll: makeNoopStep(),
})

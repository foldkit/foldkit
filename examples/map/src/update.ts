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
import { ApplicationDefinition } from './definition'
import type { Location } from './locations'
import { GeolocateState, type Model } from './model'

const findLocation = (
  model: typeof Model.Type,
  locationId: string,
): Option.Option<typeof Location.Type> =>
  Array.findFirst(model.locations, ({ id }) => Equal.equals(id, locationId))

export const update = ApplicationComposition.makeUpdate({
  SucceededMountMap: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ hostId }) => ({ maybeMapHostId: () => Option.some(hostId) }),
  ),

  FailedMountMap: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ reason }) => ({ maybeMapError: () => Option.some(reason) }),
  ),

  MovedMap: ApplicationDefinition.makeFieldsStep.fromMessage(({ bounds }) => ({
    maybeBounds: () => Option.some(bounds),
  })),

  ClickedMarker: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ locationId }) => ({
      maybeSelectedLocationId: () => Option.some(locationId),
    }),
  ),

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

  UpdatedSearchQuery: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ searchQuery: () => value }),
  ),

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

  FailedGeolocate: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ reason }) => ({
      geolocateState: () => GeolocateState.Failed({ reason }),
    }),
  ),

  SucceededFlyTo: ApplicationDefinition.makeNoopStep(),
  FailedFlyTo: ApplicationDefinition.makeNoopStep(),
  CompletedFocusSearchInput: ApplicationDefinition.makeNoopStep(),
  CompletedLockBodyScroll: ApplicationDefinition.makeNoopStep(),
  CompletedUnlockBodyScroll: ApplicationDefinition.makeNoopStep(),
})

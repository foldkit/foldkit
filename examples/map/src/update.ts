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
import type { Location } from './locations'
import { Message } from './message'
import { GeolocateState, type Model } from './model'

const findLocation = (
  model: Model,
  locationId: string,
): Option.Option<Location> =>
  Array.findFirst(model.locations, ({ id }) => Equal.equals(id, locationId))

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    SucceededMountMap: ({ hostId }) => ({
      model: modifyFields(model, { maybeMapHostId: () => Option.some(hostId) }),
    }),

    FailedMountMap: ({ reason }) => ({
      model: modifyFields(model, { maybeMapError: () => Option.some(reason) }),
    }),

    MovedMap: ({ bounds }) => ({
      model: modifyFields(model, { maybeBounds: () => Option.some(bounds) }),
    }),

    ClickedMarker: ({ locationId }) => ({
      model: modifyFields(model, {
        maybeSelectedLocationId: () => Option.some(locationId),
      }),
    }),

    ClickedLocation: ({ locationId }) =>
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

    UpdatedSearchQuery: ({ value }) => ({
      model: modifyFields(model, { searchQuery: () => value }),
    }),

    ClickedFindMe: () => ({
      model: modifyFields(model, {
        geolocateState: () => GeolocateState.Locating(),
      }),
      commands: [LockBodyScroll(), Geolocate()],
    }),

    DismissedGeolocate: () => ({
      model: modifyFields(model, {
        geolocateState: () => GeolocateState.Idle(),
      }),
      commands: [UnlockBodyScroll()],
    }),

    SucceededGeolocate: ({ lng, lat }) => ({
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

    FailedGeolocate: ({ reason }) => ({
      model: modifyFields(model, {
        geolocateState: () => GeolocateState.Failed({ reason }),
      }),
    }),

    SucceededFlyTo: () => ({ model }),
    FailedFlyTo: () => ({ model }),
    CompletedFocusSearchInput: () => ({ model }),
    CompletedLockBodyScroll: () => ({ model }),
    CompletedUnlockBodyScroll: () => ({ model }),
  }),
)

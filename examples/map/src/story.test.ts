import { Option } from 'effect'
import { Story } from 'foldkit'
import { expect, test } from 'vitest'

import {
  ClickedFindMe,
  ClickedLocation,
  ClickedMarker,
  CompletedLockBodyScroll,
  CompletedUnlockBodyScroll,
  DismissedGeolocate,
  FailedGeolocate,
  FailedMountMap,
  FlyTo,
  Geolocate,
  GeolocateFailed,
  GeolocateLocating,
  LockBodyScroll,
  MovedMap,
  SucceededFlyTo,
  SucceededGeolocate,
  SucceededMountMap,
  UnlockBodyScroll,
  UpdatedSearchQuery,
  update,
} from './main'
import { eiffelTower, initialModel, mountedModel } from './main.fixtures'

test('mounting the map records the host id in the Model', () => {
  Story.story(
    update,
    Story.with(initialModel),
    Story.message(SucceededMountMap({ hostId: 'map-host-1' })),
    Story.model(model => {
      expect(model.maybeMapHostId).toStrictEqual(Option.some('map-host-1'))
    }),
  )
})

test('movement events update the Model bounds', () => {
  Story.story(
    update,
    Story.with(mountedModel),
    Story.message(
      MovedMap({
        bounds: { west: -180, south: -85, east: 180, north: 85 },
      }),
    ),
    Story.model(model => {
      expect(model.maybeBounds).toStrictEqual(
        Option.some({ west: -180, south: -85, east: 180, north: 85 }),
      )
    }),
  )
})

test('clicking a marker selects the corresponding location', () => {
  Story.story(
    update,
    Story.with(mountedModel),
    Story.message(ClickedMarker({ locationId: eiffelTower.id })),
    Story.model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(
        Option.some(eiffelTower.id),
      )
    }),
  )
})

test('clicking a sidebar location selects it and emits a fly Command', () => {
  Story.story(
    update,
    Story.with(mountedModel),
    Story.message(ClickedLocation({ locationId: eiffelTower.id })),
    Story.model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(
        Option.some(eiffelTower.id),
      )
    }),
    Story.Command.expectHas(FlyTo),
    Story.Command.resolve(FlyTo, SucceededFlyTo()),
  )
})

test('clicking a sidebar location before the map mounts still emits FlyTo', () => {
  Story.story(
    update,
    Story.with(initialModel),
    Story.message(ClickedLocation({ locationId: eiffelTower.id })),
    Story.model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(
        Option.some(eiffelTower.id),
      )
      expect(model.maybeMapHostId).toStrictEqual(Option.none())
    }),
    Story.Command.expectHas(FlyTo),
    Story.Command.resolve(FlyTo, SucceededFlyTo()),
  )
})

test('a failed map mount surfaces the reason in the Model', () => {
  Story.story(
    update,
    Story.with(initialModel),
    Story.message(FailedMountMap({ reason: 'Network timeout' })),
    Story.model(model => {
      expect(model.maybeMapError).toStrictEqual(Option.some('Network timeout'))
    }),
  )
})

test('clicking a sidebar location with an unknown id is a no-op', () => {
  Story.story(
    update,
    Story.with(mountedModel),
    Story.message(ClickedLocation({ locationId: 'does-not-exist' })),
    Story.model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(Option.none())
    }),
    Story.Command.expectNone(),
  )
})

test('typing in the filter input updates the query', () => {
  Story.story(
    update,
    Story.with(initialModel),
    Story.message(UpdatedSearchQuery({ value: 'Paris' })),
    Story.model(model => {
      expect(model.searchQuery).toBe('Paris')
    }),
  )
})

test('clicking find-me transitions to the locating state and emits Geolocate', () => {
  Story.story(
    update,
    Story.with(initialModel),
    Story.message(ClickedFindMe()),
    Story.model(model => {
      expect(model.geolocateState._tag).toBe('GeolocateLocating')
    }),
    Story.Command.expectHas(LockBodyScroll, Geolocate),
    Story.Command.resolve(LockBodyScroll, CompletedLockBodyScroll()),
    Story.Command.resolve(
      Geolocate,
      FailedGeolocate({ reason: 'Test cleanup' }),
    ),
  )
})

test('a successful geolocation result clears the locating state and flies the map', () => {
  Story.story(
    update,
    Story.with({
      ...mountedModel,
      geolocateState: GeolocateLocating(),
    }),
    Story.message(SucceededGeolocate({ lng: 2.35, lat: 48.85 })),
    Story.model(model => {
      expect(model.geolocateState._tag).toBe('GeolocateIdle')
      expect(model.maybeUserLocation).toStrictEqual(
        Option.some({ lng: 2.35, lat: 48.85 }),
      )
    }),
    Story.Command.expectHas(UnlockBodyScroll, FlyTo),
    Story.Command.resolve(UnlockBodyScroll, CompletedUnlockBodyScroll()),
    Story.Command.resolve(FlyTo, SucceededFlyTo()),
  )
})

test('a failed geolocation result surfaces the reason in the geolocate state', () => {
  Story.story(
    update,
    Story.with({
      ...initialModel,
      geolocateState: GeolocateLocating(),
    }),
    Story.message(FailedGeolocate({ reason: 'Permission denied' })),
    Story.model(model => {
      expect(model.geolocateState._tag).toBe('GeolocateFailed')
      if (model.geolocateState._tag === 'GeolocateFailed') {
        expect(model.geolocateState.reason).toBe('Permission denied')
      }
    }),
  )
})

test('dismissing the geolocate overlay returns to idle', () => {
  Story.story(
    update,
    Story.with({
      ...initialModel,
      geolocateState: GeolocateFailed({ reason: 'Timed out' }),
    }),
    Story.message(DismissedGeolocate()),
    Story.model(model => {
      expect(model.geolocateState._tag).toBe('GeolocateIdle')
    }),
    Story.Command.resolve(UnlockBodyScroll, CompletedUnlockBodyScroll()),
  )
})

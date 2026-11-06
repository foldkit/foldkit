import { Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { FlyTo, Geolocate, LockBodyScroll, UnlockBodyScroll } from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { GeolocateState } from './model'
import { eiffelTower, initialModel, mountedModel } from './model.fixture'

it.effect('mounting the map records the host id in the Model', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(initialModel),
    Story.message(Message.SucceededMountMap({ hostId: 'map-host-1' })),
    Story.model(model => {
      expect(model.maybeMapHostId).toStrictEqual(Option.some('map-host-1'))
    }),
  ),
)

it.effect('movement events update the Model bounds', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(mountedModel),
    Story.message(
      Message.MovedMap({
        bounds: { west: -180, south: -85, east: 180, north: 85 },
      }),
    ),
    Story.model(model => {
      expect(model.maybeBounds).toStrictEqual(
        Option.some({ west: -180, south: -85, east: 180, north: 85 }),
      )
    }),
  ),
)

it.effect('clicking a marker selects the corresponding location', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(mountedModel),
    Story.message(Message.ClickedMarker({ locationId: eiffelTower.id })),
    Story.model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(
        Option.some(eiffelTower.id),
      )
    }),
  ),
)

it.effect(
  'clicking a sidebar location selects it and emits a fly Command',
  () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(mountedModel),
      Story.message(Message.ClickedLocation({ locationId: eiffelTower.id })),
      Story.model(model => {
        expect(model.maybeSelectedLocationId).toStrictEqual(
          Option.some(eiffelTower.id),
        )
      }),
      Story.Command.expectHas(FlyTo),
      Story.Command.resolve(FlyTo, Message.SucceededFlyTo()),
    ),
)

it.effect(
  'clicking a sidebar location before the map mounts still emits FlyTo',
  () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedLocation({ locationId: eiffelTower.id })),
      Story.model(model => {
        expect(model.maybeSelectedLocationId).toStrictEqual(
          Option.some(eiffelTower.id),
        )
        expect(model.maybeMapHostId).toStrictEqual(Option.none())
      }),
      Story.Command.expectHas(FlyTo),
      Story.Command.resolve(FlyTo, Message.SucceededFlyTo()),
    ),
)

it.effect('a failed map mount surfaces the reason in the Model', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(initialModel),
    Story.message(Message.FailedMountMap({ reason: 'Network timeout' })),
    Story.model(model => {
      expect(model.maybeMapError).toStrictEqual(Option.some('Network timeout'))
    }),
  ),
)

it.effect('clicking a sidebar location with an unknown id is a no-op', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(mountedModel),
    Story.message(Message.ClickedLocation({ locationId: 'does-not-exist' })),
    Story.model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(Option.none())
    }),
    Story.Command.expectNone(),
  ),
)

it.effect('typing in the filter input updates the query', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(initialModel),
    Story.message(Message.UpdatedSearchQuery({ value: 'Paris' })),
    Story.model(model => {
      expect(model.searchQuery).toBe('Paris')
    }),
  ),
)

it.effect(
  'clicking find-me transitions to the locating state and emits Geolocate',
  () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedFindMe()),
      Story.model(model => {
        expect(model.geolocateState._tag).toBe('Locating')
      }),
      Story.Command.expectHas(LockBodyScroll, Geolocate),
      Story.Command.resolve(LockBodyScroll, Message.CompletedLockBodyScroll()),
      Story.Command.resolve(
        Geolocate,
        Message.FailedGeolocate({ reason: 'Test cleanup' }),
      ),
    ),
)

it.effect(
  'a successful geolocation result clears the locating state and flies the map',
  () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(
        modifyFields(mountedModel, {
          geolocateState: () => GeolocateState.Locating(),
        }),
      ),
      Story.message(Message.SucceededGeolocate({ lng: 2.35, lat: 48.85 })),
      Story.model(model => {
        expect(model.geolocateState._tag).toBe('Idle')
        expect(model.maybeUserLocation).toStrictEqual(
          Option.some({ lng: 2.35, lat: 48.85 }),
        )
      }),
      Story.Command.expectHas(UnlockBodyScroll, FlyTo),
      Story.Command.resolve(
        UnlockBodyScroll,
        Message.CompletedUnlockBodyScroll(),
      ),
      Story.Command.resolve(FlyTo, Message.SucceededFlyTo()),
    ),
)

it.effect(
  'a failed geolocation result surfaces the reason in the geolocate state',
  () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(
        modifyFields(initialModel, {
          geolocateState: () => GeolocateState.Locating(),
        }),
      ),
      Story.message(Message.FailedGeolocate({ reason: 'Permission denied' })),
      Story.model(model => {
        expect(model.geolocateState._tag).toBe('Failed')
        if (model.geolocateState._tag === 'Failed') {
          expect(model.geolocateState.reason).toBe('Permission denied')
        }
      }),
    ),
)

it.effect('dismissing the geolocate overlay returns to idle', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(
      modifyFields(initialModel, {
        geolocateState: () => GeolocateState.Failed({ reason: 'Timed out' }),
      }),
    ),
    Story.message(Message.DismissedGeolocate()),
    Story.model(model => {
      expect(model.geolocateState._tag).toBe('Idle')
    }),
    Story.Command.resolve(
      UnlockBodyScroll,
      Message.CompletedUnlockBodyScroll(),
    ),
  ),
)

import { Option } from 'effect'
import { Block } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { expect, it } from '@effect/vitest'

import {
  FlyTo,
  Geolocate,
  GeolocateState,
  LockBodyScroll,
  Message,
  UnlockBodyScroll,
} from './application'
import {
  TestLive,
  eiffelTower,
  initialModel,
  mountedModel,
} from './model.fixture'
import { Sidebar } from './sidebar'

const sidebarMessage = (message: typeof Sidebar.Message.Type) =>
  Block.deliver(Sidebar, 'sidebar', message)

it.effect('mounting the map records the host id in the Model', () =>
  story(
    TestLive,
    given(initialModel),
    message(Message.SucceededMountMap({ hostId: 'map-host-1' })),
    model(model => {
      expect(model.maybeMapHostId).toStrictEqual(Option.some('map-host-1'))
    }),
  ),
)

it.effect('movement events update the Model bounds', () =>
  story(
    TestLive,
    given(mountedModel),
    message(
      Message.MovedMap({
        bounds: { west: -180, south: -85, east: 180, north: 85 },
      }),
    ),
    model(model => {
      expect(model.maybeBounds).toStrictEqual(
        Option.some({ west: -180, south: -85, east: 180, north: 85 }),
      )
    }),
  ),
)

it.effect('clicking a marker selects the corresponding location', () =>
  story(
    TestLive,
    given(mountedModel),
    message(Message.ClickedMarker({ locationId: eiffelTower.id })),
    model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(
        Option.some(eiffelTower.id),
      )
    }),
  ),
)

it.effect(
  'clicking a sidebar location selects it and emits a fly Command',
  () =>
    story(
      TestLive,
      given(mountedModel),
      message(
        sidebarMessage(
          Sidebar.Message.ClickedLocation({ locationId: eiffelTower.id }),
        ),
      ),
      model(model => {
        expect(model.maybeSelectedLocationId).toStrictEqual(
          Option.some(eiffelTower.id),
        )
      }),
      Command.expectHas(FlyTo),
      Command.resolve(FlyTo, Message.SucceededFlyTo()),
    ),
)

it.effect(
  'clicking a sidebar location before the map mounts still emits FlyTo',
  () =>
    story(
      TestLive,
      given(initialModel),
      message(
        sidebarMessage(
          Sidebar.Message.ClickedLocation({ locationId: eiffelTower.id }),
        ),
      ),
      model(model => {
        expect(model.maybeSelectedLocationId).toStrictEqual(
          Option.some(eiffelTower.id),
        )
        expect(model.maybeMapHostId).toStrictEqual(Option.none())
      }),
      Command.expectHas(FlyTo),
      Command.resolve(FlyTo, Message.SucceededFlyTo()),
    ),
)

it.effect('a failed map mount surfaces the reason in the Model', () =>
  story(
    TestLive,
    given(initialModel),
    message(Message.FailedMountMap({ reason: 'Network timeout' })),
    model(model => {
      expect(model.maybeMapError).toStrictEqual(Option.some('Network timeout'))
    }),
  ),
)

it.effect('clicking a sidebar location with an unknown id is a no-op', () =>
  story(
    TestLive,
    given(mountedModel),
    message(
      sidebarMessage(
        Sidebar.Message.ClickedLocation({ locationId: 'does-not-exist' }),
      ),
    ),
    model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(Option.none())
    }),
    Command.expectNone(),
  ),
)

it.effect('typing in the filter input updates the query', () =>
  story(
    TestLive,
    given(initialModel),
    message(
      sidebarMessage(Sidebar.Message.UpdatedSearchQuery({ value: 'Paris' })),
    ),
    model(model => {
      expect(model.sidebar.searchQuery).toBe('Paris')
    }),
  ),
)

it.effect(
  'clicking find-me transitions to the locating state and emits Geolocate',
  () =>
    story(
      TestLive,
      given(initialModel),
      message(sidebarMessage(Sidebar.Message.ClickedFindMe())),
      model(model => {
        expect(model.geolocateState._tag).toBe('Locating')
      }),
      Command.expectHas(LockBodyScroll, Geolocate),
      Command.resolve(LockBodyScroll, Message.CompletedLockBodyScroll()),
      Command.resolve(
        Geolocate,
        Message.FailedGeolocate({ reason: 'Test cleanup' }),
      ),
    ),
)

it.effect(
  'a successful geolocation result clears the locating state and flies the map',
  () =>
    story(
      TestLive,
      given(
        modifyFields(mountedModel, {
          geolocateState: () => GeolocateState.Locating(),
        }),
      ),
      message(Message.SucceededGeolocate({ lng: 2.35, lat: 48.85 })),
      model(model => {
        expect(model.geolocateState._tag).toBe('Idle')
        expect(model.maybeUserLocation).toStrictEqual(
          Option.some({ lng: 2.35, lat: 48.85 }),
        )
      }),
      Command.expectHas(UnlockBodyScroll, FlyTo),
      Command.resolve(UnlockBodyScroll, Message.CompletedUnlockBodyScroll()),
      Command.resolve(FlyTo, Message.SucceededFlyTo()),
    ),
)

it.effect(
  'a failed geolocation result surfaces the reason in the geolocate state',
  () =>
    story(
      TestLive,
      given(
        modifyFields(initialModel, {
          geolocateState: () => GeolocateState.Locating(),
        }),
      ),
      message(Message.FailedGeolocate({ reason: 'Permission denied' })),
      model(model => {
        expect(model.geolocateState._tag).toBe('Failed')
        if (model.geolocateState._tag === 'Failed') {
          expect(model.geolocateState.reason).toBe('Permission denied')
        }
      }),
    ),
)

it.effect('dismissing the geolocate overlay returns to idle', () =>
  story(
    TestLive,
    given(
      modifyFields(initialModel, {
        geolocateState: () => GeolocateState.Failed({ reason: 'Timed out' }),
      }),
    ),
    message(Message.DismissedGeolocate()),
    model(model => {
      expect(model.geolocateState._tag).toBe('Idle')
    }),
    Command.resolve(UnlockBodyScroll, Message.CompletedUnlockBodyScroll()),
  ),
)

import { Option } from 'effect'
import {
  Command,
  Mount,
  click,
  expect,
  given,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'
import { FlyTo, Geolocate, LockBodyScroll, UnlockBodyScroll } from './command'
import { Message } from './message'
import { GeolocateState } from './model'
import { initialModel, mountedModel } from './model.fixture'
import { MountMap } from './mount'

const acknowledgeMapMount = Mount.resolve(
  MountMap,
  Message.SucceededMountMap({ hostId: 'test-map-host' }),
)
const acknowledgeBodyLock = Command.resolve(
  LockBodyScroll,
  Message.CompletedLockBodyScroll(),
)
const acknowledgeBodyUnlock = Command.resolve(
  UnlockBodyScroll,
  Message.CompletedUnlockBodyScroll(),
)

describe('view', () => {
  it.effect('initial view lists every featured location in the sidebar', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      expect(role('button', { name: /Eiffel Tower/ })).toExist(),
      expect(role('button', { name: /Sydney Opera House/ })).toExist(),
      expect(role('button', { name: 'Find my location' })).toExist(),
      acknowledgeMapMount,
    ),
  )

  it.effect('typing in the filter input filters the visible locations', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      acknowledgeMapMount,
      type(label('Filter locations'), 'Paris'),
      expect(role('button', { name: /Eiffel Tower/ })).toExist(),
      expect(role('button', { name: /Sydney Opera House/ })).toBeAbsent(),
    ),
  )

  it.effect('clicking a sidebar location selects it and dispatches FlyTo', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(mountedModel),
      acknowledgeMapMount,
      click(role('button', { name: /Eiffel Tower/ })),
      Command.expectHas(FlyTo),
      Command.resolve(FlyTo, Message.SucceededFlyTo()),
    ),
  )

  it.effect('clicking find-me shows the locating overlay', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(mountedModel),
      acknowledgeMapMount,
      click(role('button', { name: 'Find my location' })),
      expect(role('button', { name: 'Locating…' })).toExist(),
      acknowledgeBodyLock,
      Command.resolve(
        Geolocate,
        Message.FailedGeolocate({ reason: 'Test cleanup' }),
      ),
    ),
  )

  it.effect(
    'the failed-geolocation overlay shows a Dismiss button that returns to idle',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(mountedModel, {
            geolocateState: () =>
              GeolocateState.Failed({
                reason: 'Permission denied',
              }),
          }),
        ),
        acknowledgeMapMount,
        expect(role('button', { name: 'Dismiss' })).toExist(),
        click(role('button', { name: 'Dismiss' })),
        acknowledgeBodyUnlock,
        expect(role('button', { name: 'Dismiss' })).toBeAbsent(),
      ),
  )

  it.effect('a failed map mount renders the error banner', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(initialModel, {
          maybeMapError: () => Option.some('Network timeout'),
        }),
      ),
      expect(label('Map failed to load')).toExist(),
      expect(text('Network timeout')).toExist(),
      acknowledgeMapMount,
    ),
  )

  it.effect('the bounds badge shows after the map reports its first move', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(
        modifyFields(mountedModel, {
          maybeBounds: () =>
            Option.some({
              west: -180,
              south: -85,
              east: 180,
              north: 85,
            }),
        }),
      ),
      expect(text('N 85.00')).toExist(),
      expect(text('S -85.00')).toExist(),
      acknowledgeMapMount,
    ),
  )
})

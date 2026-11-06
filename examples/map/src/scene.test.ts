import { Option } from 'effect'
import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { FlyTo, Geolocate, LockBodyScroll, UnlockBodyScroll } from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { GeolocateState } from './model'
import { initialModel, mountedModel } from './model.fixture'
import { MountMap } from './mount'

const acknowledgeMapMount = Scene.Mount.resolve(
  MountMap,
  Message.SucceededMountMap({ hostId: 'test-map-host' }),
)
const acknowledgeBodyLock = Scene.Command.resolve(
  LockBodyScroll,
  Message.CompletedLockBodyScroll(),
)
const acknowledgeBodyUnlock = Scene.Command.resolve(
  UnlockBodyScroll,
  Message.CompletedUnlockBodyScroll(),
)

describe('view', () => {
  it.effect('initial view lists every featured location in the sidebar', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.role('button', { name: /Eiffel Tower/ })).toExist(),
      Scene.expect(
        Scene.role('button', { name: /Sydney Opera House/ }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Find my location' }),
      ).toExist(),
      acknowledgeMapMount,
    ),
  )

  it.effect('typing in the filter input filters the visible locations', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      acknowledgeMapMount,
      Scene.type(Scene.label('Filter locations'), 'Paris'),
      Scene.expect(Scene.role('button', { name: /Eiffel Tower/ })).toExist(),
      Scene.expect(
        Scene.role('button', { name: /Sydney Opera House/ }),
      ).toBeAbsent(),
    ),
  )

  it.effect('clicking a sidebar location selects it and dispatches FlyTo', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(mountedModel),
      acknowledgeMapMount,
      Scene.click(Scene.role('button', { name: /Eiffel Tower/ })),
      Scene.Command.expectHas(FlyTo),
      Scene.Command.resolve(FlyTo, Message.SucceededFlyTo()),
    ),
  )

  it.effect('clicking find-me shows the locating overlay', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(mountedModel),
      acknowledgeMapMount,
      Scene.click(Scene.role('button', { name: 'Find my location' })),
      Scene.expect(Scene.role('button', { name: 'Locating…' })).toExist(),
      acknowledgeBodyLock,
      Scene.Command.resolve(
        Geolocate,
        Message.FailedGeolocate({ reason: 'Test cleanup' }),
      ),
    ),
  )

  it.effect(
    'the failed-geolocation overlay shows a Dismiss button that returns to idle',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(mountedModel, {
            geolocateState: () =>
              GeolocateState.Failed({
                reason: 'Permission denied',
              }),
          }),
        ),
        acknowledgeMapMount,
        Scene.expect(Scene.role('button', { name: 'Dismiss' })).toExist(),
        Scene.click(Scene.role('button', { name: 'Dismiss' })),
        acknowledgeBodyUnlock,
        Scene.expect(Scene.role('button', { name: 'Dismiss' })).toBeAbsent(),
      ),
  )

  it.effect('a failed map mount renders the error banner', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(initialModel, {
          maybeMapError: () => Option.some('Network timeout'),
        }),
      ),
      Scene.expect(Scene.label('Map failed to load')).toExist(),
      Scene.expect(Scene.text('Network timeout')).toExist(),
      acknowledgeMapMount,
    ),
  )

  it.effect('the bounds badge shows after the map reports its first move', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
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
      Scene.expect(Scene.text('N 85.00')).toExist(),
      Scene.expect(Scene.text('S -85.00')).toExist(),
      acknowledgeMapMount,
    ),
  )
})

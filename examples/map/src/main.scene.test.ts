import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  CompletedFocusSearchInput,
  CompletedLockBodyScroll,
  FailedGeolocate,
  FlyTo,
  FocusSearchInput,
  Geolocate,
  GeolocateFailed,
  LockBodyScroll,
  MountMap,
  SucceededFlyTo,
  SucceededMountMap,
  update,
  view,
} from './main'
import { initialModel, mountedModel } from './main.fixtures'

const acknowledgeSearchFocus = Scene.Mount.resolve(
  FocusSearchInput,
  CompletedFocusSearchInput(),
)
const acknowledgeMapMount = Scene.Mount.resolve(
  MountMap,
  SucceededMountMap({ hostId: 'test-map-host' }),
)
const acknowledgeBodyLock = Scene.Mount.resolve(
  LockBodyScroll,
  CompletedLockBodyScroll(),
)

describe('scene', () => {
  test('initial view lists every featured location in the sidebar', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button', { name: /Eiffel Tower/ })).toExist(),
      Scene.expect(
        Scene.role('button', { name: /Sydney Opera House/ }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Find my location' }),
      ).toExist(),
      acknowledgeMapMount,
      acknowledgeSearchFocus,
    )
  })

  test('typing in the filter input filters the visible locations', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      acknowledgeMapMount,
      acknowledgeSearchFocus,
      Scene.type(Scene.label('Filter locations'), 'Paris'),
      Scene.expect(Scene.role('button', { name: /Eiffel Tower/ })).toExist(),
      Scene.expect(
        Scene.role('button', { name: /Sydney Opera House/ }),
      ).toBeAbsent(),
    )
  })

  test('clicking a sidebar location selects it and dispatches FlyTo', () => {
    Scene.scene(
      { update, view },
      Scene.with(mountedModel),
      acknowledgeMapMount,
      acknowledgeSearchFocus,
      Scene.click(Scene.role('button', { name: /Eiffel Tower/ })),
      Scene.Command.expectHas(FlyTo),
      Scene.Command.resolve(FlyTo, SucceededFlyTo()),
    )
  })

  test('clicking find-me shows the locating overlay', () => {
    Scene.scene(
      { update, view },
      Scene.with(mountedModel),
      acknowledgeMapMount,
      acknowledgeSearchFocus,
      Scene.click(Scene.role('button', { name: 'Find my location' })),
      Scene.expect(Scene.role('button', { name: 'Locating…' })).toExist(),
      acknowledgeBodyLock,
      Scene.Command.resolve(
        Geolocate,
        FailedGeolocate({ reason: 'Test cleanup' }),
      ),
    )
  })

  test('the failed-geolocation overlay shows a Dismiss button that returns to idle', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...mountedModel,
        geolocateState: GeolocateFailed({ reason: 'Permission denied' }),
      }),
      acknowledgeMapMount,
      acknowledgeSearchFocus,
      acknowledgeBodyLock,
      Scene.expect(Scene.role('button', { name: 'Dismiss' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Dismiss' })),
      Scene.expect(Scene.role('button', { name: 'Dismiss' })).toBeAbsent(),
    )
  })

  test('a failed map mount renders the error banner', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...initialModel,
        maybeMapError: Option.some('Network timeout'),
      }),
      Scene.expect(Scene.label('Map failed to load')).toExist(),
      Scene.expect(Scene.text('Network timeout')).toExist(),
      acknowledgeMapMount,
      acknowledgeSearchFocus,
    )
  })

  test('the bounds badge shows after the map reports its first move', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...mountedModel,
        maybeBounds: Option.some({
          west: -180,
          south: -85,
          east: 180,
          north: 85,
        }),
      }),
      Scene.expect(Scene.text('N 85.00')).toExist(),
      Scene.expect(Scene.text('S -85.00')).toExist(),
      acknowledgeMapMount,
      acknowledgeSearchFocus,
    )
  })
})

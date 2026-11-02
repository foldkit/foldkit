import { Effect, Option } from 'effect'
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
import { describe, test } from 'vitest'

import { ApplicationBlock } from './block'
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
  test('initial view lists every featured location in the sidebar', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        expect(role('button', { name: /Eiffel Tower/ })).toExist(),
        expect(role('button', { name: /Sydney Opera House/ })).toExist(),
        expect(role('button', { name: 'Find my location' })).toExist(),
        acknowledgeMapMount,
      ),
    )
  })

  test('typing in the filter input filters the visible locations', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        acknowledgeMapMount,
        type(label('Filter locations'), 'Paris'),
        expect(role('button', { name: /Eiffel Tower/ })).toExist(),
        expect(role('button', { name: /Sydney Opera House/ })).toBeAbsent(),
      ),
    )
  })

  test('clicking a sidebar location selects it and dispatches FlyTo', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(mountedModel),
        acknowledgeMapMount,
        click(role('button', { name: /Eiffel Tower/ })),
        Command.expectHas(FlyTo),
        Command.resolve(FlyTo, Message.SucceededFlyTo()),
      ),
    )
  })

  test('clicking find-me shows the locating overlay', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('the failed-geolocation overlay shows a Dismiss button that returns to idle', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('a failed map mount renders the error banner', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('the bounds badge shows after the map reports its first move', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
})

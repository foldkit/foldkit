import { Option } from 'effect'
import {
  Command,
  ManagedResource,
  click,
  expect,
  given,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Compute,
  EngineState,
  Message,
  Model,
  layer,
  managedResources,
} from './block'

const offModel = Model.make({
  engine: EngineState.Off(),
  computeCount: 0,
  maybeSquareResult: Option.none(),
})

const readyModel = Model.make({
  engine: EngineState.Ready({ engineId: 'engine-1' }),
  computeCount: 2,
  maybeSquareResult: Option.none(),
})

describe('view', () => {
  it.effect('initial view shows the engine off with a Start button', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(offModel),
      expect(text('Engine is off.')).toExist(),
      expect(role('button', { name: 'Start engine' })).toExist(),
      expect(role('button', { name: 'Stop engine' })).toBeAbsent(),
      expect(role('button', { name: 'Compute next square' })).toBeDisabled(),
      expect(text('No result yet.')).toExist(),
    ),
  )

  it.effect(
    'clicking Start engine enters the booting state and shows Stop',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(offModel),
        click(role('button', { name: 'Start engine' })),
        expect(text('Booting engine...')).toExist(),
        expect(role('button', { name: 'Stop engine' })).toExist(),
        expect(role('button', { name: 'Start engine' })).toBeAbsent(),
      ),
  )

  it.effect('a ready engine shows its id and the Stop button', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(readyModel),
      expect(text('Engine ready: engine-1')).toExist(),
      expect(role('button', { name: 'Stop engine' })).toExist(),
      expect(
        role('button', { name: 'Compute next square' }),
      ).not.toBeDisabled(),
    ),
  )

  it.effect(
    'clicking Compute fires the Compute command and renders the result',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(readyModel),
        click(role('button', { name: 'Compute next square' })),
        Command.expectExact(Compute({ value: 3 })),
        Command.resolve(Compute, Message.SucceededCompute({ result: 9 })),
        expect(text('Square result: 9')).toExist(),
      ),
  )

  it.effect(
    'the engine lifecycle drives boot, ready, and stop through the resource steps',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(offModel),
        click(role('button', { name: 'Start engine' })),
        expect(text('Booting engine...')).toExist(),
        ManagedResource.acquire(managedResources.engine, {
          engineId: 'engine-1',
          square: value => value * value,
        }),
        expect(text('Engine ready: engine-1')).toExist(),
        expect(
          role('button', { name: 'Compute next square' }),
        ).not.toBeDisabled(),
        click(role('button', { name: 'Stop engine' })),
        ManagedResource.release(managedResources.engine),
        expect(text('Engine is off.')).toExist(),
      ),
  )

  it.effect('a failed engine boot shows the failure reason', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(offModel),
      click(role('button', { name: 'Start engine' })),
      ManagedResource.failAcquire(
        managedResources.engine,
        'Error: crypto unavailable',
      ),
      expect(text('Engine failed: Error: crypto unavailable')).toExist(),
      expect(role('button', { name: 'Start engine' })).toExist(),
    ),
  )
})

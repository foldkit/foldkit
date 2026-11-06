import { Option } from 'effect'
import { Scene } from 'foldkit'
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
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(offModel),
      Scene.expect(Scene.text('Engine is off.')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start engine' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop engine' })).toBeAbsent(),
      Scene.expect(
        Scene.role('button', { name: 'Compute next square' }),
      ).toBeDisabled(),
      Scene.expect(Scene.text('No result yet.')).toExist(),
    ),
  )

  it.effect(
    'clicking Start engine enters the booting state and shows Stop',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(offModel),
        Scene.click(Scene.role('button', { name: 'Start engine' })),
        Scene.expect(Scene.text('Booting engine...')).toExist(),
        Scene.expect(Scene.role('button', { name: 'Stop engine' })).toExist(),
        Scene.expect(
          Scene.role('button', { name: 'Start engine' }),
        ).toBeAbsent(),
      ),
  )

  it.effect('a ready engine shows its id and the Stop button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(readyModel),
      Scene.expect(Scene.text('Engine ready: engine-1')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop engine' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Compute next square' }),
      ).not.toBeDisabled(),
    ),
  )

  it.effect(
    'clicking Compute fires the Compute command and renders the result',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(readyModel),
        Scene.click(Scene.role('button', { name: 'Compute next square' })),
        Scene.Command.expectExact(Compute({ value: 3 })),
        Scene.Command.resolve(Compute, Message.SucceededCompute({ result: 9 })),
        Scene.expect(Scene.text('Square result: 9')).toExist(),
      ),
  )

  it.effect(
    'the engine lifecycle drives boot, ready, and stop through the resource steps',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(offModel),
        Scene.click(Scene.role('button', { name: 'Start engine' })),
        Scene.expect(Scene.text('Booting engine...')).toExist(),
        Scene.ManagedResource.acquire(managedResources.engine, {
          engineId: 'engine-1',
          square: value => value * value,
        }),
        Scene.expect(Scene.text('Engine ready: engine-1')).toExist(),
        Scene.expect(
          Scene.role('button', { name: 'Compute next square' }),
        ).not.toBeDisabled(),
        Scene.click(Scene.role('button', { name: 'Stop engine' })),
        Scene.ManagedResource.release(managedResources.engine),
        Scene.expect(Scene.text('Engine is off.')).toExist(),
      ),
  )

  it.effect('a failed engine boot shows the failure reason', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(offModel),
      Scene.click(Scene.role('button', { name: 'Start engine' })),
      Scene.ManagedResource.failAcquire(
        managedResources.engine,
        'Error: crypto unavailable',
      ),
      Scene.expect(
        Scene.text('Engine failed: Error: crypto unavailable'),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start engine' })).toExist(),
    ),
  )
})

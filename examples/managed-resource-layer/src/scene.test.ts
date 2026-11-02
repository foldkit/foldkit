import { Effect, Option } from 'effect'
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
import { describe, test } from 'vitest'

import {
  ApplicationBlock,
  Compute,
  EngineState,
  Message,
  Model,
  managedResources,
} from './application'

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
  test('initial view shows the engine off with a Start button', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(offModel),
        expect(text('Engine is off.')).toExist(),
        expect(role('button', { name: 'Start engine' })).toExist(),
        expect(role('button', { name: 'Stop engine' })).toBeAbsent(),
        expect(role('button', { name: 'Compute next square' })).toBeDisabled(),
        expect(text('No result yet.')).toExist(),
      ),
    )
  })

  test('clicking Start engine enters the booting state and shows Stop', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(offModel),
        click(role('button', { name: 'Start engine' })),
        expect(text('Booting engine...')).toExist(),
        expect(role('button', { name: 'Stop engine' })).toExist(),
        expect(role('button', { name: 'Start engine' })).toBeAbsent(),
      ),
    )
  })

  test('a ready engine shows its id and the Stop button', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(readyModel),
        expect(text('Engine ready: engine-1')).toExist(),
        expect(role('button', { name: 'Stop engine' })).toExist(),
        expect(
          role('button', { name: 'Compute next square' }),
        ).not.toBeDisabled(),
      ),
    )
  })

  test('clicking Compute fires the Compute command and renders the result', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(readyModel),
        click(role('button', { name: 'Compute next square' })),
        Command.expectExact(Compute({ value: 3 })),
        Command.resolve(Compute, Message.SucceededCompute({ result: 9 })),
        expect(text('Square result: 9')).toExist(),
      ),
    )
  })

  test('the engine lifecycle drives boot, ready, and stop through the resource steps', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('a failed engine boot shows the failure reason', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
})

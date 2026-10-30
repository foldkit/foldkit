import { Option } from 'effect'
import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { Compute, EngineState, Message } from './application'
import { application } from './application.fixture'
import { BootEngine, Engine } from './engine'

describe('view', () => {
  it.effect('initial view shows the engine off with a Start button', () =>
    scene(
      application,
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
        application,
        click(role('button', { name: 'Start engine' })),
        expect(text('Booting engine...')).toExist(),
        expect(role('button', { name: 'Stop engine' })).toExist(),
        expect(role('button', { name: 'Start engine' })).toBeAbsent(),
        Command.resolve(
          BootEngine,
          Engine.Message.SucceededBootEngine({ engineId: 'engine-1' }),
        ),
      ),
  )

  it.effect('a ready engine shows its id and the Stop button', () =>
    scene(
      application,
      given({
        engine: EngineState.Ready({ engineId: 'engine-1' }),
        maybeComputeEngine: Option.none(),
        computeCount: 2,
        maybeSquareResult: Option.none(),
      }),
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
        application,
        given({
          engine: EngineState.Ready({ engineId: 'engine-1' }),
          maybeComputeEngine: Option.none(),
          computeCount: 2,
          maybeSquareResult: Option.none(),
        }),
        click(role('button', { name: 'Compute next square' })),
        Command.expectExact(Compute({ value: 3 })),
        Command.resolve(Compute, Message.SucceededCompute({ result: 9 })),
        expect(text('Square result: 9')).toExist(),
      ),
  )

  it.effect('the engine lifecycle drives boot, ready, and stop', () =>
    scene(
      application,
      click(role('button', { name: 'Start engine' })),
      expect(text('Booting engine...')).toExist(),
      Command.resolve(
        BootEngine,
        Engine.Message.SucceededBootEngine({ engineId: 'engine-1' }),
      ),
      expect(text('Engine ready: engine-1')).toExist(),
      expect(
        role('button', { name: 'Compute next square' }),
      ).not.toBeDisabled(),
      click(role('button', { name: 'Stop engine' })),
      expect(text('Engine is off.')).toExist(),
    ),
  )

  it.effect('a failed engine boot shows the failure reason', () =>
    scene(
      application,
      click(role('button', { name: 'Start engine' })),
      Command.resolve(
        BootEngine,
        Engine.Message.FailedBootEngine({
          reason: 'Error: crypto unavailable',
        }),
      ),
      expect(text('Engine failed: Error: crypto unavailable')).toExist(),
      expect(role('button', { name: 'Start engine' })).toExist(),
    ),
  )
})

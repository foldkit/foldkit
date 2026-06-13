import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  DetermineStartTime,
  DeterminedStartTime,
  type Model,
  update,
  view,
} from './main'

const initialModel: Model = {
  elapsedMs: 0,
  isRunning: false,
  startTime: 0,
}

describe('view', () => {
  test('initial view shows the zeroed time and Start + Reset buttons', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('00:00.00')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Reset' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop' })).toBeAbsent(),
    )
  })

  test('clicking Start fires DetermineStartTime and switches to Stop', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Start' })),
      Scene.Command.expectExact(DetermineStartTime({ elapsedMs: 0 })),
      Scene.Command.resolve(
        DetermineStartTime,
        DeterminedStartTime({ startTime: 1000 }),
      ),
      Scene.expect(Scene.role('button', { name: 'Stop' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start' })).toBeAbsent(),
    )
  })

  test('clicking Stop while running switches back to Start', () => {
    const runningModel: Model = {
      elapsedMs: 1500,
      isRunning: true,
      startTime: 1000,
    }

    Scene.scene(
      { update, view },
      Scene.with(runningModel),
      Scene.expect(Scene.role('button', { name: 'Stop' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Stop' })),
      Scene.expect(Scene.role('button', { name: 'Start' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop' })).toBeAbsent(),
    )
  })

  test('clicking Reset zeros the elapsed time', () => {
    const runningModel: Model = {
      elapsedMs: 12345,
      isRunning: true,
      startTime: 1000,
    }

    Scene.scene(
      { update, view },
      Scene.with(runningModel),
      Scene.expect(Scene.text('00:12.34')).toExist(),
      Scene.click(Scene.role('button', { name: 'Reset' })),
      Scene.expect(Scene.text('00:00.00')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start' })).toExist(),
    )
  })

  test('elapsed time formats as MM:SS.cc', () => {
    const longRunModel: Model = {
      elapsedMs: 67890,
      isRunning: false,
      startTime: 0,
    }

    Scene.scene(
      { update, view },
      Scene.with(longRunModel),
      Scene.expect(Scene.text('01:07.89')).toExist(),
    )
  })
})

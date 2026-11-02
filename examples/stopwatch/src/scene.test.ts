import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import {
  ApplicationLive,
  DetermineStartTime,
  Message,
  Model,
} from './application'

describe('view', () => {
  it.effect(
    'initial view shows the zeroed time and Start + Reset buttons',
    () =>
      scene(
        ApplicationLive,
        expect(text('00:00.00')).toExist(),
        expect(role('button', { name: 'Start' })).toExist(),
        expect(role('button', { name: 'Reset' })).toExist(),
        expect(role('button', { name: 'Stop' })).toBeAbsent(),
      ),
  )

  it.effect(
    'clicking Start fires DetermineStartTime and switches to Stop',
    () =>
      scene(
        ApplicationLive,
        click(role('button', { name: 'Start' })),
        Command.expectExact(DetermineStartTime({ elapsedMs: 0 })),
        Command.resolve(
          DetermineStartTime,
          Message.CompletedDetermineStartTime({ startTime: 1000 }),
        ),
        expect(role('button', { name: 'Stop' })).toExist(),
        expect(role('button', { name: 'Start' })).toBeAbsent(),
      ),
  )

  it.effect('clicking Stop while running switches back to Start', () =>
    scene(
      ApplicationLive,
      given(
        Model.make({
          elapsedMs: 1500,
          isRunning: true,
          startTime: 1000,
        }),
      ),
      expect(role('button', { name: 'Stop' })).toExist(),
      click(role('button', { name: 'Stop' })),
      expect(role('button', { name: 'Start' })).toExist(),
      expect(role('button', { name: 'Stop' })).toBeAbsent(),
    ),
  )

  it.effect('clicking Reset zeros the elapsed time', () =>
    scene(
      ApplicationLive,
      given(
        Model.make({
          elapsedMs: 12345,
          isRunning: true,
          startTime: 1000,
        }),
      ),
      expect(text('00:12.34')).toExist(),
      click(role('button', { name: 'Reset' })),
      expect(text('00:00.00')).toExist(),
      expect(role('button', { name: 'Start' })).toExist(),
    ),
  )

  it.effect('elapsed time formats as MM:SS.cc', () =>
    scene(
      ApplicationLive,
      given(
        Model.make({
          elapsedMs: 67890,
          isRunning: false,
          startTime: 0,
        }),
      ),
      expect(text('01:07.89')).toExist(),
    ),
  )
})

import {
  Command,
  Subscription,
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
  DetermineStartTime,
  DetermineTickTime,
  Message,
  Model,
  subscriptions,
} from './application'

const initialModel = Model.make({
  elapsedMs: 0,
  isRunning: false,
  startTime: 0,
})

describe('view', () => {
  it.effect(
    'initial view shows the zeroed time and Start + Reset buttons',
    () =>
      scene(
        ApplicationBlock,
        given(initialModel),
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
        ApplicationBlock,
        given(initialModel),
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

  it.effect('clicking Stop while running switches back to Start', () => {
    const runningModel = Model.make({
      elapsedMs: 1500,
      isRunning: true,
      startTime: 1000,
    })

    return scene(
      ApplicationBlock,
      given(runningModel),
      expect(role('button', { name: 'Stop' })).toExist(),
      click(role('button', { name: 'Stop' })),
      expect(role('button', { name: 'Start' })).toExist(),
      expect(role('button', { name: 'Stop' })).toBeAbsent(),
    )
  })

  it.effect('clicking Reset zeros the elapsed time', () => {
    const runningModel = Model.make({
      elapsedMs: 12345,
      isRunning: true,
      startTime: 1000,
    })

    return scene(
      ApplicationBlock,
      given(runningModel),
      expect(text('00:12.34')).toExist(),
      click(role('button', { name: 'Reset' })),
      expect(text('00:00.00')).toExist(),
      expect(role('button', { name: 'Start' })).toExist(),
    )
  })

  it.effect(
    'a tick from the running Subscription advances the elapsed time',
    () => {
      const startTime = 1000
      const runningModel = Model.make({
        elapsedMs: 0,
        isRunning: true,
        startTime,
      })

      return scene(
        ApplicationBlock,
        given(runningModel),
        expect(text('00:00.00')).toExist(),
        Subscription.expectActive(subscriptions.stopwatchTicks),
        Subscription.emit(subscriptions.stopwatchTicks, Message.Ticked()),
        Command.expectExact(DetermineTickTime({ startTime })),
        Command.resolve(
          DetermineTickTime,
          Message.CompletedDetermineTickTime({ elapsedMs: 4320 }),
        ),
        expect(text('00:04.32')).toExist(),
        click(role('button', { name: 'Stop' })),
        Subscription.expectInactive(subscriptions.stopwatchTicks),
      )
    },
  )

  it.effect('elapsed time formats as MM:SS.cc', () => {
    const longRunModel = Model.make({
      elapsedMs: 67890,
      isRunning: false,
      startTime: 0,
    })

    return scene(
      ApplicationBlock,
      given(longRunModel),
      expect(text('01:07.89')).toExist(),
    )
  })
})

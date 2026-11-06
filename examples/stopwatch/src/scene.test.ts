import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  DetermineStartTime,
  DetermineTickTime,
  Message,
  Model,
  layer,
  subscriptions,
} from './block'

const initialModel = Model.make({
  elapsedMs: 0,
  isRunning: false,
  startTime: 0,
})

describe('view', () => {
  it.effect(
    'initial view shows the zeroed time and Start + Reset buttons',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.expect(Scene.text('00:00.00')).toExist(),
        Scene.expect(Scene.role('button', { name: 'Start' })).toExist(),
        Scene.expect(Scene.role('button', { name: 'Reset' })).toExist(),
        Scene.expect(Scene.role('button', { name: 'Stop' })).toBeAbsent(),
      ),
  )

  it.effect(
    'clicking Start fires DetermineStartTime and switches to Stop',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.click(Scene.role('button', { name: 'Start' })),
        Scene.Command.expectExact(DetermineStartTime({ elapsedMs: 0 })),
        Scene.Command.resolve(
          DetermineStartTime,
          Message.CompletedDetermineStartTime({ startTime: 1000 }),
        ),
        Scene.expect(Scene.role('button', { name: 'Stop' })).toExist(),
        Scene.expect(Scene.role('button', { name: 'Start' })).toBeAbsent(),
      ),
  )

  it.effect('clicking Stop while running switches back to Start', () => {
    const runningModel = Model.make({
      elapsedMs: 1500,
      isRunning: true,
      startTime: 1000,
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(runningModel),
      Scene.expect(Scene.role('button', { name: 'Stop' })).toExist(),
      Scene.click(Scene.role('button', { name: 'Stop' })),
      Scene.expect(Scene.role('button', { name: 'Start' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop' })).toBeAbsent(),
    )
  })

  it.effect('clicking Reset zeros the elapsed time', () => {
    const runningModel = Model.make({
      elapsedMs: 12345,
      isRunning: true,
      startTime: 1000,
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(runningModel),
      Scene.expect(Scene.text('00:12.34')).toExist(),
      Scene.click(Scene.role('button', { name: 'Reset' })),
      Scene.expect(Scene.text('00:00.00')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start' })).toExist(),
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

      return Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(runningModel),
        Scene.expect(Scene.text('00:00.00')).toExist(),
        Scene.Subscription.expectActive(subscriptions.stopwatchTicks),
        Scene.Subscription.emit(subscriptions.stopwatchTicks, Message.Ticked()),
        Scene.Command.expectExact(DetermineTickTime({ startTime })),
        Scene.Command.resolve(
          DetermineTickTime,
          Message.CompletedDetermineTickTime({ elapsedMs: 4320 }),
        ),
        Scene.expect(Scene.text('00:04.32')).toExist(),
        Scene.click(Scene.role('button', { name: 'Stop' })),
        Scene.Subscription.expectInactive(subscriptions.stopwatchTicks),
      )
    },
  )

  it.effect('elapsed time formats as MM:SS.cc', () => {
    const longRunModel = Model.make({
      elapsedMs: 67890,
      isRunning: false,
      startTime: 0,
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(longRunModel),
      Scene.expect(Scene.text('01:07.89')).toExist(),
    )
  })
})

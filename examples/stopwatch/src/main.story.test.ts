import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ClickedReset,
  ClickedStart,
  ClickedStop,
  DetermineStartTime,
  DetermineTickTime,
  DeterminedStartTime,
  DeterminedTickTime,
  type Model,
  Ticked,
  update,
} from './main'

const idleModel: Model = {
  elapsedMs: 0,
  isRunning: false,
  startTime: 0,
}

const runningModel: Model = {
  elapsedMs: 5000,
  isRunning: true,
  startTime: 1000,
}

describe('update', () => {
  describe('start', () => {
    test('ClickedStart fires DetermineStartTime with current elapsed time', () => {
      Story.story(
        update,
        Story.with({ ...idleModel, elapsedMs: 2000 }),
        Story.message(ClickedStart()),
        Story.Command.expectHas(DetermineStartTime),
        Story.model(model => {
          expect(model.isRunning).toBe(false)
        }),
        Story.Command.resolve(
          DetermineStartTime,
          DeterminedStartTime({ startTime: 500 }),
        ),
        Story.model(model => {
          expect(model.isRunning).toBe(true)
          expect(model.startTime).toBe(500)
        }),
      )
    })

    test('DeterminedStartTime stores the offset start time and starts running', () => {
      Story.story(
        update,
        Story.with(idleModel),
        Story.message(DeterminedStartTime({ startTime: 1000 })),
        Story.model(model => {
          expect(model.isRunning).toBe(true)
          expect(model.startTime).toBe(1000)
        }),
      )
    })
  })

  describe('stop and reset', () => {
    test('ClickedStop pauses the stopwatch without zeroing time', () => {
      Story.story(
        update,
        Story.with(runningModel),
        Story.message(ClickedStop()),
        Story.model(model => {
          expect(model.isRunning).toBe(false)
          expect(model.elapsedMs).toBe(5000)
          expect(model.startTime).toBe(1000)
        }),
      )
    })

    test('ClickedReset zeros elapsedMs, isRunning, and startTime', () => {
      Story.story(
        update,
        Story.with(runningModel),
        Story.message(ClickedReset()),
        Story.model(model => {
          expect(model.elapsedMs).toBe(0)
          expect(model.isRunning).toBe(false)
          expect(model.startTime).toBe(0)
        }),
      )
    })

    test('ClickedReset on an idle stopwatch is a no-op', () => {
      Story.story(
        update,
        Story.with(idleModel),
        Story.message(ClickedReset()),
        Story.model(model => {
          expect(model).toEqual(idleModel)
        }),
      )
    })
  })

  describe('ticking', () => {
    test('Ticked fires DetermineTickTime with the stored startTime', () => {
      Story.story(
        update,
        Story.with(runningModel),
        Story.message(Ticked()),
        Story.Command.expectHas(DetermineTickTime),
        Story.Command.resolve(
          DetermineTickTime,
          DeterminedTickTime({ elapsedMs: 6000 }),
        ),
        Story.model(model => {
          expect(model.elapsedMs).toBe(6000)
        }),
      )
    })

    test('DeterminedTickTime stores the new elapsed time', () => {
      Story.story(
        update,
        Story.with(runningModel),
        Story.message(DeterminedTickTime({ elapsedMs: 7500 })),
        Story.model(model => {
          expect(model.elapsedMs).toBe(7500)
        }),
      )
    })
  })
})

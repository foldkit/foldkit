import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  DetermineStartTime,
  DetermineTickTime,
  Message,
  type Model,
  layer,
} from './block'

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
    it.effect(
      'ClickedStart fires DetermineStartTime with current elapsed time',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(modifyFields(idleModel, { elapsedMs: () => 2000 })),
          Story.message(Message.ClickedStart()),
          Story.Command.expectHas(DetermineStartTime),
          Story.model(model => {
            expect(model.isRunning).toBe(false)
          }),
          Story.Command.resolve(
            DetermineStartTime,
            Message.CompletedDetermineStartTime({ startTime: 500 }),
          ),
          Story.model(model => {
            expect(model.isRunning).toBe(true)
            expect(model.startTime).toBe(500)
          }),
        ),
    )

    it.effect(
      'CompletedDetermineStartTime stores the offset start time and starts running',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(idleModel),
          Story.message(
            Message.CompletedDetermineStartTime({ startTime: 1000 }),
          ),
          Story.model(model => {
            expect(model.isRunning).toBe(true)
            expect(model.startTime).toBe(1000)
          }),
        ),
    )
  })

  describe('stop and reset', () => {
    it.effect('ClickedStop pauses the stopwatch without zeroing time', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(runningModel),
        Story.message(Message.ClickedStop()),
        Story.model(model => {
          expect(model.isRunning).toBe(false)
          expect(model.elapsedMs).toBe(5000)
          expect(model.startTime).toBe(1000)
        }),
      ),
    )

    it.effect('ClickedReset zeros elapsedMs, isRunning, and startTime', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(runningModel),
        Story.message(Message.ClickedReset()),
        Story.model(model => {
          expect(model.elapsedMs).toBe(0)
          expect(model.isRunning).toBe(false)
          expect(model.startTime).toBe(0)
        }),
      ),
    )

    it.effect('ClickedReset on an idle stopwatch is a no-op', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(idleModel),
        Story.message(Message.ClickedReset()),
        Story.model(model => {
          expect(model).toEqual(idleModel)
        }),
      ),
    )
  })

  describe('ticking', () => {
    it.effect('Ticked fires DetermineTickTime with the stored startTime', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(runningModel),
        Story.message(Message.Ticked()),
        Story.Command.expectHas(DetermineTickTime),
        Story.Command.resolve(
          DetermineTickTime,
          Message.CompletedDetermineTickTime({ elapsedMs: 6000 }),
        ),
        Story.model(model => {
          expect(model.elapsedMs).toBe(6000)
        }),
      ),
    )

    it.effect('CompletedDetermineTickTime stores the new elapsed time', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(runningModel),
        Story.message(Message.CompletedDetermineTickTime({ elapsedMs: 7500 })),
        Story.model(model => {
          expect(model.elapsedMs).toBe(7500)
        }),
      ),
    )
  })
})

import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationLive,
  DetermineStartTime,
  DetermineTickTime,
  Message,
  type Model,
} from './application'

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
        story(
          ApplicationLive,
          given(modifyFields(idleModel, { elapsedMs: () => 2000 })),
          message(Message.ClickedStart()),
          Command.expectHas(DetermineStartTime),
          model(model => {
            expect(model.isRunning).toBe(false)
          }),
          Command.resolve(
            DetermineStartTime,
            Message.CompletedDetermineStartTime({ startTime: 500 }),
          ),
          model(model => {
            expect(model.isRunning).toBe(true)
            expect(model.startTime).toBe(500)
          }),
        ),
    )

    it.effect(
      'CompletedDetermineStartTime stores the offset start time and starts running',
      () =>
        story(
          ApplicationLive,
          given(idleModel),
          message(Message.CompletedDetermineStartTime({ startTime: 1000 })),
          model(model => {
            expect(model.isRunning).toBe(true)
            expect(model.startTime).toBe(1000)
          }),
        ),
    )
  })

  describe('stop and reset', () => {
    it.effect('ClickedStop pauses the stopwatch without zeroing time', () =>
      story(
        ApplicationLive,
        given(runningModel),
        message(Message.ClickedStop()),
        model(model => {
          expect(model.isRunning).toBe(false)
          expect(model.elapsedMs).toBe(5000)
          expect(model.startTime).toBe(1000)
        }),
      ),
    )

    it.effect('ClickedReset zeros elapsedMs, isRunning, and startTime', () =>
      story(
        ApplicationLive,
        given(runningModel),
        message(Message.ClickedReset()),
        model(model => {
          expect(model.elapsedMs).toBe(0)
          expect(model.isRunning).toBe(false)
          expect(model.startTime).toBe(0)
        }),
      ),
    )

    it.effect('ClickedReset on an idle stopwatch is a no-op', () =>
      story(
        ApplicationLive,
        given(idleModel),
        message(Message.ClickedReset()),
        model(model => {
          expect(model).toEqual(idleModel)
        }),
      ),
    )
  })

  describe('ticking', () => {
    it.effect('Ticked fires DetermineTickTime with the stored startTime', () =>
      story(
        ApplicationLive,
        given(runningModel),
        message(Message.Ticked()),
        Command.expectHas(DetermineTickTime),
        Command.resolve(
          DetermineTickTime,
          Message.CompletedDetermineTickTime({ elapsedMs: 6000 }),
        ),
        model(model => {
          expect(model.elapsedMs).toBe(6000)
        }),
      ),
    )

    it.effect(
      'a tick advances the elapsed time until the stopwatch stops',
      () =>
        story(
          ApplicationLive,
          given(modifyFields(runningModel, { elapsedMs: () => 0 })),
          message(Message.Ticked()),
          Command.expectExact(DetermineTickTime({ startTime: 1000 })),
          Command.resolve(
            DetermineTickTime,
            Message.CompletedDetermineTickTime({ elapsedMs: 4320 }),
          ),
          model(model => {
            expect(model.elapsedMs).toBe(4320)
          }),
          message(Message.ClickedStop()),
          model(model => {
            expect(model.isRunning).toBe(false)
          }),
        ),
    )

    it.effect('CompletedDetermineTickTime stores the new elapsed time', () =>
      story(
        ApplicationLive,
        given(runningModel),
        message(Message.CompletedDetermineTickTime({ elapsedMs: 7500 })),
        model(model => {
          expect(model.elapsedMs).toBe(7500)
        }),
      ),
    )
  })
})

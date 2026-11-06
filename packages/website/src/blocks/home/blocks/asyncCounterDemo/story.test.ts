import { Array, Duration } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message } from './block'
import { DelayAdvanceAsyncCounterPhase } from './command'
import { AsyncCounterDemoBlock, layer } from './index'

const asyncCounterDemoSubject = { block: AsyncCounterDemoBlock, layer }

const INCREMENT_PHASE_STEPS = 3
const DURATION_PHASE_STEPS = 3
const RESET_PHASE_STEPS = 6
const STEPS_TO_RESET_COMMAND = 2

const advancePhases = (steps: number, generation: number) =>
  Array.makeBy(
    steps,
    () =>
      [
        DelayAdvanceAsyncCounterPhase,
        Message.CompletedDelayAdvanceAsyncCounterPhase({ generation }),
      ] as const,
  )

describe('async counter demo', () => {
  it.effect('Add 1 runs the increment animation and keeps the count', () =>
    Story.story(
      asyncCounterDemoSubject,
      Story.init(),
      Story.message(Message.ClickedDemoIncrement()),
      Story.model(model => {
        expect(model.count).toBe(1)
        expect(model.phase).toBe('IncrementMessage')
        expect(model.generation).toBe(1)
      }),
      Story.Command.expectExact(DelayAdvanceAsyncCounterPhase),
      Story.Command.resolveAll(...advancePhases(INCREMENT_PHASE_STEPS, 1)),
      Story.model(model => {
        expect(model.phase).toBe('Idle')
        expect(model.count).toBe(1)
      }),
    ),
  )

  it.effect(
    'a reset holds isResetting until the delay lands, then zeroes',
    () =>
      Story.story(
        asyncCounterDemoSubject,
        Story.init(),
        Story.message(Message.ClickedDemoIncrement()),
        Story.Command.resolveAll(...advancePhases(INCREMENT_PHASE_STEPS, 1)),
        Story.message(Message.ClickedDemoReset()),
        Story.model(model => {
          expect(model.count).toBe(1)
          expect(model.isResetting).toBe(true)
        }),
        Story.Command.resolveAll(...advancePhases(RESET_PHASE_STEPS, 2)),
        Story.model(model => {
          expect(model.count).toBe(0)
          expect(model.isResetting).toBe(false)
          expect(model.phase).toBe('Idle')
          expect(model.messageLog).toContain('CompletedDelayReset')
        }),
      ),
  )

  it.effect('changing the delay runs its own Message animation', () =>
    Story.story(
      asyncCounterDemoSubject,
      Story.init(),
      Story.message(Message.ChangedDemoResetDuration({ seconds: 4 })),
      Story.model(model => {
        expect(model.resetDuration).toBe(4)
        expect(model.phase).toBe('DurationMessage')
        expect(model.messageLog).toContain(
          'ChangedResetDuration({ seconds: 4 })',
        )
      }),
      Story.Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
      Story.model(model => {
        expect(model.phase).toBe('Idle')
        expect(model.resetDuration).toBe(4)
      }),
    ),
  )

  it.effect(
    'a delay below the allowed range is clamped before it reaches the Model',
    () =>
      Story.story(
        asyncCounterDemoSubject,
        Story.init(),
        Story.message(Message.ChangedDemoResetDuration({ seconds: 0 })),
        Story.model(model => {
          expect(model.resetDuration).toBe(1)
        }),
        Story.Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
      ),
  )

  it.effect(
    'a delay above the allowed range is clamped before it reaches the Model',
    () =>
      Story.story(
        asyncCounterDemoSubject,
        Story.init(),
        Story.message(Message.ChangedDemoResetDuration({ seconds: 99 })),
        Story.model(model => {
          expect(model.resetDuration).toBe(5)
        }),
        Story.Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
      ),
  )

  it.effect('the reset Command waits the delay the Model reports', () =>
    Story.story(
      asyncCounterDemoSubject,
      Story.init(),
      Story.message(Message.ChangedDemoResetDuration({ seconds: 0 })),
      Story.model(model => {
        expect(model.resetDuration).toBe(1)
      }),
      Story.Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
      Story.message(Message.ClickedDemoReset()),
      Story.Command.resolveAll(...advancePhases(STEPS_TO_RESET_COMMAND, 2)),
      Story.model(model => {
        expect(model.phase).toBe('ResetCommand')
      }),
      Story.Command.expectExact(
        DelayAdvanceAsyncCounterPhase({
          generation: 2,
          duration: Duration.fromInputUnsafe('1 second'),
        }),
      ),
      Story.Command.resolveAll(
        ...advancePhases(RESET_PHASE_STEPS - STEPS_TO_RESET_COMMAND, 2),
      ),
      Story.model(model => {
        expect(model.phase).toBe('Idle')
        expect(model.count).toBe(0)
      }),
    ),
  )

  it.effect(
    'a stale phase Message from a superseded interaction is ignored',
    () =>
      Story.story(
        asyncCounterDemoSubject,
        Story.init(),
        Story.message(Message.ClickedDemoIncrement()),
        Story.Command.resolveAll(...advancePhases(INCREMENT_PHASE_STEPS, 1)),
        Story.message(Message.ClickedDemoReset()),
        Story.model(model => {
          expect(model.phase).toBe('ResetMessage')
          expect(model.generation).toBe(2)
        }),
        Story.Command.resolve(
          DelayAdvanceAsyncCounterPhase,
          Message.CompletedDelayAdvanceAsyncCounterPhase({ generation: 1 }),
        ),
        Story.model(model => {
          expect(model.phase).toBe('ResetMessage')
        }),
      ),
  )
})

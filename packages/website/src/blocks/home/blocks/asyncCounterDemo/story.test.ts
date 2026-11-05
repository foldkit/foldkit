import { Array, Duration } from 'effect'
import { Command, init, message, model, story } from 'foldkit/story'
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
    story(
      asyncCounterDemoSubject,
      init(),
      message(Message.ClickedDemoIncrement()),
      model(model => {
        expect(model.count).toBe(1)
        expect(model.phase).toBe('IncrementMessage')
        expect(model.generation).toBe(1)
      }),
      Command.expectExact(DelayAdvanceAsyncCounterPhase),
      Command.resolveAll(...advancePhases(INCREMENT_PHASE_STEPS, 1)),
      model(model => {
        expect(model.phase).toBe('Idle')
        expect(model.count).toBe(1)
      }),
    ),
  )

  it.effect(
    'a reset holds isResetting until the delay lands, then zeroes',
    () =>
      story(
        asyncCounterDemoSubject,
        init(),
        message(Message.ClickedDemoIncrement()),
        Command.resolveAll(...advancePhases(INCREMENT_PHASE_STEPS, 1)),
        message(Message.ClickedDemoReset()),
        model(model => {
          expect(model.count).toBe(1)
          expect(model.isResetting).toBe(true)
        }),
        Command.resolveAll(...advancePhases(RESET_PHASE_STEPS, 2)),
        model(model => {
          expect(model.count).toBe(0)
          expect(model.isResetting).toBe(false)
          expect(model.phase).toBe('Idle')
          expect(model.messageLog).toContain('CompletedDelayReset')
        }),
      ),
  )

  it.effect('changing the delay runs its own Message animation', () =>
    story(
      asyncCounterDemoSubject,
      init(),
      message(Message.ChangedDemoResetDuration({ seconds: 4 })),
      model(model => {
        expect(model.resetDuration).toBe(4)
        expect(model.phase).toBe('DurationMessage')
        expect(model.messageLog).toContain(
          'ChangedResetDuration({ seconds: 4 })',
        )
      }),
      Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
      model(model => {
        expect(model.phase).toBe('Idle')
        expect(model.resetDuration).toBe(4)
      }),
    ),
  )

  it.effect(
    'a delay below the allowed range is clamped before it reaches the Model',
    () =>
      story(
        asyncCounterDemoSubject,
        init(),
        message(Message.ChangedDemoResetDuration({ seconds: 0 })),
        model(model => {
          expect(model.resetDuration).toBe(1)
        }),
        Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
      ),
  )

  it.effect(
    'a delay above the allowed range is clamped before it reaches the Model',
    () =>
      story(
        asyncCounterDemoSubject,
        init(),
        message(Message.ChangedDemoResetDuration({ seconds: 99 })),
        model(model => {
          expect(model.resetDuration).toBe(5)
        }),
        Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
      ),
  )

  it.effect('the reset Command waits the delay the Model reports', () =>
    story(
      asyncCounterDemoSubject,
      init(),
      message(Message.ChangedDemoResetDuration({ seconds: 0 })),
      model(model => {
        expect(model.resetDuration).toBe(1)
      }),
      Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
      message(Message.ClickedDemoReset()),
      Command.resolveAll(...advancePhases(STEPS_TO_RESET_COMMAND, 2)),
      model(model => {
        expect(model.phase).toBe('ResetCommand')
      }),
      Command.expectExact(
        DelayAdvanceAsyncCounterPhase({
          generation: 2,
          duration: Duration.fromInputUnsafe('1 second'),
        }),
      ),
      Command.resolveAll(
        ...advancePhases(RESET_PHASE_STEPS - STEPS_TO_RESET_COMMAND, 2),
      ),
      model(model => {
        expect(model.phase).toBe('Idle')
        expect(model.count).toBe(0)
      }),
    ),
  )

  it.effect(
    'a stale phase Message from a superseded interaction is ignored',
    () =>
      story(
        asyncCounterDemoSubject,
        init(),
        message(Message.ClickedDemoIncrement()),
        Command.resolveAll(...advancePhases(INCREMENT_PHASE_STEPS, 1)),
        message(Message.ClickedDemoReset()),
        model(model => {
          expect(model.phase).toBe('ResetMessage')
          expect(model.generation).toBe(2)
        }),
        Command.resolve(
          DelayAdvanceAsyncCounterPhase,
          Message.CompletedDelayAdvanceAsyncCounterPhase({ generation: 1 }),
        ),
        model(model => {
          expect(model.phase).toBe('ResetMessage')
        }),
      ),
  )
})

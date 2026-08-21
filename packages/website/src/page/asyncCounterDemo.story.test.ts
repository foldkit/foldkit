import { Array, Duration } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { DelayAdvancePhase, Message, init, update } from './asyncCounterDemo'

const initResult = init()

const INCREMENT_PHASE_STEPS = 3
const DURATION_PHASE_STEPS = 3
const RESET_PHASE_STEPS = 6
const STEPS_TO_RESET_COMMAND = 2

const advancePhases = (steps: number, generation: number) =>
  Array.makeBy(
    steps,
    () =>
      [
        DelayAdvancePhase,
        Message.CompletedDelayAdvancePhase({ generation }),
      ] as const,
  )

describe('async counter demo', () => {
  test('Add 1 runs the increment animation and keeps the count', () => {
    story(
      update,
      given(initResult.model),
      message(Message.ClickedDemoIncrement()),
      model(model => {
        expect(model.count).toBe(1)
        expect(model.phase).toBe('IncrementMessage')
        expect(model.generation).toBe(1)
      }),
      Command.expectExact(DelayAdvancePhase),
      Command.resolveAll(...advancePhases(INCREMENT_PHASE_STEPS, 1)),
      model(model => {
        expect(model.phase).toBe('Idle')
        expect(model.count).toBe(1)
      }),
    )
  })

  test('a reset holds isResetting until the delay lands, then zeroes', () => {
    story(
      update,
      given(initResult.model),
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
    )
  })

  test('changing the delay runs its own Message animation', () => {
    story(
      update,
      given(initResult.model),
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
    )
  })

  test('a delay below the allowed range is clamped before it reaches the Model', () => {
    story(
      update,
      given(initResult.model),
      message(Message.ChangedDemoResetDuration({ seconds: 0 })),
      model(model => {
        expect(model.resetDuration).toBe(1)
      }),
      Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
    )
  })

  test('a delay above the allowed range is clamped before it reaches the Model', () => {
    story(
      update,
      given(initResult.model),
      message(Message.ChangedDemoResetDuration({ seconds: 99 })),
      model(model => {
        expect(model.resetDuration).toBe(5)
      }),
      Command.resolveAll(...advancePhases(DURATION_PHASE_STEPS, 1)),
    )
  })

  test('the reset Command waits the delay the Model reports', () => {
    story(
      update,
      given(initResult.model),
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
        DelayAdvancePhase({
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
    )
  })

  test('a stale phase Message from a superseded interaction is ignored', () => {
    story(
      update,
      given(initResult.model),
      message(Message.ClickedDemoIncrement()),
      Command.resolveAll(...advancePhases(INCREMENT_PHASE_STEPS, 1)),
      message(Message.ClickedDemoReset()),
      model(model => {
        expect(model.phase).toBe('ResetMessage')
        expect(model.generation).toBe(2)
      }),
      Command.resolve(
        DelayAdvancePhase,
        Message.CompletedDelayAdvancePhase({ generation: 1 }),
      ),
      model(model => {
        expect(model.phase).toBe('ResetMessage')
      }),
    )
  })
})

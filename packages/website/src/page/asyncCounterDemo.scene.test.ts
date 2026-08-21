import { Array } from 'effect'
import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import {
  DelayAdvancePhase,
  Message,
  init,
  update,
  view,
} from './asyncCounterDemo'

const initResult = init()

const INCREMENT_PHASE_STEPS = 3
const DURATION_PHASE_STEPS = 3
const RESET_PHASE_STEPS = 6

const advancePhases = (steps: number, generation: number) =>
  Array.makeBy(steps, () =>
    Command.resolve(
      DelayAdvancePhase,
      Message.CompletedDelayAdvancePhase({ generation }),
    ),
  )

describe('async counter demo view', () => {
  test('Add 1 renders the new count', () => {
    scene(
      { update, view },
      given(initResult.model),
      expect(text('0')).toExist(),
      click(role('button', { name: 'Add 1' })),
      expect(text('1')).toExist(),
      ...advancePhases(INCREMENT_PHASE_STEPS, 1),
      expect(text('1')).toExist(),
    )
  })

  test('the reset button reports the delay and disables while resetting', () => {
    scene(
      { update, view },
      given(initResult.model),
      expect(role('button', { name: 'Reset after 2 seconds' })).toExist(),
      click(role('button', { name: 'Reset after 2 seconds' })),
      expect(role('button', { name: 'Resetting...' })).toExist(),
      ...advancePhases(RESET_PHASE_STEPS, 1),
      expect(role('button', { name: 'Reset after 2 seconds' })).toExist(),
    )
  })

  test('a reset renders its way back to zero', () => {
    scene(
      { update, view },
      given(initResult.model),
      click(role('button', { name: 'Add 1' })),
      ...advancePhases(INCREMENT_PHASE_STEPS, 1),
      expect(text('1')).toExist(),
      click(role('button', { name: 'Reset after 2 seconds' })),
      ...advancePhases(RESET_PHASE_STEPS, 2),
      expect(text('0')).toExist(),
    )
  })

  test('Add 1 and the stepper are disabled while a reset is in flight', () => {
    scene(
      { update, view },
      given(initResult.model),
      expect(role('button', { name: 'Add 1', disabled: false })).toExist(),
      click(role('button', { name: 'Reset after 2 seconds' })),
      expect(role('button', { name: 'Add 1', disabled: true })).toExist(),
      expect(
        role('button', { name: 'Increase reset delay', disabled: true }),
      ).toExist(),
      expect(
        role('button', { name: 'Decrease reset delay', disabled: true }),
      ).toExist(),
      ...advancePhases(RESET_PHASE_STEPS, 1),
      expect(role('button', { name: 'Add 1', disabled: false })).toExist(),
      expect(
        role('button', { name: 'Increase reset delay', disabled: false }),
      ).toExist(),
    )
  })

  test('the stepper raises the delay the reset button reports', () => {
    scene(
      { update, view },
      given(initResult.model),
      click(role('button', { name: 'Increase reset delay' })),
      expect(role('button', { name: 'Reset after 3 seconds' })).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 1),
      click(role('button', { name: 'Decrease reset delay' })),
      expect(role('button', { name: 'Reset after 2 seconds' })).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 2),
    )
  })

  test('the stepper stops at the low end of the allowed range', () => {
    scene(
      { update, view },
      given({ ...initResult.model, resetDuration: 1 }),
      expect(
        role('button', { name: 'Decrease reset delay', disabled: true }),
      ).toExist(),
      expect(role('button', { name: 'Reset after 1 second' })).toExist(),
      click(role('button', { name: 'Increase reset delay' })),
      expect(role('button', { name: 'Reset after 2 seconds' })).toExist(),
      expect(
        role('button', { name: 'Decrease reset delay', disabled: false }),
      ).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 1),
    )
  })

  test('the stepper stops at the high end of the allowed range', () => {
    scene(
      { update, view },
      given({ ...initResult.model, resetDuration: 5 }),
      expect(
        role('button', { name: 'Increase reset delay', disabled: true }),
      ).toExist(),
      expect(role('button', { name: 'Reset after 5 seconds' })).toExist(),
      click(role('button', { name: 'Decrease reset delay' })),
      expect(role('button', { name: 'Reset after 4 seconds' })).toExist(),
      expect(
        role('button', { name: 'Increase reset delay', disabled: false }),
      ).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 1),
    )
  })

  test('the delay is shown as text, not an editable field', () => {
    scene(
      { update, view },
      given({ ...initResult.model, resetDuration: 4 }),
      expect(role('spinbutton')).not.toExist(),
      expect(role('textbox')).not.toExist(),
      expect(role('group', { name: 'Reset Delay (seconds)' })).toExist(),
      expect(text('4')).toExist(),
    )
  })
})

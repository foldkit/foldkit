import { Array } from 'effect'
import {
  Command,
  click,
  expect,
  given,
  init,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { Message, Model } from './block'
import { DelayAdvanceAsyncCounterPhase } from './command'
import { AsyncCounterDemoBlock, layer } from './index'

const asyncCounterDemoSubject = { block: AsyncCounterDemoBlock, layer }

const INCREMENT_PHASE_STEPS = 3
const DURATION_PHASE_STEPS = 3
const RESET_PHASE_STEPS = 6
const initialModel = Model.make({
  count: 0,
  isResetting: false,
  resetDuration: 2,
  phase: 'Idle',
  generation: 0,
  messageLog: [],
})

const advancePhases = (steps: number, generation: number) =>
  Array.makeBy(steps, () =>
    Command.resolve(
      DelayAdvanceAsyncCounterPhase,
      Message.CompletedDelayAdvanceAsyncCounterPhase({ generation }),
    ),
  )

describe('async counter demo view', () => {
  it.effect('Add 1 renders the new count', () =>
    scene(
      asyncCounterDemoSubject,
      init(),
      expect(text('0')).toExist(),
      click(role('button', { name: 'Add 1' })),
      expect(text('1')).toExist(),
      ...advancePhases(INCREMENT_PHASE_STEPS, 1),
      expect(text('1')).toExist(),
    ),
  )

  it.effect(
    'the reset button reports the delay and disables while resetting',
    () =>
      scene(
        asyncCounterDemoSubject,
        init(),
        expect(role('button', { name: 'Reset after 2 seconds' })).toExist(),
        click(role('button', { name: 'Reset after 2 seconds' })),
        expect(role('button', { name: 'Resetting...' })).toExist(),
        ...advancePhases(RESET_PHASE_STEPS, 1),
        expect(role('button', { name: 'Reset after 2 seconds' })).toExist(),
      ),
  )

  it.effect('a reset renders its way back to zero', () =>
    scene(
      asyncCounterDemoSubject,
      init(),
      click(role('button', { name: 'Add 1' })),
      ...advancePhases(INCREMENT_PHASE_STEPS, 1),
      expect(text('1')).toExist(),
      click(role('button', { name: 'Reset after 2 seconds' })),
      ...advancePhases(RESET_PHASE_STEPS, 2),
      expect(text('0')).toExist(),
    ),
  )

  it.effect(
    'Add 1 and the stepper are disabled while a reset is in flight',
    () =>
      scene(
        asyncCounterDemoSubject,
        init(),
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
      ),
  )

  it.effect('the stepper raises the delay the reset button reports', () =>
    scene(
      asyncCounterDemoSubject,
      init(),
      click(role('button', { name: 'Increase reset delay' })),
      expect(role('button', { name: 'Reset after 3 seconds' })).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 1),
      click(role('button', { name: 'Decrease reset delay' })),
      expect(role('button', { name: 'Reset after 2 seconds' })).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 2),
    ),
  )

  it.effect('the stepper stops at the low end of the allowed range', () =>
    scene(
      asyncCounterDemoSubject,
      given(modifyFields(initialModel, { resetDuration: () => 1 })),
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
    ),
  )

  it.effect('the stepper stops at the high end of the allowed range', () =>
    scene(
      asyncCounterDemoSubject,
      given(modifyFields(initialModel, { resetDuration: () => 5 })),
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
    ),
  )

  it.effect('the delay is shown as text, not an editable field', () =>
    scene(
      asyncCounterDemoSubject,
      given(modifyFields(initialModel, { resetDuration: () => 4 })),
      expect(role('spinbutton')).not.toExist(),
      expect(role('textbox')).not.toExist(),
      expect(role('group', { name: 'Reset Delay (seconds)' })).toExist(),
      expect(text('4')).toExist(),
    ),
  )
})

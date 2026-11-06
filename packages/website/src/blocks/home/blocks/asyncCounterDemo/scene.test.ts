import { Array } from 'effect'
import { Scene } from 'foldkit'
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
    Scene.Command.resolve(
      DelayAdvanceAsyncCounterPhase,
      Message.CompletedDelayAdvanceAsyncCounterPhase({ generation }),
    ),
  )

describe('async counter demo view', () => {
  it.effect('Add 1 renders the new count', () =>
    Scene.scene(
      asyncCounterDemoSubject,
      Scene.init(),
      Scene.expect(Scene.text('0')).toExist(),
      Scene.click(Scene.role('button', { name: 'Add 1' })),
      Scene.expect(Scene.text('1')).toExist(),
      ...advancePhases(INCREMENT_PHASE_STEPS, 1),
      Scene.expect(Scene.text('1')).toExist(),
    ),
  )

  it.effect(
    'the reset button reports the delay and disables while resetting',
    () =>
      Scene.scene(
        asyncCounterDemoSubject,
        Scene.init(),
        Scene.expect(
          Scene.role('button', { name: 'Reset after 2 seconds' }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Reset after 2 seconds' })),
        Scene.expect(Scene.role('button', { name: 'Resetting...' })).toExist(),
        ...advancePhases(RESET_PHASE_STEPS, 1),
        Scene.expect(
          Scene.role('button', { name: 'Reset after 2 seconds' }),
        ).toExist(),
      ),
  )

  it.effect('a reset renders its way back to zero', () =>
    Scene.scene(
      asyncCounterDemoSubject,
      Scene.init(),
      Scene.click(Scene.role('button', { name: 'Add 1' })),
      ...advancePhases(INCREMENT_PHASE_STEPS, 1),
      Scene.expect(Scene.text('1')).toExist(),
      Scene.click(Scene.role('button', { name: 'Reset after 2 seconds' })),
      ...advancePhases(RESET_PHASE_STEPS, 2),
      Scene.expect(Scene.text('0')).toExist(),
    ),
  )

  it.effect(
    'Add 1 and the stepper are disabled while a reset is in flight',
    () =>
      Scene.scene(
        asyncCounterDemoSubject,
        Scene.init(),
        Scene.expect(
          Scene.role('button', { name: 'Add 1', disabled: false }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Reset after 2 seconds' })),
        Scene.expect(
          Scene.role('button', { name: 'Add 1', disabled: true }),
        ).toExist(),
        Scene.expect(
          Scene.role('button', {
            name: 'Increase reset delay',
            disabled: true,
          }),
        ).toExist(),
        Scene.expect(
          Scene.role('button', {
            name: 'Decrease reset delay',
            disabled: true,
          }),
        ).toExist(),
        ...advancePhases(RESET_PHASE_STEPS, 1),
        Scene.expect(
          Scene.role('button', { name: 'Add 1', disabled: false }),
        ).toExist(),
        Scene.expect(
          Scene.role('button', {
            name: 'Increase reset delay',
            disabled: false,
          }),
        ).toExist(),
      ),
  )

  it.effect('the stepper raises the delay the reset button reports', () =>
    Scene.scene(
      asyncCounterDemoSubject,
      Scene.init(),
      Scene.click(Scene.role('button', { name: 'Increase reset delay' })),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 3 seconds' }),
      ).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 1),
      Scene.click(Scene.role('button', { name: 'Decrease reset delay' })),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 2 seconds' }),
      ).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 2),
    ),
  )

  it.effect('the stepper stops at the low end of the allowed range', () =>
    Scene.scene(
      asyncCounterDemoSubject,
      Scene.given(modifyFields(initialModel, { resetDuration: () => 1 })),
      Scene.expect(
        Scene.role('button', { name: 'Decrease reset delay', disabled: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 1 second' }),
      ).toExist(),
      Scene.click(Scene.role('button', { name: 'Increase reset delay' })),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 2 seconds' }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Decrease reset delay', disabled: false }),
      ).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 1),
    ),
  )

  it.effect('the stepper stops at the high end of the allowed range', () =>
    Scene.scene(
      asyncCounterDemoSubject,
      Scene.given(modifyFields(initialModel, { resetDuration: () => 5 })),
      Scene.expect(
        Scene.role('button', { name: 'Increase reset delay', disabled: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 5 seconds' }),
      ).toExist(),
      Scene.click(Scene.role('button', { name: 'Decrease reset delay' })),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 4 seconds' }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Increase reset delay', disabled: false }),
      ).toExist(),
      ...advancePhases(DURATION_PHASE_STEPS, 1),
    ),
  )

  it.effect('the delay is shown as text, not an editable field', () =>
    Scene.scene(
      asyncCounterDemoSubject,
      Scene.given(modifyFields(initialModel, { resetDuration: () => 4 })),
      Scene.expect(Scene.role('spinbutton')).not.toExist(),
      Scene.expect(Scene.role('textbox')).not.toExist(),
      Scene.expect(
        Scene.role('group', { name: 'Reset Delay (seconds)' }),
      ).toExist(),
      Scene.expect(Scene.text('4')).toExist(),
    ),
  )
})

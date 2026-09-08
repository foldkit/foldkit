import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { type Model, update, view } from './main'

const initialModel: Model = {
  activeWorkload: 'Idle',
  nextWarningId: 1,
  warnings: [],
  patchRows: 0,
  patchRun: 0,
}

describe('view', () => {
  test('renders all workload controls', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(text('Slow Warnings Lab')).toExist(),
      expect(role('button', { name: 'Run update work' })).toExist(),
      expect(role('button', { name: 'Run view work' })).toExist(),
      expect(role('button', { name: 'Run patch work' })).toExist(),
      expect(role('button', { name: 'Run dependency extraction' })).toExist(),
    )
  })

  test('clicking patch work renders patch rows', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Run patch work' })),
      expect(text('Patch row 1')).toExist(),
    )
  })

  test('clear removes recorded warnings', () => {
    scene(
      { update, view },
      given(
        evo(initialModel, {
          warnings: () => [
            {
              id: 1,
              phase: 'Update',
              durationMs: 12,
              thresholdMs: 4,
              trigger: 'ClickedRunUpdateWork',
              details: 'Update work exceeded the threshold.',
            },
          ],
        }),
      ),
      expect(text('Update exceeded 4ms')).toExist(),
      click(role('button', { name: 'Clear' })),
      expect(text('Run a workload to record a warning.')).toExist(),
    )
  })
})

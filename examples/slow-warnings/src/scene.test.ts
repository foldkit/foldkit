import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { type Model, update, view } from './main'

const initialModel: Model = {
  activeWorkload: { _tag: 'Idle' },
  warnings: [],
  patchRows: 0,
  patchRun: 0,
  subscriptionsRun: 0,
  updateChecksum: 0,
  viewRun: 0,
}

describe('view', () => {
  test('renders all workload controls', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('Slow Warnings Lab')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Run update work' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Run view work' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Run patch work' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Run subscriptions work' }),
      ).toExist(),
    )
  })

  test('clicking patch work renders patch rows', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Run patch work' })),
      Scene.expect(Scene.text('Patch row 1')).toExist(),
    )
  })

  test('clear removes recorded warnings', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...initialModel,
        warnings: [
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
      Scene.expect(Scene.text('Update exceeded 4ms')).toExist(),
      Scene.click(Scene.role('button', { name: 'Clear' })),
      Scene.expect(Scene.text('Run a workload to record a warning.')).toExist(),
    )
  })
})

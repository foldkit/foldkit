import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './index'
import type { Model } from './model'

const initialModel: Model = {
  activeWorkload: 'Idle',
  nextWarningId: 1,
  warnings: [],
  patchRows: 0,
  patchRun: 0,
}

describe('view', () => {
  it.effect('renders all workload controls', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.text('Slow Warnings Lab')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Run update work' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Run view work' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Run patch work' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Run dependency extraction' }),
      ).toExist(),
    ),
  )

  it.effect('clicking patch work renders patch rows', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: 'Run patch work' })),
      Scene.expect(Scene.text('Patch row 1')).toExist(),
    ),
  )

  it.effect('clear removes recorded warnings', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(initialModel, {
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
      Scene.expect(Scene.text('Update exceeded 4ms')).toExist(),
      Scene.click(Scene.role('button', { name: 'Clear' })),
      Scene.expect(Scene.text('Run a workload to record a warning.')).toExist(),
    ),
  )
})

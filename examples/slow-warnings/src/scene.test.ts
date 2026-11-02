import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { ApplicationLive, type Model } from './application'

const initialModel: Model = {
  activeWorkload: 'Idle',
  nextWarningId: 1,
  warnings: [],
  patchRows: 0,
  patchRun: 0,
}

describe('view', () => {
  it.effect('renders all workload controls', () =>
    scene(
      ApplicationLive,
      expect(text('Slow Warnings Lab')).toExist(),
      expect(role('button', { name: 'Run update work' })).toExist(),
      expect(role('button', { name: 'Run view work' })).toExist(),
      expect(role('button', { name: 'Run patch work' })).toExist(),
    ),
  )

  it.effect('clicking patch work renders patch rows', () =>
    scene(
      ApplicationLive,
      click(role('button', { name: 'Run patch work' })),
      expect(text('Patch row 1')).toExist(),
    ),
  )

  it.effect('clear removes recorded warnings', () =>
    scene(
      ApplicationLive,
      given(
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
      expect(text('Update exceeded 4ms')).toExist(),
      click(role('button', { name: 'Clear' })),
      expect(text('Run a workload to record a warning.')).toExist(),
    ),
  )
})

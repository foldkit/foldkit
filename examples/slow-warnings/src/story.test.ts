import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ClickedClearWarnings,
  ClickedRunPatchWork,
  ClickedRunSubscriptionsWork,
  ClickedRunUpdateWork,
  ClickedRunViewWork,
  type Model,
  RecordedSlowWarning,
  update,
} from './main'

const initialModel: Model = {
  activeWorkload: { _tag: 'Idle' },
  warnings: [],
  patchRows: 0,
  patchRun: 0,
  subscriptionsRun: 0,
  updateChecksum: 0,
  viewRun: 0,
}

describe('update', () => {
  test('ClickedRunUpdateWork records update workload state', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedRunUpdateWork()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.activeWorkload._tag).toBe('Update')
        expect(model.updateChecksum).toBeGreaterThan(0)
      }),
    )
  })

  test('ClickedRunViewWork records view workload state', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedRunViewWork()),
      Story.model(model => {
        expect(model.activeWorkload._tag).toBe('View')
        expect(model.viewRun).toBe(1)
      }),
    )
  })

  test('ClickedRunPatchWork mounts a large patch surface', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedRunPatchWork()),
      Story.model(model => {
        expect(model.activeWorkload._tag).toBe('Patch')
        expect(model.patchRows).toBeGreaterThan(0)
        expect(model.patchRun).toBe(1)
      }),
    )
  })

  test('ClickedRunSubscriptionsWork records subscription workload state', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedRunSubscriptionsWork()),
      Story.model(model => {
        expect(model.activeWorkload._tag).toBe('Subscriptions')
        expect(model.subscriptionsRun).toBe(1)
      }),
    )
  })

  test('RecordedSlowWarning stores the warning and clears active workload', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(
        RecordedSlowWarning({
          warning: {
            id: 1,
            phase: 'Update',
            durationMs: 12,
            thresholdMs: 4,
            trigger: 'ClickedRunUpdateWork',
            details: 'Update work exceeded the threshold.',
          },
        }),
      ),
      Story.model(model => {
        expect(model.activeWorkload._tag).toBe('Idle')
        expect(model.warnings).toHaveLength(1)
      }),
    )
  })

  test('ClickedClearWarnings clears warnings and patch rows', () => {
    Story.story(
      update,
      Story.with({
        ...initialModel,
        patchRows: 4000,
        warnings: [
          {
            id: 1,
            phase: 'Patch',
            durationMs: 16,
            thresholdMs: 8,
            trigger: 'ClickedRunPatchWork',
            details: 'Patch work exceeded the threshold.',
          },
        ],
      }),
      Story.message(ClickedClearWarnings()),
      Story.model(model => {
        expect(model.warnings).toEqual([])
        expect(model.patchRows).toBe(0)
      }),
    )
  })
})

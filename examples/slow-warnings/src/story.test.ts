import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { Message, type Model, update } from './main'

const initialModel: Model = {
  activeWorkload: 'Idle',
  nextWarningId: 1,
  warnings: [],
  patchRows: 0,
  patchRun: 0,
}

describe('update', () => {
  test('ClickedRunUpdateWork records update workload state', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedRunUpdateWork()),
      Command.expectNone(),
      model(model => {
        expect(model.activeWorkload).toBe('Update')
      }),
    )
  })

  test('ClickedRunViewWork records view workload state', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedRunViewWork()),
      model(model => {
        expect(model.activeWorkload).toBe('View')
      }),
    )
  })

  test('ClickedRunPatchWork mounts a large patch surface', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedRunPatchWork()),
      model(model => {
        expect(model.activeWorkload).toBe('Patch')
        expect(model.patchRows).toBeGreaterThan(0)
        expect(model.patchRun).toBe(1)
      }),
    )
  })

  test('ClickedRunSubscriptionDependenciesWork records subscription dependency workload state', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedRunSubscriptionDependenciesWork()),
      model(model => {
        expect(model.activeWorkload).toBe('SubscriptionDependencies')
      }),
    )
  })

  test('RecordedSlowWarning stores the warning and clears active workload', () => {
    story(
      update,
      given(initialModel),
      message(
        Message.RecordedSlowWarning({
          report: {
            phase: 'Update',
            durationMs: 12,
            thresholdMs: 4,
            trigger: 'ClickedRunUpdateWork',
            details: 'Update work exceeded the threshold.',
          },
        }),
      ),
      model(model => {
        expect(model.activeWorkload).toBe('Idle')
        expect(model.nextWarningId).toBe(2)
        expect(model.warnings).toEqual([
          {
            id: 1,
            phase: 'Update',
            durationMs: 12,
            thresholdMs: 4,
            trigger: 'ClickedRunUpdateWork',
            details: 'Update work exceeded the threshold.',
          },
        ])
      }),
    )
  })

  test('ClickedClearWarnings clears warnings without resetting the patch surface', () => {
    story(
      update,
      given(
        evo(initialModel, {
          patchRows: () => 4000,
          warnings: () => [
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
      ),
      message(Message.ClickedClearWarnings()),
      model(model => {
        expect(model.warnings).toEqual([])
        expect(model.patchRows).toBe(4000)
      }),
    )
  })
})

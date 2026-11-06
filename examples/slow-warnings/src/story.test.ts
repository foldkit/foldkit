import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import type { Model } from './model'

const initialModel: Model = {
  activeWorkload: 'Idle',
  nextWarningId: 1,
  warnings: [],
  patchRows: 0,
  patchRun: 0,
}

describe('update', () => {
  it.effect('ClickedRunUpdateWork records update workload state', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedRunUpdateWork()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.activeWorkload).toBe('Update')
      }),
    ),
  )

  it.effect('ClickedRunViewWork records view workload state', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedRunViewWork()),
      Story.model(model => {
        expect(model.activeWorkload).toBe('View')
      }),
    ),
  )

  it.effect('ClickedRunPatchWork mounts a large patch surface', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedRunPatchWork()),
      Story.model(model => {
        expect(model.activeWorkload).toBe('Patch')
        expect(model.patchRows).toBeGreaterThan(0)
        expect(model.patchRun).toBe(1)
      }),
    ),
  )

  it.effect(
    'ClickedRunSubscriptionDependenciesWork records subscription dependency workload state',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ClickedRunSubscriptionDependenciesWork()),
        Story.model(model => {
          expect(model.activeWorkload).toBe('SubscriptionDependencies')
        }),
      ),
  )

  it.effect(
    'RecordedSlowWarning stores the warning and clears active workload',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(
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
        Story.model(model => {
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
      ),
  )

  it.effect(
    'ClickedClearWarnings clears warnings without resetting the patch surface',
    () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(initialModel, {
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
        Story.message(Message.ClickedClearWarnings()),
        Story.model(model => {
          expect(model.warnings).toEqual([])
          expect(model.patchRows).toBe(4000)
        }),
      ),
  )
})

import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { ApplicationLive, Message, type Model } from './application'

const initialModel: Model = {
  activeWorkload: 'Idle',
  nextWarningId: 1,
  warnings: [],
  patchRows: 0,
  patchRun: 0,
}

describe('update', () => {
  it.effect('ClickedRunUpdateWork records update workload state', () =>
    story(
      ApplicationLive,
      message(Message.ClickedRunUpdateWork()),
      Command.expectNone(),
      model(model => {
        expect(model.activeWorkload).toBe('Update')
      }),
    ),
  )

  it.effect('ClickedRunViewWork records view workload state', () =>
    story(
      ApplicationLive,
      message(Message.ClickedRunViewWork()),
      model(model => {
        expect(model.activeWorkload).toBe('View')
      }),
    ),
  )

  it.effect('ClickedRunPatchWork mounts a large patch surface', () =>
    story(
      ApplicationLive,
      message(Message.ClickedRunPatchWork()),
      model(model => {
        expect(model.activeWorkload).toBe('Patch')
        expect(model.patchRows).toBeGreaterThan(0)
        expect(model.patchRun).toBe(1)
      }),
    ),
  )

  it.effect(
    'RecordedSlowWarning stores the warning and clears active workload',
    () =>
      story(
        ApplicationLive,
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
      ),
  )

  it.effect(
    'ClickedClearWarnings clears warnings without resetting the patch surface',
    () =>
      story(
        ApplicationLive,
        given(
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
        message(Message.ClickedClearWarnings()),
        model(model => {
          expect(model.warnings).toEqual([])
          expect(model.patchRows).toBe(4000)
        }),
      ),
  )
})

import { Calendar } from 'foldkit'
import { expectOutMessage, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { WorkHistoryEntry, WorkHistoryEntryLive } from './workHistoryEntry'

const args = { today: Calendar.make(2026, 4, 16) }

describe('workHistory entry', () => {
  it.effect('UpdatedCompany stores a valid company', () =>
    story(
      WorkHistoryEntryLive,
      args,
      message(
        WorkHistoryEntry.Message.UpdatedCompany({ value: 'Foldkit Inc.' }),
      ),
      model(model => {
        expect(model.company.value).toBe('Foldkit Inc.')
        expect(model.company._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('clearing company after a value makes the field Invalid', () =>
    story(
      WorkHistoryEntryLive,
      args,
      message(
        WorkHistoryEntry.Message.UpdatedCompany({ value: 'Foldkit Inc.' }),
      ),
      message(WorkHistoryEntry.Message.UpdatedCompany({ value: '' })),
      model(model => {
        expect(model.company._tag).toBe('Invalid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    story(
      WorkHistoryEntryLive,
      args,
      message(WorkHistoryEntry.Message.ClickedRemoveSelf()),
      expectOutMessage(WorkHistoryEntry.OutMessage.Removed()),
    ),
  )
})

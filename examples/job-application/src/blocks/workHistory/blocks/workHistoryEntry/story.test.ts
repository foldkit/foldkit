import { Calendar, Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message, OutMessage } from './block'
import { WorkHistoryEntryBlock, layer } from './index'

const today = Calendar.make(2026, 4, 16)

describe('workHistory entry', () => {
  it.effect('UpdatedCompany stores a valid company', () =>
    Story.story(
      { block: WorkHistoryEntryBlock, layer },
      Story.init('entry-1', today),
      Story.message(Message.UpdatedCompany({ value: 'Foldkit Inc.' })),
      Story.model(model => {
        expect(model.company.value).toBe('Foldkit Inc.')
        expect(model.company._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('clearing company after a value makes the field Invalid', () =>
    Story.story(
      { block: WorkHistoryEntryBlock, layer },
      Story.init('entry-1', today),
      Story.message(Message.UpdatedCompany({ value: 'Foldkit Inc.' })),
      Story.message(Message.UpdatedCompany({ value: '' })),
      Story.model(model => {
        expect(model.company._tag).toBe('Invalid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    Story.story(
      { block: WorkHistoryEntryBlock, layer },
      Story.init('entry-1', today),
      Story.message(Message.ClickedRemoveSelf()),
      Story.expectOutMessage(OutMessage.Removed()),
    ),
  )
})

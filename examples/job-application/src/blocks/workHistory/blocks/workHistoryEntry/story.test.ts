import { Calendar } from 'foldkit'
import { init } from 'foldkit/story'
import { expectOutMessage, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { WorkHistoryEntryBlock, layer } from './block'
import { Message, OutMessage } from './definition'

const today = Calendar.make(2026, 4, 16)

describe('workHistory entry', () => {
  it.effect('UpdatedCompany stores a valid company', () =>
    story(
      { block: WorkHistoryEntryBlock, layer },
      init('entry-1', today),
      message(Message.UpdatedCompany({ value: 'Foldkit Inc.' })),
      model(model => {
        expect(model.company.value).toBe('Foldkit Inc.')
        expect(model.company._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('clearing company after a value makes the field Invalid', () =>
    story(
      { block: WorkHistoryEntryBlock, layer },
      init('entry-1', today),
      message(Message.UpdatedCompany({ value: 'Foldkit Inc.' })),
      message(Message.UpdatedCompany({ value: '' })),
      model(model => {
        expect(model.company._tag).toBe('Invalid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    story(
      { block: WorkHistoryEntryBlock, layer },
      init('entry-1', today),
      message(Message.ClickedRemoveSelf()),
      expectOutMessage(OutMessage.Removed()),
    ),
  )
})

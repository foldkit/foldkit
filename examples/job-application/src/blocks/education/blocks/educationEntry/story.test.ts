import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message, OutMessage } from './block'
import { EducationEntryBlock, layer } from './index'

describe('education entry', () => {
  it.effect('UpdatedSchool stores a valid school', () =>
    Story.story(
      { block: EducationEntryBlock, layer },
      Story.init('entry-1'),
      Story.message(Message.UpdatedSchool({ value: 'MIT' })),
      Story.model(model => {
        expect(model.school.value).toBe('MIT')
        expect(model.school._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('clearing school after a value makes the field Invalid', () =>
    Story.story(
      { block: EducationEntryBlock, layer },
      Story.init('entry-1'),
      Story.message(Message.UpdatedSchool({ value: 'MIT' })),
      Story.message(Message.UpdatedSchool({ value: '' })),
      Story.model(model => {
        expect(model.school._tag).toBe('Invalid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    Story.story(
      { block: EducationEntryBlock, layer },
      Story.init('entry-1'),
      Story.message(Message.ClickedRemoveSelf()),
      Story.expectOutMessage(OutMessage.Removed()),
    ),
  )
})

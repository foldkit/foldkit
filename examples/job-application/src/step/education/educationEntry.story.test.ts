import { Calendar } from 'foldkit'
import { expectOutMessage, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { EducationEntry, EducationEntryLive } from './educationEntry'

const args = { today: Calendar.make(2026, 4, 16) }

describe('education entry', () => {
  it.effect('UpdatedSchool stores a valid school', () =>
    story(
      EducationEntryLive,
      args,
      message(EducationEntry.Message.UpdatedSchool({ value: 'MIT' })),
      model(model => {
        expect(model.school.value).toBe('MIT')
        expect(model.school._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('clearing school after a value makes the field Invalid', () =>
    story(
      EducationEntryLive,
      args,
      message(EducationEntry.Message.UpdatedSchool({ value: 'MIT' })),
      message(EducationEntry.Message.UpdatedSchool({ value: '' })),
      model(model => {
        expect(model.school._tag).toBe('Invalid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    story(
      EducationEntryLive,
      args,
      message(EducationEntry.Message.ClickedRemoveSelf()),
      expectOutMessage(EducationEntry.OutMessage.Removed()),
    ),
  )
})

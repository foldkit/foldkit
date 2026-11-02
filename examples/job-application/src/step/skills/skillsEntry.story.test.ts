import { expectOutMessage, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { SkillsEntry, SkillsEntryLive } from './skillsEntry'

describe('skills entry', () => {
  it.effect('UpdatedName stores a valid skill name', () =>
    story(
      SkillsEntryLive,
      message(SkillsEntry.Message.UpdatedName({ value: 'TypeScript' })),
      model(model => {
        expect(model.name.value).toBe('TypeScript')
        expect(model.name._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    story(
      SkillsEntryLive,
      message(SkillsEntry.Message.ClickedRemoveSelf()),
      expectOutMessage(SkillsEntry.OutMessage.Removed()),
    ),
  )
})

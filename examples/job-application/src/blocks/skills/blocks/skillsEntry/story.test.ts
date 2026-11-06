import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message, OutMessage } from './block'
import { SkillsEntryBlock, layer } from './index'

describe('skills entry', () => {
  it.effect('UpdatedName stores a valid skill name', () =>
    Story.story(
      { block: SkillsEntryBlock, layer },
      Story.init('entry-1'),
      Story.message(Message.UpdatedName({ value: 'TypeScript' })),
      Story.model(model => {
        expect(model.name.value).toBe('TypeScript')
        expect(model.name._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    Story.story(
      { block: SkillsEntryBlock, layer },
      Story.init('entry-1'),
      Story.message(Message.ClickedRemoveSelf()),
      Story.expectOutMessage(OutMessage.Removed()),
    ),
  )
})

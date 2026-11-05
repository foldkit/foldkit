import { init } from 'foldkit/story'
import { expectOutMessage, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message, OutMessage } from './block'
import { SkillsEntryBlock, layer } from './index'

describe('skills entry', () => {
  it.effect('UpdatedName stores a valid skill name', () =>
    story(
      { block: SkillsEntryBlock, layer },
      init('entry-1'),
      message(Message.UpdatedName({ value: 'TypeScript' })),
      model(model => {
        expect(model.name.value).toBe('TypeScript')
        expect(model.name._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    story(
      { block: SkillsEntryBlock, layer },
      init('entry-1'),
      message(Message.ClickedRemoveSelf()),
      expectOutMessage(OutMessage.Removed()),
    ),
  )
})

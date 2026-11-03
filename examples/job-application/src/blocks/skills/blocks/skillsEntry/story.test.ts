import { Effect } from 'effect'
import { init } from 'foldkit/story'
import { expectOutMessage, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { SkillsEntryBlock, layer } from './block'
import { Message, OutMessage } from './definition'

describe('skills entry', () => {
  it.effect('UpdatedName stores a valid skill name', () =>
    story(
      SkillsEntryBlock,
      init('entry-1'),
      message(Message.UpdatedName({ value: 'TypeScript' })),
      model(model => {
        expect(model.name.value).toBe('TypeScript')
        expect(model.name._tag).toBe('Valid')
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    story(
      SkillsEntryBlock,
      init('entry-1'),
      message(Message.ClickedRemoveSelf()),
      expectOutMessage(OutMessage.Removed()),
    ).pipe(Effect.provide(layer)),
  )
})

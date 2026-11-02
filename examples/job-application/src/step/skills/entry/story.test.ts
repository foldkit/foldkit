import { Effect } from 'effect'
import { init } from 'foldkit/story'
import { expectOutMessage, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { SkillsEntryBlock, layer } from './block'
import { Message, OutMessage } from './definition'

describe('skills entry', () => {
  test('UpdatedName stores a valid skill name', async () => {
    await Effect.runPromise(
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
  })

  test('ClickedRemoveSelf emits Removed', async () => {
    await Effect.runPromise(
      story(
        SkillsEntryBlock,
        init('entry-1'),
        message(Message.ClickedRemoveSelf()),
        expectOutMessage(OutMessage.Removed()),
      ).pipe(Effect.provide(layer)),
    )
  })
})

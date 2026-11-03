import { Effect } from 'effect'
import { init } from 'foldkit/story'
import { expectOutMessage, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { EducationEntryBlock, layer } from './block'
import { Message, OutMessage } from './definition'

describe('education entry', () => {
  test('UpdatedSchool stores a valid school', async () => {
    await Effect.runPromise(
      story(
        EducationEntryBlock,
        init('entry-1'),
        message(Message.UpdatedSchool({ value: 'MIT' })),
        model(model => {
          expect(model.school.value).toBe('MIT')
          expect(model.school._tag).toBe('Valid')
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('clearing school after a value makes the field Invalid', async () => {
    await Effect.runPromise(
      story(
        EducationEntryBlock,
        init('entry-1'),
        message(Message.UpdatedSchool({ value: 'MIT' })),
        message(Message.UpdatedSchool({ value: '' })),
        model(model => {
          expect(model.school._tag).toBe('Invalid')
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('ClickedRemoveSelf emits Removed', async () => {
    await Effect.runPromise(
      story(
        EducationEntryBlock,
        init('entry-1'),
        message(Message.ClickedRemoveSelf()),
        expectOutMessage(OutMessage.Removed()),
      ).pipe(Effect.provide(layer)),
    )
  })
})

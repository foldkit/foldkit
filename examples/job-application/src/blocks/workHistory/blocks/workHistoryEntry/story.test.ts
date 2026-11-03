import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { init } from 'foldkit/story'
import { expectOutMessage, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { WorkHistoryEntryBlock, layer } from './block'
import { Message, OutMessage } from './definition'

const today = Calendar.make(2026, 4, 16)

describe('workHistory entry', () => {
  test('UpdatedCompany stores a valid company', async () => {
    await Effect.runPromise(
      story(
        WorkHistoryEntryBlock,
        init('entry-1', today),
        message(Message.UpdatedCompany({ value: 'Foldkit Inc.' })),
        model(model => {
          expect(model.company.value).toBe('Foldkit Inc.')
          expect(model.company._tag).toBe('Valid')
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('clearing company after a value makes the field Invalid', async () => {
    await Effect.runPromise(
      story(
        WorkHistoryEntryBlock,
        init('entry-1', today),
        message(Message.UpdatedCompany({ value: 'Foldkit Inc.' })),
        message(Message.UpdatedCompany({ value: '' })),
        model(model => {
          expect(model.company._tag).toBe('Invalid')
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('ClickedRemoveSelf emits Removed', async () => {
    await Effect.runPromise(
      story(
        WorkHistoryEntryBlock,
        init('entry-1', today),
        message(Message.ClickedRemoveSelf()),
        expectOutMessage(OutMessage.Removed()),
      ).pipe(Effect.provide(layer)),
    )
  })
})

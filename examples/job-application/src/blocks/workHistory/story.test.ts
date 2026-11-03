import { Effect } from 'effect'
import { Array, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { init, messageFrom } from 'foldkit/story'
import { Command, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { WorkHistoryBlock, layer } from './block'
import { WorkHistoryEntryBlock } from './blocks/workHistoryEntry'
import { GenerateWorkHistoryEntryId } from './command'
import { EntriesBinding } from './composition'
import { Message } from './definition'

type WorkHistoryEntryMessage = typeof WorkHistoryEntryBlock.Message.Type

const today = Calendar.make(2026, 4, 16)
const givenInitial = init(today, 'work-history-entry-1')

const entryMessage = (entryId: string, message: WorkHistoryEntryMessage) =>
  messageFrom(EntriesBinding, entryId, message)

describe('workHistory', () => {
  test('ClickedAddEntry generates an id and appends an entry', async () => {
    await Effect.runPromise(
      story(
        WorkHistoryBlock,
        givenInitial,
        message(Message.ClickedAddEntry()),
        Command.expectHas(GenerateWorkHistoryEntryId),
        Command.resolve(
          GenerateWorkHistoryEntryId,
          Message.CompletedGenerateWorkHistoryEntryId({
            entryId: 'test-work-1',
          }),
        ),
        model(model => {
          expect(model.entries).toHaveLength(2)
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('an entry OutMessage.Removed removes that entry', async () => {
    await Effect.runPromise(
      story(
        WorkHistoryBlock,
        givenInitial,
        entryMessage(
          'work-history-entry-1',
          WorkHistoryEntryBlock.Message.ClickedRemoveSelf(),
        ),
        model(model => {
          expect(model.entries).toHaveLength(0)
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('a generated entry Message updates the matching entry', async () => {
    await Effect.runPromise(
      story(
        WorkHistoryBlock,
        givenInitial,
        entryMessage(
          'work-history-entry-1',
          WorkHistoryEntryBlock.Message.UpdatedCompany({
            value: 'Foldkit Inc.',
          }),
        ),
        model(model => {
          expect(
            pipe(
              model.entries,
              Array.head,
              Option.map(entry => entry.company.value),
              Option.getOrThrow,
            ),
          ).toBe('Foldkit Inc.')
        }),
      ).pipe(Effect.provide(layer)),
    )
  })
})

import { Array, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { init, messageFrom } from 'foldkit/story'
import { Command, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

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
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    story(
      { block: WorkHistoryBlock, layer },
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
    ),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    story(
      { block: WorkHistoryBlock, layer },
      givenInitial,
      entryMessage(
        'work-history-entry-1',
        WorkHistoryEntryBlock.Message.ClickedRemoveSelf(),
      ),
      model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    story(
      { block: WorkHistoryBlock, layer },
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
    ),
  )
})

import { Array, Option, pipe } from 'effect'
import { Calendar, Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message } from './block'
import { WorkHistoryEntryBlock } from './blocks/workHistoryEntry'
import { GenerateWorkHistoryEntryId } from './command'
import { EntriesBinding } from './composition'
import { WorkHistoryBlock, layer } from './index'

const today = Calendar.make(2026, 4, 16)
const givenInitial = Story.init(today, 'work-history-entry-1')

describe('workHistory', () => {
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    Story.story(
      { block: WorkHistoryBlock, layer },
      givenInitial,
      Story.message(Message.ClickedAddEntry()),
      Story.Command.expectHas(GenerateWorkHistoryEntryId),
      Story.Command.resolve(
        GenerateWorkHistoryEntryId,
        Message.CompletedGenerateWorkHistoryEntryId({
          entryId: 'test-work-1',
        }),
      ),
      Story.model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    ),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    Story.story(
      { block: WorkHistoryBlock, layer },
      givenInitial,
      Story.messageIn(
        EntriesBinding,
        'work-history-entry-1',
        WorkHistoryEntryBlock.Message.ClickedRemoveSelf(),
      ),
      Story.model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    Story.story(
      { block: WorkHistoryBlock, layer },
      givenInitial,
      Story.messageIn(
        EntriesBinding,
        'work-history-entry-1',
        WorkHistoryEntryBlock.Message.UpdatedCompany({
          value: 'Foldkit Inc.',
        }),
      ),
      Story.model(model => {
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

import { Array, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { GenerateWorkHistoryEntryId } from './command'
import { EntriesBinding } from './composition'
import { Message } from './definition'
import { WorkHistoryEntryBlock } from './entry'
import { init } from './init'
import { update } from './update'

const today = Calendar.make(2026, 4, 16)
const givenInitial = given(init(today, 'work-history-entry-1').model)

const entryMessage = (
  entryId: string,
  message: typeof WorkHistoryEntryBlock.Message.Type,
) => toParentMessage(EntriesBinding, entryId, message)

describe('workHistory', () => {
  test('ClickedAddEntry generates an id and appends an entry', () => {
    story(
      update,
      givenInitial,
      message(Message.ClickedAddEntry()),
      Command.expectHas(GenerateWorkHistoryEntryId),
      Command.resolve(
        GenerateWorkHistoryEntryId,
        Message.SucceededGenerateWorkHistoryEntryId({ entryId: 'test-work-1' }),
      ),
      model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    )
  })

  test('FailedGenerateWorkHistoryEntryId leaves the entries unchanged', () => {
    story(
      update,
      givenInitial,
      message(Message.FailedGenerateWorkHistoryEntryId()),
      Command.expectNone(),
      model(model => {
        expect(model).toEqual(init(today, 'work-history-entry-1').model)
      }),
    )
  })

  test('an entry OutMessage.Removed removes that entry', () => {
    const firstEntry = Option.getOrThrow(
      Array.head(init(today, 'work-history-entry-1').model.entries),
    )

    story(
      update,
      givenInitial,
      message(
        entryMessage(
          firstEntry.id,
          WorkHistoryEntryBlock.Message.ClickedRemoveSelf(),
        ),
      ),
      model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    )
  })

  test('a generated entry Message updates the matching entry', () => {
    const firstEntry = Option.getOrThrow(
      Array.head(init(today, 'work-history-entry-1').model.entries),
    )

    story(
      update,
      givenInitial,
      message(
        entryMessage(
          firstEntry.id,
          WorkHistoryEntryBlock.Message.UpdatedCompany({
            value: 'Foldkit Inc.',
          }),
        ),
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
    )
  })
})

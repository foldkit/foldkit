import { Array, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { GenerateEntryId, Message, init, update } from './education'
import * as Entry from './entry'

const today = Calendar.make(2026, 4, 16)
const givenInitial = given(init(today, 'education-entry-1'))

describe('education', () => {
  test('ClickedAddEntry generates an id and appends an entry', () => {
    story(
      update,
      givenInitial,
      message(Message.ClickedAddEntry()),
      Command.expectHas(GenerateEntryId),
      Command.resolve(
        GenerateEntryId,
        Message.SucceededGenerateEntryId({ entryId: 'test-edu-1' }),
      ),
      model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    )
  })

  test('FailedGenerateEntryId leaves the entries unchanged', () => {
    story(
      update,
      givenInitial,
      message(Message.FailedGenerateEntryId()),
      Command.expectNone(),
      model(model => {
        expect(model).toEqual(init(today, 'education-entry-1'))
      }),
    )
  })

  test('an entry OutMessage.Removed removes that entry', () => {
    const firstEntry = Option.getOrThrow(
      Array.head(init(today, 'education-entry-1').entries),
    )

    story(
      update,
      givenInitial,
      message(
        Message.GotEntryMessage({
          entryId: firstEntry.id,
          message: Entry.Message.ClickedRemoveSelf(),
        }),
      ),
      model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    )
  })

  test('GotEntryMessage folds a school update into the matching entry', () => {
    const firstEntry = Option.getOrThrow(
      Array.head(init(today, 'education-entry-1').entries),
    )

    story(
      update,
      givenInitial,
      message(
        Message.GotEntryMessage({
          entryId: firstEntry.id,
          message: Entry.Message.UpdatedSchool({ value: 'MIT' }),
        }),
      ),
      model(model => {
        expect(
          pipe(
            model.entries,
            Array.head,
            Option.map(entry => entry.school.value),
            Option.getOrThrow,
          ),
        ).toBe('MIT')
      }),
    )
  })
})

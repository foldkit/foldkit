import { Array, Option, pipe } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import * as Entry from './entry'
import { GenerateEntryId, Message, init, update } from './skills'

const givenInitial = given(init('skills-entry-1'))

describe('skills', () => {
  test('ClickedAddEntry generates an id and appends an entry', () => {
    story(
      update,
      givenInitial,
      message(Message.ClickedAddEntry()),
      Command.expectHas(GenerateEntryId),
      Command.resolve(
        GenerateEntryId,
        Message.SucceededGenerateEntryId({ entryId: 'test-skill-1' }),
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
        expect(model).toEqual(init('skills-entry-1'))
      }),
    )
  })

  test('an entry OutMessage.Removed removes that entry', () => {
    const firstEntry = Option.getOrThrow(
      Array.head(init('skills-entry-1').entries),
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

  test('GotEntryMessage folds a name update into the matching entry', () => {
    const firstEntry = Option.getOrThrow(
      Array.head(init('skills-entry-1').entries),
    )

    story(
      update,
      givenInitial,
      message(
        Message.GotEntryMessage({
          entryId: firstEntry.id,
          message: Entry.Message.UpdatedName({ value: 'TypeScript' }),
        }),
      ),
      model(model => {
        expect(
          pipe(
            model.entries,
            Array.head,
            Option.map(entry => entry.name.value),
            Option.getOrThrow,
          ),
        ).toBe('TypeScript')
      }),
    )
  })
})

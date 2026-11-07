import { Array, Option, pipe } from 'effect'
import { Calendar, Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message } from './block'
import { EducationEntryBlock } from './blocks/educationEntry'
import { GenerateEducationEntryId } from './command'
import { EntriesBinding } from './composition'
import { EducationBlock, layer } from './index'

const today = Calendar.make(2026, 4, 16)
const givenInitial = Story.init(today, 'education-entry-1')

describe('education', () => {
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    Story.story(
      { block: EducationBlock, layer },
      givenInitial,
      Story.message(Message.ClickedAddEntry()),
      Story.Command.expectHas(GenerateEducationEntryId),
      Story.Command.resolve(
        GenerateEducationEntryId,
        Message.CompletedGenerateEducationEntryId({ entryId: 'test-edu-1' }),
      ),
      Story.model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    ),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    Story.story(
      { block: EducationBlock, layer },
      givenInitial,
      Story.messageIn(
        EntriesBinding,
        'education-entry-1',
        EducationEntryBlock.Message.ClickedRemoveSelf(),
      ),
      Story.model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    Story.story(
      { block: EducationBlock, layer },
      givenInitial,
      Story.messageIn(
        EntriesBinding,
        'education-entry-1',
        EducationEntryBlock.Message.UpdatedSchool({ value: 'MIT' }),
      ),
      Story.model(model => {
        expect(
          pipe(
            model.entries,
            Array.head,
            Option.map(entry => entry.school.value),
            Option.getOrThrow,
          ),
        ).toBe('MIT')
      }),
    ),
  )
})

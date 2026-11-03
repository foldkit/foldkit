import { Effect } from 'effect'
import { Array, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { init, messageFrom } from 'foldkit/story'
import { Command, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { EducationBlock, layer } from './block'
import { EducationEntryBlock } from './blocks/educationEntry'
import { GenerateEducationEntryId } from './command'
import { EntriesBinding } from './composition'
import { Message } from './definition'

type EducationEntryMessage = typeof EducationEntryBlock.Message.Type

const today = Calendar.make(2026, 4, 16)
const givenInitial = init(today, 'education-entry-1')
const entryMessage = (entryId: string, message: EducationEntryMessage) =>
  messageFrom(EntriesBinding, entryId, message)

describe('education', () => {
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    story(
      EducationBlock,
      givenInitial,
      message(Message.ClickedAddEntry()),
      Command.expectHas(GenerateEducationEntryId),
      Command.resolve(
        GenerateEducationEntryId,
        Message.CompletedGenerateEducationEntryId({ entryId: 'test-edu-1' }),
      ),
      model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    story(
      EducationBlock,
      givenInitial,
      entryMessage(
        'education-entry-1',
        EducationEntryBlock.Message.ClickedRemoveSelf(),
      ),
      model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    story(
      EducationBlock,
      givenInitial,
      entryMessage(
        'education-entry-1',
        EducationEntryBlock.Message.UpdatedSchool({ value: 'MIT' }),
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
    ).pipe(Effect.provide(layer)),
  )
})

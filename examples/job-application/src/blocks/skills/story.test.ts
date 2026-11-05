import { Array, Option, pipe } from 'effect'
import { init, messageFrom } from 'foldkit/story'
import { Command, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message } from './block'
import { SkillsEntryBlock } from './blocks/skillsEntry'
import { GenerateSkillsEntryId } from './command'
import { EntriesBinding } from './composition'
import { SkillsBlock, layer } from './index'

type SkillsEntryMessage = typeof SkillsEntryBlock.Message.Type

const givenInitial = init('skills-entry-1')

const entryMessage = (entryId: string, message: SkillsEntryMessage) =>
  messageFrom(EntriesBinding, entryId, message)

describe('skills', () => {
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    story(
      { block: SkillsBlock, layer },
      givenInitial,
      message(Message.ClickedAddEntry()),
      Command.expectHas(GenerateSkillsEntryId),
      Command.resolve(
        GenerateSkillsEntryId,
        Message.CompletedGenerateSkillsEntryId({ entryId: 'test-skill-1' }),
      ),
      model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    ),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    story(
      { block: SkillsBlock, layer },
      givenInitial,
      entryMessage(
        'skills-entry-1',
        SkillsEntryBlock.Message.ClickedRemoveSelf(),
      ),
      model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    story(
      { block: SkillsBlock, layer },
      givenInitial,
      entryMessage(
        'skills-entry-1',
        SkillsEntryBlock.Message.UpdatedName({ value: 'TypeScript' }),
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
    ),
  )
})

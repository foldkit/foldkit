import { Array, Option, pipe } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message } from './block'
import { SkillsEntryBlock } from './blocks/skillsEntry'
import { GenerateSkillsEntryId } from './command'
import { EntriesBinding } from './composition'
import { SkillsBlock, layer } from './index'

const givenInitial = Story.init('skills-entry-1')

describe('skills', () => {
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    Story.story(
      { block: SkillsBlock, layer },
      givenInitial,
      Story.message(Message.ClickedAddEntry()),
      Story.Command.expectHas(GenerateSkillsEntryId),
      Story.Command.resolve(
        GenerateSkillsEntryId,
        Message.CompletedGenerateSkillsEntryId({ entryId: 'test-skill-1' }),
      ),
      Story.model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    ),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    Story.story(
      { block: SkillsBlock, layer },
      givenInitial,
      Story.messageIn(
        EntriesBinding,
        'skills-entry-1',
        SkillsEntryBlock.Message.ClickedRemoveSelf(),
      ),
      Story.model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    Story.story(
      { block: SkillsBlock, layer },
      givenInitial,
      Story.messageIn(
        EntriesBinding,
        'skills-entry-1',
        SkillsEntryBlock.Message.UpdatedName({ value: 'TypeScript' }),
      ),
      Story.model(model => {
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

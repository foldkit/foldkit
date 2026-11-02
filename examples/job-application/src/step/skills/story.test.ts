import { Effect } from 'effect'
import { Array, Option, pipe } from 'effect'
import { init, messageFrom } from 'foldkit/story'
import { Command, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { SkillsBlock, layer } from './block'
import { GenerateSkillsEntryId } from './command'
import { EntriesBinding } from './composition'
import { Message } from './definition'
import { SkillsEntryBlock } from './entry'

type SkillsEntryMessage = typeof SkillsEntryBlock.Message.Type

const givenInitial = init('skills-entry-1')

const entryMessage = (entryId: string, message: SkillsEntryMessage) =>
  messageFrom(EntriesBinding, entryId, message)

describe('skills', () => {
  test('ClickedAddEntry generates an id and appends an entry', async () => {
    await Effect.runPromise(
      story(
        SkillsBlock,
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
      ).pipe(Effect.provide(layer)),
    )
  })

  test('an entry OutMessage.Removed removes that entry', async () => {
    await Effect.runPromise(
      story(
        SkillsBlock,
        givenInitial,
        entryMessage(
          'skills-entry-1',
          SkillsEntryBlock.Message.ClickedRemoveSelf(),
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
        SkillsBlock,
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
      ).pipe(Effect.provide(layer)),
    )
  })
})

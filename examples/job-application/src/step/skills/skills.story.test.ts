import { Array, Effect, Option, pipe } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { BrowserCrypto } from '@effect/platform-browser'
import { describe, expect, it } from '@effect/vitest'

import { GenerateSkillsEntryId, Skills, SkillsLive } from './skills'
import { SkillsEntry } from './skillsEntry'

const args = { initialEntryId: 'skills-entry-1' }

describe('skills', () => {
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    story(
      SkillsLive,
      args,
      message(Skills.Message.ClickedAddEntry()),
      Command.expectHas(GenerateSkillsEntryId),
      Command.resolve(
        GenerateSkillsEntryId,
        Skills.Message.SucceededGenerateSkillsEntryId({
          entryId: 'test-skill-1',
        }),
      ),
      model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('FailedGenerateSkillsEntryId leaves the entries unchanged', () =>
    story(
      SkillsLive,
      args,
      message(Skills.Message.FailedGenerateSkillsEntryId()),
      Command.expectNone(),
      model(model => {
        expect(Array.map(model.entries, ({ id }) => id)).toEqual([
          'skills-entry-1',
        ])
      }),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    story(
      SkillsLive,
      args,
      message(
        Block.deliver(
          SkillsEntry,
          ['entries', 'skills-entry-1'],
          SkillsEntry.Message.ClickedRemoveSelf(),
        ),
      ),
      model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    story(
      SkillsLive,
      args,
      message(
        Block.deliver(
          SkillsEntry,
          ['entries', 'skills-entry-1'],
          SkillsEntry.Message.UpdatedName({ value: 'TypeScript' }),
        ),
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
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )
})

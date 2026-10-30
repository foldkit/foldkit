import { Array, Effect, Option, pipe } from 'effect'
import { Block, Calendar } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { BrowserCrypto } from '@effect/platform-browser'
import { describe, expect, it } from '@effect/vitest'

import { Education, EducationLive, GenerateEducationEntryId } from './education'
import { EducationEntry } from './educationEntry'

const args = {
  today: Calendar.make(2026, 4, 16),
  initialEntryId: 'education-entry-1',
}

describe('education', () => {
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    story(
      EducationLive,
      args,
      message(Education.Message.ClickedAddEntry()),
      Command.expectHas(GenerateEducationEntryId),
      Command.resolve(
        GenerateEducationEntryId,
        Education.Message.SucceededGenerateEducationEntryId({
          entryId: 'test-edu-1',
        }),
      ),
      model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('FailedGenerateEducationEntryId leaves the entries unchanged', () =>
    story(
      EducationLive,
      args,
      message(Education.Message.FailedGenerateEducationEntryId()),
      Command.expectNone(),
      model(model => {
        expect(Array.map(model.entries, ({ id }) => id)).toEqual([
          'education-entry-1',
        ])
      }),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    story(
      EducationLive,
      args,
      message(
        Block.deliver(
          EducationEntry,
          ['entries', 'education-entry-1'],
          EducationEntry.Message.ClickedRemoveSelf(),
        ),
      ),
      model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    story(
      EducationLive,
      args,
      message(
        Block.deliver(
          EducationEntry,
          ['entries', 'education-entry-1'],
          EducationEntry.Message.UpdatedSchool({ value: 'MIT' }),
        ),
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
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )
})

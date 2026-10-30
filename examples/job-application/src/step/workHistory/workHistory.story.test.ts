import { Array, Effect, Option, pipe } from 'effect'
import { Block, Calendar } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { BrowserCrypto } from '@effect/platform-browser'
import { describe, expect, it } from '@effect/vitest'

import {
  GenerateWorkHistoryEntryId,
  WorkHistory,
  WorkHistoryLive,
} from './workHistory'
import { WorkHistoryEntry } from './workHistoryEntry'

const args = {
  today: Calendar.make(2026, 4, 16),
  initialEntryId: 'work-history-entry-1',
}

describe('workHistory', () => {
  it.effect('ClickedAddEntry generates an id and appends an entry', () =>
    story(
      WorkHistoryLive,
      args,
      message(WorkHistory.Message.ClickedAddEntry()),
      Command.expectHas(GenerateWorkHistoryEntryId),
      Command.resolve(
        GenerateWorkHistoryEntryId,
        WorkHistory.Message.SucceededGenerateWorkHistoryEntryId({
          entryId: 'test-work-1',
        }),
      ),
      model(model => {
        expect(model.entries).toHaveLength(2)
      }),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect(
    'FailedGenerateWorkHistoryEntryId leaves the entries unchanged',
    () =>
      story(
        WorkHistoryLive,
        args,
        message(WorkHistory.Message.FailedGenerateWorkHistoryEntryId()),
        Command.expectNone(),
        model(model => {
          expect(Array.map(model.entries, ({ id }) => id)).toEqual([
            'work-history-entry-1',
          ])
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('an entry OutMessage.Removed removes that entry', () =>
    story(
      WorkHistoryLive,
      args,
      message(
        Block.deliver(
          WorkHistoryEntry,
          ['entries', 'work-history-entry-1'],
          WorkHistoryEntry.Message.ClickedRemoveSelf(),
        ),
      ),
      model(model => {
        expect(model.entries).toHaveLength(0)
      }),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('a generated entry Message updates the matching entry', () =>
    story(
      WorkHistoryLive,
      args,
      message(
        Block.deliver(
          WorkHistoryEntry,
          ['entries', 'work-history-entry-1'],
          WorkHistoryEntry.Message.UpdatedCompany({ value: 'Foldkit Inc.' }),
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
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )
})

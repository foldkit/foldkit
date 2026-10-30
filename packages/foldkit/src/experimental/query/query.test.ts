import { Array, Context, Effect, HashMap, Option, Result, Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import * as Query from './index.js'
import { makeKeyedQueryPolicy } from './keyedQuery.js'
import { makeQueryPolicy } from './query.js'

const Note = Schema.Struct({ id: Schema.String, body: Schema.String })
type Note = typeof Note.Type

const notes = makeQueryPolicy({
  name: 'Notes',
  data: Schema.Array(Note),
  error: Schema.String,
})

const noteById = makeKeyedQueryPolicy({
  name: 'Note',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String },
})

const noteByIdAndLocale = makeKeyedQueryPolicy({
  name: 'NoteLocale',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String, locale: Schema.String },
})

const noteByIdPreview = makeKeyedQueryPolicy({
  name: 'NotePreview',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String, preview: Schema.Boolean },
  toKey: ({ noteId }) => noteId,
})

const noteByMutableFilter = makeKeyedQueryPolicy({
  name: 'NoteByMutableFilter',
  data: Schema.String,
  error: Schema.Never,
  args: {
    filter: Schema.Struct({
      id: Schema.String,
      revision: Schema.NumberFromString,
    }),
  },
})
const noteByMutableFilterHandlers = noteByMutableFilter.makeFetchHandlers(
  ({ filter }) => Effect.succeed(`${filter.id}:${filter.revision}`),
)

const hello = [{ id: '1', body: 'hello' }]
const noteRequestKey = (noteId: string): string => JSON.stringify({ noteId })

class QueryTestService extends Context.Service<
  QueryTestService,
  { readonly token: string }
>()('QueryTestService') {}

const stringNeedingDecode = Schema.String.pipe(
  Schema.optional,
  Schema.withDecodingDefault(
    Effect.gen(function* () {
      yield* QueryTestService
      return ''
    }),
  ),
)
type stringNeedingDecode = typeof stringNeedingDecode.Type

const stringNeedingEncode = Schema.flip(stringNeedingDecode)

const loadedNoteById = (noteId: string) => {
  const args = { noteId }
  const loading = noteById.requestLoadIfMissing(noteById.init().model, args)

  return noteById.update(
    loading.model,
    noteById.Message.CompletedFetch({
      args,
      generation: loading.model.generation,
      requestKey: noteRequestKey(noteId),
      result: Result.succeed({ id: noteId, body: 'hello' }),
    }),
  ).model
}

const commandShape = (command: {
  readonly name: string
  readonly args?: unknown
  readonly key?: string
}) => ({
  name: command.name,
  args: command.args,
  key: command.key,
})

describe('Query.define Schema inputs', () => {
  it('accepts codecs with no encoding or decoding services', () => {
    expectTypeOf(Schema.Array(Note)).toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
    expectTypeOf(Schema.String).toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
    expectTypeOf({ noteId: Schema.String }).toExtend<Query.SyncFields>()
  })

  it('rejects Schema.Top data and error values', () => {
    const data: Schema.Top = Schema.Array(Note)
    const error: Schema.Top = Schema.String
    type error = typeof error.Type
    expectTypeOf(data).not.toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
    expectTypeOf(error).not.toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
  })

  it('rejects a data codec that requires encoding services', () => {
    expectTypeOf(stringNeedingEncode).not.toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
  })

  it('rejects an args codec that requires encoding services', () => {
    expectTypeOf({
      noteId: stringNeedingEncode,
    }).not.toExtend<Query.SyncFields>()
  })

  it('rejects an empty args record', () => {
    expect(() =>
      makeKeyedQueryPolicy({
        name: 'EmptyArgs',
        data: Note,
        error: Schema.String,
        args: {},
      }),
    ).toThrowError('keyed args must include at least one field')
  })
})

describe('Query loading policies', () => {
  it('revalidateOrLoad starts an Idle Query and deduplicates pending work', () => {
    const started = notes.requestRevalidationOrLoad(notes.init().model)
    expect(notes.read(started.model)).toEqual(AsyncData.Loading())
    expect(started.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch({ generation: started.model.generation })),
    ])

    const ignoredLoading = notes.requestRevalidationOrLoad(started.model)
    expect(ignoredLoading.model).toBe(started.model)
    expect(ignoredLoading.commands).toBeUndefined()

    const refreshing = notes.Model.make({
      data: AsyncData.Refreshing({ data: hello }),
      generation: 1,
    })
    const ignoredRefreshing = notes.requestRevalidationOrLoad(refreshing)
    expect(ignoredRefreshing.model).toBe(refreshing)
    expect(ignoredRefreshing.commands).toBeUndefined()
  })

  it('revalidate refreshes settled data-bearing states', () => {
    const success = notes.Model.make({
      data: AsyncData.Success({ data: hello }),
      generation: 0,
    })
    const fromSuccess = notes.requestRevalidation(success)
    expect(notes.read(fromSuccess.model)).toEqual(
      AsyncData.Refreshing({ data: hello }),
    )
    expect(fromSuccess.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch({ generation: fromSuccess.model.generation })),
    ])

    const stale = notes.Model.make({
      data: AsyncData.Stale({ error: 'boom', data: hello }),
      generation: 0,
    })
    const fromStale = notes.requestRevalidation(stale)
    expect(notes.read(fromStale.model)).toEqual(
      AsyncData.Refreshing({ data: hello }),
    )
    expect(fromStale.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch({ generation: fromStale.model.generation })),
    ])

    const idle = notes.init().model
    expect(notes.requestRevalidation(idle)).toEqual({ model: idle })
    const failure = notes.Model.make({
      data: AsyncData.Failure({ error: 'boom' }),
      generation: 0,
    })
    expect(notes.requestRevalidation(failure)).toEqual({ model: failure })
  })

  it('loadIfMissing starts only states without data', () => {
    const loaded = notes.Model.make({
      data: AsyncData.Success({ data: hello }),
      generation: 0,
    })
    const successHit = notes.requestLoadIfMissing(loaded)
    expect(successHit.model).toBe(loaded)
    expect(successHit.commands).toBeUndefined()

    const stale = notes.Model.make({
      data: AsyncData.Stale({ error: 'boom', data: hello }),
      generation: 0,
    })
    const staleHit = notes.requestLoadIfMissing(stale)
    expect(staleHit.model).toBe(stale)
    expect(staleHit.commands).toBeUndefined()

    const fromIdle = notes.requestLoadIfMissing(notes.init().model)
    expect(notes.read(fromIdle.model)).toEqual(AsyncData.Loading())
    expect(fromIdle.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch({ generation: fromIdle.model.generation })),
    ])

    const fromFailure = notes.requestLoadIfMissing(
      notes.Model.make({
        data: AsyncData.Failure({ error: 'boom' }),
        generation: 0,
      }),
    )
    expect(notes.read(fromFailure.model)).toEqual(AsyncData.Loading())
    expect(fromFailure.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch({ generation: fromFailure.model.generation })),
    ])
  })

  it('update ignores a completion when the Query is not pending', () => {
    const idle = notes.init().model
    const fromIdle = notes.update(
      idle,
      notes.Message.CompletedFetch({
        generation: idle.generation,
        result: Result.succeed(hello),
      }),
    )
    expect(fromIdle).toEqual({ model: idle })

    const success = notes.Model.make({
      data: AsyncData.Success({ data: hello }),
      generation: 1,
    })
    const fromSuccess = notes.update(
      success,
      notes.Message.CompletedFetch({
        generation: success.generation,
        result: Result.succeed([{ id: '2', body: 'newer' }]),
      }),
    )
    expect(fromSuccess).toEqual({ model: success })
  })

  it('a failed refresh keeps the previous data', () => {
    const loading = notes.requestRevalidationOrLoad(notes.init().model)
    const success = notes.update(
      loading.model,
      notes.Message.CompletedFetch({
        generation: loading.model.generation,
        result: Result.succeed(hello),
      }),
    )
    expect(notes.read(success.model)).toEqual(
      AsyncData.Success({ data: hello }),
    )

    const refreshing = notes.requestRevalidation(success.model)
    expect(notes.read(refreshing.model)).toEqual(
      AsyncData.Refreshing({ data: hello }),
    )

    const stale = notes.update(
      refreshing.model,
      notes.Message.CompletedFetch({
        generation: refreshing.model.generation,
        result: Result.fail('boom'),
      }),
    )
    expect(notes.read(stale.model)).toEqual(
      AsyncData.Stale({ error: 'boom', data: hello }),
    )
  })

  it('a failed first load enters Failure', () => {
    const loading = notes.requestLoadIfMissing(notes.init().model)
    const failed = notes.update(
      loading.model,
      notes.Message.CompletedFetch({
        generation: loading.model.generation,
        result: Result.fail('boom'),
      }),
    )
    expect(notes.read(failed.model)).toEqual(
      AsyncData.Failure({ error: 'boom' }),
    )
  })

  it('reset ignores an earlier completion after a new fetch starts', () => {
    const firstLoad = notes.requestLoadIfMissing(notes.init().model)
    const reset = notes.requestReset(firstLoad.model)
    const secondLoad = notes.requestLoadIfMissing(reset.model)

    expect(notes.read(reset.model)).toEqual(AsyncData.Idle())
    expect(secondLoad.model.generation).toBe(2)

    const staleCompletion = notes.update(
      secondLoad.model,
      notes.Message.CompletedFetch({
        generation: firstLoad.model.generation,
        result: Result.succeed([{ id: 'old', body: 'stale' }]),
      }),
    )
    expect(staleCompletion.model).toBe(secondLoad.model)

    const currentCompletion = notes.update(
      staleCompletion.model,
      notes.Message.CompletedFetch({
        generation: secondLoad.model.generation,
        result: Result.succeed(hello),
      }),
    )
    expect(notes.read(currentCompletion.model)).toEqual(
      AsyncData.Success({ data: hello }),
    )
  })
})

describe('KeyedQuery loading and completion', () => {
  it('loadIfMissing starts a missing entry and keeps a loaded entry', () => {
    const missing = noteById.requestLoadIfMissing(noteById.init().model, {
      noteId: '1',
    })
    expect(noteById.read(missing.model, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(missing.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch({
          args: { noteId: '1' },
          generation: missing.model.generation,
          requestKey: noteRequestKey('1'),
        }),
      ),
    ])

    const loaded = loadedNoteById('1')
    const hit = noteById.requestLoadIfMissing(loaded, { noteId: '1' })
    expect(hit.model).toBe(loaded)
    expect(hit.commands).toBeUndefined()
  })

  it.effect(
    'snapshots nested and transformed args before storing or fetching',
    () =>
      Effect.gen(function* () {
        const requestKey = '{"filter":{"id":"a","revision":"1"}}'
        const args = { filter: { id: 'a', revision: 1 } }
        const started = noteByMutableFilter.requestLoadIfMissing(
          noteByMutableFilter.init().model,
          args,
        )
        const command = Option.getOrThrow(Array.head(started.commands ?? []))

        args.filter.id = 'b'
        args.filter.revision = 2

        expect(commandShape(command)).toEqual(
          commandShape(
            noteByMutableFilter.Fetch({
              args: { filter: { id: 'a', revision: 1 } },
              generation: started.model.generation,
              requestKey,
            }),
          ),
        )
        expect(
          Option.getOrThrow(HashMap.get(started.model.entries, requestKey))
            .args,
        ).toEqual({ filter: { id: 'a', revision: 1 } })

        const completion = yield* noteByMutableFilterHandlers.fetch(
          command.args,
        )
        const settled = noteByMutableFilter.update(started.model, completion)

        expect(
          noteByMutableFilter.read(settled.model, {
            filter: { id: 'a', revision: 1 },
          }),
        ).toEqual(AsyncData.Success({ data: 'a:1' }))
        expect(
          noteByMutableFilter.read(settled.model, {
            filter: { id: 'b', revision: 2 },
          }),
        ).toEqual(AsyncData.Idle())
      }),
  )

  it.effect('carries a custom request key through completion', () =>
    Effect.gen(function* () {
      let keyPrefix = 'before'
      let keyCallCount = 0
      const customKey = makeKeyedQueryPolicy({
        name: 'MutableCustomKey',
        data: Schema.String,
        error: Schema.Never,
        args: { id: Schema.String },
        toKey: ({ id }) => {
          keyCallCount += 1
          return `${keyPrefix}:${id}`
        },
      })
      const handlers = customKey.makeFetchHandlers(({ id }) =>
        Effect.succeed(id),
      )
      const args = { id: 'a' }
      const started = customKey.requestLoadIfMissing(
        customKey.init().model,
        args,
      )
      const command = Option.getOrThrow(Array.head(started.commands ?? []))
      const keyCallsBeforeCompletion = keyCallCount

      args.id = 'b'
      keyPrefix = 'after'

      expect(
        Option.getOrThrow(HashMap.get(started.model.entries, 'before:a')).args,
      ).toEqual({ id: 'a' })

      const completion = yield* handlers.fetch(command.args)
      const settled = customKey.update(started.model, completion)

      if (completion._tag !== 'CompletedFetch') {
        throw new Error(`Expected CompletedFetch, got ${completion._tag}`)
      }

      expect(keyCallCount).toBe(keyCallsBeforeCompletion)
      expect(completion.args).toEqual({ id: 'a' })
      expect(completion.requestKey).toBe('before:a')
      expect(HashMap.has(settled.model.entries, 'before:a')).toBe(true)

      keyPrefix = 'before'
      expect(customKey.read(settled.model, { id: 'a' })).toEqual(
        AsyncData.Success({ data: 'a' }),
      )
    }),
  )

  it('revalidate refreshes a loaded entry', () => {
    const loaded = loadedNoteById('1')
    const refreshed = noteById.requestRevalidation(loaded, { noteId: '1' })
    expect(noteById.read(refreshed.model, { noteId: '1' })).toEqual(
      AsyncData.Refreshing({ data: { id: '1', body: 'hello' } }),
    )
    expect(refreshed.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch({
          args: { noteId: '1' },
          generation: refreshed.model.generation,
          requestKey: noteRequestKey('1'),
        }),
      ),
    ])
  })

  it('a completion changes only its matching entry', () => {
    const pendingOne = noteById.requestLoadIfMissing(noteById.init().model, {
      noteId: '1',
    })
    const bothPending = noteById.requestLoadIfMissing(pendingOne.model, {
      noteId: '2',
    })
    expect(bothPending.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch({
          args: { noteId: '2' },
          generation: bothPending.model.generation,
          requestKey: noteRequestKey('2'),
        }),
      ),
    ])

    const settled = noteById.update(
      bothPending.model,
      noteById.Message.CompletedFetch({
        args: { noteId: '1' },
        generation: pendingOne.model.generation,
        requestKey: noteRequestKey('1'),
        result: Result.succeed({ id: '1', body: 'hello' }),
      }),
    )

    expect(noteById.read(settled.model, { noteId: '1' })).toEqual(
      AsyncData.Success({ data: { id: '1', body: 'hello' } }),
    )
    expect(noteById.read(settled.model, { noteId: '2' })).toEqual(
      AsyncData.Loading(),
    )
  })

  it('update ignores a completion when its entry is not pending', () => {
    const empty = noteById.init().model
    const missingEntry = noteById.update(
      empty,
      noteById.Message.CompletedFetch({
        args: { noteId: '1' },
        generation: empty.generation,
        requestKey: noteRequestKey('1'),
        result: Result.succeed({ id: '1', body: 'hello' }),
      }),
    )
    expect(missingEntry).toEqual({ model: empty })

    const loaded = loadedNoteById('1')
    const loadedEntry = noteById.update(
      loaded,
      noteById.Message.CompletedFetch({
        args: { noteId: '1' },
        generation: loaded.generation,
        requestKey: noteRequestKey('1'),
        result: Result.succeed({ id: '1', body: 'newer' }),
      }),
    )
    expect(loadedEntry).toEqual({ model: loaded })
  })

  it('reset ignores an earlier completion after the same key restarts', () => {
    const args = { noteId: '1' }
    const firstLoad = noteById.requestLoadIfMissing(noteById.init().model, args)
    const reset = noteById.requestReset(firstLoad.model)
    const secondLoad = noteById.requestLoadIfMissing(reset.model, args)

    expect(noteById.read(reset.model, args)).toEqual(AsyncData.Idle())
    expect(secondLoad.model.generation).toBe(2)

    const staleCompletion = noteById.update(
      secondLoad.model,
      noteById.Message.CompletedFetch({
        args,
        generation: firstLoad.model.generation,
        requestKey: noteRequestKey('1'),
        result: Result.succeed({ id: '1', body: 'stale' }),
      }),
    )
    expect(staleCompletion.model).toBe(secondLoad.model)

    const currentCompletion = noteById.update(
      staleCompletion.model,
      noteById.Message.CompletedFetch({
        args,
        generation: secondLoad.model.generation,
        requestKey: noteRequestKey('1'),
        result: Result.succeed({ id: '1', body: 'hello' }),
      }),
    )
    expect(noteById.read(currentCompletion.model, args)).toEqual(
      AsyncData.Success({ data: { id: '1', body: 'hello' } }),
    )
  })
})

describe('Query Model encoding', () => {
  it('round-trips Query and KeyedQuery data through a parent Model Schema', () => {
    const Model = Schema.Struct({
      notes: notes.Model,
      noteById: noteById.Model,
    })
    type Model = typeof Model.Type
    const notesLoad = notes.requestRevalidationOrLoad(notes.init().model)
    const notesSettle = notes.update(
      notesLoad.model,
      notes.Message.CompletedFetch({
        generation: notesLoad.model.generation,
        result: Result.succeed(hello),
      }),
    )
    const firstLoad = noteById.requestLoadIfMissing(noteById.init().model, {
      noteId: '1',
    })
    const secondLoad = noteById.requestLoadIfMissing(firstLoad.model, {
      noteId: '2',
    })
    const firstSettle = noteById.update(
      secondLoad.model,
      noteById.Message.CompletedFetch({
        args: { noteId: '1' },
        generation: firstLoad.model.generation,
        requestKey: noteRequestKey('1'),
        result: Result.succeed({ id: '1', body: 'hello' }),
      }),
    )

    const encoded = Schema.encodeSync(Model)({
      notes: notesSettle.model,
      noteById: firstSettle.model,
    })
    const restored = Schema.decodeUnknownSync(Model)(encoded)

    expect(notes.read(restored.notes)).toEqual(
      AsyncData.Success({ data: hello }),
    )
    expect(noteById.read(restored.noteById, { noteId: '1' })).toEqual(
      AsyncData.Success({ data: { id: '1', body: 'hello' } }),
    )
    expect(noteById.read(restored.noteById, { noteId: '2' })).toEqual(
      AsyncData.Loading(),
    )
    expect(noteById.read(restored.noteById, { noteId: '3' })).toEqual(
      AsyncData.Idle(),
    )
  })
})

describe('KeyedQuery keys', () => {
  it('uses the full args when toKey is omitted', () => {
    const started = noteByIdAndLocale.requestLoadIfMissing(
      noteByIdAndLocale.init().model,
      {
        noteId: '1',
        locale: 'en',
      },
    )
    expect(
      noteByIdAndLocale.read(started.model, { noteId: '1', locale: 'en' }),
    ).toEqual(AsyncData.Loading())
    expect(
      noteByIdAndLocale.read(started.model, { noteId: '1', locale: 'fr' }),
    ).toEqual(AsyncData.Idle())
  })

  it('a custom toKey shares one entry across extra args', () => {
    const pending = noteByIdPreview.requestLoadIfMissing(
      noteByIdPreview.init().model,
      {
        noteId: '1',
        preview: true,
      },
    )
    const sameKey = noteByIdPreview.requestLoadIfMissing(pending.model, {
      noteId: '1',
      preview: false,
    })
    expect(sameKey.commands).toBeUndefined()
    expect(HashMap.has(pending.model.entries, '1')).toBe(true)
    expect(HashMap.size(pending.model.entries)).toBe(1)
  })

  it('omitted toKey gives each argument combination its own entry', () => {
    const previewById = makeKeyedQueryPolicy({
      name: 'NotePreviewEntries',
      data: Note,
      error: Schema.String,
      args: { noteId: Schema.String, preview: Schema.Boolean },
    })
    const first = previewById.requestLoadIfMissing(previewById.init().model, {
      noteId: '1',
      preview: true,
    })
    const second = previewById.requestLoadIfMissing(first.model, {
      noteId: '1',
      preview: false,
    })
    expect(HashMap.size(second.model.entries)).toBe(2)
  })

  it('canonicalizes nested record key order', () => {
    const notesByFilter = makeKeyedQueryPolicy({
      name: 'NotesByFilter',
      data: Schema.Array(Note),
      error: Schema.String,
      args: {
        filter: Schema.Record(Schema.String, Schema.String),
      },
    })
    const firstArgs = {
      filter: { status: 'open', owner: 'devin' },
    }
    const sameArgs = {
      filter: { owner: 'devin', status: 'open' },
    }
    const firstLoad = notesByFilter.requestLoadIfMissing(
      notesByFilter.init().model,
      firstArgs,
    )
    const cacheHit = notesByFilter.requestLoadIfMissing(
      firstLoad.model,
      sameArgs,
    )

    expect(cacheHit.model).toBe(firstLoad.model)
    expect(cacheHit.commands).toBeUndefined()
  })

  it('retains Schema.Struct field identity', () => {
    const notesByFilter = makeKeyedQueryPolicy({
      name: 'NotesByStructuredFilter',
      data: Schema.Array(Note),
      error: Schema.String,
      args: {
        filter: Schema.Struct({
          owner: Schema.String,
          status: Schema.String,
        }),
      },
    })
    const firstLoad = notesByFilter.requestLoadIfMissing(
      notesByFilter.init().model,
      {
        filter: { status: 'open', owner: 'devin' },
      },
    )
    const cacheHit = notesByFilter.requestLoadIfMissing(firstLoad.model, {
      filter: { owner: 'devin', status: 'open' },
    })

    expect(cacheHit.model).toBe(firstLoad.model)
    expect(cacheHit.commands).toBeUndefined()
  })

  it('keeps array order significant', () => {
    const notesByIds = makeKeyedQueryPolicy({
      name: 'NotesByIds',
      data: Schema.Array(Note),
      error: Schema.String,
      args: { ids: Schema.Array(Schema.String) },
    })
    const firstLoad = notesByIds.requestLoadIfMissing(notesByIds.init().model, {
      ids: ['1', '2'],
    })
    const secondLoad = notesByIds.requestLoadIfMissing(firstLoad.model, {
      ids: ['2', '1'],
    })

    expect(secondLoad.commands).toBeDefined()
    expect(HashMap.size(secondLoad.model.entries)).toBe(2)
  })
})

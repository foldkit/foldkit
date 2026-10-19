import {
  Context,
  Effect,
  Equal,
  HashMap,
  Layer,
  Option,
  Result,
  Schema,
} from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Story from '../../test/story.js'
import type * as Update from '../../update/index.js'
import * as Query from './index.js'
import type { SyncFields } from './keyedQuery.js'

const Note = Schema.Struct({ id: Schema.String, body: Schema.String })
type Note = typeof Note.Type

const notes = Query.define({
  name: 'Notes',
  data: Schema.Array(Note),
  error: Schema.String,
  execute: Effect.succeed([{ id: '1', body: 'hello' }]),
})

const noteById = Query.define({
  name: 'Note',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String },
  execute: ({ noteId }) => Effect.succeed({ id: noteId, body: 'hello' }),
})

const noteByIdAndLocale = Query.define({
  name: 'NoteLocale',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String, locale: Schema.String },
  execute: ({ noteId, locale }) =>
    Effect.succeed({ id: `${noteId}:${locale}`, body: 'hello' }),
})

const noteByIdPreview = Query.define({
  name: 'NotePreview',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String, preview: Schema.Boolean },
  toKey: ({ noteId }) => noteId,
  execute: ({ noteId }) => Effect.succeed({ id: noteId, body: 'hello' }),
})

const hello = [{ id: '1', body: 'hello' }]

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

const stringNeedingEncode = Schema.flip(stringNeedingDecode)

const loadedNoteById = (noteId: string) => {
  const args = { noteId }
  const loading = noteById.loadIfMissing(noteById.init(), args)

  return noteById.update(
    loading.model,
    noteById.Message.CompletedFetch({
      args,
      generation: loading.model.generation,
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
    expectTypeOf({ noteId: Schema.String }).toExtend<SyncFields>()
  })

  it('rejects Schema.Top data and error values', () => {
    const data: Schema.Top = Schema.Array(Note)
    const error: Schema.Top = Schema.String
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
    }).not.toExtend<SyncFields>()
  })

  it('rejects an empty args record', () => {
    expect(() =>
      Query.define({
        name: 'EmptyArgs',
        data: Note,
        error: Schema.String,
        args: {},
        execute: () => Effect.succeed({ id: '1', body: 'hello' }),
      }),
    ).toThrowError('keyed args must include at least one field')
  })
})

describe('Query loading policies', () => {
  it('revalidateOrLoad starts an Idle Query and deduplicates pending work', () => {
    const started = notes.revalidateOrLoad(notes.init())
    expect(notes.read(started.model)).toEqual(AsyncData.Loading())
    expect(started.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch({ generation: started.model.generation })),
    ])

    const ignoredLoading = notes.revalidateOrLoad(started.model)
    expect(ignoredLoading.model).toBe(started.model)
    expect(ignoredLoading.commands).toBeUndefined()

    const refreshing = notes.Model.make({
      data: AsyncData.Refreshing({ data: hello }),
      generation: 1,
    })
    const ignoredRefreshing = notes.revalidateOrLoad(refreshing)
    expect(ignoredRefreshing.model).toBe(refreshing)
    expect(ignoredRefreshing.commands).toBeUndefined()
  })

  it('revalidate refreshes settled data-bearing states', () => {
    const success = notes.Model.make({
      data: AsyncData.Success({ data: hello }),
      generation: 0,
    })
    const fromSuccess = notes.revalidate(success)
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
    const fromStale = notes.revalidate(stale)
    expect(notes.read(fromStale.model)).toEqual(
      AsyncData.Refreshing({ data: hello }),
    )
    expect(fromStale.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch({ generation: fromStale.model.generation })),
    ])

    const idle = notes.init()
    expect(notes.revalidate(idle)).toEqual({ model: idle })
    const failure = notes.Model.make({
      data: AsyncData.Failure({ error: 'boom' }),
      generation: 0,
    })
    expect(notes.revalidate(failure)).toEqual({ model: failure })
  })

  it('loadIfMissing starts only states without data', () => {
    const loaded = notes.Model.make({
      data: AsyncData.Success({ data: hello }),
      generation: 0,
    })
    const successHit = notes.loadIfMissing(loaded)
    expect(successHit.model).toBe(loaded)
    expect(successHit.commands).toBeUndefined()

    const stale = notes.Model.make({
      data: AsyncData.Stale({ error: 'boom', data: hello }),
      generation: 0,
    })
    const staleHit = notes.loadIfMissing(stale)
    expect(staleHit.model).toBe(stale)
    expect(staleHit.commands).toBeUndefined()

    const fromIdle = notes.loadIfMissing(notes.init())
    expect(notes.read(fromIdle.model)).toEqual(AsyncData.Loading())
    expect(fromIdle.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch({ generation: fromIdle.model.generation })),
    ])

    const fromFailure = notes.loadIfMissing(
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
    const idle = notes.init()
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
    const loading = notes.revalidateOrLoad(notes.init())
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

    const refreshing = notes.revalidate(success.model)
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
    const loading = notes.loadIfMissing(notes.init())
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
    const firstLoad = notes.loadIfMissing(notes.init())
    const reset = notes.reset(firstLoad.model)
    const secondLoad = notes.loadIfMissing(reset.model)

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
    const missing = noteById.loadIfMissing(noteById.init(), {
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
        }),
      ),
    ])

    const loaded = loadedNoteById('1')
    const hit = noteById.loadIfMissing(loaded, { noteId: '1' })
    expect(hit.model).toBe(loaded)
    expect(hit.commands).toBeUndefined()
  })

  it('loadIfMissing supports data-first and data-last calls', () => {
    const model = noteById.init()
    const args = { noteId: '1' }
    const dataFirst = noteById.loadIfMissing(model, args)
    const dataLast = noteById.loadIfMissing(args)(model)
    expect(Equal.equals(dataFirst.model, dataLast.model)).toBe(true)
    expect(dataFirst.commands?.map(commandShape)).toEqual(
      dataLast.commands?.map(commandShape),
    )
  })

  it('revalidate refreshes a loaded entry', () => {
    const loaded = loadedNoteById('1')
    const refreshed = noteById.revalidate(loaded, { noteId: '1' })
    expect(noteById.read(refreshed.model, { noteId: '1' })).toEqual(
      AsyncData.Refreshing({ data: { id: '1', body: 'hello' } }),
    )
    expect(refreshed.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch({
          args: { noteId: '1' },
          generation: refreshed.model.generation,
        }),
      ),
    ])
  })

  it('a completion changes only its matching entry', () => {
    const pendingOne = noteById.loadIfMissing(noteById.init(), {
      noteId: '1',
    })
    const bothPending = noteById.loadIfMissing(pendingOne.model, {
      noteId: '2',
    })
    expect(bothPending.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch({
          args: { noteId: '2' },
          generation: bothPending.model.generation,
        }),
      ),
    ])

    const settled = noteById.update(
      bothPending.model,
      noteById.Message.CompletedFetch({
        args: { noteId: '1' },
        generation: pendingOne.model.generation,
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
    const empty = noteById.init()
    const missingEntry = noteById.update(
      empty,
      noteById.Message.CompletedFetch({
        args: { noteId: '1' },
        generation: empty.generation,
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
        result: Result.succeed({ id: '1', body: 'newer' }),
      }),
    )
    expect(loadedEntry).toEqual({ model: loaded })
  })

  it('reset ignores an earlier completion after the same key restarts', () => {
    const args = { noteId: '1' }
    const firstLoad = noteById.loadIfMissing(noteById.init(), args)
    const reset = noteById.reset(firstLoad.model)
    const secondLoad = noteById.loadIfMissing(reset.model, args)

    expect(noteById.read(reset.model, args)).toEqual(AsyncData.Idle())
    expect(secondLoad.model.generation).toBe(2)

    const staleCompletion = noteById.update(
      secondLoad.model,
      noteById.Message.CompletedFetch({
        args,
        generation: firstLoad.model.generation,
        result: Result.succeed({ id: '1', body: 'stale' }),
      }),
    )
    expect(staleCompletion.model).toBe(secondLoad.model)

    const currentCompletion = noteById.update(
      staleCompletion.model,
      noteById.Message.CompletedFetch({
        args,
        generation: secondLoad.model.generation,
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
    const notesLoad = notes.revalidateOrLoad(notes.init())
    const notesSettle = notes.update(
      notesLoad.model,
      notes.Message.CompletedFetch({
        generation: notesLoad.model.generation,
        result: Result.succeed(hello),
      }),
    )
    const firstLoad = noteById.loadIfMissing(noteById.init(), { noteId: '1' })
    const secondLoad = noteById.loadIfMissing(firstLoad.model, { noteId: '2' })
    const firstSettle = noteById.update(
      secondLoad.model,
      noteById.Message.CompletedFetch({
        args: { noteId: '1' },
        generation: firstLoad.model.generation,
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

describe('Query.lift', () => {
  const Model = Schema.Struct({ notes: notes.Model })
  type Model = typeof Model.Type

  const Message = defineMessageUnion({
    GotNotesMessage: { message: notes.Message },
    ClickedLoad: {},
  })
  type Message = typeof Message.Type

  const notesChild = notes.lift<Model, Message>({
    parentField: 'notes',
    toParentMessage: message => Message.GotNotesMessage({ message }),
  })

  const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
      GotNotesMessage: ({ message }) => notesChild.fold(model, message),
      ClickedLoad: () => notesChild.revalidateOrLoad(model),
    })

  it('routes loading and completion through the parent Model', () => {
    Story.story(
      update,
      Story.given({ notes: notes.init() }),
      Story.message(Message.ClickedLoad()),
      Story.Command.expectHas(notes.Fetch({ generation: 1 })),
      Story.Command.resolve(
        notes.Fetch({ generation: 1 }),
        notes.Message.CompletedFetch({
          generation: 1,
          result: Result.succeed(hello),
        }),
      ),
      Story.model(model => {
        expect(notes.read(model.notes)).toEqual(
          AsyncData.Success({ data: hello }),
        )
      }),
    )
  })

  it('fold handles the child completion Message', () => {
    const folded = notesChild.fold(
      {
        notes: notes.Model.make({
          data: AsyncData.Loading(),
          generation: 1,
        }),
      },
      notes.Message.CompletedFetch({
        generation: 1,
        result: Result.succeed(hello),
      }),
    )
    expect(notes.read(folded.model.notes)).toEqual(
      AsyncData.Success({ data: hello }),
    )
  })
})

describe('KeyedQuery.lift', () => {
  const Model = Schema.Struct({ notes: noteById.Model })
  type Model = typeof Model.Type

  const Message = defineMessageUnion({
    GotNoteMessage: { message: noteById.Message },
  })
  type Message = typeof Message.Type

  const notesChild = noteById.lift<Model, Message>({
    parentField: 'notes',
    toParentMessage: message => Message.GotNoteMessage({ message }),
  })

  it('loadIfMissing starts a missing parent entry', () => {
    const started = notesChild.loadIfMissing(
      { notes: noteById.init() },
      { noteId: '1' },
    )
    expect(noteById.read(started.model.notes, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(started.commands?.map(commandShape)).toEqual([
      commandShape(
        noteById.Fetch({
          args: { noteId: '1' },
          generation: started.model.notes.generation,
        }),
      ),
    ])
  })

  it('fold handles the child completion Message', () => {
    const pending = notesChild.loadIfMissing(
      { notes: noteById.init() },
      { noteId: '1' },
    )
    const folded = notesChild.fold(
      pending.model,
      noteById.Message.CompletedFetch({
        args: { noteId: '1' },
        generation: pending.model.notes.generation,
        result: Result.succeed({ id: '1', body: 'hello' }),
      }),
    )
    expect(noteById.read(folded.model.notes, { noteId: '1' })).toEqual(
      AsyncData.Success({ data: { id: '1', body: 'hello' } }),
    )
  })
})

describe('Query.lift parent field and lens forms', () => {
  const Model = Schema.Struct({ notes: notes.Model })
  type Model = typeof Model.Type
  const Message = defineMessageUnion({
    GotNotesMessage: { message: notes.Message },
  })
  type Message = typeof Message.Type

  it('the parentField shorthand behaves like a full ChildFold lens', () => {
    const notesChildFromField = notes.lift<Model, Message>({
      parentField: 'notes',
      toParentMessage: message => Message.GotNotesMessage({ message }),
    })
    const notesChildFromLens = notes.lift({
      read: (model: Model) => Option.some(model.notes),
      write: (model, nextNotes) =>
        modifyFields(model, { notes: () => nextNotes }),
      toParentMessage: message => Message.GotNotesMessage({ message }),
    })
    const parent = { notes: notes.init() }
    const fromParentField = notesChildFromField.revalidateOrLoad(parent)
    const fromLens = notesChildFromLens.revalidateOrLoad(parent)
    expect(fromParentField.model).toEqual(fromLens.model)
    expect(fromParentField.commands?.map(commandShape)).toEqual(
      fromLens.commands?.map(commandShape),
    )
  })

  it('fold is data-first and data-last on the child Message', () => {
    const notesChild = notes.lift<Model, Message>({
      parentField: 'notes',
      toParentMessage: message => Message.GotNotesMessage({ message }),
    })
    const parent = {
      notes: notes.Model.make({
        data: AsyncData.Loading(),
        generation: 1,
      }),
    }
    const message = notes.Message.CompletedFetch({
      generation: 1,
      result: Result.succeed(hello),
    })
    const dataFirst = notesChild.fold(parent, message)
    const dataLast = notesChild.fold(message)(parent)
    expect(notes.read(dataFirst.model.notes)).toEqual(
      AsyncData.Success({ data: hello }),
    )
    expect(Equal.equals(dataFirst.model.notes, dataLast.model.notes)).toBe(true)
  })
})

describe('KeyedQuery keys', () => {
  it('uses the full args when toKey is omitted', () => {
    const started = noteByIdAndLocale.loadIfMissing(noteByIdAndLocale.init(), {
      noteId: '1',
      locale: 'en',
    })
    expect(
      noteByIdAndLocale.read(started.model, { noteId: '1', locale: 'en' }),
    ).toEqual(AsyncData.Loading())
    expect(
      noteByIdAndLocale.read(started.model, { noteId: '1', locale: 'fr' }),
    ).toEqual(AsyncData.Idle())
  })

  it('a custom toKey shares one entry across extra args', () => {
    const pending = noteByIdPreview.loadIfMissing(noteByIdPreview.init(), {
      noteId: '1',
      preview: true,
    })
    const sameKey = noteByIdPreview.loadIfMissing(pending.model, {
      noteId: '1',
      preview: false,
    })
    expect(sameKey.commands).toBeUndefined()
    expect(HashMap.has(pending.model.entries, '1')).toBe(true)
    expect(HashMap.size(pending.model.entries)).toBe(1)
  })

  it('omitted toKey gives each argument combination its own entry', () => {
    const previewById = Query.define({
      name: 'NotePreviewEntries',
      data: Note,
      error: Schema.String,
      args: { noteId: Schema.String, preview: Schema.Boolean },
      execute: ({ noteId }) => Effect.succeed({ id: noteId, body: 'hello' }),
    })
    const first = previewById.loadIfMissing(previewById.init(), {
      noteId: '1',
      preview: true,
    })
    const second = previewById.loadIfMissing(first.model, {
      noteId: '1',
      preview: false,
    })
    expect(HashMap.size(second.model.entries)).toBe(2)
  })

  it('canonicalizes nested record key order', () => {
    const notesByFilter = Query.define({
      name: 'NotesByFilter',
      data: Schema.Array(Note),
      error: Schema.String,
      args: {
        filter: Schema.Record(Schema.String, Schema.String),
      },
      execute: () => Effect.succeed(hello),
    })
    const firstArgs = {
      filter: { status: 'open', owner: 'devin' },
    }
    const sameArgs = {
      filter: { owner: 'devin', status: 'open' },
    }
    const firstLoad = notesByFilter.loadIfMissing(
      notesByFilter.init(),
      firstArgs,
    )
    const cacheHit = notesByFilter.loadIfMissing(firstLoad.model, sameArgs)

    expect(cacheHit.model).toBe(firstLoad.model)
    expect(cacheHit.commands).toBeUndefined()
  })

  it('retains Schema.Struct field identity', () => {
    const notesByFilter = Query.define({
      name: 'NotesByStructuredFilter',
      data: Schema.Array(Note),
      error: Schema.String,
      args: {
        filter: Schema.Struct({
          owner: Schema.String,
          status: Schema.String,
        }),
      },
      execute: () => Effect.succeed(hello),
    })
    const firstLoad = notesByFilter.loadIfMissing(notesByFilter.init(), {
      filter: { status: 'open', owner: 'devin' },
    })
    const cacheHit = notesByFilter.loadIfMissing(firstLoad.model, {
      filter: { owner: 'devin', status: 'open' },
    })

    expect(cacheHit.model).toBe(firstLoad.model)
    expect(cacheHit.commands).toBeUndefined()
  })

  it('keeps array order significant', () => {
    const notesByIds = Query.define({
      name: 'NotesByIds',
      data: Schema.Array(Note),
      error: Schema.String,
      args: { ids: Schema.Array(Schema.String) },
      execute: () => Effect.succeed(hello),
    })
    const firstLoad = notesByIds.loadIfMissing(notesByIds.init(), {
      ids: ['1', '2'],
    })
    const secondLoad = notesByIds.loadIfMissing(firstLoad.model, {
      ids: ['2', '1'],
    })

    expect(secondLoad.commands).toBeDefined()
    expect(HashMap.size(secondLoad.model.entries)).toBe(2)
  })
})

describe('Query.run', () => {
  it.effect('returns Success when execute succeeds', () =>
    Effect.gen(function* () {
      const data = yield* notes.run
      expect(data).toEqual(AsyncData.Success({ data: hello }))
    }),
  )

  it.effect('returns Failure when execute fails', () =>
    Effect.gen(function* () {
      const failing = Query.define({
        name: 'FailingNotes',
        data: Schema.Array(Note),
        error: Schema.String,
        execute: Effect.fail('boom'),
      })
      const data = yield* failing.run
      expect(data).toEqual(AsyncData.Failure({ error: 'boom' }))
    }),
  )

  it.effect('runs a keyed fetch for the given arguments', () =>
    Effect.gen(function* () {
      const data = yield* noteById.run({ noteId: '1' })
      expect(data).toEqual(
        AsyncData.Success({ data: { id: '1', body: 'hello' } }),
      )
    }),
  )
})

describe('Query execute requirements', () => {
  class NoteService extends Context.Service<
    NoteService,
    { readonly body: string }
  >()('NoteService') {}

  const served = Query.define({
    name: 'ServedNotes',
    data: Schema.Array(Note),
    error: Schema.String,
    execute: Effect.gen(function* () {
      const service = yield* NoteService
      return [{ id: '1', body: service.body }]
    }),
  })
  type ServedModel = (typeof served.Model)['Type']
  type ServedMessage = (typeof served.Message)['Type']

  it('run requires the execute services', () => {
    expectTypeOf(served.run).toEqualTypeOf<
      Effect.Effect<
        AsyncData.AsyncData<ReadonlyArray<Note>, string>,
        never,
        NoteService
      >
    >()
  })

  it('only fetch-starting operations require the execute services', () => {
    expectTypeOf(served.update).returns.toEqualTypeOf<
      Update.Return<ServedModel, ServedMessage>
    >()
    expectTypeOf(served.reset).returns.toEqualTypeOf<
      Update.Return<ServedModel, ServedMessage>
    >()
    expectTypeOf(served.loadIfMissing).returns.toEqualTypeOf<
      Update.Return<ServedModel, ServedMessage, NoteService>
    >()

    const ParentModel = Schema.Struct({ notes: served.Model })
    type ParentModel = typeof ParentModel.Type
    const ParentMessage = defineMessageUnion({
      GotNotesMessage: { message: served.Message },
    })
    type ParentMessage = typeof ParentMessage.Type
    const servedNotes = served.lift<ParentModel, ParentMessage>({
      parentField: 'notes',
      toParentMessage: message => ParentMessage.GotNotesMessage({ message }),
    })

    expectTypeOf(servedNotes.fold).toEqualTypeOf<
      Update.Fold<ParentModel, ParentMessage, ServedMessage>
    >()
    expectTypeOf(servedNotes.reset).toEqualTypeOf<
      Update.Step<ParentModel, ParentMessage>
    >()
    expectTypeOf(servedNotes.loadIfMissing).toEqualTypeOf<
      Update.Step<ParentModel, ParentMessage, NoteService>
    >()
  })

  it.effect('run settles after the execute services are provided', () =>
    Effect.gen(function* () {
      const data = yield* Effect.provide(
        served.run,
        Layer.succeed(NoteService, { body: 'from-layer' }),
      )
      expect(data).toEqual(
        AsyncData.Success({ data: [{ id: '1', body: 'from-layer' }] }),
      )
    }),
  )
})

describe('Query types', () => {
  it('define returns the precise Query type', () => {
    expectTypeOf(notes).toExtend<
      Query.Query<
        'Notes',
        ReadonlyArray<Note>,
        ReadonlyArray<typeof Note.Encoded>,
        string,
        string
      >
    >()
    expectTypeOf(noteById).toExtend<
      Query.KeyedQuery<
        'Note',
        Note,
        typeof Note.Encoded,
        string,
        string,
        { readonly noteId: typeof Schema.String }
      >
    >()
    expectTypeOf(noteByIdPreview.Fetch).parameter(0).toEqualTypeOf<{
      readonly args: {
        readonly noteId: string
        readonly preview: boolean
      }
      readonly generation: number
    }>()
    expectTypeOf(noteByIdAndLocale.Fetch).parameter(0).toEqualTypeOf<{
      readonly args: {
        readonly noteId: string
        readonly locale: string
      }
      readonly generation: number
    }>()
    expectTypeOf(noteById.loadIfMissing).toEqualTypeOf<
      Update.Fold<
        (typeof noteById.Model)['Type'],
        (typeof noteById.Message)['Type'],
        { readonly noteId: string }
      >
    >()
    expectTypeOf(noteById.run).returns.toEqualTypeOf<
      Effect.Effect<AsyncData.AsyncData<Note, string>>
    >()
  })

  it('lift returns the parent operations with precise types', () => {
    const ParentModel = Schema.Struct({ notes: notes.Model })
    type ParentModel = typeof ParentModel.Type
    const ParentMessage = defineMessageUnion({
      GotNotesMessage: { message: notes.Message },
    })
    type ParentMessage = typeof ParentMessage.Type

    const notesChild = notes.lift<ParentModel, ParentMessage>({
      parentField: 'notes',
      toParentMessage: message => ParentMessage.GotNotesMessage({ message }),
    })

    expectTypeOf(notesChild.fold).toExtend<
      Update.Fold<ParentModel, ParentMessage, (typeof notes.Message)['Type']>
    >()
    expectTypeOf(
      notesChild.fold(
        { notes: notes.init() },
        notes.Message.CompletedFetch({
          generation: 0,
          result: Result.succeed(hello),
        }),
      ),
    ).toExtend<Update.Return<ParentModel, ParentMessage>>()
    expectTypeOf(
      notesChild.fold(
        notes.Message.CompletedFetch({
          generation: 0,
          result: Result.succeed(hello),
        }),
      )({
        notes: notes.init(),
      }),
    ).toExtend<Update.Return<ParentModel, ParentMessage>>()

    const KeyedParent = Schema.Struct({ notes: noteById.Model })
    type KeyedParent = typeof KeyedParent.Type
    const KeyedParentMessage = defineMessageUnion({
      GotNoteMessage: { message: noteById.Message },
    })
    type KeyedParentMessage = typeof KeyedParentMessage.Type

    const noteByIdChild = noteById.lift({
      read: (model: KeyedParent) => Option.some(model.notes),
      write: (model, nextNotes) =>
        modifyFields(model, { notes: () => nextNotes }),
      toParentMessage: message =>
        KeyedParentMessage.GotNoteMessage({ message }),
    })

    expectTypeOf(noteByIdChild.loadIfMissing).toExtend<
      Update.Fold<KeyedParent, KeyedParentMessage, { readonly noteId: string }>
    >()
  })

  it('fold accepts the child Message', () => {
    const ParentModel = Schema.Struct({ notes: notes.Model })
    type ParentModel = typeof ParentModel.Type
    const ParentMessage = defineMessageUnion({
      GotNotesMessage: { message: notes.Message },
    })
    type ParentMessage = typeof ParentMessage.Type
    const notesChild = notes.lift<ParentModel, ParentMessage>({
      parentField: 'notes',
      toParentMessage: message => ParentMessage.GotNotesMessage({ message }),
    })
    type ChildMessageFold = (
      model: ParentModel,
      message: (typeof notes.Message)['Type'],
    ) => Update.Return<ParentModel, unknown>
    expectTypeOf(notesChild.fold).toExtend<ChildMessageFold>()
  })

  it('parentField rejects a field that does not contain the Query Model', () => {
    type Parent = { notes: (typeof notes.Model)['Type']; label: string }
    type NotesField = {
      [K in keyof Parent]: Parent[K] extends (typeof notes.Model)['Type']
        ? K
        : never
    }[keyof Parent]
    expectTypeOf<'notes'>().toExtend<NotesField>()
    expectTypeOf<'label'>().not.toExtend<NotesField>()
  })

  it('toParentMessage must accept the query Message', () => {
    const Message = defineMessageUnion({
      GotNotesMessage: { message: notes.Message },
    })
    type Message = typeof Message.Type
    type ToParent = (message: (typeof notes.Message)['Type']) => Message
    const toParent = (message: (typeof notes.Message)['Type']): Message =>
      Message.GotNotesMessage({ message })
    const wrong = (_message: string) => 'nope'
    expectTypeOf(toParent).toExtend<ToParent>()
    expectTypeOf(wrong).not.toExtend<ToParent>()
  })
})

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

import * as AsyncData from '../asyncData/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Story from '../test/story.js'
import type * as Update from '../update/index.js'
import * as Query from './index.js'
import type { SyncFields } from './keyedQuery.js'

const Note = Schema.Struct({ id: Schema.String, body: Schema.String })
type Note = typeof Note.Type

const slotKey = Schema.Unknown.pipe(
  Schema.toCodecJson,
  Schema.fromJsonString,
  Schema.encodeUnknownSync,
)

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

const noteSlot = (noteId: string, data: AsyncData.AsyncData<Note, string>) => ({
  args: { noteId },
  data,
})

const commandShape = (command: {
  readonly name: string
  readonly args?: unknown
  readonly key?: string
}) => ({
  name: command.name,
  args: command.args,
  key: command.key,
})

describe('Query.define schema inputs', function () {
  it('accepts codecs with no encoding or decoding services', function () {
    expectTypeOf(Schema.Array(Note)).toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
    expectTypeOf(Schema.String).toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
    expectTypeOf({ noteId: Schema.String }).toExtend<SyncFields>()
  })

  it('rejects Schema.Top data and error', function () {
    const data: Schema.Top = Schema.Array(Note)
    const error: Schema.Top = Schema.String
    expectTypeOf(data).not.toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
    expectTypeOf(error).not.toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
  })

  it('rejects a data codec that requires encoding services', function () {
    expectTypeOf(stringNeedingEncode).not.toExtend<
      Schema.Codec<unknown, unknown, never, never>
    >()
  })

  it('rejects an args codec that requires encoding services', function () {
    expectTypeOf({
      noteId: stringNeedingEncode,
    }).not.toExtend<SyncFields>()
  })
})

describe('Query.define policy routing', () => {
  it('revalidateOrLoad starts a cold Query and leaves Loading and Refreshing alone', () => {
    const started = notes.informRevalidateOrLoad(notes.init())
    expect(started.model).toEqual(AsyncData.Loading())
    expect(started.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch()),
    ])

    const ignoredLoading = notes.informRevalidateOrLoad(started.model)
    expect(ignoredLoading.model).toBe(started.model)
    expect(ignoredLoading.commands).toBeUndefined()

    const refreshing = AsyncData.Refreshing({ data: hello })
    const ignoredRefreshing = notes.informRevalidateOrLoad(refreshing)
    expect(ignoredRefreshing.model).toBe(refreshing)
    expect(ignoredRefreshing.commands).toBeUndefined()
  })

  it('revalidate refreshes Success and Stale and is a no-op on Idle and Failure', () => {
    const success = AsyncData.Success({ data: hello })
    const fromSuccess = notes.informRevalidate(success)
    expect(fromSuccess.model).toEqual(AsyncData.Refreshing({ data: hello }))
    expect(fromSuccess.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch()),
    ])

    const stale = AsyncData.Stale({ error: 'boom', data: hello })
    const fromStale = notes.informRevalidate(stale)
    expect(fromStale.model).toEqual(AsyncData.Refreshing({ data: hello }))
    expect(fromStale.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch()),
    ])

    const idle = notes.init()
    expect(notes.informRevalidate(idle)).toEqual({ model: idle })
    const failure = AsyncData.Failure({ error: 'boom' })
    expect(notes.informRevalidate(failure)).toEqual({ model: failure })
  })

  it('loadIfMissing loads Idle and Failure and does not refetch Success or Stale', () => {
    const loaded = AsyncData.Success({ data: hello })
    const successHit = notes.informLoadIfMissing(loaded)
    expect(successHit.model).toBe(loaded)
    expect(successHit.commands).toBeUndefined()

    const stale = AsyncData.Stale({ error: 'boom', data: hello })
    const staleHit = notes.informLoadIfMissing(stale)
    expect(staleHit.model).toBe(stale)
    expect(staleHit.commands).toBeUndefined()

    const fromIdle = notes.informLoadIfMissing(notes.init())
    expect(fromIdle.model).toEqual(AsyncData.Loading())
    expect(fromIdle.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch()),
    ])

    const fromFailure = notes.informLoadIfMissing(
      AsyncData.Failure({ error: 'boom' }),
    )
    expect(fromFailure.model).toEqual(AsyncData.Loading())
    expect(fromFailure.commands?.map(commandShape)).toEqual([
      commandShape(notes.Fetch()),
    ])
  })

  it('SettledFetch on Idle leaves the Query Idle', () => {
    const idle = notes.init()
    const settled = notes.update(
      idle,
      notes.Message.SettledFetch({ result: Result.succeed(hello) }),
    )
    expect(settled).toEqual({ model: idle })
  })

  it('settle keeps last-good data when a refresh fails', () => {
    const success = notes.update(
      AsyncData.Loading(),
      notes.Message.SettledFetch({ result: Result.succeed(hello) }),
    )
    expect(success.model).toEqual(AsyncData.Success({ data: hello }))

    const refreshing = notes.informRevalidate(success.model)
    expect(refreshing.model).toEqual(AsyncData.Refreshing({ data: hello }))

    const stale = notes.update(
      refreshing.model,
      notes.Message.SettledFetch({ result: Result.fail('boom') }),
    )
    expect(stale.model).toEqual(AsyncData.Stale({ error: 'boom', data: hello }))
  })

  it('a failed initial load becomes Failure', () => {
    const failed = notes.update(
      AsyncData.Loading(),
      notes.Message.SettledFetch({ result: Result.fail('boom') }),
    )
    expect(failed.model).toEqual(AsyncData.Failure({ error: 'boom' }))
  })
})

describe('Query.define KeyedQuery isolation', () => {
  it('loadIfMissing writes Loading for a missing key and is a no-op on a hit', () => {
    const missing = noteById.informLoadIfMissing(noteById.init(), {
      noteId: '1',
    })
    expect(noteById.read(missing.model, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(missing.commands?.map(commandShape)).toEqual([
      commandShape(noteById.Fetch({ noteId: '1' })),
    ])

    const loaded = HashMap.set(
      noteById.init(),
      slotKey({ noteId: '1' }),
      noteSlot('1', AsyncData.Success({ data: { id: '1', body: 'hello' } })),
    )
    const hit = noteById.informLoadIfMissing(loaded, { noteId: '1' })
    expect(hit.model).toBe(loaded)
    expect(hit.commands).toBeUndefined()
  })

  it('informLoadIfMissing runs data-first and data-last', () => {
    const model = noteById.init()
    const args = { noteId: '1' }
    const dataFirst = noteById.informLoadIfMissing(model, args)
    const dataLast = noteById.informLoadIfMissing(args)(model)
    expect(Equal.equals(dataFirst.model, dataLast.model)).toBe(true)
    expect(dataFirst.commands?.map(commandShape)).toEqual(
      dataLast.commands?.map(commandShape),
    )
  })

  it('revalidate refreshes a Success key', () => {
    const loaded = HashMap.set(
      noteById.init(),
      slotKey({ noteId: '1' }),
      noteSlot('1', AsyncData.Success({ data: { id: '1', body: 'hello' } })),
    )
    const refreshed = noteById.informRevalidate(loaded, { noteId: '1' })
    expect(noteById.read(refreshed.model, { noteId: '1' })).toEqual(
      AsyncData.Refreshing({ data: { id: '1', body: 'hello' } }),
    )
    expect(refreshed.commands?.map(commandShape)).toEqual([
      commandShape(noteById.Fetch({ noteId: '1' })),
    ])
  })

  it('settle writes only the matching key and leaves a sibling Loading', () => {
    const pendingOne = noteById.informLoadIfMissing(noteById.init(), {
      noteId: '1',
    })
    const bothPending = noteById.informLoadIfMissing(pendingOne.model, {
      noteId: '2',
    })
    expect(bothPending.commands?.map(commandShape)).toEqual([
      commandShape(noteById.Fetch({ noteId: '2' })),
    ])

    const settled = noteById.update(
      bothPending.model,
      noteById.Message.SettledFetch({
        args: { noteId: '1' },
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

  it('SettledFetch for a missing key leaves the map unchanged', () => {
    const model = noteById.init()
    const settled = noteById.update(
      model,
      noteById.Message.SettledFetch({
        args: { noteId: '1' },
        result: Result.succeed({ id: '1', body: 'hello' }),
      }),
    )
    expect(settled).toEqual({ model })
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
    field: 'notes',
    toParentMessage: function (message) {
      return Message.GotNotesMessage({ message })
    },
  })

  const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
      GotNotesMessage: function ({ message }) {
        return notesChild.fold(model, message)
      },
      ClickedLoad: function () {
        return notesChild.revalidateOrLoad(model)
      },
    })

  it('settles an init load through the parent Got* wrapper', function () {
    Story.story(
      update,
      Story.given({ notes: notes.init() }),
      Story.message(Message.ClickedLoad()),
      Story.Command.expectHas(notes.Fetch()),
      Story.Command.resolve(
        notes.Fetch(),
        notes.Message.SettledFetch({ result: Result.succeed(hello) }),
      ),
      Story.model(function (model) {
        expect(model.notes).toEqual(AsyncData.Success({ data: hello }))
      }),
    )
  })

  it('fold applies SettledFetch through the child Message', () => {
    const folded = notesChild.fold(
      { notes: AsyncData.Loading() },
      notes.Message.SettledFetch({ result: Result.succeed(hello) }),
    )
    expect(folded.model.notes).toEqual(AsyncData.Success({ data: hello }))
  })
})

describe('Query.lift KeyedQuery', () => {
  const Model = Schema.Struct({ notes: noteById.Model })
  type Model = typeof Model.Type

  const Message = defineMessageUnion({
    GotNoteMessage: { message: noteById.Message },
  })
  type Message = typeof Message.Type

  const notesChild = noteById.lift<Model, Message>({
    field: 'notes',
    toParentMessage: function (message) {
      return Message.GotNoteMessage({ message })
    },
  })

  it('loadIfMissing through lift writes Loading for a miss and FetchNote', () => {
    const started = notesChild.loadIfMissing(
      { notes: noteById.init() },
      { noteId: '1' },
    )
    expect(noteById.read(started.model.notes, { noteId: '1' })).toEqual(
      AsyncData.Loading(),
    )
    expect(started.commands?.map(commandShape)).toEqual([
      commandShape(noteById.Fetch({ noteId: '1' })),
    ])
  })

  it('fold applies SettledFetch through the parent wrapper', () => {
    const pending = notesChild.loadIfMissing(
      { notes: noteById.init() },
      { noteId: '1' },
    )
    const folded = notesChild.fold(
      pending.model,
      noteById.Message.SettledFetch({
        args: { noteId: '1' },
        result: Result.succeed({ id: '1', body: 'hello' }),
      }),
    )
    expect(noteById.read(folded.model.notes, { noteId: '1' })).toEqual(
      AsyncData.Success({ data: { id: '1', body: 'hello' } }),
    )
  })
})

describe('Query.lift parent-key vs lens', () => {
  const Model = Schema.Struct({ notes: notes.Model })
  type Model = typeof Model.Type
  const Message = defineMessageUnion({
    GotNotesMessage: { message: notes.Message },
  })
  type Message = typeof Message.Type

  it('parent-key config writes the same Loading and Fetch as a ChildFold lens', () => {
    const notesChildFromField = notes.lift<Model, Message>({
      field: 'notes',
      toParentMessage: function (message) {
        return Message.GotNotesMessage({ message })
      },
    })
    const notesChildFromLens = notes.lift({
      read: function (model: Model) {
        return Option.some(model.notes)
      },
      write: function (model, nextNotes) {
        return modifyFields(model, { notes: () => nextNotes })
      },
      toParentMessage: function (message) {
        return Message.GotNotesMessage({ message })
      },
    })
    const parent = { notes: notes.init() }
    const fromParentKey = notesChildFromField.revalidateOrLoad(parent)
    const fromLens = notesChildFromLens.revalidateOrLoad(parent)
    expect(fromParentKey.model).toEqual(fromLens.model)
    expect(fromParentKey.commands?.map(commandShape)).toEqual(
      fromLens.commands?.map(commandShape),
    )
  })

  it('fold is data-first and data-last on the child Message', () => {
    const notesChild = notes.lift<Model, Message>({
      field: 'notes',
      toParentMessage: function (message) {
        return Message.GotNotesMessage({ message })
      },
    })
    const parent = { notes: AsyncData.Loading() }
    const message = notes.Message.SettledFetch({
      result: Result.succeed(hello),
    })
    const dataFirst = notesChild.fold(parent, message)
    const dataLast = notesChild.fold(message)(parent)
    expect(dataFirst.model.notes).toEqual(AsyncData.Success({ data: hello }))
    expect(Equal.equals(dataFirst.model.notes, dataLast.model.notes)).toBe(true)
  })
})

describe('Query.define KeyedQuery toKey', () => {
  it('JSON-encodes the full args when toKey is omitted', () => {
    const started = noteByIdAndLocale.informLoadIfMissing(
      noteByIdAndLocale.init(),
      {
        noteId: '1',
        locale: 'en',
      },
    )
    expect(
      noteByIdAndLocale.read(started.model, { noteId: '1', locale: 'en' }),
    ).toEqual(AsyncData.Loading())
    expect(
      HashMap.has(started.model, slotKey({ noteId: '1', locale: 'en' })),
    ).toBe(true)
    expect(HashMap.has(started.model, slotKey({ noteId: '1' }))).toBe(false)
    expect(HashMap.has(started.model, '1:en')).toBe(false)
  })

  it('a custom toKey shares one slot across extra args', () => {
    const pending = noteByIdPreview.informLoadIfMissing(
      noteByIdPreview.init(),
      {
        noteId: '1',
        preview: true,
      },
    )
    const sameKey = noteByIdPreview.informLoadIfMissing(pending.model, {
      noteId: '1',
      preview: false,
    })
    expect(sameKey.commands).toBeUndefined()
    expect(HashMap.has(pending.model, '1')).toBe(true)
    expect(HashMap.size(pending.model)).toBe(1)
  })

  it('omitted toKey gives each extra-arg combo its own slot', () => {
    const previewById = Query.define({
      name: 'NotePreviewSlots',
      data: Note,
      error: Schema.String,
      args: { noteId: Schema.String, preview: Schema.Boolean },
      execute: ({ noteId }) => Effect.succeed({ id: noteId, body: 'hello' }),
    })
    const first = previewById.informLoadIfMissing(previewById.init(), {
      noteId: '1',
      preview: true,
    })
    const second = previewById.informLoadIfMissing(first.model, {
      noteId: '1',
      preview: false,
    })
    expect(HashMap.size(second.model)).toBe(2)
  })
})

describe('Query.run', () => {
  it.effect('Query run settles execute into Success', () =>
    Effect.gen(function* () {
      const data = yield* notes.run
      expect(data).toEqual(AsyncData.Success({ data: hello }))
    }),
  )

  it.effect('Query run settles a failed execute into Failure', () =>
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

  it.effect(
    'KeyedQuery run(args) returns settled AsyncData for that slot',
    () =>
      Effect.gen(function* () {
        const data = yield* noteById.run({ noteId: '1' })
        expect(data).toEqual(
          AsyncData.Success({ data: { id: '1', body: 'hello' } }),
        )
      }),
  )
})

describe('Query.define execute services', () => {
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

  it('run requires the execute services', () => {
    expectTypeOf(served.run).toEqualTypeOf<
      Effect.Effect<
        AsyncData.AsyncData<ReadonlyArray<Note>, string>,
        never,
        NoteService
      >
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

describe('Query.Query and Query.KeyedQuery types', () => {
  it('Query.Any and KeyedQuery.Any accept define results', () => {
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
    const takesQuery = function (_query: Query.Query.Any) {
      return undefined
    }
    takesQuery(notes)
    const takesKeyedQuery = function (_query: Query.KeyedQuery.Any) {
      return undefined
    }
    takesKeyedQuery(noteById)
    expectTypeOf(noteByIdPreview.Fetch).parameter(0).toEqualTypeOf<{
      readonly noteId: string
      readonly preview: boolean
    }>()
    expectTypeOf(noteByIdAndLocale.Fetch).parameter(0).toEqualTypeOf<{
      readonly noteId: string
      readonly locale: string
    }>()
    expectTypeOf(noteById.informLoadIfMissing).toEqualTypeOf<
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

  it('lift returns Query.Lifted.Query / Query.Lifted.KeyedQuery', () => {
    const ParentModel = Schema.Struct({ notes: notes.Model })
    type ParentModel = typeof ParentModel.Type
    const ParentMessage = defineMessageUnion({
      GotNotesMessage: { message: notes.Message },
    })
    type ParentMessage = typeof ParentMessage.Type

    const notesChild = notes.lift<ParentModel, ParentMessage>({
      field: 'notes',
      toParentMessage: function (message) {
        return ParentMessage.GotNotesMessage({ message })
      },
    })

    expectTypeOf(notesChild).toMatchTypeOf<
      Query.Lifted.Query<ParentModel, ParentMessage, typeof notes.Message.Type>
    >()
    expectTypeOf(notesChild.fold).toExtend<
      Update.Fold<ParentModel, ParentMessage, (typeof notes.Message)['Type']>
    >()
    expectTypeOf(
      notesChild.fold(
        { notes: notes.init() },
        notes.Message.RequestedLoadIfMissing(),
      ),
    ).toExtend<Update.Return<ParentModel, ParentMessage>>()
    expectTypeOf(
      notesChild.fold(notes.Message.RequestedLoadIfMissing())({
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
      read: function (model: KeyedParent) {
        return Option.some(model.notes)
      },
      write: function (model, nextNotes) {
        return modifyFields(model, { notes: () => nextNotes })
      },
      toParentMessage: function (message) {
        return KeyedParentMessage.GotNoteMessage({ message })
      },
    })

    expectTypeOf(noteByIdChild).toExtend<
      Query.Lifted.KeyedQuery<
        KeyedParent,
        KeyedParentMessage,
        typeof noteById.Message.Type,
        { readonly noteId: string }
      >
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
      field: 'notes',
      toParentMessage: function (message) {
        return ParentMessage.GotNotesMessage({ message })
      },
    })
    type ChildMessageFold = (
      model: ParentModel,
      message: (typeof notes.Message)['Type'],
    ) => Update.Return<ParentModel, unknown>
    expectTypeOf(notesChild.fold).toExtend<ChildMessageFold>()
  })

  it('parent-key lift rejects a key that is not the query Model', () => {
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
    const toParent = function (
      message: (typeof notes.Message)['Type'],
    ): Message {
      return Message.GotNotesMessage({ message })
    }
    const wrong = function (_message: string) {
      return 'nope'
    }
    expectTypeOf(toParent).toExtend<ToParent>()
    expectTypeOf(wrong).not.toExtend<ToParent>()
  })
})

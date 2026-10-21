import {
  Context,
  Effect,
  HashMap,
  Number,
  Option,
  Result,
  Schema,
} from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as AsyncData from '../../asyncData/index.js'
import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import * as Query from './index.js'

const Note = Schema.Struct({ id: Schema.String, body: Schema.String })
type Note = typeof Note.Type

const notes = Query.define({
  name: 'CacheNotes',
  data: Schema.Array(Note),
  error: Schema.String,
  execute: Effect.succeed([{ id: '1', body: 'fetched' }]),
})

const noteById = Query.define({
  name: 'CacheNote',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String, locale: Schema.String },
  execute: ({ noteId }) => Effect.succeed({ id: noteId, body: 'fetched' }),
})

const firstNote: Note = { id: '1', body: 'first' }
const secondNote: Note = { id: '2', body: 'second' }
const firstArgs = { noteId: '1', locale: 'en' }
const secondArgs = { noteId: '2', locale: 'en' }

const appendSecondNote = (current: ReadonlyArray<Note>) => [
  ...current,
  secondNote,
]

const completeNotes = (generation: number, data: ReadonlyArray<Note>) =>
  notes.Message.CompletedFetch({ generation, result: Result.succeed(data) })

const completeNote = (args: typeof firstArgs, generation: number, data: Note) =>
  noteById.Message.CompletedFetch({
    args,
    generation,
    result: Result.succeed(data),
  })

describe('Query cache writes', () => {
  it('setData writes Success without fetching', () => {
    const written = notes.setData(notes.init(), [firstNote])

    expect(notes.read(written.model)).toEqual(
      AsyncData.Success({ data: [firstNote] }),
    )
    expect(written.commands).toBeUndefined()
  })

  it('setData wins over a pending Fetch', () => {
    const loading = notes.loadIfMissing(notes.init())
    const written = notes.setData([firstNote])(loading.model)
    const lateCompletion = notes.update(
      written.model,
      completeNotes(loading.model.generation, []),
    )

    expect(written.model.generation).toBe(loading.model.generation + 1)
    expect(lateCompletion.model).toBe(written.model)
    expect(notes.read(lateCompletion.model)).toEqual(
      AsyncData.Success({ data: [firstNote] }),
    )
  })

  it('updateData transforms Success data', () => {
    const transformed = notes.updateData(
      notes.seed(AsyncData.Success({ data: [firstNote] })),
      appendSecondNote,
    )

    expect(notes.read(transformed.model)).toEqual(
      AsyncData.Success({ data: [firstNote, secondNote] }),
    )
    expect(transformed.commands).toBeUndefined()
  })

  it('updateData settles a Refreshing Query and ignores its pending refresh', () => {
    const refreshing = notes.revalidate(
      notes.seed(AsyncData.Success({ data: [firstNote] })),
    )
    const transformed = notes.updateData(refreshing.model, appendSecondNote)
    const lateCompletion = notes.update(
      transformed.model,
      completeNotes(refreshing.model.generation, []),
    )

    expect(notes.read(transformed.model)).toEqual(
      AsyncData.Success({ data: [firstNote, secondNote] }),
    )
    expect(lateCompletion.model).toBe(transformed.model)
  })

  it('updateData keeps a Stale Query stale with its error', () => {
    const transformed = notes.updateData(
      notes.seed(AsyncData.Stale({ data: [firstNote], error: 'offline' })),
      appendSecondNote,
    )

    expect(notes.read(transformed.model)).toEqual(
      AsyncData.Stale({ data: [firstNote, secondNote], error: 'offline' }),
    )
  })

  it.each([
    AsyncData.Idle(),
    AsyncData.Loading(),
    AsyncData.Failure({ error: 'offline' }),
  ])('updateData leaves a Query without data unchanged: %o', data => {
    const seeded = notes.seed(data)

    expect(notes.updateData(seeded, appendSecondNote).model).toBe(seeded)
  })
})

describe('KeyedQuery cache writes', () => {
  it('setData creates a Success entry without fetching', () => {
    const written = noteById.setData(noteById.init(), {
      args: firstArgs,
      data: firstNote,
    })

    expect(noteById.read(written.model, firstArgs)).toEqual(
      AsyncData.Success({ data: firstNote }),
    )
    expect(written.commands).toBeUndefined()
  })

  it('setData wins over the pending Fetch for its entry only', () => {
    const first = noteById.loadIfMissing(noteById.init(), firstArgs)
    const second = noteById.loadIfMissing(first.model, secondArgs)
    const written = noteById.setData(second.model, {
      args: firstArgs,
      data: firstNote,
    })
    const lateFirst = noteById.update(
      written.model,
      completeNote(firstArgs, first.model.generation, secondNote),
    )
    const settledSecond = noteById.update(
      lateFirst.model,
      completeNote(secondArgs, second.model.generation, secondNote),
    )

    expect(lateFirst.model).toBe(written.model)
    expect(noteById.read(settledSecond.model, firstArgs)).toEqual(
      AsyncData.Success({ data: firstNote }),
    )
    expect(noteById.read(settledSecond.model, secondArgs)).toEqual(
      AsyncData.Success({ data: secondNote }),
    )
  })

  it('updateData transforms one entry and ignores its pending refresh', () => {
    const seeded = noteById.seed([
      { args: firstArgs, data: AsyncData.Success({ data: firstNote }) },
      { args: secondArgs, data: AsyncData.Success({ data: secondNote }) },
    ])
    const refreshing = noteById.revalidate(seeded, firstArgs)
    const transformed = noteById.updateData(refreshing.model, {
      args: firstArgs,
      toNextData: note => modifyFields(note, { body: () => 'edited' }),
    })
    const lateCompletion = noteById.update(
      transformed.model,
      completeNote(firstArgs, refreshing.model.generation, firstNote),
    )

    expect(noteById.read(transformed.model, firstArgs)).toEqual(
      AsyncData.Success({ data: { id: '1', body: 'edited' } }),
    )
    expect(noteById.read(transformed.model, secondArgs)).toEqual(
      AsyncData.Success({ data: secondNote }),
    )
    expect(lateCompletion.model).toBe(transformed.model)
  })

  it('updateData leaves a missing entry unchanged', () => {
    const seeded = noteById.seed([
      { args: firstArgs, data: AsyncData.Success({ data: firstNote }) },
    ])
    const transformed = noteById.updateData({
      args: secondArgs,
      toNextData: note => note,
    })(seeded)

    expect(transformed.model).toBe(seeded)
  })
})

describe('Query seed', () => {
  it.each([
    AsyncData.Idle(),
    AsyncData.Loading(),
    AsyncData.Refreshing({ data: [firstNote] }),
    AsyncData.Success({ data: [firstNote] }),
    AsyncData.Failure({ error: 'offline' }),
    AsyncData.Stale({ data: [firstNote], error: 'offline' }),
  ])('reads back the seeded state: %o', data => {
    expect(notes.read(notes.seed(data))).toEqual(data)
  })

  it('accepts a generation 0 completion for a pending seed', () => {
    const seeded = notes.seed(AsyncData.Refreshing({ data: [firstNote] }))
    const settled = notes.update(seeded, completeNotes(0, [secondNote]))

    expect(notes.read(settled.model)).toEqual(
      AsyncData.Success({ data: [secondNote] }),
    )
  })

  it('starts the first Fetch from a seed with generation 1', () => {
    const refreshing = notes.revalidate(
      notes.seed(AsyncData.Success({ data: [firstNote] })),
    )

    expect(refreshing.model.generation).toBe(1)
  })
})

describe('KeyedQuery seed', () => {
  it('keys seeded entries the way loading operations do', () => {
    const seeded = noteById.seed([
      { args: firstArgs, data: AsyncData.Success({ data: firstNote }) },
    ])
    const loaded = noteById.loadIfMissing(seeded, {
      locale: 'en',
      noteId: '1',
    })

    expect(noteById.read(seeded, { locale: 'en', noteId: '1' })).toEqual(
      AsyncData.Success({ data: firstNote }),
    )
    expect(loaded.commands).toBeUndefined()
  })

  it('accepts a generation 0 completion for a pending entry', () => {
    const seeded = noteById.seed([
      { args: firstArgs, data: AsyncData.Loading() },
    ])
    const settled = noteById.update(
      seeded,
      completeNote(firstArgs, 0, firstNote),
    )

    expect(noteById.read(settled.model, firstArgs)).toEqual(
      AsyncData.Success({ data: firstNote }),
    )
  })

  it('starts the first Fetch from a seed with generation 1', () => {
    const loading = noteById.loadIfMissing(noteById.seed([]), firstArgs)

    expect(loading.model.generation).toBe(1)
  })
})

describe('Query accepted Fetch', () => {
  it('returns AcceptedFetch for the current completion', () => {
    const loading = notes.loadIfMissing(notes.init())
    const completion = notes.updateWithOutMessage(
      loading.model,
      completeNotes(loading.model.generation, [firstNote]),
    )

    expect(completion.outMessage).toEqual(
      notes.OutMessage.AcceptedFetch({ result: Result.succeed([firstNote]) }),
    )
    expect(notes.read(completion.model)).toEqual(
      AsyncData.Success({ data: [firstNote] }),
    )
  })

  it('returns AcceptedFetch for an accepted failure', () => {
    const loading = notes.loadIfMissing(notes.init())
    const completion = notes.updateWithOutMessage(
      loading.model,
      notes.Message.CompletedFetch({
        generation: loading.model.generation,
        result: Result.fail('offline'),
      }),
    )

    expect(completion.outMessage).toEqual(
      notes.OutMessage.AcceptedFetch({ result: Result.fail('offline') }),
    )
    expect(notes.read(completion.model)).toEqual(
      AsyncData.Failure({ error: 'offline' }),
    )
  })

  it('returns no OutMessage for a superseded completion', () => {
    const loading = notes.loadIfMissing(notes.init())
    const written = notes.setData(loading.model, [firstNote])
    const completion = notes.updateWithOutMessage(
      written.model,
      completeNotes(loading.model.generation, []),
    )

    expect(completion.outMessage).toBeUndefined()
    expect(completion.model).toBe(written.model)
  })
})

describe('KeyedQuery accepted Fetch', () => {
  it('returns AcceptedFetch with the entry args', () => {
    const loading = noteById.loadIfMissing(noteById.init(), firstArgs)
    const completion = noteById.updateWithOutMessage(
      loading.model,
      completeNote(firstArgs, loading.model.generation, firstNote),
    )

    expect(completion.outMessage).toEqual({
      _tag: 'AcceptedFetch',
      args: firstArgs,
      result: Result.succeed(firstNote),
    })
  })

  it('returns no OutMessage for a late completion', () => {
    const first = noteById.loadIfMissing(noteById.init(), firstArgs)
    const reset = noteById.reset(first.model)
    const completion = noteById.updateWithOutMessage(
      reset.model,
      completeNote(firstArgs, first.model.generation, firstNote),
    )

    expect(completion.outMessage).toBeUndefined()
    expect(completion.model).toBe(reset.model)
  })
})

describe('lifted cache tools', () => {
  const Model = Schema.Struct({
    notes: notes.Model,
    noteDetails: noteById.Model,
    acceptedCount: Schema.Number,
    maybeLastAcceptedNoteId: Schema.Option(Schema.String),
  })
  type Model = typeof Model.Type

  const Message = defineMessageUnion({
    GotNotesMessage: { message: notes.Message },
    GotNoteMessage: { message: noteById.Message },
  })
  type Message = typeof Message.Type

  const initialModel = Model.make({
    notes: notes.init(),
    noteDetails: noteById.init(),
    acceptedCount: 0,
    maybeLastAcceptedNoteId: Option.none(),
  })

  const plainNotes = notes.lift<Model, Message>({
    parentField: 'notes',
    toParentMessage: message => Message.GotNotesMessage({ message }),
  })

  const countedNotes = notes.lift<Model, Message>({
    parentField: 'notes',
    toParentMessage: message => Message.GotNotesMessage({ message }),
    foldOutMessage: notes.OutMessage.match<Update.Step<Model, Message>>({
      AcceptedFetch: () => model => ({
        model: modifyFields(model, { acceptedCount: Number.increment }),
      }),
    }),
  })

  const noteDetails = noteById.lift<Model, Message>({
    parentField: 'noteDetails',
    toParentMessage: message => Message.GotNoteMessage({ message }),
    foldOutMessage: noteById.OutMessage.match<Update.Step<Model, Message>>({
      AcceptedFetch:
        ({ args }) =>
        model => ({
          model: modifyFields(model, {
            maybeLastAcceptedNoteId: () => Option.some(args.noteId),
          }),
        }),
    }),
  })

  it('folds an accepted Fetch into the parent through foldOutMessage', () => {
    const loading = countedNotes.loadIfMissing(initialModel)
    const settled = countedNotes.fold(
      loading.model,
      completeNotes(loading.model.notes.generation, [firstNote]),
    )

    expect(settled.model.acceptedCount).toBe(1)
    expect(notes.read(settled.model.notes)).toEqual(
      AsyncData.Success({ data: [firstNote] }),
    )
  })

  it('skips foldOutMessage for a superseded completion', () => {
    const loading = countedNotes.loadIfMissing(initialModel)
    const written = countedNotes.setData(loading.model, [secondNote])
    const late = countedNotes.fold(
      written.model,
      completeNotes(loading.model.notes.generation, [firstNote]),
    )

    expect(late.model.acceptedCount).toBe(0)
    expect(notes.read(late.model.notes)).toEqual(
      AsyncData.Success({ data: [secondNote] }),
    )
  })

  it('keeps fold without foldOutMessage free of parent reactions', () => {
    const loading = plainNotes.loadIfMissing(initialModel)
    const settled = plainNotes.fold(
      loading.model,
      completeNotes(loading.model.notes.generation, [firstNote]),
    )

    expect(settled.model.acceptedCount).toBe(0)
    expectTypeOf(plainNotes.fold).toEqualTypeOf<
      Update.Fold<Model, Message, typeof notes.Message.Type>
    >()
  })

  it('carries foldOutMessage service requirements into the lifted fold', () => {
    class AuditLog extends Context.Service<
      AuditLog,
      { readonly entries: ReadonlyArray<string> }
    >()('CacheToolsTestAuditLog') {}

    const ReadAuditLog = Command.define('ReadAuditLog', {
      messages: [Message.GotNotesMessage],
      execute: Effect.gen(function* () {
        yield* AuditLog
        return Message.GotNotesMessage({ message: completeNotes(0, []) })
      }),
    })

    const auditedNotes = notes.lift<Model, Message, AuditLog>({
      parentField: 'notes',
      toParentMessage: message => Message.GotNotesMessage({ message }),
      foldOutMessage: notes.OutMessage.match<
        Update.Step<Model, Message, AuditLog>
      >({
        AcceptedFetch: () => model => ({ model, commands: [ReadAuditLog()] }),
      }),
    })

    expectTypeOf(auditedNotes.fold).toEqualTypeOf<
      Update.Fold<Model, Message, typeof notes.Message.Type, AuditLog>
    >()
  })

  it('folds an accepted keyed Fetch with its args', () => {
    const loading = noteDetails.loadIfMissing(initialModel, firstArgs)
    const settled = noteDetails.fold(
      loading.model,
      completeNote(firstArgs, loading.model.noteDetails.generation, firstNote),
    )

    expect(settled.model.maybeLastAcceptedNoteId).toEqual(Option.some('1'))
  })

  it('lifts setData and updateData into the parent', () => {
    const written = plainNotes.setData(initialModel, [firstNote])
    const transformed = plainNotes.updateData(written.model, appendSecondNote)
    const detailWritten = noteDetails.setData(transformed.model, {
      args: secondArgs,
      data: secondNote,
    })

    expect(notes.read(transformed.model.notes)).toEqual(
      AsyncData.Success({ data: [firstNote, secondNote] }),
    )
    expect(HashMap.size(detailWritten.model.noteDetails.entries)).toBe(1)
    expect(noteById.read(detailWritten.model.noteDetails, secondArgs)).toEqual(
      AsyncData.Success({ data: secondNote }),
    )
  })
})

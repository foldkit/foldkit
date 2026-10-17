import { Context, Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'
import * as Message from 'foldkit/message'

const Note = Schema.Struct({ id: Schema.String, body: Schema.String })

export class QueryBuildService extends Context.Service<
  QueryBuildService,
  Readonly<{ isAvailable: boolean }>
>()('DeclarationQueryBuildService') {}

export class QueryExecutionService extends Context.Service<
  QueryExecutionService,
  Readonly<{ body: string }>
>()('DeclarationQueryExecutionService') {}

export class QueryBuildFailure extends Error {}

export const Notes = Query.define({
  name: 'DeclarationNotes',
  data: Schema.Array(Note),
  error: Schema.String,
})

export const NotesLayer = Notes.toLayer(
  Effect.succeed(() => Effect.succeed([{ id: '1', body: 'host' }])),
)

export const ProvidedNotes = Notes.provideHandlers(NotesLayer)

export const CanonicalNotes = Query.define({
  name: 'DeclarationCanonicalNotes',
  data: Schema.Array(Note),
  error: Schema.String,
  handler: function* () {
    const build = yield* QueryBuildService

    if (!build.isAvailable) {
      return yield* Effect.fail(new QueryBuildFailure())
    }

    return () =>
      Effect.map(QueryExecutionService, ({ body }) => [{ id: '1', body }])
  },
})

export const CanonicalNotesTestLayer = CanonicalNotes.toLayer(
  Effect.succeed(() => Effect.succeed([{ id: '1', body: 'test' }])),
)
export const ReplacedCanonicalNotes = CanonicalNotes.replaceEffectsLayer(
  CanonicalNotesTestLayer,
)

const ForeignCanonicalNotes = Query.define({
  name: 'DeclarationForeignCanonicalNotes',
  data: Schema.Array(Note),
  error: Schema.String,
  handler: function* () {
    return () => Effect.succeed([{ id: 'foreign', body: 'foreign' }])
  },
})
export const ForeignCanonicalNotesLayer = ForeignCanonicalNotes.EffectsLayer

export const NoteById = Query.define({
  name: 'DeclarationNoteById',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String },
})

export const NoteByIdLayer = NoteById.toLayer(
  Effect.succeed(({ noteId }) => Effect.succeed({ id: noteId, body: 'host' })),
)

export const ProvidedNoteById = NoteById.provideHandlers(NoteByIdLayer)

export const CanonicalNoteById = Query.define({
  name: 'DeclarationCanonicalNoteById',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String },
  handler: function* () {
    return ({ noteId }) => Effect.succeed({ id: noteId, body: 'canonical' })
  },
})

export const CanonicalNoteByIdTestLayer = CanonicalNoteById.toLayer(
  Effect.succeed(({ noteId }) => Effect.succeed({ id: noteId, body: 'test' })),
)
export const ReplacedCanonicalNoteById = CanonicalNoteById.replaceEffectsLayer(
  CanonicalNoteByIdTestLayer,
)

const ForeignCanonicalNoteById = Query.define({
  name: 'DeclarationForeignCanonicalNoteById',
  data: Note,
  error: Schema.String,
  args: { noteId: Schema.String },
  handler: function* () {
    return ({ noteId }) => Effect.succeed({ id: noteId, body: 'foreign' })
  },
})
export const ForeignCanonicalNoteByIdLayer =
  ForeignCanonicalNoteById.EffectsLayer

const ParentModel = Schema.Struct({ notes: Notes.Model })
const ParentMessage = Message.defineMessageUnion({
  GotNotesMessage: { message: Notes.Message },
})
const DeclarationQueryParent = Block.define('DeclarationQueryParent', {
  Model: ParentModel,
  Message: ParentMessage,
})

export const NotesChildBinding = DeclarationQueryParent.bindChild(Notes, {
  field: 'notes',
  parentMessage: ParentMessage.GotNotesMessage,
})

export const DeclarationQueryParentComposition =
  DeclarationQueryParent.makeComposition({
    childBindings: [NotesChildBinding],
  })

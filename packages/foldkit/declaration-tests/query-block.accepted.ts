import { Context, Effect, Layer, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'
import * as Message from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

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
export const ReplacedCanonicalNotes = CanonicalNotes.provideHandlers(
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
export const ReplacedCanonicalNoteById = CanonicalNoteById.provideHandlers(
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
export const ParentMessage = Message.defineMessageUnion({
  ClickedParent: {},
})
export const DeclarationQueryParentKey = Symbol('DeclarationQueryParent')
const DeclarationQueryParentDefinition = Block.makeDefinition(
  'DeclarationQueryParent',
  {
    key: DeclarationQueryParentKey,
    Model: ParentModel,
    Message: ParentMessage,
    InitArgs: Schema.Tuple([]),
  },
)
export const DeclarationQueryParentContract =
  DeclarationQueryParentDefinition.contract

export const NotesChildBinding =
  DeclarationQueryParentDefinition.makeRequiredFieldBinding(Notes, {
    field: 'notes',
  })

export const DeclarationQueryParentComposition =
  DeclarationQueryParentDefinition.makeComposition({
    bindings: [NotesChildBinding],
  })

export const GenericInputRequestKey = Symbol('GenericInputRequest')

export const defineGenericInputRequest = <Name extends string, Value, Encoded>(
  name: Name,
  Value: Schema.Codec<Value, Encoded, never, never>,
) => {
  const Model = Schema.Struct({ maybeValue: Schema.Option(Value) })
  const LocalMessage = Message.defineMessageUnion({
    CompletedFetch: { value: Value },
  })
  const InMessage = Message.defineMessageUnion({ RequestedFetch: {} })
  const Definition = Block.makeFamilyDefinition(name, {
    key: GenericInputRequestKey,
    Model,
    Message: LocalMessage,
    InMessage,
    InitArgs: Schema.Tuple([]),
  })
  const Fetch = Definition.makeCommand('Fetch', {
    messages: [LocalMessage.CompletedFetch],
  })
  const Composition = Definition.makeComposition()
  const init = Composition.makeInit(() => ({
    model: { maybeValue: Option.none() },
  }))
  const update = Composition.makeUpdate({
    CompletedFetch: (model, { value }) => ({
      model: modifyFields(model, { maybeValue: () => Option.some(value) }),
    }),
  })
  const inMessageUpdate = Composition.makeInMessageUpdate({
    RequestedFetch: model => ({ model, commands: [Fetch()] }),
  })
  const recipe = Definition.makeBlock(
    Effect.succeed({
      children: [],
      init,
      update,
      inMessageUpdate,
      EffectsLayer: Layer.empty,
      hostHandlers: [Fetch],
    }),
  )

  return { Definition, Fetch, recipe }
}

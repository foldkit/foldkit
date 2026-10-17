import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'
import * as Message from 'foldkit/message'

const Notes = Query.define({
  name: 'RejectedDeclarationNotes',
  data: Schema.Array(Schema.String),
  error: Schema.String,
})

// @ts-expect-error A Query host requires its exact Fetch handler contract.
Notes.provideHandlers(Layer.empty)

const ParentModel = Schema.Struct({ label: Schema.String })
const ParentMessage = Message.defineMessageUnion({
  GotNotesMessage: { message: Notes.Message },
})
const RejectedDeclarationQueryParent = Block.define(
  'RejectedDeclarationQueryParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

RejectedDeclarationQueryParent.bindChild(Notes, {
  // @ts-expect-error The direct parent field must contain the Query Model.
  field: 'label',
  // @ts-expect-error This invalid Binding configuration has no matching overload.
  parentMessage: ParentMessage.GotNotesMessage,
})

Query.define({
  name: 'RejectedCanonicalQuery',
  data: Schema.String,
  error: Schema.String,
  // @ts-expect-error The handler result must match the Query data Schema.
  handler: function* () {
    return () => Effect.succeed(1)
  },
})

const CanonicalNotes = Query.define({
  name: 'RejectedCanonicalNotes',
  data: Schema.Array(Schema.String),
  error: Schema.String,
  handler: function* () {
    return () => Effect.succeed(['notes'])
  },
})
const ForeignCanonicalNotes = Query.define({
  name: 'RejectedForeignCanonicalNotes',
  data: Schema.Array(Schema.String),
  error: Schema.String,
  handler: function* () {
    return () => Effect.succeed(['foreign'])
  },
})

// @ts-expect-error A canonical Query replacement must provide its own Fetch handler.
CanonicalNotes.replaceEffectsLayer(ForeignCanonicalNotes.EffectsLayer)

const CanonicalNoteById = Query.define({
  name: 'RejectedCanonicalNoteById',
  data: Schema.String,
  error: Schema.String,
  args: { noteId: Schema.String },
  handler: function* () {
    return ({ noteId }) => Effect.succeed(noteId)
  },
})
const ForeignCanonicalNoteById = Query.define({
  name: 'RejectedForeignCanonicalNoteById',
  data: Schema.String,
  error: Schema.String,
  args: { noteId: Schema.String },
  handler: function* () {
    return ({ noteId }) => Effect.succeed(noteId)
  },
})

// @ts-expect-error A canonical KeyedQuery replacement must provide its own Fetch handler.
CanonicalNoteById.replaceEffectsLayer(ForeignCanonicalNoteById.EffectsLayer)

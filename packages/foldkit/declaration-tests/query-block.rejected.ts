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

const ParentModel = Schema.Struct({ label: Schema.String, notes: Notes.Model })
const ParentMessage = Message.defineMessageUnion({ ClickedParent: {} })
const RejectedParentKey = Symbol('RejectedDeclarationQueryParent')
const RejectedDeclarationQueryParentDefinition = Block.makeDefinition(
  'RejectedDeclarationQueryParent',
  {
    key: RejectedParentKey,
    Model: ParentModel,
    Message: ParentMessage,
    InitArgs: Schema.Tuple([]),
  },
)

// @ts-expect-error The direct parent field must contain the Query Model.
RejectedDeclarationQueryParentDefinition.makeRequiredFieldBinding(Notes, {
  field: 'label',
})

// @ts-expect-error Authored parent Message constructors are no longer Binding configuration.
RejectedDeclarationQueryParentDefinition.makeRequiredFieldBinding(Notes, {
  field: 'notes',
  parentMessage: ParentMessage.ClickedParent,
})
// @ts-expect-error Authored child-to-parent Message mappers are no longer Binding configuration.
RejectedDeclarationQueryParentDefinition.makeRequiredFieldBinding(Notes, {
  field: 'notes',
  toParentMessage: () => ParentMessage.ClickedParent(),
})
// @ts-expect-error Authored parent-to-child Message routes are no longer Binding configuration.
RejectedDeclarationQueryParentDefinition.makeRequiredFieldBinding(Notes, {
  field: 'notes',
  fromParentMessage: false,
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
CanonicalNotes.provideHandlers(ForeignCanonicalNotes.EffectsLayer)

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
CanonicalNoteById.provideHandlers(ForeignCanonicalNoteById.EffectsLayer)

// @ts-expect-error Query parent requests are separate from local completion Messages.
CanonicalNotes.Message.RequestedLoadIfMissing()
// @ts-expect-error Query reset is accepted through inMessageUpdate rather than local update.
CanonicalNotes.Message.RequestedReset()
// @ts-expect-error The Clock adapter preserves its explicit positional operation.
CanonicalNotes.InMessage.RequestedLoadIfStale({ nowMillis: 0 })
// @ts-expect-error KeyedQuery reset is separate from local completion Messages.
CanonicalNoteById.Message.RequestedReset()
// @ts-expect-error Keyed argument adapters retain their existing direct signatures.
CanonicalNoteById.InMessage.RequestedLoadIfMissing({ args: { noteId: '1' } })

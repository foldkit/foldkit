import { Effect, Schema, pipe } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { AsyncData, Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Note = Schema.Struct({ id: Schema.String, title: Schema.String })
const NotesAsyncData = AsyncData.Schema(Schema.Array(Note), Schema.String)

const Model = Schema.Struct({ allNotes: NotesAsyncData.schema })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  SucceededLoadAllNotes: { notes: Schema.Array(Note) },
  FailedLoadAllNotes: { error: Schema.String },
})
type Message = typeof Message.Type

const LoadAllNotes = Command.define('LoadAllNotes', {
  messages: [Message.SucceededLoadAllNotes, Message.FailedLoadAllNotes],
})

class Notes extends Block<Notes>()('Notes', {
  Model,
  Message,
  Command: [LoadAllNotes],
}) {}

const NotesLive = Notes.make(
  Effect.fn(function* () {
    const client = yield* HttpClient.HttpClient

    const fetchAllNotes = client.get('/api/notes').pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Array(Note))),
      Effect.mapError(() => 'Could not load notes'),
    )

    return {
      model: { allNotes: NotesAsyncData.Loading() },
      start: [LoadAllNotes()],

      update: {
        SucceededLoadAllNotes: (model, { notes }) => ({
          model: modifyFields(model, {
            allNotes: () => NotesAsyncData.Success({ data: notes }),
          }),
        }),
        FailedLoadAllNotes: (model, { error }) => ({
          model: modifyFields(model, {
            allNotes: () => NotesAsyncData.Failure({ error }),
          }),
        }),
      },

      commands: {
        LoadAllNotes: () =>
          pipe(
            fetchAllNotes,
            Effect.match({
              onSuccess: notes => Message.SucceededLoadAllNotes({ notes }),
              onFailure: error => Message.FailedLoadAllNotes({ error }),
            }),
          ),
      },

      view: (model, h) =>
        h.p([], [AsyncData.isPending(model.allNotes) ? 'Loading' : 'Notes']),
    }
  }),
)

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
  SettledLoadAllNotes: {
    result: Schema.Result(Schema.Array(Note), Schema.String),
  },
})
type Message = typeof Message.Type

const LoadAllNotes = Command.define('LoadAllNotes', {
  messages: [Message.SettledLoadAllNotes],
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
        SettledLoadAllNotes: (model, { result }) => ({
          model: modifyFields(model, {
            allNotes: previous => AsyncData.settle(previous, result),
          }),
        }),
      },

      commands: {
        LoadAllNotes: () =>
          pipe(
            fetchAllNotes,
            Effect.result,
            Effect.map(result => Message.SettledLoadAllNotes({ result })),
          ),
      },

      view: (model, h) =>
        h.p([], [AsyncData.isPending(model.allNotes) ? 'Loading' : 'Notes']),
    }
  }),
)

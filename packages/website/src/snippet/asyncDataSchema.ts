import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { Note, NoteId, Notebook, NotebookId } from './domain'

const NotebooksAsyncData = AsyncData.Schema(
  Schema.Array(Notebook),
  Schema.String,
)
const NotebookAsyncData = AsyncData.Schema(Notebook, Schema.String)
const NotesAsyncData = AsyncData.Schema(Schema.Array(Note), Schema.String)
const NoteAsyncData = AsyncData.Schema(Note, Schema.String)

export const Model = Schema.Struct({
  // ...
  notebooks: NotebooksAsyncData.schema,
  notebookById: Schema.HashMap(NotebookId, NotebookAsyncData.schema),
  allNotes: NotesAsyncData.schema,
  notesByNotebook: Schema.HashMap(NotebookId, NotesAsyncData.schema),
  noteById: Schema.HashMap(NoteId, NoteAsyncData.schema),
})

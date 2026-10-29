import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { Note, NoteId, Notebook, NotebookId } from './domain'

const NotebooksAsyncData = AsyncData.Schema(
  Schema.Array(Notebook),
  Schema.String,
)
type NotebooksAsyncData = typeof NotebooksAsyncData.schema.Type
const NotebookAsyncData = AsyncData.Schema(Notebook, Schema.String)
type NotebookAsyncData = typeof NotebookAsyncData.schema.Type
const NotesAsyncData = AsyncData.Schema(Schema.Array(Note), Schema.String)
type NotesAsyncData = typeof NotesAsyncData.schema.Type
const NoteAsyncData = AsyncData.Schema(Note, Schema.String)
type NoteAsyncData = typeof NoteAsyncData.schema.Type
export const Model = Schema.Struct({
  // ...
  notebooks: NotebooksAsyncData.schema,
  notebookById: Schema.HashMap(NotebookId, NotebookAsyncData.schema),
  allNotes: NotesAsyncData.schema,
  notesByNotebook: Schema.HashMap(NotebookId, NotesAsyncData.schema),
  noteById: Schema.HashMap(NoteId, NoteAsyncData.schema),
})
export type Model = typeof Model.Type

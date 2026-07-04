import { Schema as S } from 'effect'
import { AsyncData } from 'foldkit'

import { NotFound, Note, NoteId, Notebook, NotebookId } from './domain'

const NotesLoadError = S.Union([NotFound, S.String])

// One AsyncData per resource kind.
const Notebooks = AsyncData.Schema(S.Array(Notebook), S.String)
const NotebookById = AsyncData.Schema(Notebook, NotesLoadError)
const AllNotes = AsyncData.Schema(S.Array(Note), S.String)
const NotesByNotebook = AsyncData.Schema(S.Array(Note), NotesLoadError)
const NoteById = AsyncData.Schema(Note, NotesLoadError)

export const Model = S.Struct({
  route: AppRoute,
  // Shape 1: a single-field list.
  notebooks: Notebooks.schema,
  // Shape 2: a byId table of single entities.
  notebookById: S.HashMap(NotebookId, NotebookById.schema),
  noteById: S.HashMap(NoteId, NoteById.schema),
  // Shape 3: a per-parent table of lists.
  notesByNotebook: S.HashMap(NotebookId, NotesByNotebook.schema),
  // Shape 4: a cross-cutting feed.
  allNotes: AllNotes.schema,
  // ...
})
export type Model = typeof Model.Type

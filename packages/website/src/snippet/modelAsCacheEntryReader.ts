import { HashMap, pipe } from 'effect'
import { AsyncData } from 'foldkit'

const notesEntry = (
  model: Model,
  notebookId: NotebookId,
): AsyncData.AsyncData<ReadonlyArray<Note>, NotesLoadError> =>
  pipe(model.notesByNotebook, HashMap.get(notebookId), AsyncData.getOrIdle)

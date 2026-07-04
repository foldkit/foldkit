import { HashMap, Option, pipe } from 'effect'
import { AsyncData } from 'foldkit'

const noteNotebookId = (
  model: Model,
  noteId: NoteId,
): Option.Option<NotebookId> =>
  pipe(
    HashMap.get(model.noteById, noteId),
    Option.flatMap(AsyncData.getData),
    Option.flatMap(note => note.maybeNotebookId),
  )

import { Array, HashMap, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { evo } from 'foldkit/struct'

export const prependNewNote =
  (note: Note) =>
  (model: Model): Model =>
    Option.match(note.maybeNotebookId, {
      onNone: () =>
        evo(model, {
          allNotes: allNotes =>
            AsyncData.map(allNotes, noteList => Array.prepend(noteList, note)),
        }),
      onSome: notebookId =>
        evo(model, {
          notesByNotebook: notesByNotebook =>
            HashMap.modify(notesByNotebook, notebookId, notes =>
              AsyncData.map(notes, noteList => Array.prepend(noteList, note)),
            ),
        }),
    })

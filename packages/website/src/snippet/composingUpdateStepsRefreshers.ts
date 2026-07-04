import { HashMap, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'

type Refresher = Update.Step<Model, Message, NotesServices>

export const refreshAllNotes: Refresher = Update.refresh({
  read: model => Option.some(model.allNotes),
  revalidate: AsyncData.revalidate,
  write: (model, allNotes) => evo(model, { allNotes: () => allNotes }),
  load: LoadAllNotes(),
})

export const refreshNote = (noteId: NoteId): Refresher =>
  Update.refresh({
    read: model => HashMap.get(model.noteById, noteId),
    revalidate: AsyncData.revalidate,
    write: (model, note) =>
      evo(model, {
        noteById: byId => HashMap.set(byId, noteId, note),
      }),
    load: LoadNote({ id: noteId }),
  })

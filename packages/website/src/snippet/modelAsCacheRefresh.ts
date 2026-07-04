import { HashMap } from 'effect'
import { AsyncData, Update } from 'foldkit'

type Refresher = Update.Step<Model, Message, NotesServices>

const refreshNotesForNotebook = (notebookId: NotebookId): Refresher =>
  Update.refresh({
    read: model => HashMap.get(model.notesByNotebook, notebookId),
    revalidate: AsyncData.revalidate,
    write: (model, notes) =>
      evo(model, {
        notesByNotebook: byNotebook =>
          HashMap.set(byNotebook, notebookId, notes),
      }),
    load: LoadNotes({ notebookId }),
  })

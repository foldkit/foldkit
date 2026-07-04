import { pipe } from 'effect'
import { Update } from 'foldkit'

const [nextModel, commands] = pipe(
  model,
  Update.combine([
    refreshNote(note.id),
    refreshAllNotes,
    showToast('Success', `Updated ${note.title}`),
  ]),
)

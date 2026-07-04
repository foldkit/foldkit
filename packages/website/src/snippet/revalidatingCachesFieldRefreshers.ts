import { Option } from 'effect'
import { AsyncData, Update } from 'foldkit'

export const refreshNotebooks: Refresher = Update.refresh({
  read: model => Option.some(model.notebooks),
  revalidate: AsyncData.revalidate,
  write: (model, notebooks) => evo(model, { notebooks: () => notebooks }),
  load: LoadNotebooks(),
})

export const refreshAllNotes: Refresher = Update.refresh({
  read: model => Option.some(model.allNotes),
  revalidate: AsyncData.revalidate,
  write: (model, allNotes) => evo(model, { allNotes: () => allNotes }),
  load: LoadAllNotes(),
})

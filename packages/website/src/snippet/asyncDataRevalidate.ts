import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const revalidateAllNotesStep = (model: Model) =>
  Option.match(AsyncData.revalidate(model.allNotes), {
    onNone: () => ({ model }),
    onSome: refreshingAllNotes => ({
      model: modifyFields(model, { allNotes: () => refreshingAllNotes }),
      commands: [LoadAllNotes()],
    }),
  })

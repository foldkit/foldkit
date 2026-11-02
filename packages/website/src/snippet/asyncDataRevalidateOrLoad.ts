import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const enterNotebooksRouteStep = (model: Model) =>
  Option.match(AsyncData.revalidateOrLoad(model.notebooks), {
    onNone: () => ({ model }),
    onSome: nextNotebooks => ({
      model: modifyFields(model, { notebooks: () => nextNotebooks }),
      commands: [LoadNotebooks()],
    }),
  })

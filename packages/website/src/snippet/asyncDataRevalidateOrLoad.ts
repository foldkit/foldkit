import { makeStep } from './block'

const enterNotebooksRoute = makeStep(model =>
  Option.match(AsyncData.revalidateOrLoad(model.notebooks), {
    onNone: () => ({ model }),
    onSome: nextNotebooks => ({
      model: modifyFields(model, { notebooks: () => nextNotebooks }),
      commands: [LoadNotebooks()],
    }),
  }),
)

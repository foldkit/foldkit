const route = Route.urlToAppRoute(url)
const transition = { previousRoute: Option.none(), nextRoute: route }

const [notebooks, notebooksCommands] = stepNotebooks(
  transition,
  AsyncData.Idle(),
)

const [noteById, noteByIdCommands] = stepNoteById(transition, HashMap.empty())
// ... one pair per cache; concat all the Commands into the boot batch

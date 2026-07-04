export const handleChangedUrl =
  (model: Model) =>
  ({ url }: { url: Url }): UpdateReturn => {
    const transition: RouteTransition = {
      previousRoute: Option.some(model.route),
      nextRoute: Route.urlToAppRoute(url),
    }

    const [notebooks, notebooksCommands] = stepNotebooks(
      transition,
      model.notebooks,
    )

    const [noteById, noteByIdCommands] = stepNoteById(
      transition,
      model.noteById,
    )
    // ... one pair per cache

    const nextModel = evo(model, {
      route: () => transition.nextRoute,
      notebooks: () => notebooks,
      noteById: () => noteById,
      // ...
    })

    return [nextModel, [...notebooksCommands, ...noteByIdCommands]]
  }

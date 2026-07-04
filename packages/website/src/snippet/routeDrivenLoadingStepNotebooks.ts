export const stepNotebooks = (
  transition: RouteTransition,
  notebooks: NotebooksAsyncData,
): readonly [NotebooksAsyncData, Commands] =>
  pipe(
    M.value(transition.nextRoute).pipe(
      M.withReturnType<
        Option.Option<readonly [NotebooksAsyncData, Commands]>
      >(),
      M.tag('NotebooksList', () => revalidateOrLoadNotebooks(notebooks)),
      M.tag('NoteViewer', () => maybeLoadNotebooks(notebooks)),
      M.orElse(() => Option.none()),
    ),
    Option.getOrElse(() => [notebooks, []] as const),
  )

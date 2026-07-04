const revalidateOrLoadNotebooks = (
  notebooks: NotebooksAsyncData,
): Option.Option<readonly [NotebooksAsyncData, Commands]> =>
  pipe(
    notebooks,
    AsyncData.revalidateOrLoad,
    Option.map(
      refreshingNotebooks => [refreshingNotebooks, [LoadNotebooks()]] as const,
    ),
  )

const maybeLoadNotebooks = (
  notebooks: NotebooksAsyncData,
): Option.Option<readonly [NotebooksAsyncData, Commands]> =>
  pipe(
    notebooks,
    Option.liftPredicate(Predicate.not(AsyncData.hasData)),
    Option.map(() => [AsyncData.Loading(), [LoadNotebooks()]] as const),
  )

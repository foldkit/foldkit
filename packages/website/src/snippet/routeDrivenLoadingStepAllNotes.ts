const revalidateOrLoadAllNotes = (
  allNotes: AllNotesAsyncData,
): Option.Option<readonly [AllNotesAsyncData, Commands]> =>
  pipe(
    allNotes,
    AsyncData.revalidateOrLoad,
    Option.map(
      refreshingAllNotes => [refreshingAllNotes, [LoadAllNotes()]] as const,
    ),
  )

export const stepAllNotes = (
  transition: RouteTransition,
  allNotes: AllNotesAsyncData,
): readonly [AllNotesAsyncData, Commands] =>
  pipe(
    transition,
    Option.liftPredicate(isTransitionTo('AllNotes')),
    Option.flatMap(() => revalidateOrLoadAllNotes(allNotes)),
    Option.getOrElse(() => [allNotes, []] as const),
  )

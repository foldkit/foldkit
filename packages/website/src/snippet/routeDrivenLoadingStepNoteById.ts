const isNoteLoaded =
  (noteById: NoteById) =>
  (noteId: NoteId): boolean =>
    pipe(noteById, HashMap.get(noteId), Option.exists(AsyncData.hasData))

const loadNote =
  (noteById: NoteById) =>
  (noteId: NoteId): Option.Option<readonly [NoteById, Commands]> =>
    pipe(
      noteId,
      Option.liftPredicate(Predicate.not(isNoteLoaded(noteById))),
      Option.map(id => [
        HashMap.set(noteById, id, AsyncData.Loading()),
        [LoadNote({ id })],
      ]),
    )

export const stepNoteById = (
  transition: RouteTransition,
  noteById: NoteById,
): readonly [NoteById, Commands] =>
  pipe(
    transition.nextRoute,
    routeToMaybeViewerNoteId,
    Option.flatMap(loadNote(noteById)),
    Option.getOrElse(() => [noteById, []] as const),
  )

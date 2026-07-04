// the same logic without Update.combine, for contrast only
const updatedNoteByHand = (model: Model): UpdateReturn => {
  const [m1, c1] = refreshNote(note.id)(replaceNoteInCaches(note)(model))
  const [m2, c2] = refreshAllNotes(m1)
  const [m3, c3] = refreshNotebookNotes(note.maybeNotebookId)(m2)
  const [m4, c4] = hasMoved
    ? refreshNotebookNotes(previousNotebookId)(m3)
    : Update.noOp(m3)
  const [m5, c5] = showToast('Success', `Updated ${note.title}`)(m4)
  return [m5, [...c1, ...c2, ...c3, ...c4, ...c5]]
}

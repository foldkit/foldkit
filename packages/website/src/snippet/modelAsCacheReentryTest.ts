Story.story(
  update,
  Story.with(notebookAModel),
  Story.message(
    ChangedUrl({
      url: urlOrThrow(`http://localhost/notebooks/${NOTEBOOK_A_ID}`),
    }),
  ),
  Story.model(model => {
    const entry = notesEntry(model, notebookAId)
    if (entry._tag === 'Refreshing') {
      expect(entry.data.map(({ id }) => id)).toEqual([noteId])
    } else {
      throw new Error('Expected Refreshing notes')
    }
  }),
  // ...
)

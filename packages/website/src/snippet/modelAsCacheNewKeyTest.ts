Story.story(
  update,
  Story.with(notebookAModel),
  Story.message(
    ChangedUrl({
      url: urlOrThrow(`http://localhost/notebooks/${NOTEBOOK_B_ID}`),
    }),
  ),
  Story.model(model => {
    expect(notesEntry(model, notebookBId)._tag).toBe('Loading')
    expect(notesEntry(model, notebookAId)._tag).toBe('Success')
  }),
  // ...
)

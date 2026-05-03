test('undo restores the previous grid state', () => {
  Story.story(
    update,
    Story.with(emptyModel),
    Story.message(PressedCell({ x: 0, y: 0 })),
    Story.message(ReleasedMouse()),
    // If someone removes the SaveCanvas command from ReleasedMouse, this
    // test fails. You can't accidentally delete a side effect without
    // every test that depends on it telling you. That's the point: side
    // effects are load-bearing, and your tests enforce it automatically.
    Story.Command.resolve(SaveCanvas, CompletedSaveCanvas()),
    Story.model(model => {
      expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      expect(model.undoStack).toHaveLength(1)
    }),
    Story.message(ClickedUndo()),
    Story.Command.resolve(SaveCanvas, CompletedSaveCanvas()),
    Story.model(model => {
      expect(model.grid[0]?.[0]).toEqual(Option.none())
      expect(model.undoStack).toHaveLength(0)
      expect(model.redoStack).toHaveLength(1)
    }),
  )
})

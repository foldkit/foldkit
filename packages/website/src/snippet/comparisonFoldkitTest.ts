test('undo restores the previous grid state', () => {
  Test.story(
    update,
    Test.with(emptyModel),
    Test.message(PressedCell({ x: 0, y: 0 })),
    Test.message(ReleasedMouse()),
    // If someone removes the SaveCanvas command from ReleasedMouse, this
    // test fails — you can't accidentally delete a side effect without
    // every test that depends on it telling you. That's the point: side
    // effects are load-bearing, and your tests enforce it automatically.
    Test.resolve(SaveCanvas, CompletedSaveCanvas()),
    Test.tap(({ model }) => {
      expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      expect(model.undoStack).toHaveLength(1)
    }),
    Test.message(ClickedUndo()),
    Test.resolve(SaveCanvas, CompletedSaveCanvas()),
    Test.tap(({ model }) => {
      expect(model.grid[0]?.[0]).toEqual(Option.none())
      expect(model.undoStack).toHaveLength(0)
      expect(model.redoStack).toHaveLength(1)
    }),
  )
})

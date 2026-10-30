it.effect('undo restores the previous grid state', () =>
  story(
    application,
    startArgs,
    message(Message.PressedCell({ x: 0, y: 0 })),
    message(Message.ReleasedMouse()),
    Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
    model(model => {
      expect(model.grid[0]?.[0]).toEqual(Option.some(0))
      expect(model.undoStack).toHaveLength(1)
    }),
    message(Message.ClickedUndo()),
    Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
    model(model => {
      expect(model.grid[0]?.[0]).toEqual(Option.none())
      expect(model.undoStack).toHaveLength(0)
      expect(model.redoStack).toHaveLength(1)
    }),
  ),
)

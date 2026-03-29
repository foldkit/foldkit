test('undo restores the previous grid state', () => {
  const afterPaint = dispatch(
    emptyModel,
    { type: 'PressedCell', x: 0, y: 0 },
    { type: 'ReleasedMouse' },
  )
  expect(afterPaint.grid[0]?.[0]).toBe(0)
  expect(afterPaint.undoStack).toHaveLength(1)

  const afterUndo = dispatch(afterPaint, { type: 'ClickedUndo' })
  expect(afterUndo.grid[0]?.[0]).toBeNull()
  expect(afterUndo.undoStack).toHaveLength(0)
  expect(afterUndo.redoStack).toHaveLength(1)
})

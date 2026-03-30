test('painting persists canvas to localStorage', async () => {
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

  render(<App />)

  const cells = findCanvasCells()
  const firstCell = cells[0]

  // Simulate a paint stroke: mousedown on cell, then mouseup on document
  fireEvent.mouseDown(firstCell)
  fireEvent.mouseUp(document)

  // localStorage.setItem is called inside a useEffect, which runs
  // asynchronously after React finishes rendering. We have to poll for it.
  await vi.waitFor(() => {
    expect(setItemSpy).toHaveBeenCalledWith(
      'pixel-art-react-canvas',
      expect.any(String),
    )
  })
})

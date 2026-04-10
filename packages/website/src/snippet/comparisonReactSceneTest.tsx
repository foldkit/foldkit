test('failed export shows error dialog that can be dismissed', () => {
  // Mock getContext to return null so export fails
  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(
    (tagName: string, options?: ElementCreationOptions): any => {
      if (tagName === 'canvas') {
        const fakeCanvas = originalCreateElement('canvas')
        fakeCanvas.getContext = (() => null) as typeof fakeCanvas.getContext
        return fakeCanvas
      }
      return originalCreateElement(tagName, options)
    },
  )

  // Render the full component tree in jsdom
  render(<App />)

  // Restore createElement, then re-apply the mock — React's own
  // createElement calls during re-render must not hit our mock
  vi.spyOn(document, 'createElement').mockRestore()
  vi.spyOn(document, 'createElement').mockImplementation(
    (tagName: string, options?: ElementCreationOptions): any => {
      if (tagName === 'canvas') {
        const fakeCanvas = originalCreateElement('canvas')
        fakeCanvas.getContext = (() => null) as typeof fakeCanvas.getContext
        return fakeCanvas
      }
      return originalCreateElement(tagName, options)
    },
  )

  // Click export — the side effect fires imperatively inside the component
  fireEvent.click(screen.getByRole('button', { name: /export png/i }))

  // Assert the error dialog appeared
  expect(screen.getByText('Export Failed')).toBeInTheDocument()
  expect(
    screen.getByText('Could not get canvas context'),
  ).toBeInTheDocument()

  // Click dismiss and assert the dialog is gone
  fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
  expect(screen.queryByText('Export Failed')).not.toBeInTheDocument()
})

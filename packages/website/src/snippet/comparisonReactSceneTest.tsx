test('failed export shows error dialog that can be dismissed', async () => {
  // Mock the canvas API so getContext returns null, simulating an
  // environment where export would fail
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

  // Render the full component tree in jsdom
  render(<App />)

  // Click export — the side effect fires imperatively inside the component
  await userEvent.click(screen.getByRole('button', { name: /export png/i }))

  // findByText waits for the async state update
  expect(await screen.findByText('Export Failed')).toBeInTheDocument()
  expect(screen.getByText('Could not get canvas context')).toBeInTheDocument()

  // Click dismiss and assert the dialog is gone
  await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
  expect(screen.queryByText('Export Failed')).not.toBeInTheDocument()
})

test('failed export shows error dialog that can be dismissed', () => {
  Scene.scene(
    { update, view },
    Scene.with(createTestModel()),
    // Click Export PNG. The update function returns an ExportPng Command.
    Scene.click(Scene.role('button', { name: 'Export PNG' })),
    // Resolve the Command with a failure — the update function opens
    // the error dialog in response.
    Scene.Command.resolve(
      ExportPng,
      FailedExportPng({ error: 'Canvas 2D context not available' }),
    ),
    Scene.Command.resolve(
      Ui.Dialog.ShowDialog,
      Ui.Dialog.CompletedShowDialog(),
      errorDialogMessageToMessage,
    ),
    // The error dialog is open. Find elements by role and text content —
    // no CSS selectors, no test IDs, no DOM.
    Scene.expect(Scene.text('Export Failed')).toExist(),
    Scene.expect(Scene.text('Canvas 2D context not available')).toExist(),
    // Click the Dismiss button. Scene finds the handler on the virtual
    // DOM node, dispatches the Message, and feeds it through update.
    Scene.click(Scene.role('button', { name: 'Dismiss' })),
    // The update function returned a CloseDialog Command. Resolve it
    // the same way Story.Command.resolve does — synchronously, inline.
    Scene.Command.resolve(
      Ui.Dialog.CloseDialog,
      Ui.Dialog.CompletedCloseDialog(),
      errorDialogMessageToMessage,
    ),
    // After the Command resolves, the dialog is gone.
    Scene.expect(Scene.text('Export Failed')).toBeAbsent(),
  )
})

test('failed export shows error dialog that can be dismissed', () => {
  Scene.scene(
    { update, view },
    Scene.with(modelWithExportError),
    // The error dialog is open. Find elements by role and text content —
    // no CSS selectors, no test IDs, no DOM.
    Scene.expect(Scene.text('Export Failed')).toExist(),
    Scene.expect(Scene.text('Canvas 2D context not available')).toExist(),
    Scene.expect(Scene.role('button', { name: 'Dismiss' })).toExist(),
    // Click the Dismiss button. Scene finds the handler on the virtual
    // DOM node, dispatches the Message, and feeds it through update.
    Scene.click(Scene.role('button', { name: 'Dismiss' })),
    // The update function returned a CloseDialog Command. Resolve it
    // the same way Story.resolve does — synchronously, inline.
    Scene.resolve(
      Ui.Dialog.CloseDialog,
      Ui.Dialog.CompletedCloseDialog(),
      toErrorDialogMessage,
    ),
    // After the Command resolves, the dialog is gone.
    Scene.expect(Scene.text('Export Failed')).toBeAbsent(),
  )
})

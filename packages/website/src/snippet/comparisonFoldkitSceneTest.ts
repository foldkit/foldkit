import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { ApplicationBlock, layer } from './block'

it.effect('failed export shows error dialog that can be dismissed', () =>
  scene(
    { block: ApplicationBlock, layer },
    given(createTestModel()),
    // Click Export PNG. The update function returns an ExportPng Command.
    click(role('button', { name: 'Export PNG' })),
    // Resolve the Command with a failure. The update function opens
    // the error dialog in response.
    Command.resolve(
      ExportPng,
      FailedExportPng({ error: 'Canvas 2D context not available' }),
    ),
    Command.resolve(
      Dialog.test.ShowDialog,
      Dialog.DialogBlock.Message.SucceededShowDialog(),
    ),
    // The error dialog is open. Find elements by role and text content:
    // no CSS selectors, no test IDs, no DOM.
    expect(text('Export Failed')).toExist(),
    expect(text('Canvas 2D context not available')).toExist(),
    // Click the Dismiss button. Scene finds the handler on the virtual
    // DOM node, dispatches the Message, and feeds it through update.
    click(role('button', { name: 'Dismiss' })),
    // The update function returned a CloseDialog Command. Resolve it
    // the same way a story test does: synchronously, inline.
    Command.resolve(
      Dialog.test.CloseDialog,
      Dialog.DialogBlock.Message.CompletedCloseDialog(),
    ),
    // After the Command resolves, the dialog is gone.
    expect(text('Export Failed')).toBeAbsent(),
  ),
)
import { it } from '@effect/vitest'

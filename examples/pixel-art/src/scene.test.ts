import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { Dialog, Listbox } from '@foldkit/ui'

import { ExportPng, SaveCanvas } from './command'
import { createEmptyGrid } from './grid'
import {
  CompletedSaveCanvas,
  FailedExportPng,
  SucceededExportPng,
} from './message'
import { type Model, type PaletteIndex } from './model'
import { update } from './update'
import { view } from './view'

const createTestModel = (): Model => ({
  grid: createEmptyGrid(4),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: 4,
  tool: 'Brush',
  mirrorMode: 'None',
  isDrawing: false,
  maybeHoveredCell: Option.none(),
  errorDialog: Dialog.init({ id: 'export-error-dialog' }),
  maybeExportError: Option.none(),
  paletteThemeIndex: 0,
  gridSizeConfirmDialog: Dialog.init({ id: 'grid-size-confirm-dialog' }),
  maybePendingGridSize: Option.none(),
  themeListbox: Listbox.init({ id: 'theme-picker' }),
})

const createPaintedModel = (): Model => ({
  ...createTestModel(),
  grid: createEmptyGrid(4).map((row, y) =>
    row.map((cell, x) =>
      x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
    ),
  ),
})

describe('export workflow', () => {
  test('clicking Export PNG produces ExportPng Command', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.click(Scene.role('button', { name: 'Export PNG' })),
      Scene.Command.expectExact(ExportPng),
      Scene.Command.resolve(ExportPng, SucceededExportPng()),
      Scene.Command.expectNone(),
    )
  })

  test('failed export opens error dialog with message', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.click(Scene.role('button', { name: 'Export PNG' })),
      Scene.Command.resolve(
        ExportPng,
        FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Scene.Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      Scene.expect(Scene.text('Export Failed')).toExist(),
      Scene.expect(Scene.text('Canvas 2D context not available')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Dismiss' })).toExist(),
    )
  })

  test('dismissing error dialog closes it', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.click(Scene.role('button', { name: 'Export PNG' })),
      Scene.Command.resolve(
        ExportPng,
        FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Scene.Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      Scene.expect(Scene.text('Export Failed')).toExist(),
      Scene.click(Scene.role('button', { name: 'Dismiss' })),
      Scene.Command.resolve(Dialog.CloseDialog, Dialog.CompletedCloseDialog()),
      Scene.expect(Scene.text('Export Failed')).toBeAbsent(),
    )
  })
})

describe('header', () => {
  test('renders PixelForge title and Export PNG button', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.expect(Scene.role('heading', { name: 'PixelForge' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Export PNG' })).toExist(),
    )
  })
})

describe('toolbar', () => {
  test('Brush tool is selected by default', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.expect(
        Scene.role('radio', { name: /^Brush/, checked: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('radio', { name: /^Fill/, checked: false }),
      ).toExist(),
      Scene.expect(
        Scene.role('radio', { name: /^Eraser/, checked: false }),
      ).toExist(),
    )
  })

  test('clear canvas button is disabled when canvas is empty', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.expect(
        Scene.role('button', { name: 'Clear Canvas' }),
      ).toBeDisabled(),
    )
  })

  test('clicking Fill tool selects it', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.click(Scene.role('radio', { name: /^Fill/ })),
      Scene.expect(
        Scene.role('radio', { name: /^Fill/, checked: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('radio', { name: /^Brush/, checked: false }),
      ).toExist(),
    )
  })

  test('clear canvas enables after painting then disables after clearing', () => {
    Scene.scene(
      { update, view },
      Scene.with(createPaintedModel()),
      Scene.expect(
        Scene.role('button', { name: 'Clear Canvas' }),
      ).toBeEnabled(),
      Scene.click(Scene.role('button', { name: 'Clear Canvas' })),
      Scene.Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      Scene.expect(
        Scene.role('button', { name: 'Clear Canvas' }),
      ).toBeDisabled(),
    )
  })
})

describe('history panel', () => {
  test('undo and redo buttons are disabled with no history', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.expect(Scene.role('button', { name: /^Undo/ })).toBeDisabled(),
      Scene.expect(Scene.role('button', { name: /^Redo/ })).toBeDisabled(),
    )
  })

  test('current history entry is visible', () => {
    Scene.scene(
      { update, view },
      Scene.with(createTestModel()),
      Scene.expect(Scene.text('Current')).toExist(),
    )
  })

  test('undo enables after painting and re-disables after undoing', () => {
    const modelWithHistory: Model = {
      ...createTestModel(),
      grid: createEmptyGrid(4).map((row, y) =>
        row.map((cell, x) =>
          x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
        ),
      ),
      undoStack: [createEmptyGrid(4)],
    }

    Scene.scene(
      { update, view },
      Scene.with(modelWithHistory),
      Scene.expect(Scene.role('button', { name: /^Undo/ })).toBeEnabled(),
      Scene.expect(Scene.role('button', { name: /^Redo/ })).toBeDisabled(),
      Scene.click(Scene.role('button', { name: /^Undo/ })),
      Scene.Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      Scene.expect(Scene.role('button', { name: /^Undo/ })).toBeDisabled(),
      Scene.expect(Scene.role('button', { name: /^Redo/ })).toBeEnabled(),
    )
  })
})

describe('grid size change', () => {
  test('painted canvas opens confirmation dialog', () => {
    Scene.scene(
      { update, view },
      Scene.with(createPaintedModel()),
      Scene.click(Scene.role('radio', { name: '8' })),
      Scene.Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      Scene.expect(Scene.text('Change to 8\u00d78?')).toExist(),
      Scene.expect(
        Scene.text('This will clear your canvas and reset undo history.'),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: 'Cancel' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Clear and Resize' }),
      ).toExist(),
    )
  })

  test('confirming grid size change closes dialog and saves canvas', () => {
    const modelWithPendingResize: Model = {
      ...createTestModel(),
      maybePendingGridSize: Option.some(8),
      gridSizeConfirmDialog: Dialog.init({
        id: 'grid-size-confirm-dialog',
        isOpen: true,
      }),
      undoStack: [createEmptyGrid(4)],
    }

    Scene.scene(
      { update, view },
      Scene.with(modelWithPendingResize),
      Scene.expect(Scene.text('Change to 8\u00d78?')).toExist(),
      Scene.click(Scene.role('button', { name: 'Clear and Resize' })),
      Scene.Command.resolve(Dialog.CloseDialog, Dialog.CompletedCloseDialog()),
      Scene.Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      Scene.expect(Scene.text('Change to 8\u00d78?')).toBeAbsent(),
    )
  })

  test('cancelling grid size change keeps current size', () => {
    const modelWithPendingResize: Model = {
      ...createTestModel(),
      maybePendingGridSize: Option.some(8),
      gridSizeConfirmDialog: Dialog.init({
        id: 'grid-size-confirm-dialog',
        isOpen: true,
      }),
    }

    Scene.scene(
      { update, view },
      Scene.with(modelWithPendingResize),
      Scene.expect(Scene.text('Change to 8\u00d78?')).toExist(),
      Scene.click(Scene.role('button', { name: 'Cancel' })),
      Scene.Command.resolve(Dialog.CloseDialog, Dialog.CompletedCloseDialog()),
      Scene.expect(Scene.text('Change to 8\u00d78?')).toBeAbsent(),
    )
  })
})

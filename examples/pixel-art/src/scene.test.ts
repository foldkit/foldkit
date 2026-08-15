import { Option } from 'effect'
import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

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

const resolveFocusOption = Command.resolve(
  RadioGroup.FocusOption,
  RadioGroup.CompletedFocusOption(),
)

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
  toolRadioGroup: RadioGroup.init({ id: 'tool-picker' }),
  gridSizeRadioGroup: RadioGroup.init({ id: 'grid-size-picker' }),
  paletteRadioGroup: RadioGroup.init({ id: 'palette-picker' }),
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
    scene(
      { update, view },
      given(createTestModel()),
      click(role('button', { name: 'Export PNG' })),
      Command.expectExact(ExportPng),
      Command.resolve(ExportPng, SucceededExportPng()),
      Command.expectNone(),
    )
  })

  test('failed export opens error dialog with message', () => {
    scene(
      { update, view },
      given(createTestModel()),
      click(role('button', { name: 'Export PNG' })),
      Command.resolve(
        ExportPng,
        FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      expect(text('Export Failed')).toExist(),
      expect(text('Canvas 2D context not available')).toExist(),
      expect(role('button', { name: 'Dismiss' })).toExist(),
    )
  })

  test('dismissing error dialog closes it', () => {
    scene(
      { update, view },
      given(createTestModel()),
      click(role('button', { name: 'Export PNG' })),
      Command.resolve(
        ExportPng,
        FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      expect(text('Export Failed')).toExist(),
      click(role('button', { name: 'Dismiss' })),
      Command.resolve(Dialog.CloseDialog, Dialog.CompletedCloseDialog()),
      expect(text('Export Failed')).toBeAbsent(),
    )
  })
})

describe('header', () => {
  test('renders PixelForge title and Export PNG button', () => {
    scene(
      { update, view },
      given(createTestModel()),
      expect(role('heading', { name: 'PixelForge' })).toExist(),
      expect(role('button', { name: 'Export PNG' })).toExist(),
    )
  })
})

describe('toolbar', () => {
  test('Brush tool is selected by default', () => {
    scene(
      { update, view },
      given(createTestModel()),
      expect(role('radio', { name: /^Brush/, checked: true })).toExist(),
      expect(role('radio', { name: /^Fill/, checked: false })).toExist(),
      expect(role('radio', { name: /^Eraser/, checked: false })).toExist(),
    )
  })

  test('clear canvas button is disabled when canvas is empty', () => {
    scene(
      { update, view },
      given(createTestModel()),
      expect(role('button', { name: 'Clear Canvas' })).toBeDisabled(),
    )
  })

  test('clicking Fill tool selects it', () => {
    scene(
      { update, view },
      given(createTestModel()),
      click(role('radio', { name: /^Fill/ })),
      resolveFocusOption,
      expect(role('radio', { name: /^Fill/, checked: true })).toExist(),
      expect(role('radio', { name: /^Brush/, checked: false })).toExist(),
    )
  })

  test('clear canvas enables after painting then disables after clearing', () => {
    scene(
      { update, view },
      given(createPaintedModel()),
      expect(role('button', { name: 'Clear Canvas' })).toBeEnabled(),
      click(role('button', { name: 'Clear Canvas' })),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      expect(role('button', { name: 'Clear Canvas' })).toBeDisabled(),
    )
  })
})

describe('history panel', () => {
  test('undo and redo buttons are disabled with no history', () => {
    scene(
      { update, view },
      given(createTestModel()),
      expect(role('button', { name: /^Undo/ })).toBeDisabled(),
      expect(role('button', { name: /^Redo/ })).toBeDisabled(),
    )
  })

  test('current history entry is visible', () => {
    scene(
      { update, view },
      given(createTestModel()),
      expect(text('Current')).toExist(),
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

    scene(
      { update, view },
      given(modelWithHistory),
      expect(role('button', { name: /^Undo/ })).toBeEnabled(),
      expect(role('button', { name: /^Redo/ })).toBeDisabled(),
      click(role('button', { name: /^Undo/ })),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      expect(role('button', { name: /^Undo/ })).toBeDisabled(),
      expect(role('button', { name: /^Redo/ })).toBeEnabled(),
    )
  })
})

describe('grid size change', () => {
  test('painted canvas opens confirmation dialog', () => {
    scene(
      { update, view },
      given(createPaintedModel()),
      click(role('radio', { name: '8' })),
      resolveFocusOption,
      Command.resolve(Dialog.ShowDialog, Dialog.CompletedShowDialog()),
      expect(text('Change to 8\u00d78?')).toExist(),
      expect(
        text('This will clear your canvas and reset undo history.'),
      ).toExist(),
      expect(role('button', { name: 'Cancel' })).toExist(),
      expect(role('button', { name: 'Clear and Resize' })).toExist(),
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

    scene(
      { update, view },
      given(modelWithPendingResize),
      expect(text('Change to 8\u00d78?')).toExist(),
      click(role('button', { name: 'Clear and Resize' })),
      Command.resolve(Dialog.CloseDialog, Dialog.CompletedCloseDialog()),
      Command.resolve(SaveCanvas, CompletedSaveCanvas()),
      expect(text('Change to 8\u00d78?')).toBeAbsent(),
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

    scene(
      { update, view },
      given(modelWithPendingResize),
      expect(text('Change to 8\u00d78?')).toExist(),
      click(role('button', { name: 'Cancel' })),
      Command.resolve(Dialog.CloseDialog, Dialog.CompletedCloseDialog()),
      expect(text('Change to 8\u00d78?')).toBeAbsent(),
    )
  })
})

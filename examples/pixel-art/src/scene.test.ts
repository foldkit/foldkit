import { Option } from 'effect'
import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog, RadioGroup } from '@foldkit/ui'

import { ExportPng, SaveCanvas } from './command'
import {
  GridSizeRadioGroupBlock,
  PaletteRadioGroupBlock,
  ThemeListboxBlock,
  ToolRadioGroupBlock,
} from './components'
import { createEmptyGrid } from './grid'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { type Model, type PaletteIndex } from './model'

const resolveFocusOption = Scene.Command.resolve(
  RadioGroup.test.FocusOption,
  ToolRadioGroupBlock.Message.CompletedFocusOption(),
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
  errorDialog: Dialog.DialogBlock.Model.make({
    id: 'export-error-dialog',
    isOpen: false,
    isAnimated: false,
    animation: {
      id: 'export-error-dialog' + '-panel',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeFocusSelector: Option.none(),
  }),
  maybeExportError: Option.none(),
  paletteThemeIndex: 0,
  gridSizeConfirmDialog: Dialog.DialogBlock.Model.make({
    id: 'grid-size-confirm-dialog',
    isOpen: false,
    isAnimated: false,
    animation: {
      id: 'grid-size-confirm-dialog' + '-panel',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeFocusSelector: Option.none(),
  }),
  maybePendingGridSize: Option.none(),
  themeListbox: ThemeListboxBlock.Model.make({
    id: 'theme-picker',
    isOpen: false,
    isAnimated: false,
    isModal: false,
    orientation: 'Vertical',
    animation: {
      id: 'theme-picker' + '-listbox',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeActiveItemIndex: Option.none(),
    activationTrigger: 'Keyboard',
    searchQuery: '',
    searchVersion: 0,
    maybeLastPointerPosition: Option.none(),
    maybeLastButtonPointerType: Option.none(),
  }),
  toolRadioGroup: ToolRadioGroupBlock.Model.make({
    id: 'tool-picker',
    maybeFocusedIndex: Option.none(),
  }),
  gridSizeRadioGroup: GridSizeRadioGroupBlock.Model.make({
    id: 'grid-size-picker',
    maybeFocusedIndex: Option.none(),
  }),
  paletteRadioGroup: PaletteRadioGroupBlock.Model.make({
    id: 'palette-picker',
    maybeFocusedIndex: Option.none(),
  }),
})

const createPaintedModel = (): Model =>
  modifyFields(createTestModel(), {
    grid: () =>
      createEmptyGrid(4).map((row, y) =>
        row.map((cell, x) =>
          x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
        ),
      ),
  })

describe('export workflow', () => {
  it.effect('clicking Export PNG produces ExportPng Command', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.click(Scene.role('button', { name: 'Export PNG' })),
      Scene.Command.expectExact(ExportPng),
      Scene.Command.resolve(ExportPng, Message.SucceededExportPng()),
      Scene.Command.expectNone(),
    ),
  )

  it.effect('failed export opens error dialog with message', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.click(Scene.role('button', { name: 'Export PNG' })),
      Scene.Command.resolve(
        ExportPng,
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Scene.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Scene.expect(Scene.text('Export Failed')).toExist(),
      Scene.expect(Scene.text('Canvas 2D context not available')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Dismiss' })).toExist(),
    ),
  )

  it.effect('dismissing error dialog closes it', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.click(Scene.role('button', { name: 'Export PNG' })),
      Scene.Command.resolve(
        ExportPng,
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Scene.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Scene.expect(Scene.text('Export Failed')).toExist(),
      Scene.click(Scene.role('button', { name: 'Dismiss' })),
      Scene.Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      Scene.expect(Scene.text('Export Failed')).toBeAbsent(),
    ),
  )
})

describe('header', () => {
  it.effect('renders PixelForge title and Export PNG button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.expect(Scene.role('heading', { name: 'PixelForge' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Export PNG' })).toExist(),
    ),
  )
})

describe('toolbar', () => {
  it.effect('Brush tool is selected by default', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.expect(
        Scene.role('radio', { name: /^Brush/, checked: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('radio', { name: /^Fill/, checked: false }),
      ).toExist(),
      Scene.expect(
        Scene.role('radio', { name: /^Eraser/, checked: false }),
      ).toExist(),
    ),
  )

  it.effect('clear canvas button is disabled when canvas is empty', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.expect(
        Scene.role('button', { name: 'Clear Canvas' }),
      ).toBeDisabled(),
    ),
  )

  it.effect('clicking Fill tool selects it', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.click(Scene.role('radio', { name: /^Fill/ })),
      resolveFocusOption,
      Scene.expect(
        Scene.role('radio', { name: /^Fill/, checked: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('radio', { name: /^Brush/, checked: false }),
      ).toExist(),
    ),
  )

  it.effect(
    'clear canvas enables after painting then disables after clearing',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(createPaintedModel()),
        Scene.expect(
          Scene.role('button', { name: 'Clear Canvas' }),
        ).toBeEnabled(),
        Scene.click(Scene.role('button', { name: 'Clear Canvas' })),
        Scene.Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
        Scene.expect(
          Scene.role('button', { name: 'Clear Canvas' }),
        ).toBeDisabled(),
      ),
  )
})

describe('history panel', () => {
  it.effect('undo and redo buttons are disabled with no history', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.expect(Scene.role('button', { name: /^Undo/ })).toBeDisabled(),
      Scene.expect(Scene.role('button', { name: /^Redo/ })).toBeDisabled(),
    ),
  )

  it.effect('current history entry is visible', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createTestModel()),
      Scene.expect(Scene.text('Current')).toExist(),
    ),
  )

  it.effect('undo enables after painting and re-disables after undoing', () => {
    const modelWithHistory: Model = modifyFields(createTestModel(), {
      grid: () =>
        createEmptyGrid(4).map((row, y) =>
          row.map((cell, x) =>
            x === 0 && y === 0 ? Option.some<PaletteIndex>(0) : cell,
          ),
        ),
      undoStack: () => [createEmptyGrid(4)],
    })

    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithHistory),
      Scene.expect(Scene.role('button', { name: /^Undo/ })).toBeEnabled(),
      Scene.expect(Scene.role('button', { name: /^Redo/ })).toBeDisabled(),
      Scene.click(Scene.role('button', { name: /^Undo/ })),
      Scene.Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      Scene.expect(Scene.role('button', { name: /^Undo/ })).toBeDisabled(),
      Scene.expect(Scene.role('button', { name: /^Redo/ })).toBeEnabled(),
    )
  })
})

describe('grid size change', () => {
  it.effect('painted canvas opens confirmation dialog', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createPaintedModel()),
      Scene.click(Scene.role('radio', { name: '8' })),
      resolveFocusOption,
      Scene.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Scene.expect(Scene.text('Change to 8\u00d78?')).toExist(),
      Scene.expect(
        Scene.text('This will clear your canvas and reset undo history.'),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: 'Cancel' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Clear and Resize' }),
      ).toExist(),
    ),
  )

  it.effect(
    'confirming grid size change closes dialog and saves canvas',
    () => {
      const paintedModel = modifyFields(createPaintedModel(), {
        undoStack: () => [createEmptyGrid(4)],
      })

      return Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(paintedModel),
        Scene.click(Scene.role('radio', { name: '8' })),
        resolveFocusOption,
        Scene.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Scene.expect(Scene.text('Change to 8\u00d78?')).toExist(),
        Scene.click(Scene.role('button', { name: 'Clear and Resize' })),
        Scene.Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        Scene.Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
        Scene.expect(Scene.text('Change to 8\u00d78?')).toBeAbsent(),
      )
    },
  )

  it.effect('cancelling grid size change keeps current size', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(createPaintedModel()),
      Scene.click(Scene.role('radio', { name: '8' })),
      resolveFocusOption,
      Scene.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Scene.expect(Scene.text('Change to 8\u00d78?')).toExist(),
      Scene.click(Scene.role('button', { name: 'Cancel' })),
      Scene.Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      Scene.expect(Scene.text('Change to 8\u00d78?')).toBeAbsent(),
    ),
  )
})

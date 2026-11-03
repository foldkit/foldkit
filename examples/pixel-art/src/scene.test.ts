import { Option } from 'effect'
import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'
import { test as RadioGroupTest } from '@foldkit/ui/radioGroup'

import { ApplicationBlock } from './block'
import { ExportPng, SaveCanvas } from './command'
import {
  GridSizeRadioGroupBlock,
  PaletteRadioGroupBlock,
  ThemeListboxBlock,
  ToolRadioGroupBlock,
} from './components'
import { createEmptyGrid } from './grid'
import { Message } from './message'
import { type Model, type PaletteIndex } from './model'

const resolveFocusOption = Command.resolve(
  RadioGroupTest.FocusOption,
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
  errorDialog: DialogBlock.Model.make({
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
  gridSizeConfirmDialog: DialogBlock.Model.make({
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
    scene(
      ApplicationBlock,
      given(createTestModel()),
      click(role('button', { name: 'Export PNG' })),
      Command.expectExact(ExportPng),
      Command.resolve(ExportPng, Message.SucceededExportPng()),
      Command.expectNone(),
    ),
  )

  it.effect('failed export opens error dialog with message', () =>
    scene(
      ApplicationBlock,
      given(createTestModel()),
      click(role('button', { name: 'Export PNG' })),
      Command.resolve(
        ExportPng,
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      expect(text('Export Failed')).toExist(),
      expect(text('Canvas 2D context not available')).toExist(),
      expect(role('button', { name: 'Dismiss' })).toExist(),
    ),
  )

  it.effect('dismissing error dialog closes it', () =>
    scene(
      ApplicationBlock,
      given(createTestModel()),
      click(role('button', { name: 'Export PNG' })),
      Command.resolve(
        ExportPng,
        Message.FailedExportPng({ error: 'Canvas 2D context not available' }),
      ),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      expect(text('Export Failed')).toExist(),
      click(role('button', { name: 'Dismiss' })),
      Command.resolve(
        DialogTest.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      expect(text('Export Failed')).toBeAbsent(),
    ),
  )
})

describe('header', () => {
  it.effect('renders PixelForge title and Export PNG button', () =>
    scene(
      ApplicationBlock,
      given(createTestModel()),
      expect(role('heading', { name: 'PixelForge' })).toExist(),
      expect(role('button', { name: 'Export PNG' })).toExist(),
    ),
  )
})

describe('toolbar', () => {
  it.effect('Brush tool is selected by default', () =>
    scene(
      ApplicationBlock,
      given(createTestModel()),
      expect(role('radio', { name: /^Brush/, checked: true })).toExist(),
      expect(role('radio', { name: /^Fill/, checked: false })).toExist(),
      expect(role('radio', { name: /^Eraser/, checked: false })).toExist(),
    ),
  )

  it.effect('clear canvas button is disabled when canvas is empty', () =>
    scene(
      ApplicationBlock,
      given(createTestModel()),
      expect(role('button', { name: 'Clear Canvas' })).toBeDisabled(),
    ),
  )

  it.effect('clicking Fill tool selects it', () =>
    scene(
      ApplicationBlock,
      given(createTestModel()),
      click(role('radio', { name: /^Fill/ })),
      resolveFocusOption,
      expect(role('radio', { name: /^Fill/, checked: true })).toExist(),
      expect(role('radio', { name: /^Brush/, checked: false })).toExist(),
    ),
  )

  it.effect(
    'clear canvas enables after painting then disables after clearing',
    () =>
      scene(
        ApplicationBlock,
        given(createPaintedModel()),
        expect(role('button', { name: 'Clear Canvas' })).toBeEnabled(),
        click(role('button', { name: 'Clear Canvas' })),
        Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
        expect(role('button', { name: 'Clear Canvas' })).toBeDisabled(),
      ),
  )
})

describe('history panel', () => {
  it.effect('undo and redo buttons are disabled with no history', () =>
    scene(
      ApplicationBlock,
      given(createTestModel()),
      expect(role('button', { name: /^Undo/ })).toBeDisabled(),
      expect(role('button', { name: /^Redo/ })).toBeDisabled(),
    ),
  )

  it.effect('current history entry is visible', () =>
    scene(
      ApplicationBlock,
      given(createTestModel()),
      expect(text('Current')).toExist(),
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

    return scene(
      ApplicationBlock,
      given(modelWithHistory),
      expect(role('button', { name: /^Undo/ })).toBeEnabled(),
      expect(role('button', { name: /^Redo/ })).toBeDisabled(),
      click(role('button', { name: /^Undo/ })),
      Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
      expect(role('button', { name: /^Undo/ })).toBeDisabled(),
      expect(role('button', { name: /^Redo/ })).toBeEnabled(),
    )
  })
})

describe('grid size change', () => {
  it.effect('painted canvas opens confirmation dialog', () =>
    scene(
      ApplicationBlock,
      given(createPaintedModel()),
      click(role('radio', { name: '8' })),
      resolveFocusOption,
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      expect(text('Change to 8\u00d78?')).toExist(),
      expect(
        text('This will clear your canvas and reset undo history.'),
      ).toExist(),
      expect(role('button', { name: 'Cancel' })).toExist(),
      expect(role('button', { name: 'Clear and Resize' })).toExist(),
    ),
  )

  it.effect(
    'confirming grid size change closes dialog and saves canvas',
    () => {
      const paintedModel = modifyFields(createPaintedModel(), {
        undoStack: () => [createEmptyGrid(4)],
      })

      return scene(
        ApplicationBlock,
        given(paintedModel),
        click(role('radio', { name: '8' })),
        resolveFocusOption,
        Command.resolve(
          DialogTest.ShowDialog,
          DialogBlock.Message.SucceededShowDialog(),
        ),
        expect(text('Change to 8\u00d78?')).toExist(),
        click(role('button', { name: 'Clear and Resize' })),
        Command.resolve(
          DialogTest.CloseDialog,
          DialogBlock.Message.CompletedCloseDialog(),
        ),
        Command.resolve(SaveCanvas, Message.CompletedSaveCanvas()),
        expect(text('Change to 8\u00d78?')).toBeAbsent(),
      )
    },
  )

  it.effect('cancelling grid size change keeps current size', () =>
    scene(
      ApplicationBlock,
      given(createPaintedModel()),
      click(role('radio', { name: '8' })),
      resolveFocusOption,
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      expect(text('Change to 8\u00d78?')).toExist(),
      click(role('button', { name: 'Cancel' })),
      Command.resolve(
        DialogTest.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      expect(text('Change to 8\u00d78?')).toBeAbsent(),
    ),
  )
})

import { Option } from 'effect'
import { Scene, Ui } from 'foldkit'
import { describe, test } from 'vitest'

import { createEmptyGrid } from './grid'
import { type Model } from './model'
import { update } from './update'
import { view } from './view'

const emptyModel: Model = {
  grid: createEmptyGrid(4),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: 4,
  tool: 'Brush',
  mirrorMode: 'None',
  isDrawing: false,
  maybeHoveredCell: Option.none(),
  errorDialog: Ui.Dialog.init({ id: 'export-error-dialog' }),
  maybeExportError: Option.none(),
  paletteThemeIndex: 0,
  gridSizeConfirmDialog: Ui.Dialog.init({ id: 'grid-size-confirm-dialog' }),
  maybePendingGridSize: Option.none(),
  toolRadioGroup: Ui.RadioGroup.init({
    id: 'tool-picker',
    selectedValue: 'Brush',
  }),
  gridSizeRadioGroup: Ui.RadioGroup.init({
    id: 'grid-size-picker',
    selectedValue: '4',
    orientation: 'Horizontal',
  }),
  paletteRadioGroup: Ui.RadioGroup.init({
    id: 'palette-picker',
    selectedValue: '0',
    orientation: 'Horizontal',
  }),
  mirrorHorizontalSwitch: Ui.Switch.init({ id: 'mirror-horizontal' }),
  mirrorVerticalSwitch: Ui.Switch.init({ id: 'mirror-vertical' }),
  themeListbox: Ui.Listbox.init({ id: 'theme-picker', selectedItem: '0' }),
}

describe('scene', () => {
  test('header renders PixelForge title', () => {
    Scene.scene(
      { update, view },
      Scene.with(emptyModel),
      Scene.expect(Scene.role('heading', { name: 'PixelForge' })).toExist(),
    )
  })

  test('undo button is disabled when there is no history', () => {
    Scene.scene(
      { update, view },
      Scene.with(emptyModel),
      Scene.expect(Scene.role('button', { name: 'Undo\u2318Z' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Undo\u2318Z' }),
      ).toBeDisabled(),
    )
  })
})

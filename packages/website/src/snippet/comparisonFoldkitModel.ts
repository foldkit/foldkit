import { Schema as S } from 'effect'
import { Ui } from 'foldkit'

export const Model = S.Struct({
  grid: Grid,
  undoStack: S.Array(Grid),
  redoStack: S.Array(Grid),
  selectedColorIndex: PaletteIndex,
  gridSize: S.Number,
  tool: Tool,
  mirrorMode: MirrorMode,
  isDrawing: S.Boolean,
  maybeHoveredCell: S.OptionFromSelf(Position),
  errorDialog: Ui.Dialog.Model,
  maybeExportError: S.OptionFromSelf(S.String),
  paletteThemeIndex: S.Number,
  gridSizeConfirmDialog: Ui.Dialog.Model,
  maybePendingGridSize: S.OptionFromSelf(S.Number),
  toolRadioGroup: Ui.RadioGroup.Model,
  gridSizeRadioGroup: Ui.RadioGroup.Model,
  paletteRadioGroup: Ui.RadioGroup.Model,
  mirrorHorizontalSwitch: Ui.Switch.Model,
  mirrorVerticalSwitch: Ui.Switch.Model,
  themeListbox: Ui.Listbox.Model,
})

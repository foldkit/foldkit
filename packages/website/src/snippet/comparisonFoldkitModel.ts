import { Schema } from 'effect'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

export const Model = Schema.Struct({
  grid: Grid,
  undoStack: Schema.Array(Grid),
  redoStack: Schema.Array(Grid),
  selectedColorIndex: PaletteIndex,
  gridSize: Schema.Number,
  tool: Tool,
  mirrorMode: MirrorMode,
  isDrawing: Schema.Boolean,
  maybeHoveredCell: Schema.Option(Position),
  errorDialog: Dialog.Model,
  maybeExportError: Schema.Option(Schema.String),
  paletteThemeIndex: Schema.Number,
  gridSizeConfirmDialog: Dialog.Model,
  maybePendingGridSize: Schema.Option(Schema.Number),
  themeListbox: Listbox.Model,
  toolRadioGroup: RadioGroup.Model,
  gridSizeRadioGroup: RadioGroup.Model,
  paletteRadioGroup: RadioGroup.Model,
})

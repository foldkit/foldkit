import { Schema } from 'effect'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

const ThemeListbox = Listbox.makeBlock()
const ToolRadioGroup = RadioGroup.makeBlock<Tool>()
const GridSizeRadioGroup = RadioGroup.makeBlock()
const PaletteRadioGroup = RadioGroup.makeBlock()

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
  errorDialog: Dialog.Dialog,
  maybeExportError: Schema.Option(Schema.String),
  paletteThemeIndex: Schema.Number,
  gridSizeConfirmDialog: Dialog.Dialog,
  maybePendingGridSize: Schema.Option(Schema.Number),
  themeListbox: ThemeListbox,
  toolRadioGroup: ToolRadioGroup,
  gridSizeRadioGroup: GridSizeRadioGroup,
  paletteRadioGroup: PaletteRadioGroup,
})
export type Model = typeof Model.Type

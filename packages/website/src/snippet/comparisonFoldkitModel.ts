import { Schema } from 'effect'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

const ThemeListbox = Listbox.makeBlock<Theme>()
const ToolRadioGroup = RadioGroup.makeBlock<Tool>()
const GridSizeRadioGroup = RadioGroup.makeBlock<number>()
const PaletteRadioGroup = RadioGroup.makeBlock<PaletteIndex>()

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
  errorDialog: Dialog.DialogBlock.Model,
  maybeExportError: Schema.Option(Schema.String),
  paletteThemeIndex: Schema.Number,
  gridSizeConfirmDialog: Dialog.DialogBlock.Model,
  maybePendingGridSize: Schema.Option(Schema.Number),
  themeListbox: ThemeListbox.Model,
  toolRadioGroup: ToolRadioGroup.Model,
  gridSizeRadioGroup: GridSizeRadioGroup.Model,
  paletteRadioGroup: PaletteRadioGroup.Model,
})
export type Model = typeof Model.Type

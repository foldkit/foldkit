import { Schema } from 'effect'

import { DialogBlock } from '@foldkit/ui/dialog'
import { makeBlock as makeListboxBlock } from '@foldkit/ui/listbox'
import { makeBlock as makeRadioGroupBlock } from '@foldkit/ui/radioGroup'

const ThemeListbox = makeListboxBlock<Theme>()
const ToolRadioGroup = makeRadioGroupBlock<Tool>()
const GridSizeRadioGroup = makeRadioGroupBlock<number>()
const PaletteRadioGroup = makeRadioGroupBlock<PaletteIndex>()

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
  errorDialog: DialogBlock.Model,
  maybeExportError: Schema.Option(Schema.String),
  paletteThemeIndex: Schema.Number,
  gridSizeConfirmDialog: DialogBlock.Model,
  maybePendingGridSize: Schema.Option(Schema.Number),
  themeListbox: ThemeListbox.Model,
  toolRadioGroup: ToolRadioGroup.Model,
  gridSizeRadioGroup: GridSizeRadioGroup.Model,
  paletteRadioGroup: PaletteRadioGroup.Model,
})
export type Model = typeof Model.Type

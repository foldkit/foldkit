import { Schema as S } from 'effect'
import { Ui } from 'foldkit'

// CONSTANT

export const PaletteIndex = S.Literals([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
])
export type PaletteIndex = typeof PaletteIndex.Type

export const HexColor = S.String.check(S.isPattern(/^#[0-9a-f]{6}$/)).pipe(
  S.brand('HexColor'),
)
export type HexColor = typeof HexColor.Type

export const Tool = S.Literals(['Brush', 'Fill', 'Eraser'])
export type Tool = typeof Tool.Type

export const MirrorMode = S.Literals(['None', 'Horizontal', 'Vertical', 'Both'])
export type MirrorMode = typeof MirrorMode.Type

export const Cell = S.Option(PaletteIndex)
export type Cell = typeof Cell.Type

const Row = S.Array(Cell)
export const Grid = S.Array(Row)
export type Grid = typeof Grid.Type

export const Position = S.Struct({ x: S.Number, y: S.Number })

const SavedCell = S.Option(PaletteIndex)
const SavedRow = S.Array(SavedCell)
const SavedGrid = S.Array(SavedRow)

export const SavedCanvas = S.Struct({
  grid: SavedGrid,
  gridSize: S.Number,
  paletteThemeIndex: S.Number,
  selectedColorIndex: PaletteIndex,
})
export type SavedCanvas = typeof SavedCanvas.Type

// MODEL

export const Model = S.Struct({
  grid: Grid,
  undoStack: S.Array(Grid),
  redoStack: S.Array(Grid),
  selectedColorIndex: PaletteIndex,
  gridSize: S.Number,
  tool: Tool,
  mirrorMode: MirrorMode,
  isDrawing: S.Boolean,
  maybeHoveredCell: S.Option(Position),
  errorDialog: Ui.Dialog.Model,
  maybeExportError: S.Option(S.String),
  paletteThemeIndex: S.Number,
  gridSizeConfirmDialog: Ui.Dialog.Model,
  maybePendingGridSize: S.Option(S.Number),
  toolRadioGroup: Ui.RadioGroup.Model,
  gridSizeRadioGroup: Ui.RadioGroup.Model,
  paletteRadioGroup: Ui.RadioGroup.Model,
  mirrorHorizontalSwitch: Ui.Switch.Model,
  mirrorVerticalSwitch: Ui.Switch.Model,
  themeListbox: Ui.Listbox.Model,
})
export type Model = typeof Model.Type

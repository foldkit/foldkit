import { Option, Schema } from 'effect'

import { DialogBlock } from '@foldkit/ui'

import {
  GridSizeRadioGroupBlock,
  PaletteRadioGroupBlock,
  ThemeListboxBlock,
  ToolRadioGroupBlock,
} from './components'

// CONSTANT

export const PaletteIndex = Schema.Literals([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
])
export type PaletteIndex = typeof PaletteIndex.Type

export const HexColor = Schema.String.check(
  Schema.isPattern(/^#[0-9a-f]{6}$/),
).pipe(Schema.brand('HexColor'))
export type HexColor = typeof HexColor.Type

export const Tool = Schema.Literals(['Brush', 'Fill', 'Eraser'])
export type Tool = typeof Tool.Type

export const MirrorMode = Schema.Literals([
  'None',
  'Horizontal',
  'Vertical',
  'Both',
])
export type MirrorMode = typeof MirrorMode.Type

export const Cell = Schema.Option(PaletteIndex)
export type Cell = typeof Cell.Type

const Row = Schema.Array(Cell)
type Row = typeof Row.Type
export const Grid = Schema.Array(Row)
export type Grid = typeof Grid.Type

export const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number })
export type Position = typeof Position.Type

const SavedCell = Schema.Option(PaletteIndex)
type SavedCell = typeof SavedCell.Type
const SavedRow = Schema.Array(SavedCell)
type SavedRow = typeof SavedRow.Type
const SavedGrid = Schema.Array(SavedRow)
type SavedGrid = typeof SavedGrid.Type

export const SavedCanvas = Schema.Struct({
  grid: SavedGrid,
  gridSize: Schema.Number,
  paletteThemeIndex: Schema.Number,
  selectedColorIndex: PaletteIndex,
})
export type SavedCanvas = typeof SavedCanvas.Type

export const SavedCanvasJsonString = Schema.fromJsonString(
  Schema.toCodecJson(SavedCanvas),
)
export type SavedCanvasJsonString = typeof SavedCanvasJsonString.Type

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
  themeListbox: ThemeListboxBlock.Model,
  toolRadioGroup: ToolRadioGroupBlock.Model,
  gridSizeRadioGroup: GridSizeRadioGroupBlock.Model,
  paletteRadioGroup: PaletteRadioGroupBlock.Model,
})
export type Model = typeof Model.Type

export const paletteIndexFromValue = (
  value: string,
  fallback: PaletteIndex,
): PaletteIndex =>
  Option.getOrElse(
    Schema.decodeUnknownOption(PaletteIndex)(Number(value)),
    () => fallback,
  )

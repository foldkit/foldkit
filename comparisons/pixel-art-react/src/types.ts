export type PaletteIndex =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15

export type Tool = 'Brush' | 'Fill' | 'Eraser'

export type MirrorMode = 'None' | 'Horizontal' | 'Vertical' | 'Both'

export type Cell = PaletteIndex | null

export type Grid = ReadonlyArray<ReadonlyArray<Cell>>

export type Position = Readonly<{ x: number; y: number }>

export type SavedCanvas = Readonly<{
  grid: Grid
  gridSize: number
  paletteThemeIndex: number
  selectedColorIndex: PaletteIndex
}>

export type State = Readonly<{
  grid: Grid
  undoStack: ReadonlyArray<Grid>
  redoStack: ReadonlyArray<Grid>
  selectedColorIndex: PaletteIndex
  gridSize: number
  tool: Tool
  mirrorMode: MirrorMode
  isDrawing: boolean
  hoveredCell: Position | null
  paletteThemeIndex: number
  exportError: string | null
  isErrorDialogOpen: boolean
  pendingGridSize: number | null
  isGridSizeDialogOpen: boolean
}>

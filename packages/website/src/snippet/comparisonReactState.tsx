type State = Readonly<{
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

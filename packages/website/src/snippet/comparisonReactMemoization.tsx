export const App = () => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const theme = useMemo(
    () => currentPaletteTheme(state.paletteThemeIndex),
    [state.paletteThemeIndex],
  )

  const handleExport = () => exportPng(state, dispatch)

  const currentGrid = useMemo(
    () =>
      state.isDrawing
        ? (state.undoStack[state.undoStack.length - 1] ?? state.grid)
        : state.grid,
    [state.isDrawing, state.undoStack, state.grid],
  )

  return (
    <div>
      <Header onExport={handleExport} />
      {/* Each child is wrapped in memo() and receives dispatch + state slices */}
      <Toolbar
        tool={state.tool}
        mirrorMode={state.mirrorMode}
        dispatch={dispatch}
      />
      <Canvas grid={state.grid} gridSize={state.gridSize} dispatch={dispatch} />
      <HistoryPanel undoStack={state.undoStack} dispatch={dispatch} />
    </div>
  )
}

// Every component receiving state slices is wrapped in memo()
const Toolbar = memo(function Toolbar({
  tool,
  mirrorMode,
  dispatch,
}: ToolbarProps) {
  // useCallback for every handler inside
})
const Canvas = memo(function Canvas({ grid, gridSize, dispatch }: CanvasProps) {
  // useCallback for every handler inside
})
const HistoryPanel = memo(function HistoryPanel({
  undoStack,
  dispatch,
}: HistoryProps) {
  // useCallback for every handler inside
})

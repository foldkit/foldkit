export const App = () => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const theme = useMemo(
    () => currentPaletteTheme(state.paletteThemeIndex),
    [state.paletteThemeIndex],
  )

  const stateRef = useRef(state)
  stateRef.current = state

  useKeyboardShortcuts(dispatch)
  useMouseRelease(state.isDrawing, dispatch)
  useLocalStorage(
    state.grid,
    state.gridSize,
    state.paletteThemeIndex,
    state.selectedColorIndex,
    state.isDrawing,
  )

  const handleExport = useCallback(() => {
    exportPng(stateRef.current, dispatch)
  }, [dispatch])

  const currentGrid = useMemo(
    () =>
      state.isDrawing
        ? (state.undoStack[state.undoStack.length - 1] ?? state.grid)
        : state.grid,
    [state.isDrawing, state.undoStack, state.grid],
  )

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Header onExport={handleExport} />
      <Toolbar
        tool={state.tool}
        mirrorMode={state.mirrorMode}
        selectedColorIndex={state.selectedColorIndex}
        gridSize={state.gridSize}
        grid={state.grid}
        paletteThemeIndex={state.paletteThemeIndex}
        theme={theme}
        dispatch={dispatch}
      />
      <Canvas
        grid={state.grid}
        gridSize={state.gridSize}
        tool={state.tool}
        mirrorMode={state.mirrorMode}
        hoveredCell={state.hoveredCell}
        isDrawing={state.isDrawing}
        selectedColorIndex={state.selectedColorIndex}
        paletteColors={theme.colors}
        dispatch={dispatch}
      />
      <HistoryPanel
        undoStack={state.undoStack}
        redoStack={state.redoStack}
        currentGrid={currentGrid}
        gridSize={state.gridSize}
        theme={theme}
        dispatch={dispatch}
      />
      <ErrorDialog
        isOpen={state.isErrorDialogOpen}
        exportError={state.exportError}
        dispatch={dispatch}
      />
      <ConfirmDialog
        isOpen={state.isGridSizeDialogOpen}
        pendingGridSize={state.pendingGridSize}
        dispatch={dispatch}
      />
    </div>
  )
}

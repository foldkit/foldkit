const useLocalStorage = (
  grid: Grid,
  gridSize: number,
  paletteThemeIndex: number,
  selectedColorIndex: PaletteIndex,
  isDrawing: boolean,
): void => {
  useEffect(() => {
    if (isDrawing) {
      return
    }

    try {
      const saved: SavedCanvas = {
        grid,
        gridSize,
        paletteThemeIndex,
        selectedColorIndex,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // Handle storage errors
    }
  }, [grid, gridSize, paletteThemeIndex, selectedColorIndex, isDrawing])
}

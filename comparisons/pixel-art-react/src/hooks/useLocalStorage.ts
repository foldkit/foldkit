import { useEffect } from 'react'

import { STORAGE_KEY } from '../constants'
import type { Grid, PaletteIndex, SavedCanvas } from '../types'

export const useLocalStorage = (
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
      // Silently fail on storage errors
    }
  }, [grid, gridSize, paletteThemeIndex, selectedColorIndex, isDrawing])
}

export const loadSavedCanvas = (): SavedCanvas | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'grid' in parsed &&
      'gridSize' in parsed &&
      'paletteThemeIndex' in parsed &&
      'selectedColorIndex' in parsed
    ) {
      return parsed as SavedCanvas
    }
    return null
  } catch {
    return null
  }
}

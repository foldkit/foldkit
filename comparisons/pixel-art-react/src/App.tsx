import { memo, useCallback, useMemo, useReducer, useRef } from 'react'

import { Canvas } from './components/Canvas'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ErrorDialog } from './components/ErrorDialog'
import { HistoryPanel } from './components/HistoryPanel'
import { Toolbar } from './components/Toolbar'
import {
  CANVAS_SIZE_PX,
  DEFAULT_COLOR_INDEX,
  DEFAULT_GRID_SIZE,
  DEFAULT_PALETTE_THEME_INDEX,
  EXPORT_SCALE,
} from './constants'
import { createEmptyGrid } from './grid'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { loadSavedCanvas, useLocalStorage } from './hooks/useLocalStorage'
import { useMouseRelease } from './hooks/useMouseRelease'
import { currentPaletteTheme, resolveColor } from './palette'
import { type Action, reducer } from './reducer'
import type { State } from './types'

const createInitialState = (): State => {
  const saved = loadSavedCanvas()
  if (saved !== null) {
    return {
      grid: saved.grid,
      gridSize: saved.gridSize,
      selectedColorIndex: saved.selectedColorIndex,
      paletteThemeIndex: saved.paletteThemeIndex,
      undoStack: [],
      redoStack: [],
      tool: 'Brush',
      mirrorMode: 'None',
      isDrawing: false,
      hoveredCell: null,
      exportError: null,
      isErrorDialogOpen: false,
      pendingGridSize: null,
      isGridSizeDialogOpen: false,
    }
  }
  return {
    grid: createEmptyGrid(DEFAULT_GRID_SIZE),
    gridSize: DEFAULT_GRID_SIZE,
    selectedColorIndex: DEFAULT_COLOR_INDEX,
    paletteThemeIndex: DEFAULT_PALETTE_THEME_INDEX,
    undoStack: [],
    redoStack: [],
    tool: 'Brush',
    mirrorMode: 'None',
    isDrawing: false,
    hoveredCell: null,
    exportError: null,
    isErrorDialogOpen: false,
    pendingGridSize: null,
    isGridSizeDialogOpen: false,
  }
}

const exportPng = (state: State, dispatch: React.Dispatch<Action>): void => {
  try {
    const theme = currentPaletteTheme(state.paletteThemeIndex)
    const scale =
      Math.max(1, Math.floor(CANVAS_SIZE_PX / state.gridSize)) * EXPORT_SCALE
    const canvasSize = state.gridSize * scale

    const canvas = document.createElement('canvas')
    canvas.width = canvasSize
    canvas.height = canvasSize
    const context = canvas.getContext('2d')
    if (context === null) {
      throw new Error('Could not get canvas context')
    }

    state.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        context.fillStyle = resolveColor(cell, theme)
        context.fillRect(x * scale, y * scale, scale, scale)
      })
    })

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = 'pixel-art.png'
    link.href = dataUrl
    link.click()
  } catch (error) {
    dispatch({
      type: 'ExportFailed',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const App = () => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const theme = useMemo(
    () => currentPaletteTheme(state.paletteThemeIndex),
    [state.paletteThemeIndex],
  )

  const paletteColors = theme.colors

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
      <div className="flex-1 grid gap-6 p-4 md:p-6 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-[auto_1fr_auto] md:justify-center md:items-start max-w-5xl mx-auto w-full">
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
          paletteColors={paletteColors}
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
      </div>
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

const DownloadIcon = () => (
  <svg
    aria-hidden="true"
    className="w-4 h-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
)

const Header = memo(function Header({
  onExport,
}: Readonly<{ onExport: () => void }>) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <div className="flex flex-col">
        <h1 className="text-lg font-bold tracking-tight leading-none mb-1">
          PixelForge
        </h1>
        <div className="flex items-center gap-1 text-xs text-gray-400 leading-none">
          <span>Built with React</span>
          <span>/</span>
          <a
            href="https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-react"
            className="hover:text-gray-200 transition"
          >
            Source on GitHub
          </a>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onExport}
          className="px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none flex items-center gap-2 hover:bg-gray-700 cursor-pointer"
        >
          <DownloadIcon />
          <span>Export PNG</span>
        </button>
      </div>
    </div>
  )
})

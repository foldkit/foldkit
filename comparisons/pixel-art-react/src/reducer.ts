import { DEFAULT_COLOR_INDEX } from './constants'
import {
  createEmptyGrid,
  erasePixels,
  floodFill,
  getMirroredPositions,
  isGridEmpty,
  pushHistory,
  setPixels,
} from './grid'
import { PALETTE_THEMES } from './palette'
import type { MirrorMode, PaletteIndex, State, Tool } from './types'

// ACTION

export type Action =
  | Readonly<{ type: 'PressedCell'; x: number; y: number }>
  | Readonly<{ type: 'EnteredCell'; x: number; y: number }>
  | Readonly<{ type: 'LeftCanvas' }>
  | Readonly<{ type: 'ReleasedMouse' }>
  | Readonly<{ type: 'SelectedColor'; colorIndex: PaletteIndex }>
  | Readonly<{ type: 'SelectedTool'; tool: Tool }>
  | Readonly<{ type: 'SelectedGridSize'; size: number }>
  | Readonly<{ type: 'ToggledMirrorHorizontal' }>
  | Readonly<{ type: 'ToggledMirrorVertical' }>
  | Readonly<{ type: 'ClickedUndo' }>
  | Readonly<{ type: 'ClickedRedo' }>
  | Readonly<{ type: 'ClickedHistoryStep'; stepIndex: number }>
  | Readonly<{ type: 'ClickedRedoStep'; stepIndex: number }>
  | Readonly<{ type: 'ClickedClear' }>
  | Readonly<{ type: 'SelectedPaletteTheme'; themeIndex: number }>
  | Readonly<{ type: 'ExportFailed'; error: string }>
  | Readonly<{ type: 'DismissedErrorDialog' }>
  | Readonly<{ type: 'ConfirmedGridSizeChange' }>
  | Readonly<{ type: 'DismissedGridSizeDialog' }>

// HELPERS

const applyBrush = (state: State, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, state.gridSize, state.mirrorMode)
  return setPixels(state.grid, positions, state.selectedColorIndex)
}

const applyEraser = (state: State, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, state.gridSize, state.mirrorMode)
  return erasePixels(state.grid, positions)
}

const applyFill = (state: State, x: number, y: number) => {
  const positions = getMirroredPositions(x, y, state.gridSize, 'None')
  return positions.reduce(
    (currentGrid, [fillX, fillY]) =>
      floodFill(currentGrid, fillX, fillY, state.selectedColorIndex),
    state.grid,
  )
}

const nextMirrorModeForHorizontalToggle = (
  mirrorMode: MirrorMode,
): MirrorMode => {
  switch (mirrorMode) {
    case 'None':
      return 'Horizontal'
    case 'Horizontal':
      return 'None'
    case 'Vertical':
      return 'Both'
    case 'Both':
      return 'Vertical'
  }
}

const nextMirrorModeForVerticalToggle = (
  mirrorMode: MirrorMode,
): MirrorMode => {
  switch (mirrorMode) {
    case 'None':
      return 'Vertical'
    case 'Vertical':
      return 'None'
    case 'Horizontal':
      return 'Both'
    case 'Both':
      return 'Horizontal'
  }
}

const applyGridSizeChange = (state: State, size: number): State => ({
  ...state,
  grid: createEmptyGrid(size),
  gridSize: size,
  undoStack: [],
  redoStack: [],
  isDrawing: false,
  hoveredCell: null,
})

// REDUCER

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'PressedCell': {
      const { x, y } = action
      switch (state.tool) {
        case 'Brush':
          return {
            ...state,
            grid: applyBrush(state, x, y),
            undoStack: pushHistory(state.undoStack, state.grid),
            redoStack: [],
            isDrawing: true,
          }
        case 'Fill':
          return {
            ...state,
            grid: applyFill(state, x, y),
            undoStack: pushHistory(state.undoStack, state.grid),
            redoStack: [],
          }
        case 'Eraser':
          return {
            ...state,
            grid: applyEraser(state, x, y),
            undoStack: pushHistory(state.undoStack, state.grid),
            redoStack: [],
            isDrawing: true,
          }
      }
      break
    }

    case 'EnteredCell': {
      const { x, y } = action
      const withHover: State = {
        ...state,
        hoveredCell: { x, y },
      }

      if (state.isDrawing && state.tool === 'Brush') {
        return { ...withHover, grid: applyBrush(state, x, y) }
      }

      if (state.isDrawing && state.tool === 'Eraser') {
        return { ...withHover, grid: applyEraser(state, x, y) }
      }

      return withHover
    }

    case 'LeftCanvas':
      return { ...state, hoveredCell: null }

    case 'ReleasedMouse':
      if (!state.isDrawing) {
        return state
      }
      return { ...state, isDrawing: false }

    case 'SelectedColor':
      return { ...state, selectedColorIndex: action.colorIndex }

    case 'SelectedTool':
      return { ...state, tool: action.tool }

    case 'SelectedGridSize': {
      const { size } = action
      if (size === state.gridSize) {
        return state
      }
      if (isGridEmpty(state.grid)) {
        return applyGridSizeChange(state, size)
      }
      return {
        ...state,
        pendingGridSize: size,
        isGridSizeDialogOpen: true,
      }
    }

    case 'ToggledMirrorHorizontal':
      return {
        ...state,
        mirrorMode: nextMirrorModeForHorizontalToggle(state.mirrorMode),
      }

    case 'ToggledMirrorVertical':
      return {
        ...state,
        mirrorMode: nextMirrorModeForVerticalToggle(state.mirrorMode),
      }

    case 'ClickedUndo': {
      if (state.undoStack.length === 0) {
        return state
      }
      const previousGrid = state.undoStack[state.undoStack.length - 1]!
      return {
        ...state,
        grid: previousGrid,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.grid],
      }
    }

    case 'ClickedRedo': {
      if (state.redoStack.length === 0) {
        return state
      }
      const nextGrid = state.redoStack[state.redoStack.length - 1]!
      return {
        ...state,
        grid: nextGrid,
        undoStack: [...state.undoStack, state.grid],
        redoStack: state.redoStack.slice(0, -1),
      }
    }

    case 'ClickedHistoryStep': {
      const targetGrid = state.undoStack[action.stepIndex]
      if (targetGrid === undefined) {
        return state
      }
      const statesAfterTarget = state.undoStack.slice(action.stepIndex + 1)
      return {
        ...state,
        grid: targetGrid,
        undoStack: state.undoStack.slice(0, action.stepIndex),
        redoStack: [
          ...state.redoStack,
          state.grid,
          ...statesAfterTarget.toReversed(),
        ],
      }
    }

    case 'ClickedRedoStep': {
      const targetGrid = state.redoStack[action.stepIndex]
      if (targetGrid === undefined) {
        return state
      }
      const statesBetweenCurrentAndTarget = state.redoStack.slice(
        action.stepIndex + 1,
      )
      return {
        ...state,
        grid: targetGrid,
        undoStack: [
          ...state.undoStack,
          state.grid,
          ...statesBetweenCurrentAndTarget.toReversed(),
        ],
        redoStack: state.redoStack.slice(0, action.stepIndex),
      }
    }

    case 'ClickedClear':
      return {
        ...state,
        grid: createEmptyGrid(state.gridSize),
        undoStack: pushHistory(state.undoStack, state.grid),
        redoStack: [],
      }

    case 'SelectedPaletteTheme': {
      const nextTheme = PALETTE_THEMES[action.themeIndex]
      if (nextTheme === undefined) {
        return state
      }
      return {
        ...state,
        paletteThemeIndex: action.themeIndex,
        selectedColorIndex: DEFAULT_COLOR_INDEX,
      }
    }

    case 'ExportFailed':
      return {
        ...state,
        exportError: action.error,
        isErrorDialogOpen: true,
      }

    case 'DismissedErrorDialog':
      return {
        ...state,
        exportError: null,
        isErrorDialogOpen: false,
      }

    case 'ConfirmedGridSizeChange': {
      if (state.pendingGridSize === null) {
        return state
      }
      return {
        ...applyGridSizeChange(state, state.pendingGridSize),
        pendingGridSize: null,
        isGridSizeDialogOpen: false,
      }
    }

    case 'DismissedGridSizeDialog':
      return {
        ...state,
        pendingGridSize: null,
        isGridSizeDialogOpen: false,
      }
  }
}

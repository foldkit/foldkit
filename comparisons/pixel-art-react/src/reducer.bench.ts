import { bench, describe } from 'vitest'

import { createEmptyGrid } from './grid'
import { type Action, reducer } from './reducer'
import type { State } from './types'

const GRID_SIZE = 16

const initialState: State = {
  grid: createEmptyGrid(GRID_SIZE),
  undoStack: [],
  redoStack: [],
  selectedColorIndex: 0,
  gridSize: GRID_SIZE,
  tool: 'Brush',
  mirrorMode: 'None',
  isDrawing: false,
  hoveredCell: null,
  paletteThemeIndex: 0,
  exportError: null,
  isErrorDialogOpen: false,
  pendingGridSize: null,
  isGridSizeDialogOpen: false,
}

const dispatch = (state: State, ...actions: ReadonlyArray<Action>): State =>
  actions.reduce<State>(
    (currentState, action) => reducer(currentState, action),
    state,
  )

const buildHistoryState = (steps: number): State => {
  let state = initialState
  for (let i = 0; i < steps; i++) {
    const x = i % GRID_SIZE
    const y = Math.floor(i / GRID_SIZE) % GRID_SIZE
    state = dispatch(
      state,
      { type: 'PressedCell', x, y },
      { type: 'ReleasedMouse' },
    )
  }
  return state
}

describe('reducer: single operations', () => {
  bench('brush stroke (press + release)', () => {
    dispatch(
      initialState,
      { type: 'PressedCell', x: 5, y: 5 },
      { type: 'ReleasedMouse' },
    )
  })

  bench('brush drag (5 cells)', () => {
    dispatch(
      initialState,
      { type: 'PressedCell', x: 0, y: 0 },
      { type: 'EnteredCell', x: 1, y: 0 },
      { type: 'EnteredCell', x: 2, y: 0 },
      { type: 'EnteredCell', x: 3, y: 0 },
      { type: 'EnteredCell', x: 4, y: 0 },
      { type: 'ReleasedMouse' },
    )
  })

  bench('flood fill (empty grid)', () => {
    dispatch(
      { ...initialState, tool: 'Fill' },
      { type: 'PressedCell', x: 0, y: 0 },
    )
  })
})

describe('reducer: undo/redo with history', () => {
  const stateWith10Steps = buildHistoryState(10)
  const stateWith30Steps = buildHistoryState(30)

  bench('undo (10 history entries)', () => {
    dispatch(stateWith10Steps, { type: 'ClickedUndo' })
  })

  bench('undo (30 history entries)', () => {
    dispatch(stateWith30Steps, { type: 'ClickedUndo' })
  })

  bench('5x undo then 5x redo', () => {
    let state = stateWith10Steps
    for (let i = 0; i < 5; i++) {
      state = reducer(state, { type: 'ClickedUndo' })
    }
    for (let i = 0; i < 5; i++) {
      state = reducer(state, { type: 'ClickedRedo' })
    }
  })
})

describe('reducer: paint sequence (16x16 grid)', () => {
  bench('paint 50 random cells', () => {
    let state = initialState
    for (let i = 0; i < 50; i++) {
      const x = (i * 7 + 3) % GRID_SIZE
      const y = (i * 11 + 5) % GRID_SIZE
      state = dispatch(
        state,
        { type: 'PressedCell', x, y },
        { type: 'ReleasedMouse' },
      )
    }
  })

  bench('paint 50 cells with mirror mode', () => {
    let state: State = { ...initialState, mirrorMode: 'Both' }
    for (let i = 0; i < 50; i++) {
      const x = (i * 7 + 3) % GRID_SIZE
      const y = (i * 11 + 5) % GRID_SIZE
      state = dispatch(
        state,
        { type: 'PressedCell', x, y },
        { type: 'ReleasedMouse' },
      )
    }
  })
})

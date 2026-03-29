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
        // ...
      }
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
    // ... 17 more cases
  }
}

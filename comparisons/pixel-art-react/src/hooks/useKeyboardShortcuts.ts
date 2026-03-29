import { useEffect } from 'react'

import type { Action } from '../reducer'

export const useKeyboardShortcuts = (
  dispatch: React.Dispatch<Action>,
): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey

      if (isModifier && event.shiftKey && event.key === 'z') {
        event.preventDefault()
        dispatch({ type: 'ClickedRedo' })
        return
      }

      if (isModifier && event.key === 'z') {
        event.preventDefault()
        dispatch({ type: 'ClickedUndo' })
        return
      }

      if (isModifier && event.key === 'y') {
        event.preventDefault()
        dispatch({ type: 'ClickedRedo' })
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'b':
          dispatch({ type: 'SelectedTool', tool: 'Brush' })
          break
        case 'f':
          dispatch({ type: 'SelectedTool', tool: 'Fill' })
          break
        case 'e':
          dispatch({ type: 'SelectedTool', tool: 'Eraser' })
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])
}

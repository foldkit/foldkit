import { useEffect } from 'react'

import type { Action } from '../reducer'

export const useMouseRelease = (
  isDrawing: boolean,
  dispatch: React.Dispatch<Action>,
): void => {
  useEffect(() => {
    if (!isDrawing) {
      return
    }

    const handleMouseUp = () => {
      dispatch({ type: 'ReleasedMouse' })
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [isDrawing, dispatch])
}

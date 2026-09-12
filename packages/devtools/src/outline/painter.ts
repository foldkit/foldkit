import type { OutlineRect } from './types.js'

export type OutlinePainter = Readonly<{
  pushRects: (rects: ReadonlyArray<OutlineRect>) => void
  applyScroll: (deltaX: number, deltaY: number) => void
  resize: (width: number, height: number, dpr: number) => void
  setVisible: (visible: boolean) => void
  clear: () => void
}>

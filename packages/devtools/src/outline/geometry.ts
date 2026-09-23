import { MAX_CANVAS_DIM, MAX_DPR } from './constants.js'

export const getDpr = (): number =>
  Math.min(window.devicePixelRatio || 1, MAX_DPR)

export const clampedCanvasSize = (size: number, dpr: number): number =>
  Math.min(size * dpr, MAX_CANVAS_DIM * dpr)

import { MONO_FONT, PRIMARY_COLOR, TOTAL_FRAMES } from './constants.js'
import { buildLabels, mergeOverlappingLabels } from './labels.js'
import { advanceOutlines, expireOutlines } from './model.js'
import type { ActiveOutline } from './types.js'

const PRIMARY_RGB: readonly [number, number, number] = [115, 97, 230]
const HOT_RGB: readonly [number, number, number] = [239, 68, 68]

const heatColor = (count: number): string => {
  const heat = Math.min(count / 5, 1)
  const red = Math.round(PRIMARY_RGB[0] + (HOT_RGB[0] - PRIMARY_RGB[0]) * heat)
  const green = Math.round(
    PRIMARY_RGB[1] + (HOT_RGB[1] - PRIMARY_RGB[1]) * heat,
  )
  const blue = Math.round(PRIMARY_RGB[2] + (HOT_RGB[2] - PRIMARY_RGB[2]) * heat)
  return `${red},${green},${blue}`
}

export function initCanvas(
  canvas: HTMLCanvasElement,
  dpr: number,
): CanvasRenderingContext2D | null
export function initCanvas(
  canvas: OffscreenCanvas,
  dpr: number,
): OffscreenCanvasRenderingContext2D | null
export function initCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  dpr: number,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (ctx) {
    ctx.scale(dpr, dpr)
  }
  return ctx
}

export const buildRectMap = (
  activeOutlines: Map<string, ActiveOutline>,
): Map<
  string,
  {
    x: number
    y: number
    width: number
    height: number
    alpha: number
    color: string
  }
> => {
  const rectMap = new Map<
    string,
    {
      x: number
      y: number
      width: number
      height: number
      alpha: number
      color: string
    }
  >()
  for (const outline of activeOutlines.values()) {
    const alpha = 1 - (outline.frame - 1) / TOTAL_FRAMES
    const rectKey = `${outline.targetX},${outline.targetY},${outline.targetWidth},${outline.targetHeight}`
    const color = heatColor(outline.count)
    const existing = rectMap.get(rectKey)
    if (!existing || alpha > existing.alpha) {
      rectMap.set(rectKey, {
        x: outline.x,
        y: outline.y,
        width: outline.width,
        height: outline.height,
        alpha,
        color,
      })
    }
  }
  return rectMap
}

const setTextRenderingOptimizeSpeed = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
): void => {
  if ('textRendering' in ctx) {
    Reflect.set(ctx, 'textRendering', 'optimizeSpeed')
  }
}

export const drawFrame = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  dpr: number,
  activeOutlines: Map<string, ActiveOutline>,
): boolean => {
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

  advanceOutlines(activeOutlines)

  const rectMap = buildRectMap(activeOutlines)

  for (const { x, y, width, height, alpha, color } of rectMap.values()) {
    ctx.strokeStyle = `rgba(${color},${alpha})`
    ctx.lineWidth = 1
    const rx = Math.round(x) + 0.5
    const ry = Math.round(y) + 0.5
    const rw = Math.round(width)
    const rh = Math.round(height)
    ctx.beginPath()
    ctx.rect(rx, ry, rw, rh)
    ctx.stroke()
    ctx.fillStyle = `rgba(${color},${alpha * 0.1})`
    ctx.fill()
  }

  setTextRenderingOptimizeSpeed(ctx)
  ctx.font = `11px ${MONO_FONT}`

  const labels = buildLabels(activeOutlines, ctx)

  expireOutlines(activeOutlines)

  const merged = mergeOverlappingLabels(labels, ctx)

  for (const label of merged) {
    let labelY = label.y - label.height - 4
    if (labelY < 0) {
      labelY = 0
    }
    ctx.fillStyle = `rgba(${PRIMARY_COLOR},${label.alpha})`
    ctx.fillRect(label.x, labelY, label.width + 4, label.height + 4)
    ctx.fillStyle = `rgba(255,255,255,${label.alpha})`
    ctx.fillText(label.text, label.x + 2, labelY + label.height)
  }

  return activeOutlines.size > 0
}

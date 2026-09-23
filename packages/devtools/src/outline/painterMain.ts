import { Effect } from 'effect'

import { OUTLINE_Z_INDEX } from './constants.js'
import { makeDrawLoop } from './drawLoop.js'
import { clampedCanvasSize, getDpr } from './geometry.js'
import { updateOutlines, updateScroll } from './model.js'
import type { OutlinePainter } from './painter.js'
import { drawFrame, initCanvas } from './render.js'
import type { ActiveOutline, OutlineRect } from './types.js'

export type CanvasHolder = { el: HTMLCanvasElement }

const isCanvasNeutered = (canvasEl: HTMLCanvasElement): boolean => {
  try {
    const maybe = canvasEl.getContext('2d')
    return maybe === null && canvasEl.width === 0 && canvasEl.height === 0
  } catch {
    return true
  }
}

const recreateCanvasIfNeutered = (
  canvasHolder: CanvasHolder,
  isVisible: boolean,
): HTMLCanvasElement => {
  const canvas = canvasHolder.el
  let isNeutered = false
  try {
    const testCtx = canvas.getContext('2d')
    if (testCtx === null) {
      const width = canvas.width
      const height = canvas.height
      if (width === 0 || height === 0) {
        isNeutered = true
      } else {
        try {
          canvas.width = canvas.width
        } catch {
          isNeutered = true
        }
      }
    }
  } catch {
    isNeutered = true
  }
  if (!isNeutered) {
    return canvas
  }
  const dpr = getDpr()
  const replacement = document.createElement('canvas')
  replacement.dataset['foldkitOutlines'] = 'true'
  replacement.style.position = 'fixed'
  replacement.style.inset = '0'
  replacement.style.width = `${window.innerWidth}px`
  replacement.style.height = `${window.innerHeight}px`
  replacement.style.pointerEvents = 'none'
  replacement.style.zIndex = OUTLINE_Z_INDEX
  replacement.style.display = isVisible ? 'block' : 'none'
  replacement.width = clampedCanvasSize(window.innerWidth, dpr)
  replacement.height = clampedCanvasSize(window.innerHeight, dpr)
  canvas.replaceWith(replacement)
  return replacement
}

export const acquireMainPainter = (
  canvasHolder: CanvasHolder,
  getEnabled: () => boolean,
) =>
  Effect.gen(function* () {
    let canvas = canvasHolder.el
    let ctx: CanvasRenderingContext2D | null = null
    let dpr = getDpr()

    if (isCanvasNeutered(canvas)) {
      canvas = recreateCanvasIfNeutered(canvasHolder, getEnabled() === true)
      canvasHolder.el = canvas
    }
    ctx = initCanvas(canvas, dpr)

    const activeOutlines = new Map<string, ActiveOutline>()

    const drawLoop = makeDrawLoop(() => {
      if (!ctx) {
        return false
      }
      if (getEnabled() !== true) {
        return false
      }
      return drawFrame(ctx, canvas, getDpr(), activeOutlines)
    })

    const scheduleIfStoreHasOutlines = (): void => {
      if (activeOutlines.size > 0) {
        drawLoop.schedule()
      }
    }

    const painter: OutlinePainter = {
      pushRects: (rects: ReadonlyArray<OutlineRect>) => {
        updateOutlines(activeOutlines, rects)
        drawLoop.schedule()
      },
      applyScroll: (deltaX, deltaY) => {
        if (activeOutlines.size > 0) {
          updateScroll(activeOutlines, deltaX, deltaY)
          scheduleIfStoreHasOutlines()
        }
      },
      resize: (width, height, nextDpr) => {
        dpr = nextDpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        canvas.width = clampedCanvasSize(width, dpr)
        canvas.height = clampedCanvasSize(height, dpr)
        if (ctx) {
          ctx.resetTransform()
          ctx.scale(dpr, dpr)
        }
        scheduleIfStoreHasOutlines()
      },
      setVisible: visible => {
        canvas.style.display = visible ? 'block' : 'none'
      },
      clear: () => {
        drawLoop.cancel()
        activeOutlines.clear()
        if (ctx) {
          const currentDpr = getDpr()
          ctx.clearRect(
            0,
            0,
            canvas.width / currentDpr,
            canvas.height / currentDpr,
          )
        }
      },
    }

    yield* Effect.addFinalizer(() => Effect.sync(() => drawLoop.cancel()))

    return painter
  })

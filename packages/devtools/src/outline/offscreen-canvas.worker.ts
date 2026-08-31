// oxlint-disable foldkit/no-module-level-mutable-state
import { Match } from 'effect'

import { makeWorkerDrawLoop } from './drawLoop.js'
import { clampedCanvasSize } from './geometry.js'
import { updateOutlines, updateScroll } from './model.js'
import type { WorkerWireMessage } from './protocol.js'
import { drawFrame, initCanvas } from './render.js'
import type { ActiveOutline } from './types.js'

let canvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null
let dpr = 1
const activeOutlines = new Map<string, ActiveOutline>()

const runDraw = (): boolean => {
  if (!ctx || !canvas) {
    return false
  }
  return drawFrame(ctx, canvas, dpr, activeOutlines)
}

const drawLoop = makeWorkerDrawLoop(runDraw)

const scheduleDraw = (): void => {
  drawLoop.schedule()
}

const handleWireMessage = (data: WorkerWireMessage): void => {
  Match.value(data).pipe(
    Match.discriminatorsExhaustive('type')({
      init: message => {
        canvas = message.canvas
        dpr = message.dpr
        canvas.width = clampedCanvasSize(message.width, dpr)
        canvas.height = clampedCanvasSize(message.height, dpr)
        ctx = initCanvas(canvas, dpr)
      },
      'draw-outlines': message => {
        updateOutlines(activeOutlines, message.rects)
        scheduleDraw()
      },
      scroll: message => {
        if (activeOutlines.size > 0) {
          updateScroll(activeOutlines, message.deltaX, message.deltaY)
          scheduleDraw()
        }
      },
      resize: message => {
        if (!canvas || !ctx) {
          return
        }
        dpr = message.dpr
        canvas.width = clampedCanvasSize(message.width, dpr)
        canvas.height = clampedCanvasSize(message.height, dpr)
        ctx.resetTransform()
        ctx.scale(dpr, dpr)
        if (activeOutlines.size > 0) {
          scheduleDraw()
        }
      },
      clear: () => {
        activeOutlines.clear()
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
        }
        drawLoop.cancel()
      },
    }),
  )
}

self.onmessage = (event: MessageEvent<WorkerWireMessage>): void => {
  handleWireMessage(event.data)
}

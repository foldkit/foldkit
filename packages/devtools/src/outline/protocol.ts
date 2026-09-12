/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { Schema } from 'effect'
import { OutlineRectBatch } from 'foldkit/outline'

import type { OutlineRect } from './types.js'

export const WorkerWireInit = Schema.Struct({
  type: Schema.Literal('init'),
  canvas: Schema.Unknown,
  width: Schema.Number,
  height: Schema.Number,
  dpr: Schema.Number,
})

export const WorkerWireDrawOutlines = Schema.Struct({
  type: Schema.Literal('draw-outlines'),
  rects: OutlineRectBatch,
})

export const WorkerWireScroll = Schema.Struct({
  type: Schema.Literal('scroll'),
  deltaX: Schema.Number,
  deltaY: Schema.Number,
})

export const WorkerWireResize = Schema.Struct({
  type: Schema.Literal('resize'),
  width: Schema.Number,
  height: Schema.Number,
  dpr: Schema.Number,
})

export const WorkerWireClear = Schema.Struct({
  type: Schema.Literal('clear'),
})

export const WorkerWireMessage = Schema.Union([
  WorkerWireInit,
  WorkerWireDrawOutlines,
  WorkerWireScroll,
  WorkerWireResize,
  WorkerWireClear,
])
export type WorkerWireMessage = typeof WorkerWireMessage.Type

export const decodeWorkerWireMessage =
  Schema.decodeUnknownOption(WorkerWireMessage)

export type WorkerWireEnvelope = Readonly<{
  message: WorkerWireMessage
  transfer?: ReadonlyArray<Transferable>
}>

export const workerWireInit = (
  canvas: OffscreenCanvas,
  width: number,
  height: number,
  dpr: number,
): WorkerWireEnvelope => {
  const transfer: ReadonlyArray<Transferable> = [canvas]
  return {
    message: WorkerWireInit.make({
      type: 'init',
      canvas,
      width,
      height,
      dpr,
    }),
    transfer,
  }
}

export const workerWireDrawOutlines = (
  rects: ReadonlyArray<OutlineRect>,
): WorkerWireEnvelope => ({
  message: WorkerWireDrawOutlines.make({
    type: 'draw-outlines',
    rects,
  }),
})

export const workerWireScroll = (
  deltaX: number,
  deltaY: number,
): WorkerWireEnvelope => ({
  message: WorkerWireScroll.make({
    type: 'scroll',
    deltaX,
    deltaY,
  }),
})

export const workerWireResize = (
  width: number,
  height: number,
  dpr: number,
): WorkerWireEnvelope => ({
  message: WorkerWireResize.make({
    type: 'resize',
    width,
    height,
    dpr,
  }),
})

export const workerWireClear = (): WorkerWireEnvelope => ({
  message: WorkerWireClear.make({ type: 'clear' }),
})

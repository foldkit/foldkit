import type { OutlineRect } from './types.js'

export type WorkerWireMessage =
  | Readonly<{
      type: 'init'
      canvas: OffscreenCanvas
      width: number
      height: number
      dpr: number
    }>
  | Readonly<{
      type: 'draw-outlines'
      rects: ReadonlyArray<OutlineRect>
    }>
  | Readonly<{ type: 'scroll'; deltaX: number; deltaY: number }>
  | Readonly<{
      type: 'resize'
      width: number
      height: number
      dpr: number
    }>
  | Readonly<{ type: 'clear' }>

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
    message: {
      type: 'init',
      canvas,
      width,
      height,
      dpr,
    },
    transfer,
  }
}

export const workerWireDrawOutlines = (
  rects: ReadonlyArray<OutlineRect>,
): WorkerWireEnvelope => ({
  message: {
    type: 'draw-outlines',
    rects,
  },
})

export const workerWireScroll = (
  deltaX: number,
  deltaY: number,
): WorkerWireEnvelope => ({
  message: {
    type: 'scroll',
    deltaX,
    deltaY,
  },
})

export const workerWireResize = (
  width: number,
  height: number,
  dpr: number,
): WorkerWireEnvelope => ({
  message: {
    type: 'resize',
    width,
    height,
    dpr,
  },
})

export const workerWireClear = (): WorkerWireEnvelope => ({
  message: { type: 'clear' },
})

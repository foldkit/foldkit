import { Data, Effect } from 'effect'

import type { OutlinePainter } from './painter.js'
import type { CanvasHolder } from './painterMain.js'
import {
  type WorkerWireEnvelope,
  workerWireClear,
  workerWireDrawOutlines,
  workerWireInit,
  workerWireResize,
  workerWireScroll,
} from './protocol.js'
import type { OutlineRect } from './types.js'

declare global {
  interface ImportMeta {
    readonly env: { readonly DEV: boolean }
  }
}

class OutlineWorkerUnavailable extends Data.TaggedError(
  'OutlineWorkerUnavailable',
)<{
  readonly reason: string
}> {}

const devWarn = (...args: Array<unknown>): void => {
  if (import.meta.env.DEV) {
    console.warn(...args)
  }
}

const postWorkerEnvelope = (
  worker: Worker,
  envelope: WorkerWireEnvelope,
): Effect.Effect<void, OutlineWorkerUnavailable> =>
  Effect.try({
    try: () => {
      if (envelope.transfer !== undefined) {
        worker.postMessage(envelope.message, {
          transfer: [...envelope.transfer],
        })
      } else {
        worker.postMessage(envelope.message)
      }
    },
    catch: error => new OutlineWorkerUnavailable({ reason: String(error) }),
  })

const postEnvelope = (worker: Worker, envelope: WorkerWireEnvelope): void => {
  if (envelope.transfer !== undefined) {
    worker.postMessage(envelope.message, {
      transfer: [...envelope.transfer],
    })
  } else {
    worker.postMessage(envelope.message)
  }
}

export const acquireWorkerPainter = (canvasHolder: CanvasHolder, dpr: number) =>
  Effect.gen(function* () {
    if (
      typeof OffscreenCanvas === 'undefined' ||
      typeof Worker === 'undefined'
    ) {
      return yield* Effect.fail(
        new OutlineWorkerUnavailable({ reason: 'API missing' }),
      )
    }

    const worker = yield* Effect.try({
      try: () =>
        new Worker(new URL('./offscreen-canvas.worker.js', import.meta.url), {
          type: 'module',
        }),
      catch: error =>
        new OutlineWorkerUnavailable({
          reason: `[foldkit] outline worker .js load failed: ${String(error)}`,
        }),
    }).pipe(Effect.tapError(error => Effect.sync(() => devWarn(error.reason))))

    const offscreen = yield* Effect.try({
      try: () => canvasHolder.el.transferControlToOffscreen(),
      catch: error => {
        worker.terminate()
        return new OutlineWorkerUnavailable({
          reason: `[foldkit] outline transferControlToOffscreen failed: ${String(error)}`,
        })
      },
    }).pipe(Effect.tapError(error => Effect.sync(() => devWarn(error.reason))))

    yield* postWorkerEnvelope(
      worker,
      workerWireInit(offscreen, window.innerWidth, window.innerHeight, dpr),
    ).pipe(
      Effect.tapError(() => Effect.sync(() => worker.terminate())),
      Effect.tapError(error => Effect.sync(() => devWarn(error.reason))),
    )

    const canvas = canvasHolder.el

    const painter: OutlinePainter = {
      pushRects: (rects: ReadonlyArray<OutlineRect>) =>
        postEnvelope(worker, workerWireDrawOutlines(rects)),
      applyScroll: (deltaX, deltaY) =>
        postEnvelope(worker, workerWireScroll(deltaX, deltaY)),
      resize: (width, height, nextDpr) => {
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        postEnvelope(worker, workerWireResize(width, height, nextDpr))
      },
      setVisible: visible => {
        canvas.style.display = visible ? 'block' : 'none'
      },
      clear: () => postEnvelope(worker, workerWireClear()),
    }

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        worker.terminate()
      }),
    )

    return painter
  })

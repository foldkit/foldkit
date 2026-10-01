import { Effect, Stream } from 'effect'
import { setOutlineRecordingEnabled } from 'foldkit/outline'

import { OutlineCommand } from './commands.js'
import { OUTLINE_Z_INDEX } from './constants.js'
import { dispatchOutlineCommand } from './dispatch.js'
import { clampedCanvasSize, getDpr } from './geometry.js'
import { acquireMainPainter } from './painterMain.js'
import { acquireWorkerPainter } from './painterWorker.js'
import {
  acquireScrollIngress,
  outlineBatchStream,
  resizeCommandStream,
} from './streams.js'

export type OutlineService = Readonly<{
  setEnabled: (enabled: boolean) => void
}>

const createCanvasElement = (initialEnabled: boolean): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.dataset['foldkitOutlines'] = 'true'
  canvas.style.position = 'fixed'
  canvas.style.inset = '0'
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = OUTLINE_Z_INDEX
  canvas.style.display = initialEnabled ? 'block' : 'none'
  const dpr = getDpr()
  canvas.width = clampedCanvasSize(window.innerWidth, dpr)
  canvas.height = clampedCanvasSize(window.innerHeight, dpr)
  document.body.appendChild(canvas)
  return canvas
}

const acquireCanvasHolder = (initialEnabled: boolean) =>
  Effect.acquireRelease(
    Effect.sync(() => ({ el: createCanvasElement(initialEnabled) })),
    canvasHolder => Effect.sync(() => canvasHolder.el.remove()),
  )

export const makeOutlineService = (initialEnabled: boolean) =>
  Effect.gen(function* () {
    let isEnabled = initialEnabled
    setOutlineRecordingEnabled(initialEnabled)

    const canvasHolder = yield* acquireCanvasHolder(initialEnabled)
    const getEnabled = () => isEnabled

    const painter = yield* acquireWorkerPainter(canvasHolder, getDpr()).pipe(
      Effect.catch(() => acquireMainPainter(canvasHolder, getEnabled)),
    )

    const dispatch = (command: OutlineCommand): void => {
      dispatchOutlineCommand(command, painter, isEnabled)
    }

    yield* acquireScrollIngress(commands => {
      for (const command of commands) {
        dispatch(command)
      }
    })

    yield* Effect.forkScoped(
      Stream.runForEach(outlineBatchStream, rects =>
        Effect.sync(() => dispatch(OutlineCommand.PushRects({ rects }))),
      ),
    )

    yield* Effect.forkScoped(
      Stream.runForEach(resizeCommandStream, command =>
        Effect.sync(() => dispatch(command)),
      ),
    )

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => setOutlineRecordingEnabled(false)),
    )

    const service: OutlineService = {
      setEnabled: enabled => {
        isEnabled = enabled
        setOutlineRecordingEnabled(enabled)
        dispatch(OutlineCommand.SetVisible({ visible: enabled }))
        if (!enabled) {
          dispatch(OutlineCommand.Clear())
        }
      },
    }

    return service
  })

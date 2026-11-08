import { Effect, Fiber, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __htmlBuilder, __requireDispatch } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { makeElement } from './makeElement.js'

const Message = defineMessageUnion({
  Ticked: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({ tickCount: Schema.Number })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

const FRAME_MS = 16
const TICKED_FRAME_COUNT = 8

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'render-frame-app'
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const waitForNextTask = () =>
  new Promise<void>(resolve => {
    setTimeout(resolve, 0)
  })

// NOTE: callbacks requested while a frame runs belong to the next frame,
// as in a browser. Tasks such as MessageChannel messages run between frames.
const startElementWithFrames = async (viewFailure?: Error) => {
  let capturedDispatch: ((message: Message) => void) | undefined

  const element = makeElement({
    Model,
    init: () => ({ model: { tickCount: 0 } }),
    update: (model: Model, message: Message) =>
      Message.match(message, {
        Ticked: () => ({
          model: modifyFields(model, { tickCount: count => count + 1 }),
        }),
      }),
    view: model => {
      if (model.tickCount > 0 && viewFailure !== undefined) {
        throw viewFailure
      }
      capturedDispatch = __requireDispatch()
      return h.div([], [String(model.tickCount)])
    },
    container,
  })

  const fiber = Effect.runFork(element.start())
  await vi.waitFor(() => {
    expect(capturedDispatch).toBeDefined()
  })

  let requestedFrames: Array<FrameRequestCallback> = []
  let frameTime = 0
  const frameSpy = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation(callback => {
      requestedFrames.push(callback)
      return requestedFrames.length
    })

  const dispatch = (message: Message): void => {
    if (capturedDispatch === undefined) {
      throw new Error('Runtime dispatch is not available')
    }

    capturedDispatch(message)
  }

  const runFrame = async (): Promise<void> => {
    const frameCallbacks = requestedFrames
    requestedFrames = []
    frameTime += FRAME_MS

    for (const callback of frameCallbacks) {
      callback(frameTime)
    }

    await waitForNextTask()
  }

  const dispose = () => Effect.runPromise(Fiber.interrupt(fiber))

  const stop = async () => {
    await dispose()
    frameSpy.mockRestore()
  }

  return {
    dispatch,
    runFrame,
    requestedFrameCount: () => requestedFrames.length,
    dispose,
    stop,
  }
}

describe('render frames', () => {
  it('does not acquire a frame channel after its render crashes', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const { dispatch, runFrame, requestedFrameCount, stop } =
      await startElementWithFrames(new Error('The tick view failed'))
    const channelSpy = vi.spyOn(globalThis, 'MessageChannel')

    try {
      dispatch(Message.Ticked())
      await runFrame()

      expect(consoleError).toHaveBeenCalled()
      expect(channelSpy).not.toHaveBeenCalled()
      expect(requestedFrameCount()).toBe(0)
    } finally {
      await stop()
      channelSpy.mockRestore()
      consoleError.mockRestore()
    }
  })

  it('renders a Message from an animation frame tick in the same frame', async () => {
    const { dispatch, runFrame, stop } = await startElementWithFrames()

    // NOTE: like an animation frame Subscription, the tick requests its
    // next frame before its Message is processed.
    let isTicking = true
    const tick = () => {
      if (isTicking) {
        requestAnimationFrame(tick)
        dispatch(Message.Ticked())
      }
    }

    try {
      requestAnimationFrame(tick)
      await runFrame()
      await runFrame()

      const renderedPerFrame: Array<string | null> = []
      for (let frame = 0; frame < TICKED_FRAME_COUNT; frame++) {
        await runFrame()
        renderedPerFrame.push(document.body.textContent)
      }

      expect(renderedPerFrame).toStrictEqual(
        Array.from({ length: TICKED_FRAME_COUNT }, (_, frame) =>
          String(frame + 3),
        ),
      )
    } finally {
      isTicking = false
      await stop()
    }
  })

  it('stops requesting frames once nothing changes', async () => {
    const { dispatch, runFrame, requestedFrameCount, stop } =
      await startElementWithFrames()

    try {
      dispatch(Message.Ticked())
      expect(requestedFrameCount()).toBe(1)

      await runFrame()
      expect(document.body.textContent).toBe('1')
      expect(requestedFrameCount()).toBe(1)

      await runFrame()
      expect(document.body.textContent).toBe('1')
      expect(requestedFrameCount()).toBe(0)

      dispatch(Message.Ticked())
      expect(requestedFrameCount()).toBe(1)

      await runFrame()
      expect(document.body.textContent).toBe('2')
    } finally {
      await stop()
    }
  })

  it('requests one frame for a Message that arrives while a frame is armed', async () => {
    const { dispatch, runFrame, requestedFrameCount, stop } =
      await startElementWithFrames()

    try {
      dispatch(Message.Ticked())
      await runFrame()
      expect(requestedFrameCount()).toBe(1)

      dispatch(Message.Ticked())
      dispatch(Message.Ticked())
      expect(requestedFrameCount()).toBe(1)

      await runFrame()
      expect(document.body.textContent).toBe('3')
    } finally {
      await stop()
    }
  })

  it.each([false, true])(
    'does not paint or request another frame after disposal with an armed frame: %s',
    async isFrameArmed => {
      const { dispatch, runFrame, requestedFrameCount, dispose, stop } =
        await startElementWithFrames()

      try {
        dispatch(Message.Ticked())
        if (isFrameArmed) {
          await runFrame()
        }

        expect(requestedFrameCount()).toBe(1)
        await dispose()
        const disposedContent = container.innerHTML

        await runFrame()

        expect(container.innerHTML).toBe(disposedContent)
        expect(requestedFrameCount()).toBe(0)
      } finally {
        await stop()
      }
    },
  )
})

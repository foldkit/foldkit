export type DrawLoop = Readonly<{
  schedule: () => void
  cancel: () => void
}>

export const makeDrawLoop = (runFrame: () => boolean): DrawLoop => {
  let frameId = 0
  let isDrawing = false

  const cancel = (): void => {
    if (frameId !== 0) {
      cancelAnimationFrame(frameId)
      frameId = 0
    }
    isDrawing = false
  }

  const schedule = (): void => {
    if (isDrawing) {
      return
    }
    isDrawing = true
    const draw = (): void => {
      const hasMore = runFrame()
      if (hasMore) {
        frameId = requestAnimationFrame(draw)
      } else {
        isDrawing = false
        frameId = 0
      }
    }
    frameId = requestAnimationFrame(draw)
  }

  return { schedule, cancel }
}

export const makeWorkerDrawLoop = (runFrame: () => boolean): DrawLoop => {
  let frameId: number | undefined
  let isDrawing = false

  const scheduleFrame = (draw: () => void): void => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      frameId = globalThis.requestAnimationFrame(draw)
    } else {
      frameId = globalThis.setTimeout(draw, 16)
    }
  }

  const cancel = (): void => {
    if (frameId !== undefined) {
      if (typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(frameId)
      } else {
        globalThis.clearTimeout(frameId)
      }
      frameId = undefined
    }
    isDrawing = false
  }

  const schedule = (): void => {
    if (isDrawing) {
      return
    }
    isDrawing = true
    const draw = (): void => {
      const hasMore = runFrame()
      if (hasMore) {
        scheduleFrame(draw)
      } else {
        isDrawing = false
        frameId = undefined
      }
    }
    scheduleFrame(draw)
  }

  return { schedule, cancel }
}

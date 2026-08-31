import {
  INTERPOLATION_SPEED,
  SNAP_THRESHOLD,
  TOTAL_FRAMES,
} from './constants.js'
import type { ActiveOutline, OutlineRect } from './types.js'

export const lerp = (start: number, end: number): number => {
  const delta = end - start
  if (Math.abs(delta) < SNAP_THRESHOLD) {
    return end
  }
  return start + delta * INTERPOLATION_SPEED
}

const nextCause = (
  rect: OutlineRect,
  existing: ActiveOutline | undefined,
): { cause?: string } => {
  if (rect.cause !== undefined) {
    return { cause: rect.cause }
  }
  if (existing?.cause !== undefined) {
    return { cause: existing.cause }
  }
  return {}
}

export const updateOutlines = (
  activeOutlines: Map<string, ActiveOutline>,
  rects: ReadonlyArray<OutlineRect>,
): void => {
  for (const rect of rects) {
    const existing = activeOutlines.get(rect.id)
    if (existing) {
      const next: ActiveOutline = {
        ...existing,
        count: existing.count + 1,
        frame: 0,
        targetX: rect.x,
        targetY: rect.y,
        targetWidth: rect.width,
        targetHeight: rect.height,
        label: rect.label,
        ...nextCause(rect, existing),
      }
      activeOutlines.set(rect.id, next)
    } else {
      const outline: ActiveOutline = {
        id: rect.id,
        label: rect.label,
        ...(rect.cause !== undefined ? { cause: rect.cause } : {}),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        targetX: rect.x,
        targetY: rect.y,
        targetWidth: rect.width,
        targetHeight: rect.height,
        frame: 0,
        count: 1,
      }
      activeOutlines.set(rect.id, outline)
    }
  }
}

export const updateScroll = (
  activeOutlines: Map<string, ActiveOutline>,
  deltaX: number,
  deltaY: number,
): void => {
  for (const [id, outline] of activeOutlines) {
    activeOutlines.set(id, {
      ...outline,
      targetX: outline.targetX - deltaX,
      targetY: outline.targetY - deltaY,
    })
  }
}

export const advanceOutlines = (
  activeOutlines: Map<string, ActiveOutline>,
): void => {
  for (const [id, outline] of activeOutlines) {
    let {
      x,
      y,
      width,
      height,
      targetX,
      targetY,
      targetWidth,
      targetHeight,
      frame,
    } = outline
    if (targetX !== x) {
      x = lerp(x, targetX)
    }
    if (targetY !== y) {
      y = lerp(y, targetY)
    }
    if (targetWidth !== width) {
      width = lerp(width, targetWidth)
    }
    if (targetHeight !== height) {
      height = lerp(height, targetHeight)
    }
    const nextFrame = frame + 1
    const nextOutline: ActiveOutline = {
      ...outline,
      x,
      y,
      width,
      height,
      frame: nextFrame,
    }
    activeOutlines.set(id, nextOutline)
  }
}

export const expireOutlines = (
  activeOutlines: Map<string, ActiveOutline>,
): void => {
  for (const [id, outline] of activeOutlines) {
    if (outline.frame > TOTAL_FRAMES) {
      activeOutlines.delete(id)
    }
  }
}

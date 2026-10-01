import {
  INTERPOLATION_SPEED,
  SNAP_THRESHOLD,
  TOTAL_FRAMES,
} from './constants.js'
import { ActiveOutline, type OutlineRect } from './types.js'

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
      activeOutlines.set(
        rect.id,
        ActiveOutline.make({
          ...existing,
          count: existing.count + 1,
          frame: 0,
          targetX: rect.x,
          targetY: rect.y,
          targetWidth: rect.width,
          targetHeight: rect.height,
          label: rect.label,
          ...nextCause(rect, existing),
        }),
      )
    } else {
      activeOutlines.set(
        rect.id,
        ActiveOutline.make({
          id: rect.id,
          label: rect.label,
          cause: rect.cause,
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
        }),
      )
    }
  }
}

export const updateScroll = (
  activeOutlines: Map<string, ActiveOutline>,
  deltaX: number,
  deltaY: number,
): void => {
  for (const [id, outline] of activeOutlines) {
    activeOutlines.set(
      id,
      ActiveOutline.make({
        ...outline,
        targetX: outline.targetX - deltaX,
        targetY: outline.targetY - deltaY,
      }),
    )
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
    activeOutlines.set(
      id,
      ActiveOutline.make({
        ...outline,
        x,
        y,
        width,
        height,
        frame: frame + 1,
      }),
    )
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

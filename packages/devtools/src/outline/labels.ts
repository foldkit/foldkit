import { Array, Option } from 'effect'

import { MAX_LABEL_LENGTH, TOTAL_FRAMES } from './constants.js'
import type { ActiveOutline } from './types.js'

const BOUNDARY_SEPARATOR = '|'

export const getLabelText = (
  outlines: ReadonlyArray<ActiveOutline>,
): string => {
  const counts = new Map<string, number>()
  const causeByLabel = new Map<string, string>()
  for (const outline of outlines) {
    counts.set(outline.label, (counts.get(outline.label) ?? 0) + outline.count)
    if (outline.cause !== undefined && !causeByLabel.has(outline.label)) {
      causeByLabel.set(outline.label, outline.cause)
    }
  }
  const parts: Array<string> = []
  for (const [label, count] of counts) {
    const short = label.split(BOUNDARY_SEPARATOR).at(-1) ?? label
    const cause = causeByLabel.get(label)
    if (cause !== undefined) {
      parts.push(`${short} ×${count} (${cause})`)
    } else {
      parts.push(`${short} ×${count}`)
    }
  }
  let text = parts.join(', ')
  if (text.length > MAX_LABEL_LENGTH) {
    text = `${text.slice(0, MAX_LABEL_LENGTH)}…`
  }
  return text
}

export type OutlineLabel = Readonly<{
  x: number
  y: number
  text: string
  width: number
  height: number
  alpha: number
  outlines: ReadonlyArray<ActiveOutline>
}>

export const buildLabels = (
  activeOutlines: Map<string, ActiveOutline>,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
): Array<OutlineLabel> => {
  const groupedByLabel = new Map<string, Array<ActiveOutline>>()
  for (const outline of activeOutlines.values()) {
    const labelKey = `${outline.targetX},${outline.targetY}`
    const group = groupedByLabel.get(labelKey)
    if (group) {
      group.push(outline)
    } else {
      groupedByLabel.set(labelKey, [outline])
    }
  }
  const labels: Array<OutlineLabel> = []
  for (const outlines of groupedByLabel.values()) {
    const maybeFirst = Array.head(outlines)
    if (Option.isNone(maybeFirst)) {
      continue
    }
    const first = maybeFirst.value
    const alpha = 1 - first.frame / TOTAL_FRAMES
    const text = getLabelText(outlines)
    const { width } = ctx.measureText(text)
    const height = 11
    labels.push({
      x: first.x,
      y: first.y,
      text,
      width,
      height,
      alpha,
      outlines: [...outlines],
    })
  }
  return labels
}

export const mergeOverlappingLabels = (
  labels: Array<OutlineLabel>,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
): Array<OutlineLabel> => {
  labels.sort((a, b) => {
    const areaA = a.outlines.reduce(
      (sum, outline) => sum + outline.width * outline.height,
      0,
    )
    const areaB = b.outlines.reduce(
      (sum, outline) => sum + outline.width * outline.height,
      0,
    )
    return areaB - areaA
  })

  const merged: Array<OutlineLabel> = []
  const removed = new Set<number>()
  for (let index = 0; index < labels.length; index++) {
    if (removed.has(index)) {
      continue
    }
    const labelAtIndex = Array.get(labels, index)
    if (Option.isNone(labelAtIndex)) {
      continue
    }
    let current = labelAtIndex.value
    for (let otherIndex = index + 1; otherIndex < labels.length; otherIndex++) {
      if (removed.has(otherIndex)) {
        continue
      }
      const maybeOther = Array.get(labels, otherIndex)
      if (Option.isNone(maybeOther)) {
        continue
      }
      const other = maybeOther.value
      const overlap =
        current.x + current.width > other.x &&
        other.x + other.width > current.x &&
        current.y + current.height > other.y &&
        other.y + other.height > current.y
      if (overlap) {
        const combinedOutlines = [...current.outlines, ...other.outlines]
        current = {
          ...current,
          text: getLabelText(combinedOutlines),
          width: ctx.measureText(getLabelText(combinedOutlines)).width,
          outlines: combinedOutlines,
        }
        removed.add(otherIndex)
      }
    }
    merged.push(current)
  }
  return merged
}

import { describe, expect, it } from 'vitest'

import { MAX_LABEL_LENGTH, TOTAL_FRAMES } from './constants.js'
import { getLabelText } from './labels.js'
import { updateOutlines, updateScroll } from './model.js'
import type { ActiveOutline, OutlineRect } from './types.js'

describe('outline/model', () => {
  it('updateOutlines increments count and resets frame', () => {
    const map = new Map<string, ActiveOutline>()
    const rect: OutlineRect = {
      id: 'a|b',
      label: 'a|b',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    }
    updateOutlines(map, [rect])
    expect(map.get('a|b')?.count).toBe(1)
    expect(map.get('a|b')?.frame).toBe(0)
    map.set('a|b', { ...map.get('a|b')!, frame: 5 })
    updateOutlines(map, [rect])
    expect(map.get('a|b')?.count).toBe(2)
    expect(map.get('a|b')?.frame).toBe(0)
  })

  it('updateScroll nudges target', () => {
    const map = new Map<string, ActiveOutline>([
      [
        'id',
        {
          id: 'id',
          label: 'id',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          targetX: 10,
          targetY: 10,
          targetWidth: 10,
          targetHeight: 10,
          frame: 0,
          count: 1,
        },
      ],
    ])
    updateScroll(map, 2, 3)
    expect(map.get('id')?.targetX).toBe(8)
    expect(map.get('id')?.targetY).toBe(7)
  })

  it('getLabelText truncates at MAX_LABEL_LENGTH', () => {
    const outlines: Array<ActiveOutline> = [
      {
        id: 'a|very-long-boundary-name-that-exceeds-limit',
        label: 'a|very-long-boundary-name-that-exceeds-limit',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        targetX: 0,
        targetY: 0,
        targetWidth: 10,
        targetHeight: 10,
        frame: 0,
        count: 1,
      },
      {
        id: 'b|another-very-long-boundary-name',
        label: 'b|another-very-long-boundary-name',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        targetX: 0,
        targetY: 0,
        targetWidth: 10,
        targetHeight: 10,
        frame: 0,
        count: 1,
      },
    ]
    const text = getLabelText(outlines)
    expect(text.length).toBeLessThanOrEqual(MAX_LABEL_LENGTH + 1)
    expect(TOTAL_FRAMES).toBe(45)
  })
})

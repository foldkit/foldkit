import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import { Circle, Group, Rect } from './shape.js'

describe('Group', () => {
  it('nests shapes under a transform', () => {
    const group = Group({
      translate: { x: 50, y: 50 },
      rotate: Math.PI / 4,
      scale: { x: 2, y: 2 },
      opacity: 0.8,
      shapes: [Circle({ x: 0, y: 0, radius: 10, fill: 'red' })],
    })
    expect(group.translate).toEqual({ x: 50, y: 50 })
    expect(group.rotate).toBeCloseTo(Math.PI / 4)
    expect(group.scale).toEqual({ x: 2, y: 2 })
    expect(group.opacity).toBeCloseTo(0.8)
    expect(group.shapes).toHaveLength(1)
  })

  it('composes recursively with other Groups as children', () => {
    const inner = Group({
      shapes: [Rect({ x: 0, y: 0, width: 1, height: 1 })],
    })
    const outer = Group({
      translate: { x: 10, y: 10 },
      shapes: [inner],
    })
    const firstChild = outer.shapes[0]
    expect(firstChild?._tag).toBe('Group')
  })

  it('supports an arbitrary mix of shape variants as children', () => {
    const group = Group({
      shapes: [
        Rect({ x: 0, y: 0, width: 10, height: 10 }),
        Circle({ x: 5, y: 5, radius: 3 }),
        Group({ shapes: [Rect({ x: 0, y: 0, width: 1, height: 1 })] }),
      ],
    })
    const tags = group.shapes.map(shape => shape._tag)
    expect(tags).toEqual(['Rect', 'Circle', 'Group'])
  })
})

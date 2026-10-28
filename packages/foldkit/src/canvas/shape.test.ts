import { Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Circle, Group, Rect } from './shape.js'
import type { Shape } from './shape.js'

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

  it('constructs the same value as make', () => {
    const shapes = [
      Rect({ x: 0, y: 0, width: 10, height: 10, fill: 'red' }),
      Group({ shapes: [Circle({ x: 5, y: 5, radius: 3 })] }),
    ]
    const transformed = {
      shapes,
      translate: { x: 1, y: 2 },
      rotate: 0.5,
      scale: { x: 2, y: 2 },
      opacity: 0.5,
    }

    expect(Group(transformed)).toStrictEqual(Group.make(transformed))
    expect(Group({ shapes })).toStrictEqual(Group.make({ shapes }))
    expect(Group({ shapes, opacity: undefined })).toStrictEqual(
      Group.make({ shapes, opacity: undefined }),
    )
  })

  it('keeps the given children by reference', () => {
    const rect = Rect({ x: 0, y: 0, width: 1, height: 1 })
    const inner = Group({ shapes: [rect] })
    const shapes = [inner]
    const outer = Group({ shapes })

    expect(outer.shapes).toBe(shapes)
    expect(inner.shapes.at(0)).toBe(rect)
  })

  it('validates every nested shape when decoding', () => {
    const decodeGroup = Schema.decodeUnknownSync(Group)
    const encoded = {
      _tag: 'Group',
      shapes: [
        {
          _tag: 'Group',
          shapes: [{ _tag: 'Rect', x: 0, y: 0, width: 1, height: 1 }],
        },
      ],
    }
    const invalidNested = {
      _tag: 'Group',
      shapes: [
        {
          _tag: 'Group',
          shapes: [{ _tag: 'Rect', x: 0, y: 0, width: 'wide', height: 1 }],
        },
      ],
    }

    expect(decodeGroup(encoded)).toStrictEqual(encoded)
    expect(() => decodeGroup(invalidNested)).toThrow()
  })

  it('types the constructor by its shapes and stays a Schema', () => {
    expectTypeOf(Group)
      .parameter(0)
      .toHaveProperty('shapes')
      .toEqualTypeOf<ReadonlyArray<Shape>>()
    expectTypeOf(Group).returns.toEqualTypeOf<Group>()
    expectTypeOf(Group).toExtend<Schema.Codec<Group>>()
  })
})

import { describe, it } from '@effect/vitest'
import { expect, vi } from 'vitest'

import { paintScene } from './paint.js'
import {
  Circle,
  Close,
  Group,
  LineTo,
  MoveTo,
  Path,
  Rect,
  Text,
} from './shape.js'

type MockContext = Readonly<{
  ctx: CanvasRenderingContext2D
  fillStyle: () => unknown
  strokeStyle: () => unknown
  lineWidth: () => number
  globalAlpha: () => number
  font: () => string
  textAlign: () => CanvasTextAlign
  textBaseline: () => CanvasTextBaseline
  lineCap: () => CanvasLineCap
  lineJoin: () => CanvasLineJoin
  spies: {
    clearRect: ReturnType<typeof vi.fn>
    fillRect: ReturnType<typeof vi.fn>
    strokeRect: ReturnType<typeof vi.fn>
    beginPath: ReturnType<typeof vi.fn>
    arc: ReturnType<typeof vi.fn>
    fill: ReturnType<typeof vi.fn>
    stroke: ReturnType<typeof vi.fn>
    moveTo: ReturnType<typeof vi.fn>
    lineTo: ReturnType<typeof vi.fn>
    quadraticCurveTo: ReturnType<typeof vi.fn>
    bezierCurveTo: ReturnType<typeof vi.fn>
    closePath: ReturnType<typeof vi.fn>
    fillText: ReturnType<typeof vi.fn>
    strokeText: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
    restore: ReturnType<typeof vi.fn>
    translate: ReturnType<typeof vi.fn>
    rotate: ReturnType<typeof vi.fn>
    scale: ReturnType<typeof vi.fn>
  }
}>

const makeMockContext = (): MockContext => {
  const state: {
    fillStyle: unknown
    strokeStyle: unknown
    lineWidth: number
    globalAlpha: number
    font: string
    textAlign: CanvasTextAlign
    textBaseline: CanvasTextBaseline
    lineCap: CanvasLineCap
    lineJoin: CanvasLineJoin
  } = {
    fillStyle: 'black',
    strokeStyle: 'black',
    lineWidth: 1,
    globalAlpha: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineCap: 'butt',
    lineJoin: 'miter',
  }

  const spies = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
  }

  const ctx = {
    get fillStyle() {
      return state.fillStyle
    },
    set fillStyle(value: unknown) {
      state.fillStyle = value
    },
    get strokeStyle() {
      return state.strokeStyle
    },
    set strokeStyle(value: unknown) {
      state.strokeStyle = value
    },
    get lineWidth() {
      return state.lineWidth
    },
    set lineWidth(value: number) {
      state.lineWidth = value
    },
    get globalAlpha() {
      return state.globalAlpha
    },
    set globalAlpha(value: number) {
      state.globalAlpha = value
    },
    get font() {
      return state.font
    },
    set font(value: string) {
      state.font = value
    },
    get textAlign() {
      return state.textAlign
    },
    set textAlign(value: CanvasTextAlign) {
      state.textAlign = value
    },
    get textBaseline() {
      return state.textBaseline
    },
    set textBaseline(value: CanvasTextBaseline) {
      state.textBaseline = value
    },
    get lineCap() {
      return state.lineCap
    },
    set lineCap(value: CanvasLineCap) {
      state.lineCap = value
    },
    get lineJoin() {
      return state.lineJoin
    },
    set lineJoin(value: CanvasLineJoin) {
      state.lineJoin = value
    },
    ...spies,
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const ctxAsCanvas = ctx as unknown as CanvasRenderingContext2D

  return {
    ctx: ctxAsCanvas,
    fillStyle: () => state.fillStyle,
    strokeStyle: () => state.strokeStyle,
    lineWidth: () => state.lineWidth,
    globalAlpha: () => state.globalAlpha,
    font: () => state.font,
    textAlign: () => state.textAlign,
    textBaseline: () => state.textBaseline,
    lineCap: () => state.lineCap,
    lineJoin: () => state.lineJoin,
    spies,
  }
}

describe('paintScene', () => {
  it('clears the canvas before painting', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 200, 100, [])
    expect(mock.spies.clearRect).toHaveBeenCalledWith(0, 0, 200, 100)
  })

  it('fills a Rect with the given color', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Rect({ x: 10, y: 20, width: 30, height: 40, fill: 'red' }),
    ])
    expect(mock.spies.fillRect).toHaveBeenCalledWith(10, 20, 30, 40)
    expect(mock.fillStyle()).toBe('red')
  })

  it('strokes a Rect with the given color and lineWidth', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Rect({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        stroke: 'blue',
        lineWidth: 3,
      }),
    ])
    expect(mock.spies.strokeRect).toHaveBeenCalledWith(0, 0, 10, 10)
    expect(mock.strokeStyle()).toBe('blue')
    expect(mock.lineWidth()).toBe(3)
  })

  it('skips draw calls for a Rect with no fill or stroke', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Rect({ x: 0, y: 0, width: 10, height: 10 }),
    ])
    expect(mock.spies.fillRect).not.toHaveBeenCalled()
    expect(mock.spies.strokeRect).not.toHaveBeenCalled()
  })

  it('paints a Circle as an arc with fill', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Circle({ x: 50, y: 50, radius: 25, fill: 'green' }),
    ])
    expect(mock.spies.beginPath).toHaveBeenCalled()
    expect(mock.spies.arc).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI * 2)
    expect(mock.spies.fill).toHaveBeenCalled()
    expect(mock.fillStyle()).toBe('green')
  })

  it('walks Path commands in order', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Path({
        instructions: [
          MoveTo({ x: 0, y: 0 }),
          LineTo({ x: 10, y: 0 }),
          LineTo({ x: 10, y: 10 }),
          Close(),
        ],
        stroke: 'black',
      }),
    ])
    expect(mock.spies.beginPath).toHaveBeenCalled()
    expect(mock.spies.moveTo).toHaveBeenCalledWith(0, 0)
    expect(mock.spies.lineTo).toHaveBeenNthCalledWith(1, 10, 0)
    expect(mock.spies.lineTo).toHaveBeenNthCalledWith(2, 10, 10)
    expect(mock.spies.closePath).toHaveBeenCalled()
    expect(mock.spies.stroke).toHaveBeenCalled()
  })

  it('translates Path lineCap and lineJoin to canvas-API spelling', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Path({
        instructions: [MoveTo({ x: 0, y: 0 }), LineTo({ x: 10, y: 0 })],
        stroke: 'black',
        lineCap: 'Round',
        lineJoin: 'Bevel',
      }),
    ])
    expect(mock.lineCap()).toBe('round')
    expect(mock.lineJoin()).toBe('bevel')
  })

  it('paints Text with content, font, and alignment', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Text({
        x: 10,
        y: 30,
        content: 'Hello',
        font: '24px sans-serif',
        fill: 'white',
        align: 'Center',
        baseline: 'Middle',
      }),
    ])
    expect(mock.spies.fillText).toHaveBeenCalledWith('Hello', 10, 30)
    expect(mock.font()).toBe('24px sans-serif')
    expect(mock.textAlign()).toBe('center')
    expect(mock.textBaseline()).toBe('middle')
  })

  it('Group applies translate, rotate, and scale within save/restore', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Group({
        translate: { x: 50, y: 50 },
        rotate: Math.PI / 2,
        scale: { x: 2, y: 2 },
        shapes: [Rect({ x: 0, y: 0, width: 1, height: 1, fill: 'red' })],
      }),
    ])
    expect(mock.spies.save).toHaveBeenCalled()
    expect(mock.spies.translate).toHaveBeenCalledWith(50, 50)
    expect(mock.spies.rotate).toHaveBeenCalledWith(Math.PI / 2)
    expect(mock.spies.scale).toHaveBeenCalledWith(2, 2)
    expect(mock.spies.fillRect).toHaveBeenCalledWith(0, 0, 1, 1)
    expect(mock.spies.restore).toHaveBeenCalled()
  })

  it('Group multiplies opacity into globalAlpha', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Group({
        opacity: 0.5,
        shapes: [Rect({ x: 0, y: 0, width: 1, height: 1, fill: 'red' })],
      }),
    ])
    expect(mock.spies.save).toHaveBeenCalled()
    expect(mock.spies.restore).toHaveBeenCalled()
  })

  it('Group recurses into nested children', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Group({
        translate: { x: 10, y: 10 },
        shapes: [
          Group({
            translate: { x: 5, y: 5 },
            shapes: [Rect({ x: 0, y: 0, width: 1, height: 1, fill: 'red' })],
          }),
        ],
      }),
    ])
    expect(mock.spies.save).toHaveBeenCalledTimes(3)
    expect(mock.spies.restore).toHaveBeenCalledTimes(3)
    expect(mock.spies.translate).toHaveBeenNthCalledWith(1, 10, 10)
    expect(mock.spies.translate).toHaveBeenNthCalledWith(2, 5, 5)
    expect(mock.spies.fillRect).toHaveBeenCalledWith(0, 0, 1, 1)
  })

  it('brackets every top-level shape in save/restore so per-shape state cannot leak to siblings', () => {
    const mock = makeMockContext()
    paintScene(mock.ctx, 100, 100, [
      Rect({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        stroke: 'red',
        lineWidth: 12,
      }),
      Rect({ x: 20, y: 0, width: 10, height: 10, fill: 'blue' }),
    ])
    expect(mock.spies.save).toHaveBeenCalledTimes(2)
    expect(mock.spies.restore).toHaveBeenCalledTimes(2)
    const [firstSave, secondSave] = mock.spies.save.mock.invocationCallOrder
    const [firstRestore, secondRestore] =
      mock.spies.restore.mock.invocationCallOrder
    const [firstStrokeRect] = mock.spies.strokeRect.mock.invocationCallOrder
    const [firstFillRect] = mock.spies.fillRect.mock.invocationCallOrder
    expect(firstSave).toBeLessThan(firstStrokeRect)
    expect(firstStrokeRect).toBeLessThan(firstRestore)
    expect(firstRestore).toBeLessThan(secondSave)
    expect(secondSave).toBeLessThan(firstFillRect)
    expect(firstFillRect).toBeLessThan(secondRestore)
  })
})

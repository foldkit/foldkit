import { Function } from 'effect'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { paintScene } from './paint.js'
import {
  Circle,
  Close,
  Group,
  Image,
  LineTo,
  MoveTo,
  Path,
  Rect,
  Text,
} from './shape.js'
import type { Shape } from './shape.js'

const asCallOrder = (order: number | undefined): number => {
  if (order === undefined) {
    throw new Error('expected a recorded call order')
  }
  return order
}

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
  imageSmoothingEnabled: () => boolean
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
    drawImage: ReturnType<typeof vi.fn>
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
    imageSmoothingEnabled: boolean
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
    imageSmoothingEnabled: true,
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
    drawImage: vi.fn(),
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
    get imageSmoothingEnabled() {
      return state.imageSmoothingEnabled
    },
    set imageSmoothingEnabled(value: boolean) {
      state.imageSmoothingEnabled = value
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
    imageSmoothingEnabled: () => state.imageSmoothingEnabled,
    spies,
  }
}

const paint = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shapes: ReadonlyArray<Shape>,
): void => paintScene(ctx, width, height, shapes, Function.constVoid)

describe('paintScene', () => {
  it('clears the canvas before painting', () => {
    const mock = makeMockContext()
    paint(mock.ctx, 200, 100, [])
    expect(mock.spies.clearRect).toHaveBeenCalledWith(0, 0, 200, 100)
  })

  it('fills a Rect with the given color', () => {
    const mock = makeMockContext()
    paint(mock.ctx, 100, 100, [
      Rect({ x: 10, y: 20, width: 30, height: 40, fill: 'red' }),
    ])
    expect(mock.spies.fillRect).toHaveBeenCalledWith(10, 20, 30, 40)
    expect(mock.fillStyle()).toBe('red')
  })

  it('strokes a Rect with the given color and lineWidth', () => {
    const mock = makeMockContext()
    paint(mock.ctx, 100, 100, [
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
    paint(mock.ctx, 100, 100, [Rect({ x: 0, y: 0, width: 10, height: 10 })])
    expect(mock.spies.fillRect).not.toHaveBeenCalled()
    expect(mock.spies.strokeRect).not.toHaveBeenCalled()
  })

  it('paints a Circle as an arc with fill', () => {
    const mock = makeMockContext()
    paint(mock.ctx, 100, 100, [
      Circle({ x: 50, y: 50, radius: 25, fill: 'green' }),
    ])
    expect(mock.spies.beginPath).toHaveBeenCalled()
    expect(mock.spies.arc).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI * 2)
    expect(mock.spies.fill).toHaveBeenCalled()
    expect(mock.fillStyle()).toBe('green')
  })

  it('walks Path commands in order', () => {
    const mock = makeMockContext()
    paint(mock.ctx, 100, 100, [
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
    paint(mock.ctx, 100, 100, [
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
    paint(mock.ctx, 100, 100, [
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
    paint(mock.ctx, 100, 100, [
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
    paint(mock.ctx, 100, 100, [
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
    paint(mock.ctx, 100, 100, [
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
    paint(mock.ctx, 100, 100, [
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
    const saveOrders = mock.spies.save.mock.invocationCallOrder
    const restoreOrders = mock.spies.restore.mock.invocationCallOrder
    const firstSave = asCallOrder(saveOrders[0])
    const secondSave = asCallOrder(saveOrders[1])
    const firstRestore = asCallOrder(restoreOrders[0])
    const secondRestore = asCallOrder(restoreOrders[1])
    const firstStrokeRect = asCallOrder(
      mock.spies.strokeRect.mock.invocationCallOrder[0],
    )
    const firstFillRect = asCallOrder(
      mock.spies.fillRect.mock.invocationCallOrder[0],
    )
    expect(firstSave).toBeLessThan(firstStrokeRect)
    expect(firstStrokeRect).toBeLessThan(firstRestore)
    expect(firstRestore).toBeLessThan(secondSave)
    expect(secondSave).toBeLessThan(firstFillRect)
    expect(firstFillRect).toBeLessThan(secondRestore)
  })
})

const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const onePixelPng = (name: string): string =>
  `data:image/png;name=${name};base64,${ONE_PIXEL_PNG_BASE64}`

const captureCreatedImages = (): ReadonlyArray<HTMLImageElement> => {
  const images: Array<HTMLImageElement> = []
  const createElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(
    (tagName: string, options?: ElementCreationOptions) => {
      const element = createElement(tagName, options)
      if (element instanceof HTMLImageElement) {
        images.push(element)
      }
      return element
    },
  )
  return images
}

const onlyImage = (
  images: ReadonlyArray<HTMLImageElement>,
): HTMLImageElement => {
  expect(images).toHaveLength(1)
  const [image] = images
  if (image === undefined) {
    throw new Error('expected one created image')
  }
  return image
}

describe('paintScene with Image shapes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('draws nothing until the source loads, then reports the load once', () => {
    const images = captureCreatedImages()
    const mock = makeMockContext()
    const onImageLoad = vi.fn()
    const sprite = Image({
      src: 'https://example.test/not-yet-loaded.png',
      x: 10,
      y: 20,
      width: 32,
      height: 48,
    })

    paintScene(mock.ctx, 100, 100, [sprite, sprite], onImageLoad)
    expect(mock.spies.drawImage).not.toHaveBeenCalled()

    const image = onlyImage(images)
    expect(image.src).toBe('https://example.test/not-yet-loaded.png')

    image.dispatchEvent(new Event('load'))
    expect(onImageLoad).toHaveBeenCalledTimes(1)

    paintScene(mock.ctx, 100, 100, [sprite], onImageLoad)
    expect(mock.spies.drawImage).toHaveBeenCalledExactlyOnceWith(
      image,
      10,
      20,
      32,
      48,
    )
  })

  it('draws a cropped region of the source for a sprite sheet frame', () => {
    const images = captureCreatedImages()
    const mock = makeMockContext()
    const frame = Image({
      src: 'https://example.test/sheet.png',
      x: 40,
      y: 50,
      width: 64,
      height: 64,
      crop: { x: 16, y: 0, width: 16, height: 16 },
    })

    paint(mock.ctx, 100, 100, [frame])
    const image = onlyImage(images)
    image.dispatchEvent(new Event('load'))
    paint(mock.ctx, 100, 100, [frame])

    expect(mock.spies.drawImage).toHaveBeenCalledExactlyOnceWith(
      image,
      16,
      0,
      16,
      16,
      40,
      50,
      64,
      64,
    )
  })

  it('sets image smoothing from rendering for that shape only', () => {
    const mock = makeMockContext()
    const savedSmoothing: Array<boolean> = []
    mock.spies.save.mockImplementation(() => {
      savedSmoothing.push(mock.imageSmoothingEnabled())
    })
    mock.spies.restore.mockImplementation(() => {
      mock.ctx.imageSmoothingEnabled = savedSmoothing.pop() ?? true
    })
    const smoothingAtDraw: Array<boolean> = []
    mock.spies.drawImage.mockImplementation(() => {
      smoothingAtDraw.push(mock.imageSmoothingEnabled())
    })
    const sprite = {
      src: onePixelPng('smoothing'),
      x: 0,
      y: 0,
      width: 8,
      height: 8,
    }

    paint(mock.ctx, 100, 100, [
      Image({ ...sprite, rendering: 'Pixelated' }),
      Image(sprite),
      Image({ ...sprite, rendering: 'Smooth' }),
    ])
    mock.ctx.imageSmoothingEnabled = false
    paint(mock.ctx, 100, 100, [Image(sprite)])

    expect(smoothingAtDraw).toEqual([false, true, true, false])
  })

  it('draws an image inside a Group with the Group transform and opacity applied', () => {
    const mock = makeMockContext()
    const alphaAtDraw: Array<number> = []
    mock.spies.drawImage.mockImplementation(() => {
      alphaAtDraw.push(mock.globalAlpha())
    })

    paint(mock.ctx, 100, 100, [
      Group({
        translate: { x: 30, y: 40 },
        opacity: 0.5,
        shapes: [
          Image({
            src: onePixelPng('group'),
            x: 0,
            y: 0,
            width: 4,
            height: 4,
          }),
        ],
      }),
    ])

    expect(mock.spies.translate).toHaveBeenCalledWith(30, 40)
    expect(alphaAtDraw).toEqual([0.5])
    const translateOrder = asCallOrder(
      mock.spies.translate.mock.invocationCallOrder[0],
    )
    const drawOrder = asCallOrder(
      mock.spies.drawImage.mock.invocationCallOrder[0],
    )
    expect(translateOrder).toBeLessThan(drawOrder)
  })

  it('loads each src once and notifies every waiting canvas when it loads', () => {
    const images = captureCreatedImages()
    const firstCanvas = makeMockContext()
    const secondCanvas = makeMockContext()
    const onFirstCanvasImageLoad = vi.fn()
    const onSecondCanvasImageLoad = vi.fn()
    const sprite = Image({
      src: 'https://example.test/shared.png',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    })

    paintScene(firstCanvas.ctx, 100, 100, [sprite], onFirstCanvasImageLoad)
    paintScene(firstCanvas.ctx, 100, 100, [sprite], onFirstCanvasImageLoad)
    paintScene(secondCanvas.ctx, 100, 100, [sprite], onSecondCanvasImageLoad)
    const image = onlyImage(images)

    image.dispatchEvent(new Event('load'))
    expect(onFirstCanvasImageLoad).toHaveBeenCalledTimes(1)
    expect(onSecondCanvasImageLoad).toHaveBeenCalledTimes(1)

    paint(firstCanvas.ctx, 100, 100, [sprite])
    paint(secondCanvas.ctx, 100, 100, [sprite])
    expect(images).toHaveLength(1)
    expect(firstCanvas.spies.drawImage).toHaveBeenCalledWith(
      image,
      0,
      0,
      16,
      16,
    )
    expect(secondCanvas.spies.drawImage).toHaveBeenCalledWith(
      image,
      0,
      0,
      16,
      16,
    )
  })

  it('draws on the first paint when the source loads while it is requested', () => {
    const mock = makeMockContext()
    const onImageLoad = vi.fn()

    paintScene(
      mock.ctx,
      100,
      100,
      [
        Image({
          src: onePixelPng('first-paint'),
          x: 1,
          y: 2,
          width: 3,
          height: 4,
        }),
      ],
      onImageLoad,
    )

    expect(mock.spies.drawImage).toHaveBeenCalledWith(
      expect.any(HTMLImageElement),
      1,
      2,
      3,
      4,
    )
    expect(onImageLoad).not.toHaveBeenCalled()
  })

  it('draws nothing for a source that fails to load and does not retry it', () => {
    const images = captureCreatedImages()
    const mock = makeMockContext()
    const onImageLoad = vi.fn()
    const sprite = Image({
      src: 'https://example.test/missing.png',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    })

    paintScene(mock.ctx, 100, 100, [sprite], onImageLoad)
    onlyImage(images).dispatchEvent(new Event('error'))
    paintScene(mock.ctx, 100, 100, [sprite], onImageLoad)

    expect(images).toHaveLength(1)
    expect(onImageLoad).not.toHaveBeenCalled()
    expect(mock.spies.drawImage).not.toHaveBeenCalled()
  })
})

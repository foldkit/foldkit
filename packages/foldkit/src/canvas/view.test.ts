import { Context, Effect } from 'effect'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  __htmlBuilder,
  __clearRuntime as clearHtmlRuntime,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import { MountTracker } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { Dispatch } from '../runtime/index.js'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  h as snabbdomH,
  styleModule,
  toVNode,
} from '../snabbdom/index.js'
import type { VNode } from '../vdom.js'
import { Circle, Image, Rect } from './shape.js'
import { view } from './view.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

type CanvasTestMessage = Readonly<{ _tag: 'ClickedCanvas' }>

const h = __htmlBuilder<CanvasTestMessage>()

const createCapturingDispatch = () => {
  const dispatched: Array<unknown> = []
  const dispatch = Dispatch.of({
    dispatchAsync: () => Effect.void,
    dispatchSync: message => {
      dispatched.push(message)
    },
  })
  return { dispatch, dispatched }
}

const renderView = (
  build: () => VNode | null,
  dispatch: typeof Dispatch.Service,
): VNode => {
  const testContext = Context.make(Dispatch, dispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  setHtmlRuntime(dispatch.dispatchSync, testContext)
  let vnode: VNode | null
  try {
    vnode = build()
  } finally {
    clearHtmlRuntime()
  }
  if (vnode === null) {
    throw new Error('view returned null')
  }
  return vnode
}

const makeMockContext = () => {
  const calls: Array<string> = []
  const record =
    (name: string) =>
    (...args: ReadonlyArray<unknown>) => {
      calls.push(`${name}(${args.join(',')})`)
    }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineCap: 'butt',
    lineJoin: 'miter',
    clearRect: record('clearRect'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    beginPath: record('beginPath'),
    arc: record('arc'),
    fill: record('fill'),
    stroke: record('stroke'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    bezierCurveTo: record('bezierCurveTo'),
    closePath: record('closePath'),
    fillText: record('fillText'),
    strokeText: record('strokeText'),
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    rotate: record('rotate'),
    scale: record('scale'),
    drawImage: (image: unknown, ...args: ReadonlyArray<unknown>) => {
      calls.push(
        `drawImage(${image instanceof HTMLImageElement},${args.join(',')})`,
      )
    },
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D
  return { context, calls }
}

const mockCalls = (): Array<string> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  (globalThis as unknown as { __mockCalls: Array<string> }).__mockCalls

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

describe('Canvas.view', () => {
  beforeEach(() => {
    const mock = makeMockContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      mock.context as unknown as RenderingContext,
    )
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    ;(globalThis as unknown as { __mockCalls: Array<string> }).__mockCalls =
      mock.calls
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a canvas VNode with the configured width and height as props', () => {
    const { dispatch } = createCapturingDispatch()
    const vnode = renderView(
      () =>
        view(
          {
            width: 400,
            height: 300,
            shapes: [],
          },
          h,
        ),
      dispatch,
    )
    expect(vnode.sel).toBe('canvas')
    expect(vnode.data?.props?.['width']).toBe(400)
    expect(vnode.data?.props?.['height']).toBe(300)
  })

  it('paints the scene on insert', () => {
    const { dispatch } = createCapturingDispatch()
    const vnode = renderView(
      () =>
        view(
          {
            width: 100,
            height: 100,
            shapes: [
              Rect({ x: 0, y: 0, width: 100, height: 100, fill: 'red' }),
            ],
          },
          h,
        ),
      dispatch,
    )
    const container = document.createElement('div')
    patch(toVNode(container), vnode)

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const calls = (globalThis as unknown as { __mockCalls: Array<string> })
      .__mockCalls
    expect(calls).toContain('clearRect(0,0,100,100)')
    expect(calls).toContain('fillRect(0,0,100,100)')
  })

  it('re-paints on postpatch when shapes change', () => {
    const { dispatch } = createCapturingDispatch()
    const initialVNode = renderView(
      () =>
        view(
          {
            width: 100,
            height: 100,
            shapes: [Rect({ x: 0, y: 0, width: 10, height: 10, fill: 'red' })],
          },
          h,
        ),
      dispatch,
    )
    const container = document.createElement('div')
    const inserted = patch(toVNode(container), initialVNode)

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const calls = (globalThis as unknown as { __mockCalls: Array<string> })
      .__mockCalls
    const initialFillRectCount = calls.filter(call =>
      call.startsWith('fillRect'),
    ).length

    const nextVNode = renderView(
      () =>
        view(
          {
            width: 100,
            height: 100,
            shapes: [
              Rect({ x: 0, y: 0, width: 10, height: 10, fill: 'red' }),
              Circle({ x: 50, y: 50, radius: 25, fill: 'blue' }),
            ],
          },
          h,
        ),
      dispatch,
    )
    patch(inserted, nextVNode)

    const nextFillRectCount = calls.filter(call =>
      call.startsWith('fillRect'),
    ).length
    const arcCallCount = calls.filter(call => call.startsWith('arc')).length

    expect(nextFillRectCount).toBeGreaterThan(initialFillRectCount)
    expect(arcCallCount).toBeGreaterThan(0)
  })

  it('attaches a class when className is provided', () => {
    const { dispatch } = createCapturingDispatch()
    const vnode = renderView(
      () =>
        view(
          {
            width: 100,
            height: 100,
            shapes: [],
            className: 'rounded shadow',
          },
          h,
        ),
      dispatch,
    )
    expect(vnode.data?.class).toEqual({ rounded: true, shadow: true })
  })

  it('wires pointer event listeners only when handlers are provided', () => {
    const { dispatch } = createCapturingDispatch()
    const onPointerDown = vi.fn((): CanvasTestMessage => ({
      _tag: 'ClickedCanvas',
    }))
    const vnode = renderView(
      () =>
        view(
          {
            width: 100,
            height: 100,
            shapes: [],
            onPointerDown,
          },
          h,
        ),
      dispatch,
    )
    expect(vnode.data?.on?.pointerdown).toBeDefined()
    expect(vnode.data?.on?.pointermove).toBeUndefined()
    expect(vnode.data?.on?.pointerup).toBeUndefined()
  })

  it('omits the class field when no className is provided', () => {
    const { dispatch } = createCapturingDispatch()
    const vnode = renderView(
      () =>
        view(
          {
            width: 100,
            height: 100,
            shapes: [],
          },
          h,
        ),
      dispatch,
    )
    expect(vnode.data?.class).toBeUndefined()
  })

  it('repaints its latest scene when an image it drew finishes loading', () => {
    const { dispatch } = createCapturingDispatch()
    const images = captureCreatedImages()
    const sprite = (x: number) =>
      Image({
        src: 'https://example.test/view-repaint.png',
        x,
        y: 0,
        width: 16,
        height: 16,
      })
    const renderScene = (x: number) =>
      renderView(
        () => view({ width: 100, height: 100, shapes: [sprite(x)] }, h),
        dispatch,
      )

    const container = document.createElement('div')
    const inserted = patch(toVNode(container), renderScene(10))
    patch(inserted, renderScene(30))

    const calls = mockCalls()
    expect(calls.filter(call => call.startsWith('drawImage'))).toEqual([])

    expect(images).toHaveLength(1)
    const [image] = images
    image?.dispatchEvent(new Event('load'))

    expect(calls.filter(call => call.startsWith('drawImage'))).toEqual([
      'drawImage(true,30,0,16,16)',
    ])
  })

  it('does not repaint a removed canvas when its image loads', () => {
    const { dispatch } = createCapturingDispatch()
    const images = captureCreatedImages()
    const vnode = renderView(
      () =>
        view(
          {
            width: 100,
            height: 100,
            shapes: [
              Image({
                src: 'https://example.test/view-removed.png',
                x: 0,
                y: 0,
                width: 16,
                height: 16,
              }),
            ],
          },
          h,
        ),
      dispatch,
    )

    const parent = document.createElement('div')
    const container = document.createElement('div')
    parent.appendChild(container)
    const inserted = patch(toVNode(container), vnode)
    patch(inserted, snabbdomH('div'))
    expect(parent.querySelector('canvas')).toBeNull()

    const calls = mockCalls()
    const callCountBeforeLoad = calls.length
    expect(images).toHaveLength(1)
    const [image] = images
    image?.dispatchEvent(new Event('load'))

    expect(calls).toHaveLength(callCountBeforeLoad)
  })
})

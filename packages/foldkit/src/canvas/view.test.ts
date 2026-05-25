import { describe, it } from '@effect/vitest'
import { Context, Effect } from 'effect'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from 'snabbdom'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import {
  __clearRuntime as clearHtmlRuntime,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import { MountTracker } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import { Circle, Rect } from './shape.js'
import { view } from './view.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

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
  dispatch: Dispatch['Type'],
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
  } as unknown as CanvasRenderingContext2D
  return { context, calls }
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
        view({
          width: 400,
          height: 300,
          shapes: [],
        }),
      dispatch,
    )
    expect(vnode.sel).toBe('canvas')
    expect(vnode.data?.props?.width).toBe(400)
    expect(vnode.data?.props?.height).toBe(300)
  })

  it('paints the scene on insert', () => {
    const { dispatch } = createCapturingDispatch()
    const vnode = renderView(
      () =>
        view({
          width: 100,
          height: 100,
          shapes: [Rect({ x: 0, y: 0, width: 100, height: 100, fill: 'red' })],
        }),
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
        view({
          width: 100,
          height: 100,
          shapes: [Rect({ x: 0, y: 0, width: 10, height: 10, fill: 'red' })],
        }),
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
        view({
          width: 100,
          height: 100,
          shapes: [
            Rect({ x: 0, y: 0, width: 10, height: 10, fill: 'red' }),
            Circle({ x: 50, y: 50, radius: 25, fill: 'blue' }),
          ],
        }),
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
        view({
          width: 100,
          height: 100,
          shapes: [],
          className: 'rounded shadow',
        }),
      dispatch,
    )
    expect(vnode.data?.class).toEqual({ rounded: true, shadow: true })
  })

  it('wires pointer event listeners only when handlers are provided', () => {
    const { dispatch } = createCapturingDispatch()
    const onPointerDown = vi.fn(() => ({ _tag: 'ClickedCanvas' }))
    const vnode = renderView(
      () =>
        view({
          width: 100,
          height: 100,
          shapes: [],
          onPointerDown,
        }),
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
        view({
          width: 100,
          height: 100,
          shapes: [],
        }),
      dispatch,
    )
    expect(vnode.data?.class).toBeUndefined()
  })
})

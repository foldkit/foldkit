import { Array as Array_, Option, pipe } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  ComputePositionConfig,
  Placement as FloatingPlacement,
  Middleware,
  MiddlewareData,
} from '@floating-ui/dom'

import { anchorSetup } from './index.js'

type MockComputePositionReturn = {
  x: number
  y: number
  placement: FloatingPlacement
  middlewareData: MiddlewareData
}

const BUTTON_ID = 'btn'
const ARROW_ID = 'arrow'

const computePositionMock =
  vi.fn<
    (
      reference: Element,
      floating: Element,
      options: Partial<ComputePositionConfig>,
    ) => Promise<MockComputePositionReturn>
  >()

const updateCallbacks: Array<() => void> = []

// NOTE: `actual` is spread so the real arrow/offset/flip/shift/size factories
// survive and their middleware objects keep the `.name` and `.options` values
// the assertions match on. Stubbing those factories too would make every
// assertion pass vacuously. `autoUpdate` invokes its callback once on setup,
// as the real one does.
vi.mock('@floating-ui/dom', async importOriginal => {
  const actual = await importOriginal<typeof import('@floating-ui/dom')>()
  return {
    ...actual,
    computePosition: (
      reference: Element,
      floating: Element,
      options: Partial<ComputePositionConfig>,
    ) => computePositionMock(reference, floating, options),
    autoUpdate: (
      _reference: unknown,
      _floating: unknown,
      update: () => void,
    ) => {
      updateCallbacks.push(update)
      update()
      return () => {}
    },
  }
})

describe('anchorSetup arrow', () => {
  afterEach(() => {
    computePositionMock.mockReset()
    updateCallbacks.length = 0
    document.body.replaceChildren()
  })

  const optionsOfCall = (callIndex: number): Partial<ComputePositionConfig> =>
    pipe(
      Array_.get(computePositionMock.mock.calls, callIndex),
      Option.map(([, , options]) => options),
      Option.getOrThrowWith(
        () =>
          new Error(`Expected a computePosition call at index ${callIndex}`),
      ),
    )

  const middlewareNamesOfCall = (callIndex: number): Array<string> =>
    pipe(
      optionsOfCall(callIndex).middleware ?? [],
      Array_.flatMap(middleware => (middleware ? [middleware.name] : [])),
    )

  const middlewareOfCall = (callIndex: number, name: string): Middleware =>
    pipe(
      optionsOfCall(callIndex).middleware ?? [],
      Array_.flatMap(middleware => (middleware ? [middleware] : [])),
      Array_.findFirst(middleware => middleware.name === name),
      Option.getOrThrowWith(
        () =>
          new Error(`Expected ${name} middleware at call index ${callIndex}`),
      ),
    )

  const arrowMiddlewareOfCall = (callIndex: number): Middleware =>
    middlewareOfCall(callIndex, 'arrow')

  const applySize = (callIndex: number, availableHeight: number): void => {
    const apply = middlewareOfCall(callIndex, 'size').options?.apply

    if (typeof apply !== 'function') {
      throw new Error('Expected the size middleware to carry an apply option')
    }

    apply({
      rects: { reference: { width: 120 } },
      availableHeight,
    })
  }

  const positionWith = (
    middlewareData: MiddlewareData,
  ): MockComputePositionReturn => ({
    x: 10,
    y: 20,
    placement: 'bottom-start',
    middlewareData,
  })

  const mountAnchor = (
    setup: Readonly<{ arrowId?: string; arrowPadding?: number }>,
    isArrowRendered: boolean,
  ): Readonly<{
    element: HTMLElement
    arrowElement: HTMLElement | undefined
    cleanup: () => void
  }> => {
    const button = document.createElement('button')
    button.id = BUTTON_ID
    const element = document.createElement('div')
    document.body.append(button, element)

    const arrowElement = isArrowRendered
      ? document.createElement('div')
      : undefined

    if (arrowElement) {
      arrowElement.id = ARROW_ID
      element.append(arrowElement)
    }

    const cleanup = anchorSetup(element, {
      buttonId: BUTTON_ID,
      anchor: { placement: 'bottom-start', portal: false },
      ...setup,
    })

    return { element, arrowElement, cleanup }
  }

  it('omits the arrow middleware when no arrowId is given', () => {
    computePositionMock.mockResolvedValue(positionWith({}))
    mountAnchor({}, true)

    expect(middlewareNamesOfCall(0)).not.toContain('arrow')
  })

  it('omits the arrow middleware when the arrowId resolves to nothing', () => {
    computePositionMock.mockResolvedValue(positionWith({}))
    mountAnchor({ arrowId: ARROW_ID }, false)

    expect(middlewareNamesOfCall(0)).not.toContain('arrow')
  })

  it('carries the resolved arrow element and its padding', () => {
    computePositionMock.mockResolvedValue(positionWith({}))
    const { arrowElement } = mountAnchor(
      { arrowId: ARROW_ID, arrowPadding: 8 },
      true,
    )

    const options = arrowMiddlewareOfCall(0).options
    const element: unknown = options?.element
    const padding: unknown = options?.padding

    expect(element).toBe(arrowElement)
    expect(padding).toBe(8)
  })

  it('defaults the arrow padding to zero', () => {
    computePositionMock.mockResolvedValue(positionWith({}))
    mountAnchor({ arrowId: ARROW_ID }, true)

    const padding: unknown = arrowMiddlewareOfCall(0).options?.padding

    expect(padding).toBe(0)
  })

  it('runs the arrow middleware after shift', () => {
    computePositionMock.mockResolvedValue(positionWith({}))
    mountAnchor({ arrowId: ARROW_ID }, true)

    expect(middlewareNamesOfCall(0)).toEqual([
      'offset',
      'flip',
      'shift',
      'size',
      'arrow',
    ])
  })

  const triggerUpdate = (callbackIndex: number): void => {
    const update = pipe(
      Array_.get(updateCallbacks, callbackIndex),
      Option.getOrThrowWith(
        () =>
          new Error(
            `Expected an autoUpdate callback at index ${callbackIndex}`,
          ),
      ),
    )
    update()
  }

  it('publishes the resolved axis and leaves the unset one absent', async () => {
    computePositionMock.mockResolvedValue(
      positionWith({ arrow: { x: 42, centerOffset: 0 } }),
    )
    const { element } = mountAnchor({ arrowId: ARROW_ID }, true)

    await vi.waitFor(() => {
      expect(element.style.getPropertyValue('--arrow-x')).toBe('42px')
    })

    expect(element.style.getPropertyValue('--arrow-y')).toBe('')
  })

  it('drops the previous axis when a later tick resolves the other one', async () => {
    computePositionMock
      .mockResolvedValueOnce(
        positionWith({ arrow: { x: 42, centerOffset: 0 } }),
      )
      .mockResolvedValueOnce(
        positionWith({ arrow: { y: 17, centerOffset: 0 } }),
      )
    const { element } = mountAnchor({ arrowId: ARROW_ID }, true)

    await vi.waitFor(() => {
      expect(element.style.getPropertyValue('--arrow-x')).toBe('42px')
    })

    triggerUpdate(0)

    await vi.waitFor(() => {
      expect(element.style.getPropertyValue('--arrow-y')).toBe('17px')
    })

    expect(element.style.getPropertyValue('--arrow-x')).toBe('')
  })

  it('makes the panel a scroll container when no arrow is rendered', () => {
    computePositionMock.mockResolvedValue(positionWith({}))
    const { element } = mountAnchor({}, false)

    applySize(0, 200)

    expect(element.style.maxHeight).toBe('200px')
    expect(element.style.overflowY).toBe('auto')
    expect(element.style.overscrollBehavior).toBe('none')
  })

  // NOTE: a scrolling panel clips on both axes, so it would erase the arrow it
  // just positioned. See the `size.apply` guard in anchor.ts.
  it('leaves the panel unclipped when an arrow is rendered', () => {
    computePositionMock.mockResolvedValue(positionWith({}))
    const { element } = mountAnchor({ arrowId: ARROW_ID }, true)

    applySize(0, 200)

    expect(element.style.maxHeight).toBe('200px')
    expect(element.style.overflowY).toBe('')
    expect(element.style.overscrollBehavior).toBe('')
  })

  it('removes both custom properties on cleanup', async () => {
    computePositionMock.mockResolvedValue(
      positionWith({ arrow: { x: 42, y: 17, centerOffset: 0 } }),
    )
    const { element, cleanup } = mountAnchor({ arrowId: ARROW_ID }, true)

    await vi.waitFor(() => {
      expect(element.style.getPropertyValue('--arrow-x')).toBe('42px')
    })

    cleanup()

    expect(element.style.getPropertyValue('--arrow-x')).toBe('')
    expect(element.style.getPropertyValue('--arrow-y')).toBe('')
  })
})

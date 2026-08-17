import { Array as Array_, Function, Option, pipe } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  ComputePositionConfig,
  Placement as FloatingPlacement,
} from '@floating-ui/dom'

import { type AnchorConfig, anchorSetup } from './index.js'

type MockComputePositionReturn = {
  x: number
  y: number
  placement: FloatingPlacement
}

type SizeApply = (
  args: Readonly<{
    rects: Readonly<{ reference: Readonly<{ width: number }> }>
    availableHeight: number
  }>,
) => void

type DeferredPosition = Readonly<{
  promise: Promise<MockComputePositionReturn>
  resolve: (value: MockComputePositionReturn) => void
}>

const deferPosition = (): DeferredPosition => {
  let resolve: (value: MockComputePositionReturn) => void = Function.constVoid
  const promise = new Promise<MockComputePositionReturn>(capture => {
    resolve = capture
  })
  return { promise, resolve }
}

const flushPromises = (): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, 0)
  })

const BUTTON_ID = 'btn'

const isSizeApply = (value: unknown): value is SizeApply =>
  typeof value === 'function'

const computePositionMock =
  vi.fn<
    (
      reference: Element,
      floating: Element,
      options: Partial<ComputePositionConfig>,
    ) => Promise<MockComputePositionReturn>
  >()

const updateCallbacks: Array<() => void> = []

// NOTE: `actual` is spread so the real offset/flip/shift/size factories survive
// and their middleware objects keep the `.name` values the assertions match on.
// Stubbing those factories too would make every name assertion pass vacuously.
// `autoUpdate` invokes its callback once on setup, as the real one does.
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

describe('anchorSetup placement locking and position ticks', () => {
  afterEach(() => {
    computePositionMock.mockReset()
    updateCallbacks.length = 0
    document.body.replaceChildren()
    vi.restoreAllMocks()
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

  const sizeApplyOfCall = (callIndex: number): SizeApply => {
    const middleware = pipe(
      optionsOfCall(callIndex).middleware ?? [],
      Array_.flatMap(middleware => (middleware ? [middleware] : [])),
      Array_.findFirst(({ name }) => name === 'size'),
      Option.getOrThrowWith(
        () => new Error(`Expected size middleware at call index ${callIndex}`),
      ),
    )
    const apply: unknown = middleware.options?.apply

    if (isSizeApply(apply)) {
      return apply
    } else {
      throw new Error(`Expected size.apply at call index ${callIndex}`)
    }
  }

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

  const mountAnchor = (
    anchor: AnchorConfig,
  ): Readonly<{ element: HTMLElement; cleanup: () => void }> => {
    const button = document.createElement('button')
    button.id = BUTTON_ID
    const element = document.createElement('div')
    document.body.append(button, element)
    const cleanup = anchorSetup(element, { buttonId: BUTTON_ID, anchor })
    return { element, cleanup }
  }

  const waitForPosition = (
    element: HTMLElement,
    x: number,
    y: number,
  ): Promise<void> =>
    vi.waitFor(() => {
      expect(element.style.left).toBe(`${x}px`)
      expect(element.style.top).toBe(`${y}px`)
    })

  it('locks the resolved placement and drops flip on later updates', async () => {
    computePositionMock
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'top-start' })
      .mockResolvedValueOnce({ x: 11, y: 21, placement: 'top-start' })
    const { element } = mountAnchor({
      placement: 'bottom-start',
      isPlacementLocked: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    expect(optionsOfCall(0).placement).toBe('bottom-start')
    expect(middlewareNamesOfCall(0)).toContain('flip')

    triggerUpdate(0)
    await waitForPosition(element, 11, 21)

    expect(optionsOfCall(1).placement).toBe('top-start')
    expect(middlewareNamesOfCall(1)).toEqual(['offset', 'shift', 'size'])
  })

  it('keeps flip and follows the resolved side without isPlacementLocked', async () => {
    computePositionMock
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'top-start' })
      .mockResolvedValueOnce({ x: 11, y: 21, placement: 'bottom-start' })
    const { element } = mountAnchor({
      placement: 'bottom-start',
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    expect(middlewareNamesOfCall(0)).toContain('flip')
    expect(element.getAttribute('data-placement')).toBe('top')

    triggerUpdate(0)
    await waitForPosition(element, 11, 21)

    expect(middlewareNamesOfCall(1)).toContain('flip')
    expect(optionsOfCall(1).placement).toBe('bottom-start')
    expect(element.getAttribute('data-placement')).toBe('bottom')
  })

  it('clamps negative available height to zero', async () => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'bottom-start',
    })
    const { element } = mountAnchor({
      placement: 'bottom-start',
      portal: false,
    })

    sizeApplyOfCall(0)({
      rects: { reference: { width: 160 } },
      availableHeight: -20,
    })

    expect(element.style.getPropertyValue('--button-width')).toBe('160px')
    expect(element.style.maxHeight).toBe('0px')
  })

  it('writes the locked side to data-placement', async () => {
    computePositionMock
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'bottom-end' })
      .mockResolvedValueOnce({ x: 11, y: 21, placement: 'bottom-end' })
    const { element } = mountAnchor({
      placement: 'bottom-start',
      isPlacementLocked: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    expect(element.getAttribute('data-placement')).toBe('bottom')

    triggerUpdate(0)
    await waitForPosition(element, 11, 21)

    expect(optionsOfCall(1).placement).toBe('bottom-end')
    expect(element.getAttribute('data-placement')).toBe('bottom')
  })

  it('keeps repositioning on later updates once locked', async () => {
    computePositionMock
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'top-start' })
      .mockResolvedValueOnce({ x: 140, y: 320, placement: 'top-start' })
    const { element } = mountAnchor({
      placement: 'bottom-start',
      isPlacementLocked: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    triggerUpdate(0)

    await waitForPosition(element, 140, 320)
    expect(element.getAttribute('data-placement')).toBe('top')
  })

  it('coalesces updates that arrive while positioning', async () => {
    const firstTick = deferPosition()
    const secondTick = deferPosition()
    computePositionMock
      .mockReturnValueOnce(firstTick.promise)
      .mockReturnValueOnce(secondTick.promise)
    const { element } = mountAnchor({
      placement: 'bottom-start',
      isPlacementLocked: true,
      portal: false,
    })

    triggerUpdate(0)
    triggerUpdate(0)

    expect(computePositionMock).toHaveBeenCalledTimes(1)

    firstTick.resolve({ x: 5, y: 6, placement: 'top-start' })
    await waitForPosition(element, 5, 6)

    await vi.waitFor(() => {
      expect(computePositionMock).toHaveBeenCalledTimes(2)
    })
    expect(optionsOfCall(1).placement).toBe('top-start')
    expect(middlewareNamesOfCall(1)).toEqual(['offset', 'shift', 'size'])

    secondTick.resolve({ x: 30, y: 40, placement: 'top-start' })
    await waitForPosition(element, 30, 40)
    expect(computePositionMock).toHaveBeenCalledTimes(2)
  })

  it('coalesces ticks that arrive while positioning without isPlacementLocked', async () => {
    const firstTick = deferPosition()
    const secondTick = deferPosition()
    computePositionMock
      .mockReturnValueOnce(firstTick.promise)
      .mockReturnValueOnce(secondTick.promise)
    const { element } = mountAnchor({
      placement: 'bottom-start',
      portal: false,
    })

    triggerUpdate(0)
    triggerUpdate(0)

    expect(computePositionMock).toHaveBeenCalledTimes(1)

    firstTick.resolve({ x: 5, y: 6, placement: 'bottom-start' })
    await waitForPosition(element, 5, 6)

    await vi.waitFor(() => {
      expect(computePositionMock).toHaveBeenCalledTimes(2)
    })

    secondTick.resolve({ x: 30, y: 40, placement: 'bottom-start' })
    await waitForPosition(element, 30, 40)
    expect(computePositionMock).toHaveBeenCalledTimes(2)
  })

  it('lets the coalesced tick win the last write without isPlacementLocked', async () => {
    const firstTick = deferPosition()
    const secondTick = deferPosition()
    computePositionMock
      .mockReturnValueOnce(firstTick.promise)
      .mockReturnValueOnce(secondTick.promise)
    const { element } = mountAnchor({
      placement: 'bottom-start',
      portal: false,
    })

    triggerUpdate(0)

    secondTick.resolve({ x: 99, y: 99, placement: 'bottom-start' })
    firstTick.resolve({ x: 10, y: 20, placement: 'bottom-start' })
    await flushPromises()

    expect(element.style.left).toBe('99px')
    expect(element.style.top).toBe('99px')
  })

  it('reports once and leaves the panel hidden while ticks reject', async () => {
    const reportError = vi
      .spyOn(console, 'error')
      .mockImplementation(Function.constVoid)
    computePositionMock
      .mockRejectedValueOnce(new Error('measurement failed'))
      .mockRejectedValueOnce(new Error('measurement failed again'))
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'bottom-start' })
    const { element } = mountAnchor({
      placement: 'bottom-start',
      portal: false,
    })
    element.style.visibility = 'hidden'

    await flushPromises()
    triggerUpdate(0)
    await flushPromises()

    expect(reportError).toHaveBeenCalledTimes(1)
    expect(element.style.visibility).toBe('hidden')

    triggerUpdate(0)
    await waitForPosition(element, 10, 20)

    expect(reportError).toHaveBeenCalledTimes(1)
    expect(element.style.visibility).toBe('')
  })

  it('reports a fresh failure after a tick has recovered', async () => {
    const reportError = vi
      .spyOn(console, 'error')
      .mockImplementation(Function.constVoid)
    computePositionMock
      .mockRejectedValueOnce(new Error('measurement failed'))
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'bottom-start' })
      .mockRejectedValueOnce(new Error('measurement failed later'))
    const { element } = mountAnchor({
      placement: 'bottom-start',
      portal: false,
    })

    await flushPromises()
    triggerUpdate(0)
    await waitForPosition(element, 10, 20)
    triggerUpdate(0)
    await flushPromises()

    expect(reportError).toHaveBeenCalledTimes(2)
  })

  it('exposes a horizontal side, not only top and bottom', async () => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'left-start',
    })
    const { element } = mountAnchor({
      placement: 'right-start',
      isPlacementLocked: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    expect(element.getAttribute('data-placement')).toBe('left')
  })

  it('does not write a pending position after cleanup', async () => {
    const firstTick = deferPosition()
    computePositionMock.mockReturnValue(firstTick.promise)
    const { element, cleanup } = mountAnchor({
      placement: 'bottom-start',
      isPlacementLocked: true,
      portal: false,
    })
    const sizeApply = sizeApplyOfCall(0)

    cleanup()
    sizeApply({
      rects: { reference: { width: 160 } },
      availableHeight: 100,
    })
    firstTick.resolve({ x: 10, y: 20, placement: 'top-start' })
    await flushPromises()

    expect(element.style.getPropertyValue('--button-width')).toBe('')
    expect(element.style.maxHeight).toBe('')
    expect(element.style.left).toBe('')
    expect(element.style.top).toBe('')
    expect(element.hasAttribute('data-placement')).toBe(false)
  })

  it('removes data-placement on cleanup', async () => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'top-start',
    })
    const { element, cleanup } = mountAnchor({
      placement: 'bottom-start',
      isPlacementLocked: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)
    expect(element.getAttribute('data-placement')).toBe('top')

    cleanup()

    expect(element.hasAttribute('data-placement')).toBe(false)
  })

  it('removes data-placement on cleanup without isPlacementLocked', async () => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'top-start',
    })
    const { element, cleanup } = mountAnchor({
      placement: 'bottom-start',
      portal: false,
    })

    await waitForPosition(element, 10, 20)
    expect(element.getAttribute('data-placement')).toBe('top')

    cleanup()

    expect(element.hasAttribute('data-placement')).toBe(false)
  })
})

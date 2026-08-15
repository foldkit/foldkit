import { Array, Option, pipe } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  ComputePositionConfig,
  Placement as FloatingPlacement,
} from '@floating-ui/dom'

import { type AnchorConfig, anchorSetup } from './anchor.js'

type MockComputePositionReturn = {
  x: number
  y: number
  placement: FloatingPlacement
}

const BUTTON_ID = 'btn'

const computePositionMock =
  vi.fn<
    (
      reference: Element,
      floating: Element,
      options: Partial<ComputePositionConfig>,
    ) => Promise<MockComputePositionReturn>
  >()

// NOTE: `actual` is spread so the real offset/flip/shift/size factories survive
// and their middleware objects keep the `.name` and `.options` values the
// assertions match on. Stubbing those factories too would make every padding
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
      update()
      return () => {}
    },
  }
})

describe('anchorSetup padding', () => {
  afterEach(() => {
    computePositionMock.mockReset()
    document.body.replaceChildren()
  })

  const optionsOfCall = (callIndex: number): Partial<ComputePositionConfig> =>
    pipe(
      Array.get(computePositionMock.mock.calls, callIndex),
      Option.map(([, , options]) => options),
      Option.getOrThrowWith(
        () =>
          new Error(`Expected a computePosition call at index ${callIndex}`),
      ),
    )

  const paddingOfMiddleware = (
    callIndex: number,
    middlewareName: string,
  ): unknown => {
    const middleware = pipe(
      optionsOfCall(callIndex).middleware ?? [],
      Array.flatMap(middleware => (middleware ? [middleware] : [])),
      Array.findFirst(({ name }) => name === middlewareName),
      Option.getOrThrowWith(
        () =>
          new Error(
            `Expected ${middlewareName} middleware at call index ${callIndex}`,
          ),
      ),
    )
    const padding: unknown = middleware.options?.padding
    return padding
  }

  const mountAnchor = (
    anchor: AnchorConfig,
  ): Readonly<{ element: HTMLElement; cleanup: () => void }> => {
    const button = document.createElement('button')
    button.id = BUTTON_ID
    const element = document.createElement('div')
    document.body.append(button, element)
    const cleanup = anchorSetup({ buttonId: BUTTON_ID, anchor })(element)
    return { element, cleanup }
  }

  it('forwards a per-side padding object to flip, shift, and size', () => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'bottom-start',
    })
    mountAnchor({
      placement: 'bottom-start',
      padding: { top: 88, right: 16, bottom: 16, left: 16 },
      portal: false,
    })

    const perSidePadding = { top: 88, right: 16, bottom: 16, left: 16 }
    expect(paddingOfMiddleware(0, 'flip')).toEqual(perSidePadding)
    expect(paddingOfMiddleware(0, 'shift')).toEqual(perSidePadding)
    expect(paddingOfMiddleware(0, 'size')).toEqual(perSidePadding)
  })

  it('forwards a scalar padding unchanged', () => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'bottom-start',
    })
    mountAnchor({ placement: 'bottom-start', padding: 16, portal: false })

    expect(paddingOfMiddleware(0, 'flip')).toBe(16)
    expect(paddingOfMiddleware(0, 'shift')).toBe(16)
    expect(paddingOfMiddleware(0, 'size')).toBe(16)
  })

  it('forwards zero when padding is omitted', () => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'bottom-start',
    })
    mountAnchor({ placement: 'bottom-start', portal: false })

    expect(paddingOfMiddleware(0, 'flip')).toBe(0)
    expect(paddingOfMiddleware(0, 'shift')).toBe(0)
    expect(paddingOfMiddleware(0, 'size')).toBe(0)
  })
})

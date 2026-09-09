import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  ComputePositionConfig,
  Placement as FloatingPlacement,
} from '@floating-ui/dom'

import { anchorSetup } from './index.js'

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

describe('anchorSetup focusAfterPosition', () => {
  afterEach(() => {
    computePositionMock.mockReset()
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('focuses the panel with preventScroll once the first position resolves', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'bottom-start',
    })

    const button = document.createElement('button')
    button.id = BUTTON_ID
    const element = document.createElement('div')
    element.tabIndex = 0
    element.style.visibility = 'hidden'
    document.body.append(button, element)
    const focusSpy = vi.spyOn(element, 'focus')

    const cleanup = anchorSetup(element, {
      buttonId: BUTTON_ID,
      anchor: { portal: false },
      focusAfterPosition: true,
    })

    await vi.waitFor(() => {
      expect(focusSpy).toHaveBeenCalledTimes(1)
    })
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    expect(element.style.visibility).toBe('')

    cleanup()
  })
})

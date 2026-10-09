import { Array, Option, pipe } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  ComputePositionConfig,
  Placement as FloatingPlacement,
  Strategy,
} from '@floating-ui/dom'

import {
  type AnchorConfig,
  anchorSetup,
  anchorSetupWithoutRelocation,
} from './index.js'

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

describe('anchorSetup strategy', () => {
  afterEach(() => {
    computePositionMock.mockReset()
    document.body.replaceChildren()
  })

  const strategyOfCall = (callIndex: number): Strategy | undefined =>
    pipe(
      Array.get(computePositionMock.mock.calls, callIndex),
      Option.map(([, , options]) => options.strategy),
      Option.getOrThrowWith(
        () =>
          new Error(`Expected a computePosition call at index ${callIndex}`),
      ),
    )

  const mountAnchor = (
    anchor: AnchorConfig,
    containerPosition: string,
    setup: typeof anchorSetup = anchorSetup,
  ): Readonly<{
    element: HTMLElement
    layer: HTMLElement
    cleanup: () => void
  }> => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'bottom-start',
    })
    const container = document.createElement('header')
    container.style.position = containerPosition
    const nav = document.createElement('nav')
    const wrapper = document.createElement('div')
    const button = document.createElement('button')
    button.id = BUTTON_ID
    wrapper.append(button)
    nav.append(wrapper)
    container.append(nav)
    const element = document.createElement('div')
    element.style.position = 'absolute'
    const layer = document.createElement('div')
    layer.append(element)
    document.body.append(container, layer)
    const cleanup = setup(element, { buttonId: BUTTON_ID, anchor })
    return { element, layer, cleanup }
  }

  it('positions a portaled panel with the fixed strategy when the button sits inside a fixed container', () => {
    const { element, cleanup } = mountAnchor({}, 'fixed')

    expect(strategyOfCall(0)).toBe('fixed')
    expect(element.style.position).toBe('fixed')

    cleanup()
  })

  it('keeps the absolute strategy when no ancestor of the button is fixed', () => {
    const { element, cleanup } = mountAnchor({}, 'sticky')

    expect(strategyOfCall(0)).toBe('absolute')
    expect(element.style.position).toBe('absolute')

    cleanup()
  })

  it('keeps a layer-owned panel in place while using the portal strategy', () => {
    const { element, layer, cleanup } = mountAnchor(
      {},
      'fixed',
      anchorSetupWithoutRelocation,
    )

    expect(element.parentElement).toBe(layer)
    expect(strategyOfCall(0)).toBe('fixed')
    expect(element.style.position).toBe('fixed')

    cleanup()
    expect(element.parentElement).toBe(layer)
  })

  it('keeps the absolute strategy for a panel that is not portaled', () => {
    const { element, cleanup } = mountAnchor({ portal: false }, 'fixed')

    expect(strategyOfCall(0)).toBe('absolute')
    expect(element.style.position).toBe('absolute')

    cleanup()
  })
})

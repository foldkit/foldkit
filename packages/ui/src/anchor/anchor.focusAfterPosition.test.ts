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
const TARGET_ID = 'target'

class FakeVisibilityTransition extends Animation {
  readonly transitionProperty = 'visibility'

  override readonly playState: AnimationPlayState

  constructor(playState: AnimationPlayState) {
    super()
    this.playState = playState
  }
}

type HiddenTargetSetup = Readonly<{
  transitioningElement: 'Target' | 'Panel'
  animations: ReadonlyArray<Animation> | 'Unsupported'
}>

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
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
    document.body.replaceChildren()
  })

  const mountPanelWithHiddenTarget = async ({
    transitioningElement,
    animations,
  }: HiddenTargetSetup) => {
    const pendingFrames = new Map<number, FrameRequestCallback>()
    let nextFrameId = 1

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const frameId = nextFrameId++
      pendingFrames.set(frameId, callback)
      return frameId
    })
    vi.stubGlobal('cancelAnimationFrame', (frameId: number) => {
      pendingFrames.delete(frameId)
    })

    const runFrame = (): void => {
      const callbacks = [...pendingFrames.values()]
      pendingFrames.clear()
      callbacks.forEach(callback => callback(0))
    }

    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'bottom-start',
    })

    const button = document.createElement('button')
    button.id = BUTTON_ID
    const element = document.createElement('div')
    element.style.visibility = 'hidden'
    const target = document.createElement('div')
    target.id = TARGET_ID
    target.tabIndex = 0
    target.style.visibility = 'hidden'
    element.append(target)
    document.body.append(button, element)

    const transitioningNode =
      transitioningElement === 'Panel' ? element : target
    if (animations === 'Unsupported') {
      Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
        configurable: true,
        value: undefined,
      })
    }
    const getAnimationsSpy =
      animations === 'Unsupported'
        ? undefined
        : vi
            .spyOn(transitioningNode, 'getAnimations')
            .mockReturnValue([...animations])
    const focusSpy = vi.spyOn(target, 'focus')

    const finishTransition = (): void => {
      target.style.visibility = 'visible'
      getAnimationsSpy?.mockReturnValue([])
    }

    const cleanup = anchorSetup(element, {
      buttonId: BUTTON_ID,
      anchor: { portal: false },
      focusAfterPosition: true,
      focusSelector: `#${TARGET_ID}`,
    })

    await vi.waitFor(() => {
      expect(pendingFrames.size).toBe(1)
    })

    return { cleanup, finishTransition, focusSpy, pendingFrames, runFrame }
  }
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

  it('waits while a visibility transition on an ancestor keeps the target hidden', async () => {
    const { cleanup, finishTransition, focusSpy, pendingFrames, runFrame } =
      await mountPanelWithHiddenTarget({
        transitioningElement: 'Panel',
        animations: [new FakeVisibilityTransition('running')],
      })

    runFrame()

    expect(focusSpy).not.toHaveBeenCalled()
    expect(pendingFrames.size).toBe(1)

    finishTransition()
    runFrame()

    expect(focusSpy).toHaveBeenCalledTimes(1)
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    expect(pendingFrames.size).toBe(0)

    cleanup()
  })

  it('cancels the pending focus when cleaned up while the target is transitioning', async () => {
    const { cleanup, finishTransition, focusSpy, pendingFrames, runFrame } =
      await mountPanelWithHiddenTarget({
        transitioningElement: 'Target',
        animations: [new FakeVisibilityTransition('running')],
      })

    runFrame()
    cleanup()
    finishTransition()
    runFrame()

    expect(focusSpy).not.toHaveBeenCalled()
    expect(pendingFrames.size).toBe(0)
  })

  const singleAttemptCases: ReadonlyArray<
    Readonly<{ reason: string; animations: HiddenTargetSetup['animations'] }>
  > = [
    { reason: 'there is no visibility transition', animations: [] },
    {
      reason: 'the visibility transition is paused',
      animations: [new FakeVisibilityTransition('paused')],
    },
    {
      reason: 'elements have no getAnimations',
      animations: 'Unsupported',
    },
  ]

  it.each(singleAttemptCases)(
    'makes a single attempt on a hidden target when $reason',
    async ({ animations }) => {
      const { cleanup, focusSpy, pendingFrames, runFrame } =
        await mountPanelWithHiddenTarget({
          transitioningElement: 'Target',
          animations,
        })

      runFrame()

      expect(focusSpy).toHaveBeenCalledTimes(1)
      expect(pendingFrames.size).toBe(0)

      cleanup()
    },
  )

  it('drops the pending focus when focus moves elsewhere during the wait', async () => {
    const { cleanup, finishTransition, focusSpy, pendingFrames, runFrame } =
      await mountPanelWithHiddenTarget({
        transitioningElement: 'Target',
        animations: [new FakeVisibilityTransition('running')],
      })
    const searchInput = document.createElement('input')
    document.body.append(searchInput)

    runFrame()
    searchInput.focus()
    finishTransition()
    runFrame()

    expect(focusSpy).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(searchInput)
    expect(pendingFrames.size).toBe(0)

    cleanup()
  })
})

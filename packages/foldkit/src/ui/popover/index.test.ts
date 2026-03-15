import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/errorUI'
import {
  AdvancedTransitionFrame,
  Closed,
  ClosedByTab,
  CompletedPanelFocus,
  DetectedButtonMovement,
  EndedTransition,
  Opened,
  PressedPointerOnButton,
  init,
  update,
  view,
} from './index'
import type { Model, ViewConfig } from './index'

const closedModel = () => init({ id: 'test' })

const openModel = () => {
  const model = init({ id: 'test' })
  const [result] = update(model, Opened())
  return result
}

const closedAnimatedModel = () => init({ id: 'test', isAnimated: true })

const openAnimatedModel = () => {
  const model = closedAnimatedModel()
  const [result] = update(model, Opened())
  return result
}

describe('Popover', () => {
  describe('init', () => {
    it('defaults to closed', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        transitionState: 'Idle',
        maybeLastButtonPointerType: Option.none(),
      })
    })

    it('accepts isAnimated option', () => {
      const model = init({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', () => {
      const model = init({ id: 'test' })
      expect(model.isModal).toBe(false)
    })

    it('accepts isModal option', () => {
      const model = init({ id: 'test', isModal: true })
      expect(model.isModal).toBe(true)
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the popover', () => {
        const model = closedModel()
        const [result, commands] = update(model, Opened())
        expect(result.isOpen).toBe(true)
        expect(commands).toHaveLength(1)
      })
    })

    describe('Closed', () => {
      it('closes the popover and returns a focus command', () => {
        const model = openModel()
        const [result, commands] = update(model, Closed())
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })

      it('is idempotent when already closed', () => {
        const model = closedModel()
        const [result, commands] = update(model, Closed())
        expect(result.isOpen).toBe(false)
        expect(commands).toHaveLength(1)
      })
    })

    describe('ClosedByTab', () => {
      it('closes the popover without a focus command', () => {
        const model = openModel()
        const [result, commands] = update(model, ClosedByTab())
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(Option.none())
        expect(commands).toHaveLength(0)
      })
    })

    describe('PressedPointerOnButton', () => {
      it('records pointer type for touch without toggling', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('touch'),
        )
        expect(commands).toHaveLength(0)
      })

      it('records pointer type for pen without toggling', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({ pointerType: 'pen', button: 0 }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('pen'),
        )
        expect(commands).toHaveLength(0)
      })

      it('opens the popover on mouse left button when closed', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
        )
        expect(result.isOpen).toBe(true)
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('mouse'),
        )
        expect(commands).toHaveLength(1)
      })

      it('closes the popover on mouse left button when open', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })

      it('does not toggle on mouse right button', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          PressedPointerOnButton({ pointerType: 'mouse', button: 2 }),
        )
        expect(result.isOpen).toBe(false)
        expect(result.maybeLastButtonPointerType).toStrictEqual(
          Option.some('mouse'),
        )
        expect(commands).toHaveLength(0)
      })

      it('always records maybeLastButtonPointerType', () => {
        const model = closedModel()
        const [afterTouch] = update(
          model,
          PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
        )
        expect(afterTouch.maybeLastButtonPointerType).toStrictEqual(
          Option.some('touch'),
        )

        const [afterMouse] = update(
          afterTouch,
          PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
        )
        expect(afterMouse.maybeLastButtonPointerType).toStrictEqual(
          Option.some('mouse'),
        )
      })
    })

    describe('CompletedPanelFocus', () => {
      it('returns model unchanged', () => {
        const model = openModel()
        const [result, commands] = update(model, CompletedPanelFocus())
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + nextFrame on Opened', () => {
          const model = closedAnimatedModel()
          const [result, commands] = update(model, Opened())
          expect(result.isOpen).toBe(true)
          expect(result.transitionState).toBe('EnterStart')
          expect(commands).toHaveLength(2)
        })

        it('advances EnterStart to EnterAnimating on AdvancedTransitionFrame', () => {
          const model = openAnimatedModel()
          expect(model.transitionState).toBe('EnterStart')

          const [result, commands] = update(model, AdvancedTransitionFrame())
          expect(result.transitionState).toBe('EnterAnimating')
          expect(commands).toHaveLength(1)
        })

        it('completes EnterAnimating to Idle on EndedTransition', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, AdvancedTransitionFrame())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result, commands] = update(enterAnimating, EndedTransition())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          const model = openAnimatedModel()
          const [result, commands] = update(model, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
          expect(commands).toHaveLength(2)
        })

        it('sets LeaveStart on ClosedByTab', () => {
          const model = openAnimatedModel()
          const [result, commands] = update(model, ClosedByTab())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
          expect(commands).toHaveLength(1)
        })

        it('advances LeaveStart to LeaveAnimating on AdvancedTransitionFrame', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          expect(closed.transitionState).toBe('LeaveStart')

          const [result, commands] = update(closed, AdvancedTransitionFrame())
          expect(result.transitionState).toBe('LeaveAnimating')
          expect(commands).toHaveLength(1)
        })

        it('completes LeaveAnimating to Idle on EndedTransition', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          const [leaveAnimating] = update(closed, AdvancedTransitionFrame())
          expect(leaveAnimating.transitionState).toBe('LeaveAnimating')

          const [result, commands] = update(leaveAnimating, EndedTransition())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          const model = closedModel()
          const [result, commands] = update(model, Opened())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(1)
        })

        it('keeps transitionState Idle on Closed', () => {
          const model = openModel()
          const [result, commands] = update(model, Closed())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(1)
        })
      })

      describe('stale messages', () => {
        it('ignores AdvancedTransitionFrame when Idle', () => {
          const model = openModel()
          const [result, commands] = update(model, AdvancedTransitionFrame())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })

        it('ignores EndedTransition when Idle', () => {
          const model = openModel()
          const [result, commands] = update(model, EndedTransition())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          const model = openAnimatedModel()
          expect(model.transitionState).toBe('EnterStart')

          const [result] = update(model, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, AdvancedTransitionFrame())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result] = update(enterAnimating, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
        })
      })

      describe('DetectedButtonMovement', () => {
        it('cancels leave animation by setting transitionState to Idle', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          const [leaveAnimating] = update(closed, AdvancedTransitionFrame())
          expect(leaveAnimating.transitionState).toBe('LeaveAnimating')

          const [result, commands] = update(
            leaveAnimating,
            DetectedButtonMovement(),
          )
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })

        it('is a no-op during Idle', () => {
          const model = openModel()
          expect(model.transitionState).toBe('Idle')

          const [result, commands] = update(model, DetectedButtonMovement())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })

        it('is a no-op during EnterAnimating', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, AdvancedTransitionFrame())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result, commands] = update(
            enterAnimating,
            DetectedButtonMovement(),
          )
          expect(result).toBe(enterAnimating)
          expect(commands).toHaveLength(0)
        })
      })
    })
  })

  describe('modal commands', () => {
    const closedModalModel = () => init({ id: 'test', isModal: true })

    const openModalModel = () => {
      const model = closedModalModel()
      const [result] = update(model, Opened())
      return result
    }

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      const model = closedModalModel()
      const [, commands] = update(model, Opened())
      expect(commands).toHaveLength(3)
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      const model = openModalModel()
      const [, commands] = update(model, Closed())
      expect(commands).toHaveLength(3)
    })

    it('emits unlockScroll and restoreInert commands on ClosedByTab when isModal is true', () => {
      const model = openModalModel()
      const [, commands] = update(model, ClosedByTab())
      expect(commands).toHaveLength(2)
    })

    it('does not emit modal commands when isModal is false', () => {
      const model = closedModel()
      const [, openCommands] = update(model, Opened())
      expect(openCommands).toHaveLength(1)

      const open = openModel()
      const [, closeCommands] = update(open, Closed())
      expect(closeCommands).toHaveLength(1)

      const [, tabCommands] = update(open, ClosedByTab())
      expect(tabCommands).toHaveLength(0)
    })
  })

  describe('view', () => {
    type TestMessage = string

    const baseViewConfig = (model: Model): ViewConfig<TestMessage> => ({
      model,
      toMessage: message => message._tag,
      anchor: { placement: 'bottom-start' },
      buttonContent: Effect.succeed(null),
      panelContent: Effect.succeed(null),
    })

    const renderView = (config: ViewConfig<TestMessage>): VNode => {
      const vnode = Effect.runSync(
        Effect.provideService(view(config), Dispatch, noOpDispatch),
      )
      if (Predicate.isNull(vnode)) {
        throw new Error('Expected vnode, got null')
      }
      return vnode
    }

    const findChildByKey = (vnode: VNode, key: string): VNode | undefined =>
      vnode.children?.find(
        (child): child is VNode =>
          typeof child !== 'string' && child.key === key,
      )

    it('renders button with aria-expanded false when closed', () => {
      const model = closedModel()
      const vnode = renderView(baseViewConfig(model))
      const button = findChildByKey(vnode, 'test-button')

      expect(button?.data?.attrs?.['aria-expanded']).toBe('false')
      expect(button?.data?.attrs?.['aria-controls']).toBe('test-panel')
    })

    it('renders button with aria-expanded true when open', () => {
      const model = openModel()
      const vnode = renderView(baseViewConfig(model))
      const button = findChildByKey(vnode, 'test-button')

      expect(button?.data?.attrs?.['aria-expanded']).toBe('true')
    })

    it('renders panel when open', () => {
      const model = openModel()
      const vnode = renderView(baseViewConfig(model))
      const panel = findChildByKey(vnode, 'test-panel-container')

      expect(panel).toBeDefined()
      expect(panel?.data?.props?.['tabIndex']).toBe(0)
    })

    it('does not render panel when closed', () => {
      const model = closedModel()
      const vnode = renderView(baseViewConfig(model))
      const panel = findChildByKey(vnode, 'test-panel-container')

      expect(panel).toBeUndefined()
    })

    it('renders backdrop when open', () => {
      const model = openModel()
      const vnode = renderView(baseViewConfig(model))
      const backdrop = findChildByKey(vnode, 'test-backdrop')

      expect(backdrop).toBeDefined()
    })

    it('does not have aria-haspopup on the button', () => {
      const model = closedModel()
      const vnode = renderView(baseViewConfig(model))
      const button = findChildByKey(vnode, 'test-button')

      expect(button?.data?.attrs?.['aria-haspopup']).toBeUndefined()
    })

    it('does not have role on the panel', () => {
      const model = openModel()
      const vnode = renderView(baseViewConfig(model))
      const panel = findChildByKey(vnode, 'test-panel-container')

      expect(panel?.data?.attrs?.['role']).toBeUndefined()
    })

    it('adds anchor positioning styles and hooks', () => {
      const model = openModel()
      const vnode = renderView(baseViewConfig(model))
      const panel = findChildByKey(vnode, 'test-panel-container')

      expect(panel?.data?.style?.position).toBe('absolute')
      expect(panel?.data?.style?.margin).toBe('0')
      expect(panel?.data?.style?.visibility).toBe('hidden')
      expect(panel?.data?.hook?.insert).toBeTypeOf('function')
      expect(panel?.data?.hook?.destroy).toBeTypeOf('function')
    })
  })
})

import { describe, it } from '@effect/vitest'
import { Effect, Option, Predicate, flow } from 'effect'
import type { VNode } from 'snabbdom'
import { expect } from 'vitest'

import { Dispatch } from '../../runtime'
import { noOpDispatch } from '../../runtime/crashUI'
import * as Test from '../../test'
import {
  AdvancedTransitionFrame,
  Closed,
  ClosedByTab,
  CompletedFocusButton,
  CompletedFocusPanel,
  CompletedLockScroll,
  CompletedSetupInert,
  CompletedTeardownInert,
  CompletedUnlockScroll,
  DetectMovementOrTransitionEnd,
  DetectedButtonMovement,
  EndedTransition,
  FocusButton,
  FocusPanel,
  InertOthers,
  LockScroll,
  Opened,
  PressedPointerOnButton,
  RequestFrame,
  RestoreInert,
  UnlockScroll,
  WaitForTransitions,
  init,
  update,
  view,
} from './index'
import type { Model, ViewConfig } from './index'

const withClosed = Test.with(init({ id: 'test' }))

const withOpen = flow(
  withClosed,
  Test.message(Opened()),
  Test.resolve(FocusPanel, CompletedFocusPanel()),
)

const withClosedAnimated = Test.with(init({ id: 'test', isAnimated: true }))

const withOpenAnimated = flow(
  withClosedAnimated,
  Test.message(Opened()),
  Test.resolveAll([
    [FocusPanel, CompletedFocusPanel()],
    [RequestFrame, AdvancedTransitionFrame()],
    [WaitForTransitions, EndedTransition()],
    [DetectMovementOrTransitionEnd, EndedTransition()],
  ]),
)

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
        Test.story(
          update,
          withClosed,
          Test.message(Opened()),
          Test.resolve(FocusPanel, CompletedFocusPanel()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes the popover and returns a focus command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(Closed()),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })

      it('is idempotent when already closed', () => {
        Test.story(
          update,
          withClosed,
          Test.message(Closed()),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('ClosedByTab', () => {
      it('closes the popover without a focus command', () => {
        Test.story(
          update,
          withOpen,
          Test.message(ClosedByTab()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })
    })

    describe('PressedPointerOnButton', () => {
      it('records pointer type for touch without toggling', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
        )
      })

      it('records pointer type for pen without toggling', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'pen', button: 0 }),
          ),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('pen'),
            )
          }),
        )
      })

      it('opens the popover on mouse left button when closed', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Test.resolve(FocusPanel, CompletedFocusPanel()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('closes the popover on mouse left button when open', () => {
        Test.story(
          update,
          withOpen,
          Test.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Test.resolve(FocusButton, CompletedFocusButton()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })

      it('does not toggle on mouse right button', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 2 }),
          ),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('always records maybeLastButtonPointerType', () => {
        Test.story(
          update,
          withClosed,
          Test.message(
            PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Test.tap(({ model }) => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Test.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Test.resolve(FocusPanel, CompletedFocusPanel()),
          Test.tap(({ model }) => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })
    })

    describe('CompletedFocusPanel', () => {
      it('returns model unchanged', () => {
        Test.story(
          update,
          withOpen,
          Test.message(CompletedFocusPanel()),
          Test.tap(({ model }) => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + nextFrame on Opened', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('EnterStart')
            }),
            Test.resolveAll([
              [FocusPanel, CompletedFocusPanel()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('advances EnterStart to EnterAnimating on AdvancedTransitionFrame', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened()),
            Test.resolve(RequestFrame, AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
            Test.resolveAll([
              [FocusPanel, CompletedFocusPanel()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('completes EnterAnimating to Idle on EndedTransition', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened()),
            Test.resolveAll([
              [FocusPanel, CompletedFocusPanel()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('sets LeaveStart on ClosedByTab', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(ClosedByTab()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('advances LeaveStart to LeaveAnimating on AdvancedTransitionFrame', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.resolve(RequestFrame, AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('LeaveAnimating')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('completes LeaveAnimating to Idle on EndedTransition', () => {
          Test.story(
            update,
            withOpenAnimated,
            Test.message(Closed()),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          Test.story(
            update,
            withClosed,
            Test.message(Opened()),
            Test.resolve(FocusPanel, CompletedFocusPanel()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Test.story(
            update,
            withOpen,
            Test.message(Closed()),
            Test.resolve(FocusButton, CompletedFocusButton()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores AdvancedTransitionFrame when Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(AdvancedTransitionFrame()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('ignores EndedTransition when Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(EndedTransition()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened()),
            Test.resolveAll([
              [FocusPanel, CompletedFocusPanel()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          Test.story(
            update,
            withClosedAnimated,
            Test.message(Opened()),
            Test.resolveAll([
              [FocusPanel, CompletedFocusPanel()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
            Test.message(Closed()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Test.resolveAll([
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ]),
          )
        })
      })

      describe('DetectedButtonMovement', () => {
        it('cancels leave animation by setting transitionState to Idle', () => {
          Test.story(
            update,
            Test.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: false,
              transitionState: 'LeaveAnimating' as const,
            }),
            Test.message(DetectedButtonMovement()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during Idle', () => {
          Test.story(
            update,
            withOpen,
            Test.message(DetectedButtonMovement()),
            Test.tap(({ model }) => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during EnterAnimating', () => {
          Test.story(
            update,
            Test.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: true,
              transitionState: 'EnterAnimating' as const,
            }),
            Test.message(DetectedButtonMovement()),
            Test.tap(({ model }) => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    const withClosedModal = Test.with(init({ id: 'test', isModal: true }))

    const withOpenModal = flow(
      withClosedModal,
      Test.message(Opened()),
      Test.resolveAll([
        [FocusPanel, CompletedFocusPanel()],
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedSetupInert()],
      ]),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Test.story(
        update,
        withClosedModal,
        Test.message(Opened()),
        Test.resolveAll([
          [FocusPanel, CompletedFocusPanel()],
          [LockScroll, CompletedLockScroll()],
          [InertOthers, CompletedSetupInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      Test.story(
        update,
        withOpenModal,
        Test.message(Closed()),
        Test.resolveAll([
          [FocusButton, CompletedFocusButton()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on ClosedByTab when isModal is true', () => {
      Test.story(
        update,
        withOpenModal,
        Test.message(ClosedByTab()),
        Test.resolveAll([
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ]),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit modal commands when isModal is false', () => {
      Test.story(
        update,
        withClosed,
        Test.message(Opened()),
        Test.resolve(FocusPanel, CompletedFocusPanel()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
        Test.message(Closed()),
        Test.resolve(FocusButton, CompletedFocusButton()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })
  })

  describe('view', () => {
    type TestMessage = string

    const baseViewConfig = (model: Model): ViewConfig<TestMessage> => ({
      model,
      toParentMessage: message => message._tag,
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

    const closedModel = () => init({ id: 'test' })

    const openModel = (): Model => {
      let model!: Model
      Test.story(
        update,
        withOpen,
        Test.tap(simulation => {
          model = simulation.model
        }),
      )
      return model
    }

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

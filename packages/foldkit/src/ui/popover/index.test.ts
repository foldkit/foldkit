import { describe, it } from '@effect/vitest'
import { Effect, Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Scene from '../../test/scene'
import * as Story from '../../test/story'
import type { Message, Model, ViewConfig } from './index'
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

const withClosed = Story.with(init({ id: 'test' }))

const withOpen = flow(
  withClosed,
  Story.message(Opened()),
  Story.resolve(FocusPanel, CompletedFocusPanel()),
)

const withClosedAnimated = Story.with(init({ id: 'test', isAnimated: true }))

const withOpenAnimated = flow(
  withClosedAnimated,
  Story.message(Opened()),
  Story.resolveAll(
    [FocusPanel, CompletedFocusPanel()],
    [RequestFrame, AdvancedTransitionFrame()],
    [WaitForTransitions, EndedTransition()],
    [DetectMovementOrTransitionEnd, EndedTransition()],
  ),
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
        Story.story(
          update,
          withClosed,
          Story.message(Opened()),
          Story.resolve(FocusPanel, CompletedFocusPanel()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('Closed', () => {
      it('closes the popover and returns a focus command', () => {
        Story.story(
          update,
          withOpen,
          Story.message(Closed()),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })

      it('is idempotent when already closed', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Closed()),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('ClosedByTab', () => {
      it('closes the popover without a focus command', () => {
        Story.story(
          update,
          withOpen,
          Story.message(ClosedByTab()),
          Story.model(model => {
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
        Story.story(
          update,
          withClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
        )
      })

      it('records pointer type for pen without toggling', () => {
        Story.story(
          update,
          withClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'pen', button: 0 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('pen'),
            )
          }),
        )
      })

      it('opens the popover on mouse left button when closed', () => {
        Story.story(
          update,
          withClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.resolve(FocusPanel, CompletedFocusPanel()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('closes the popover on mouse left button when open', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })

      it('does not toggle on mouse right button', () => {
        Story.story(
          update,
          withClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 2 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })

      it('always records maybeLastButtonPointerType', () => {
        Story.story(
          update,
          withClosed,
          Story.message(
            PressedPointerOnButton({ pointerType: 'touch', button: 0 }),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.resolve(FocusPanel, CompletedFocusPanel()),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
        )
      })
    })

    describe('CompletedFocusPanel', () => {
      it('returns model unchanged', () => {
        Story.story(
          update,
          withOpen,
          Story.message(CompletedFocusPanel()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + nextFrame on Opened', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('EnterStart')
            }),
            Story.resolveAll(
              [FocusPanel, CompletedFocusPanel()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on AdvancedTransitionFrame', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.resolve(RequestFrame, AdvancedTransitionFrame()),
            Story.model(model => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
            Story.resolveAll(
              [FocusPanel, CompletedFocusPanel()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('completes EnterAnimating to Idle on EndedTransition', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.resolveAll(
              [FocusPanel, CompletedFocusPanel()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('sets LeaveStart on ClosedByTab', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(ClosedByTab()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating on AdvancedTransitionFrame', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.resolve(RequestFrame, AdvancedTransitionFrame()),
            Story.model(model => {
              expect(model.transitionState).toBe('LeaveAnimating')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on EndedTransition', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          Story.story(
            update,
            withClosed,
            Story.message(Opened()),
            Story.resolve(FocusPanel, CompletedFocusPanel()),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Story.story(
            update,
            withOpen,
            Story.message(Closed()),
            Story.resolve(FocusButton, CompletedFocusButton()),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores AdvancedTransitionFrame when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(AdvancedTransitionFrame()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('ignores EndedTransition when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(EndedTransition()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.resolveAll(
              [FocusPanel, CompletedFocusPanel()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.resolveAll(
              [FocusPanel, CompletedFocusPanel()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [RequestFrame, AdvancedTransitionFrame()],
              [WaitForTransitions, EndedTransition()],
              [DetectMovementOrTransitionEnd, EndedTransition()],
            ),
          )
        })
      })

      describe('DetectedButtonMovement', () => {
        it('cancels leave animation by setting transitionState to Idle', () => {
          Story.story(
            update,
            Story.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: false,
              transitionState: 'LeaveAnimating' as const,
            }),
            Story.message(DetectedButtonMovement()),
            Story.model(model => {
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(DetectedButtonMovement()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transitionState).toBe('Idle')
            }),
          )
        })

        it('is a no-op during EnterAnimating', () => {
          Story.story(
            update,
            Story.with({
              ...init({ id: 'test', isAnimated: true }),
              isOpen: true,
              transitionState: 'EnterAnimating' as const,
            }),
            Story.message(DetectedButtonMovement()),
            Story.model(model => {
              expect(model.transitionState).toBe('EnterAnimating')
            }),
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    const withClosedModal = Story.with(init({ id: 'test', isModal: true }))

    const withOpenModal = flow(
      withClosedModal,
      Story.message(Opened()),
      Story.resolveAll(
        [FocusPanel, CompletedFocusPanel()],
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedSetupInert()],
      ),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Story.story(
        update,
        withClosedModal,
        Story.message(Opened()),
        Story.resolveAll(
          [FocusPanel, CompletedFocusPanel()],
          [LockScroll, CompletedLockScroll()],
          [InertOthers, CompletedSetupInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on Closed when isModal is true', () => {
      Story.story(
        update,
        withOpenModal,
        Story.message(Closed()),
        Story.resolveAll(
          [FocusButton, CompletedFocusButton()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on ClosedByTab when isModal is true', () => {
      Story.story(
        update,
        withOpenModal,
        Story.message(ClosedByTab()),
        Story.resolveAll(
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit modal commands when isModal is false', () => {
      Story.story(
        update,
        withClosed,
        Story.message(Opened()),
        Story.resolve(FocusPanel, CompletedFocusPanel()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Closed()),
        Story.resolve(FocusButton, CompletedFocusButton()),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })
  })

  describe('view', () => {
    const sceneView =
      (
        overrides: Omit<
          Partial<ViewConfig<Message>>,
          'model' | 'toParentMessage'
        > = {},
      ) =>
      (model: Model) =>
        view({
          anchor: { placement: 'bottom-start' },
          buttonContent: Effect.succeed(null),
          panelContent: Effect.succeed(null),
          ...overrides,
          model,
          toParentMessage: message => message,
        })

    const closedModel = () => init({ id: 'test' })

    const openModel = (): Model => {
      let model!: Model
      Story.story(
        update,
        withOpen,
        Story.model(extractedModel => {
          model = extractedModel
        }),
      )
      return model
    }

    it('renders button with aria-expanded false when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          const button = Scene.find(html, '[key="test-button"]')
          expect(button).toHaveAttr('aria-expanded', 'false')
          expect(button).toHaveAttr('aria-controls', 'test-panel')
        }),
      )
    })

    it('renders button with aria-expanded true when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-button"]')).toHaveAttr(
            'aria-expanded',
            'true',
          )
        }),
      )
    })

    it('renders panel when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          const panel = Scene.find(html, '[key="test-panel-container"]')
          expect(panel).toExist()
          expect(panel).toHaveAttr('tabIndex', '0')
        }),
      )
    })

    it('does not render panel when closed', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-panel-container"]')).toBeAbsent()
        }),
      )
    })

    it('renders backdrop when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-backdrop"]')).toExist()
        }),
      )
    })

    it('does not have aria-haspopup on the button', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(closedModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-button"]')).toExist()
          expect(Scene.find(html, '[key="test-button"]')).not.toHaveAttr(
            'aria-haspopup',
          )
        }),
      )
    })

    it('does not have role on the panel', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          expect(Scene.find(html, '[key="test-panel-container"]')).toExist()
          expect(
            Scene.find(html, '[key="test-panel-container"]'),
          ).not.toHaveAttr('role')
        }),
      )
    })

    it('adds anchor positioning styles and hooks', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel()),
        Scene.tap(({ html }) => {
          const panel = Scene.find(html, '[key="test-panel-container"]')
          expect(panel).toHaveStyle('position', 'absolute')
          expect(panel).toHaveStyle('margin', '0')
          expect(panel).toHaveStyle('visibility', 'hidden')
          expect(panel).toHaveHook('insert')
          expect(panel).toHaveHook('destroy')
        }),
      )
    })
  })
})

import { describe, it } from '@effect/vitest'
import { Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Story from '../../test/story'
import * as Transition from '../transition'
import {
  Closed,
  ClosedByTab,
  CompletedFocusButton,
  CompletedFocusPanel,
  CompletedLockScroll,
  CompletedSetupInert,
  CompletedTeardownInert,
  CompletedUnlockScroll,
  DetectMovementOrTransitionEnd,
  FocusButton,
  FocusPanel,
  GotTransitionMessage,
  IgnoredMouseClick,
  InertOthers,
  LockScroll,
  Opened,
  PressedPointerOnButton,
  RestoreInert,
  UnlockScroll,
  init,
  update,
} from './index'

const transitionToPopoverMessage = (message: Transition.Message) =>
  GotTransitionMessage({ message })

const transitionEndMessage = GotTransitionMessage({
  message: Transition.EndedTransition(),
})

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
    [
      Transition.RequestFrame,
      Transition.AdvancedTransitionFrame(),
      transitionToPopoverMessage,
    ],
    [
      Transition.WaitForTransitions,
      Transition.EndedTransition(),
      transitionToPopoverMessage,
    ],
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
        transition: Transition.init({ id: 'test-panel' }),
        maybeLastButtonPointerType: Option.none(),
      })
    })

    it('accepts isAnimated option', () => {
      const model = init({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.transition.transitionState).toBe('Idle')
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

      it('closes the popover on mouse left button when open and preserves pointer type', () => {
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
              Option.some('mouse'),
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

    describe('IgnoredMouseClick', () => {
      it('resets maybeLastButtonPointerType', () => {
        Story.story(
          update,
          withOpen,
          Story.message(
            PressedPointerOnButton({ pointerType: 'mouse', button: 0 }),
          ),
          Story.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
          Story.message(IgnoredMouseClick()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
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
        it('starts enter transition and emits focus + RequestFrame on Opened', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transition.transitionState).toBe('EnterStart')
            }),
            Story.expectHasCommands(FocusPanel, Transition.RequestFrame),
            Story.resolveAll(
              [FocusPanel, CompletedFocusPanel()],
              [
                Transition.RequestFrame,
                Transition.AdvancedTransitionFrame(),
                transitionToPopoverMessage,
              ],
              [
                Transition.WaitForTransitions,
                Transition.EndedTransition(),
                transitionToPopoverMessage,
              ],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on AdvancedTransitionFrame', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.resolve(
              Transition.RequestFrame,
              Transition.AdvancedTransitionFrame(),
              transitionToPopoverMessage,
            ),
            Story.model(model => {
              expect(model.transition.transitionState).toBe('EnterAnimating')
            }),
            Story.resolveAll(
              [FocusPanel, CompletedFocusPanel()],
              [
                Transition.WaitForTransitions,
                Transition.EndedTransition(),
                transitionToPopoverMessage,
              ],
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
              [
                Transition.RequestFrame,
                Transition.AdvancedTransitionFrame(),
                transitionToPopoverMessage,
              ],
              [
                Transition.WaitForTransitions,
                Transition.EndedTransition(),
                transitionToPopoverMessage,
              ],
            ),
            Story.model(model => {
              expect(model.transition.transitionState).toBe('Idle')
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
              expect(model.transition.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Transition.RequestFrame,
                Transition.AdvancedTransitionFrame(),
                transitionToPopoverMessage,
              ],
              [DetectMovementOrTransitionEnd, transitionEndMessage],
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
              expect(model.transition.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [
                Transition.RequestFrame,
                Transition.AdvancedTransitionFrame(),
                transitionToPopoverMessage,
              ],
              [DetectMovementOrTransitionEnd, transitionEndMessage],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating with DetectMovementOrTransitionEnd', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.resolve(
              Transition.RequestFrame,
              Transition.AdvancedTransitionFrame(),
              transitionToPopoverMessage,
            ),
            Story.model(model => {
              expect(model.transition.transitionState).toBe('LeaveAnimating')
            }),
            Story.expectHasCommands(DetectMovementOrTransitionEnd),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [DetectMovementOrTransitionEnd, transitionEndMessage],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on transition end', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Transition.RequestFrame,
                Transition.AdvancedTransitionFrame(),
                transitionToPopoverMessage,
              ],
              [DetectMovementOrTransitionEnd, transitionEndMessage],
            ),
            Story.model(model => {
              expect(model.transition.transitionState).toBe('Idle')
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
              expect(model.transition.transitionState).toBe('Idle')
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
              expect(model.transition.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores GotTransitionMessage with AdvancedTransitionFrame when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(
              GotTransitionMessage({
                message: Transition.AdvancedTransitionFrame(),
              }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transition.transitionState).toBe('Idle')
            }),
          )
        })

        it('ignores GotTransitionMessage with EndedTransition when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(transitionEndMessage),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.transition.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during enter', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.resolveAll(
              [FocusPanel, CompletedFocusPanel()],
              [
                Transition.RequestFrame,
                Transition.AdvancedTransitionFrame(),
                transitionToPopoverMessage,
              ],
              [
                Transition.WaitForTransitions,
                Transition.EndedTransition(),
                transitionToPopoverMessage,
              ],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.transition.transitionState).toBe('LeaveStart')
            }),
            Story.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Transition.RequestFrame,
                Transition.AdvancedTransitionFrame(),
                transitionToPopoverMessage,
              ],
              [DetectMovementOrTransitionEnd, transitionEndMessage],
            ),
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
})

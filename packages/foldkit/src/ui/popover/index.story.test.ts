import { describe, it } from '@effect/vitest'
import { Option, flow } from 'effect'
import { expect } from 'vitest'

import * as Story from '../../test/story.js'
import * as Animation from '../animation/index.js'
import {
  BlurredPanel,
  Closed,
  CompletedFocusButton,
  CompletedFocusPanel,
  CompletedLockScroll,
  CompletedSetupInert,
  CompletedTeardownInert,
  CompletedUnlockScroll,
  DetectMovementOrAnimationEnd,
  FocusButton,
  GotAnimationMessage,
  IgnoredMouseClick,
  InertOthers,
  LockScroll,
  Opened,
  PressedPointerOnButton,
  RestoreInert,
  UnlockScroll,
  init,
  update,
} from './index.js'

const animationToPopoverMessage = (message: Animation.Message) =>
  GotAnimationMessage({ message })

const animationEndMessage = GotAnimationMessage({
  message: Animation.EndedAnimation(),
})

const withClosed = Story.with(init({ id: 'test' }))

const withOpen = flow(withClosed, Story.message(Opened()))

const withClosedAnimated = Story.with(init({ id: 'test', isAnimated: true }))

const withOpenAnimated = flow(
  withClosedAnimated,
  Story.message(Opened()),
  Story.Command.resolveAll(
    [
      Animation.RequestFrame,
      Animation.AdvancedAnimationFrame(),
      animationToPopoverMessage,
    ],
    [
      Animation.WaitForAnimationSettled,
      Animation.EndedAnimation(),
      animationToPopoverMessage,
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
        contentFocus: false,
        animation: Animation.init({ id: 'test-panel' }),
        maybeLastButtonPointerType: Option.none(),
      })
    })

    it('accepts isAnimated option', () => {
      const model = init({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.animation.transitionState).toBe('Idle')
    })

    it('defaults isModal to false', () => {
      const model = init({ id: 'test' })
      expect(model.isModal).toBe(false)
    })

    it('accepts isModal option', () => {
      const model = init({ id: 'test', isModal: true })
      expect(model.isModal).toBe(true)
    })

    it('defaults contentFocus to false', () => {
      const model = init({ id: 'test' })
      expect(model.contentFocus).toBe(false)
    })

    it('accepts contentFocus option', () => {
      const model = init({ id: 'test', contentFocus: true })
      expect(model.contentFocus).toBe(true)
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the popover', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Opened()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('does not dispatch focus commands when opening', () => {
        Story.story(
          update,
          withClosed,
          Story.message(Opened()),
          Story.Command.expectNone(),
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
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
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
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })
    })

    describe('BlurredPanel', () => {
      it('closes the popover without restoring button focus', () => {
        Story.story(
          update,
          withOpen,
          Story.message(BlurredPanel()),
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
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
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
          Story.Command.resolve(FocusButton, CompletedFocusButton()),
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

    describe('animation', () => {
      describe('enter flow', () => {
        it('starts enter animation and emits RequestFrame on Opened', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('EnterStart')
            }),
            Story.Command.expectHas(Animation.RequestFrame),
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToPopoverMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToPopoverMessage,
              ],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on AdvancedAnimationFrame', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.Command.resolve(
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToPopoverMessage,
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.Command.resolve(
              Animation.WaitForAnimationSettled,
              Animation.EndedAnimation(),
              animationToPopoverMessage,
            ),
          )
        })

        it('completes EnterAnimating to Idle on EndedAnimation', () => {
          Story.story(
            update,
            withClosedAnimated,
            Story.message(Opened()),
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToPopoverMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToPopoverMessage,
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
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
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToPopoverMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('begins the leave animation when the panel blurs', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(BlurredPanel()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToPopoverMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating with DetectMovementOrAnimationEnd', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.Command.resolve(
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToPopoverMessage,
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('LeaveAnimating')
            }),
            Story.Command.expectHas(DetectMovementOrAnimationEnd),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on animation end', () => {
          Story.story(
            update,
            withOpenAnimated,
            Story.message(Closed()),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToPopoverMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
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
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on Closed', () => {
          Story.story(
            update,
            withOpen,
            Story.message(Closed()),
            Story.Command.resolve(FocusButton, CompletedFocusButton()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores GotAnimationMessage with AdvancedAnimationFrame when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(
              GotAnimationMessage({
                message: Animation.AdvancedAnimationFrame(),
              }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('ignores GotAnimationMessage with EndedAnimation when Idle', () => {
          Story.story(
            update,
            withOpen,
            Story.message(animationEndMessage),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
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
            Story.Command.resolveAll(
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToPopoverMessage,
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.EndedAnimation(),
                animationToPopoverMessage,
              ],
            ),
            Story.message(Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, CompletedFocusButton()],
              [
                Animation.RequestFrame,
                Animation.AdvancedAnimationFrame(),
                animationToPopoverMessage,
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
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
      Story.Command.resolveAll(
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedSetupInert()],
      ),
    )

    it('emits lockScroll and inertOthers commands on Opened when isModal is true', () => {
      Story.story(
        update,
        withClosedModal,
        Story.message(Opened()),
        Story.Command.resolveAll(
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
        Story.Command.resolveAll(
          [FocusButton, CompletedFocusButton()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedTeardownInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands when the panel blurs in modal mode', () => {
      Story.story(
        update,
        withOpenModal,
        Story.message(BlurredPanel()),
        Story.Command.resolveAll(
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
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Closed()),
        Story.Command.resolve(FocusButton, CompletedFocusButton()),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })
  })
})

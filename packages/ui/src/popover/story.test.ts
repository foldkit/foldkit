import { Option } from 'effect'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import {
  DetectMovementOrAnimationEnd,
  FocusButton,
  InertOthers,
  LockScroll,
  Message,
  OutMessage,
  RestoreInert,
  UnlockScroll,
  init,
  update,
} from './index.js'

const animationEndMessage = Message.GotAnimationMessage({
  message: Animation.Message.EndedAnimation(),
})

const givenClosed = Story.given(init({ id: 'test' }))

const givenOpen = Story.steps(
  givenClosed,
  Story.message(Message.RequestedOpen()),
)

const givenClosedAnimated = Story.given(init({ id: 'test', isAnimated: true }))

const givenOpenAnimated = Story.steps(
  givenClosedAnimated,
  Story.message(Message.RequestedOpen()),
  Story.Command.resolveAll(
    [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
    [Animation.WaitForAnimationSettled, Animation.Message.EndedAnimation()],
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
    describe('RequestedOpen', () => {
      it('opens the popover', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.RequestedOpen()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('does not dispatch focus commands when opening', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.RequestedOpen()),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('RequestedClose', () => {
      it('closes the popover and returns a focus command', () => {
        Story.story(
          update,
          givenOpen,
          Story.message(Message.RequestedClose()),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.Command.expectExact(FocusButton),
          Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        )
      })

      it('returns no Command and no OutMessage when already closed', () => {
        Story.story(
          update,
          givenClosed,
          Story.message(Message.RequestedClose()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
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
          givenOpen,
          Story.message(Message.BlurredPanel()),
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'touch',
              button: 0,
            }),
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'pen',
              button: 0,
            }),
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
            }),
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
          givenOpen,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
            }),
          ),
          Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 2,
            }),
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
          givenClosed,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'touch',
              button: 0,
            }),
          ),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('touch'),
            )
          }),
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
            }),
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
          givenOpen,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
            }),
          ),
          Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
          Story.model(model => {
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.some('mouse'),
            )
          }),
          Story.message(Message.IgnoredMouseClick()),
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
          givenOpen,
          Story.message(Message.CompletedFocusPanel()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })

    describe('animation', () => {
      describe('enter flow', () => {
        it('starts enter animation and emits WaitForPaint on RequestedOpen', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Message.RequestedOpen()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('EnterStart')
            }),
            Story.Command.expectHas(Animation.WaitForPaint),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint(),
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.Message.EndedAnimation(),
              ],
            ),
          )
        })

        it('advances EnterStart to EnterAnimating on CompletedWaitForPaint', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Message.RequestedOpen()),
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('EnterAnimating')
            }),
            Story.Command.resolve(
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation(),
            ),
          )
        })

        it('completes EnterAnimating to Idle on EndedAnimation', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Message.RequestedOpen()),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint(),
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.Message.EndedAnimation(),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on RequestedClose', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.RequestedClose()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, Message.CompletedFocusButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint(),
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('starts no leave cascade on RequestedClose when already closed', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Message.RequestedClose()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('begins the leave animation when the panel blurs', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.BlurredPanel()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint(),
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('advances LeaveStart to LeaveAnimating with DetectMovementOrAnimationEnd', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.RequestedClose()),
            Story.Command.resolve(
              Animation.WaitForPaint,
              Animation.Message.CompletedWaitForPaint(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('LeaveAnimating')
            }),
            Story.Command.expectHas(DetectMovementOrAnimationEnd),
            Story.Command.resolveAll(
              [FocusButton, Message.CompletedFocusButton()],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })

        it('completes LeaveAnimating to Idle on animation end', () => {
          Story.story(
            update,
            givenOpenAnimated,
            Story.message(Message.RequestedClose()),
            Story.Command.resolveAll(
              [FocusButton, Message.CompletedFocusButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint(),
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
        it('keeps transitionState Idle on RequestedOpen', () => {
          Story.story(
            update,
            givenClosed,
            Story.message(Message.RequestedOpen()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })

        it('keeps transitionState Idle on RequestedClose', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(Message.RequestedClose()),
            Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('stale messages', () => {
        it('ignores GotAnimationMessage with CompletedWaitForPaint when Idle', () => {
          Story.story(
            update,
            givenOpen,
            Story.message(
              Message.GotAnimationMessage({
                message: Animation.Message.CompletedWaitForPaint(),
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
            givenOpen,
            Story.message(animationEndMessage),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.animation.transitionState).toBe('Idle')
            }),
          )
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when RequestedClose during enter', () => {
          Story.story(
            update,
            givenClosedAnimated,
            Story.message(Message.RequestedOpen()),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint(),
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.Message.EndedAnimation(),
              ],
            ),
            Story.message(Message.RequestedClose()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusButton, Message.CompletedFocusButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint(),
              ],
              [DetectMovementOrAnimationEnd, animationEndMessage],
            ),
          )
        })
      })
    })
  })

  describe('modal commands', () => {
    const givenClosedModal = Story.given(init({ id: 'test', isModal: true }))

    const givenOpenModal = Story.steps(
      givenClosedModal,
      Story.message(Message.RequestedOpen()),
      Story.Command.resolveAll(
        [LockScroll, Message.CompletedLockScroll()],
        [InertOthers, Message.CompletedInertOthers()],
      ),
    )

    it('emits lockScroll and inertOthers commands on RequestedOpen when isModal is true', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.RequestedOpen()),
        Story.Command.resolveAll(
          [LockScroll, Message.CompletedLockScroll()],
          [InertOthers, Message.CompletedInertOthers()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands on RequestedClose when isModal is true', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.RequestedClose()),
        Story.Command.resolveAll(
          [FocusButton, Message.CompletedFocusButton()],
          [UnlockScroll, Message.CompletedUnlockScroll()],
          [RestoreInert, Message.CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands on RequestedClose when already closed in modal mode', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.RequestedClose()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits unlockScroll and restoreInert commands when the panel blurs in modal mode', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Message.BlurredPanel()),
        Story.Command.resolveAll(
          [UnlockScroll, Message.CompletedUnlockScroll()],
          [RestoreInert, Message.CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('emits no Commands when the panel blurs on a closed popover in modal mode', () => {
      Story.story(
        update,
        givenClosedModal,
        Story.message(Message.BlurredPanel()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('does not emit modal commands when isModal is false', () => {
      Story.story(
        update,
        givenClosed,
        Story.message(Message.RequestedOpen()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Message.RequestedClose()),
        Story.Command.resolve(FocusButton, Message.CompletedFocusButton()),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })
  })
})

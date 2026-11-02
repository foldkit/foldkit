import { Option } from 'effect'
import { Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import {
  DetectPopoverMovementOrAnimationEnd,
  FocusPopoverButton,
  InertPopoverOthers,
  LockPopoverScroll,
  Message,
  OutMessage,
  type Popover,
  PopoverLive,
  RestorePopoverInert,
  UnlockPopoverScroll,
} from './block.js'

const completedDetectPopoverMovementOrAnimationEnd = (generation: number) =>
  Message.CompletedDetectPopoverMovementOrAnimationEnd({ generation })

const STALE_ANIMATION_GENERATION = -1

const deliverAnimationMessage = (
  message: typeof Animation.Animation.Message.Type,
) => Block.deliver(Animation.Animation, 'animation', message)

type PopoverModel = Resolved<Popover>

const closed = { id: 'test' }
const closedAnimated = { id: 'test', isAnimated: true }
const closedModal = { id: 'test', isModal: true }

const openSteps = Story.steps(Story.message(Message.RequestedOpen()))

const openAnimatedSteps = Story.steps(
  Story.message(Message.RequestedOpen()),
  Story.Command.resolveAll(
    [
      Animation.WaitForPaint,
      Animation.Message.CompletedWaitForPaint({ generation: 1 }),
    ],
    [
      Animation.WaitForAnimationSettled,
      Animation.Message.EndedAnimation({ generation: 1 }),
    ],
  ),
  Story.model((model: PopoverModel) => {
    expect(model.animation.transitionState).toBe('Idle')
  }),
)

const openModalSteps = Story.steps(
  Story.message(Message.RequestedOpen()),
  Story.Command.resolveAll(
    [LockPopoverScroll, Message.CompletedLockPopoverScroll()],
    [InertPopoverOthers, Message.CompletedInertPopoverOthers()],
  ),
)

describe('Popover', () => {
  describe('init', () => {
    it.effect('defaults to closed', () =>
      Story.story(
        PopoverLive,
        closed,
        Story.model(model => {
          expect(model).toStrictEqual({
            id: 'test',
            isOpen: false,
            isAnimated: false,
            isModal: false,
            contentFocus: false,
            animation: {
              id: 'test-panel',
              isShowing: false,
              transitionState: 'Idle',
              transitionGeneration: 0,
            },
            maybeLastButtonPointerType: Option.none(),
          })
        }),
      ),
    )

    it.effect('accepts isAnimated option', () =>
      Story.story(
        PopoverLive,
        closedAnimated,
        Story.model(model => {
          expect(model.isAnimated).toBe(true)
          expect(model.animation.transitionState).toBe('Idle')
        }),
      ),
    )

    it.effect('defaults isModal to false', () =>
      Story.story(
        PopoverLive,
        closed,
        Story.model(model => {
          expect(model.isModal).toBe(false)
        }),
      ),
    )

    it.effect('accepts isModal option', () =>
      Story.story(
        PopoverLive,
        closedModal,
        Story.model(model => {
          expect(model.isModal).toBe(true)
        }),
      ),
    )

    it.effect('defaults contentFocus to false', () =>
      Story.story(
        PopoverLive,
        closed,
        Story.model(model => {
          expect(model.contentFocus).toBe(false)
        }),
      ),
    )

    it.effect('accepts contentFocus option', () =>
      Story.story(
        PopoverLive,
        { id: 'test', contentFocus: true },
        Story.model(model => {
          expect(model.contentFocus).toBe(true)
        }),
      ),
    )
  })

  describe('update', () => {
    describe('RequestedOpen', () => {
      it.effect('opens the popover', () =>
        Story.story(
          PopoverLive,
          closed,
          Story.message(Message.RequestedOpen()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect('does not dispatch focus commands when opening', () =>
        Story.story(
          PopoverLive,
          closed,
          Story.message(Message.RequestedOpen()),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('RequestedClose', () => {
      it.effect('closes the popover and returns a focus command', () =>
        Story.story(
          PopoverLive,
          closed,
          openSteps,
          Story.message(Message.RequestedClose()),
          Story.expectOutMessage(OutMessage.Closed()),
          Story.Command.expectExact(FocusPopoverButton),
          Story.Command.resolve(
            FocusPopoverButton,
            Message.CompletedFocusPopoverButton(),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        ),
      )

      it.effect(
        'returns no Command and no OutMessage when already closed',
        () =>
          Story.story(
            PopoverLive,
            closed,
            Story.message(Message.RequestedClose()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )
    })

    describe('BlurredPanel', () => {
      it.effect('closes the popover without restoring button focus', () =>
        Story.story(
          PopoverLive,
          closed,
          openSteps,
          Story.message(Message.BlurredPanel()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.maybeLastButtonPointerType).toStrictEqual(
              Option.none(),
            )
          }),
        ),
      )
    })

    describe('PressedPointerOnButton', () => {
      it.effect('records pointer type for touch without toggling', () =>
        Story.story(
          PopoverLive,
          closed,
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
        ),
      )

      it.effect('records pointer type for pen without toggling', () =>
        Story.story(
          PopoverLive,
          closed,
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
        ),
      )

      it.effect('opens the popover on mouse left button when closed', () =>
        Story.story(
          PopoverLive,
          closed,
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
        ),
      )

      it.effect(
        'closes the popover on mouse left button when open and preserves pointer type',
        () =>
          Story.story(
            PopoverLive,
            closed,
            openSteps,
            Story.message(
              Message.PressedPointerOnButton({
                pointerType: 'mouse',
                button: 0,
              }),
            ),
            Story.Command.resolve(
              FocusPopoverButton,
              Message.CompletedFocusPopoverButton(),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.maybeLastButtonPointerType).toStrictEqual(
                Option.some('mouse'),
              )
            }),
          ),
      )

      it.effect('does not toggle on mouse right button', () =>
        Story.story(
          PopoverLive,
          closed,
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
        ),
      )

      it.effect('always records maybeLastButtonPointerType', () =>
        Story.story(
          PopoverLive,
          closed,
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
        ),
      )
    })

    describe('IgnoredMouseClick', () => {
      it.effect('resets maybeLastButtonPointerType', () =>
        Story.story(
          PopoverLive,
          closed,
          openSteps,
          Story.message(
            Message.PressedPointerOnButton({
              pointerType: 'mouse',
              button: 0,
            }),
          ),
          Story.Command.resolve(
            FocusPopoverButton,
            Message.CompletedFocusPopoverButton(),
          ),
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
        ),
      )
    })

    describe('ClickedButton', () => {
      it.effect(
        'keeps the popover open after the click that follows a mouse press',
        () =>
          Story.story(
            PopoverLive,
            closed,
            Story.message(
              Message.PressedPointerOnButton({
                pointerType: 'mouse',
                button: 0,
              }),
            ),
            Story.message(Message.ClickedButton()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.maybeLastButtonPointerType).toStrictEqual(
                Option.none(),
              )
            }),
          ),
      )

      it.effect('opens when the click did not follow a mouse press', () =>
        Story.story(
          PopoverLive,
          closed,
          Story.message(Message.ClickedButton()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect(
        'closes an open Popover when the click did not follow a mouse press',
        () =>
          Story.story(
            PopoverLive,
            closed,
            openSteps,
            Story.message(Message.ClickedButton()),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.Command.resolve(
              FocusPopoverButton,
              Message.CompletedFocusPopoverButton(),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )
    })

    describe('CompletedFocusPopoverPanel', () => {
      it.effect('returns model unchanged', () =>
        Story.story(
          PopoverLive,
          closed,
          openSteps,
          Story.message(Message.CompletedFocusPopoverPanel()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('animation', () => {
      describe('enter flow', () => {
        it.effect(
          'starts enter animation and emits WaitForPaint on RequestedOpen',
          () =>
            Story.story(
              PopoverLive,
              closedAnimated,
              Story.message(Message.RequestedOpen()),
              Story.expectOutMessage(OutMessage.Opened()),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('EnterStart')
              }),
              Story.Command.expectHas(Animation.WaitForPaint),
              Story.Command.resolveAll(
                [
                  Animation.WaitForPaint,
                  Animation.Message.CompletedWaitForPaint({ generation: 1 }),
                ],
                [
                  Animation.WaitForAnimationSettled,
                  Animation.Message.EndedAnimation({ generation: 1 }),
                ],
              ),
            ),
        )

        it.effect(
          'advances EnterStart to EnterAnimating on CompletedWaitForPaint',
          () =>
            Story.story(
              PopoverLive,
              closedAnimated,
              Story.message(Message.RequestedOpen()),
              Story.Command.resolve(
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 1 }),
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('EnterAnimating')
              }),
              Story.Command.resolve(
                Animation.WaitForAnimationSettled,
                Animation.Message.EndedAnimation({ generation: 1 }),
              ),
            ),
        )

        it.effect('completes EnterAnimating to Idle on EndedAnimation', () =>
          Story.story(
            PopoverLive,
            closedAnimated,
            Story.message(Message.RequestedOpen()),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 1 }),
              ],
              [
                Animation.WaitForAnimationSettled,
                Animation.Message.EndedAnimation({ generation: 1 }),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )
      })

      describe('leave flow', () => {
        it.effect(
          'preserves Closed when the pointer closes an animated Popover',
          () =>
            Story.story(
              PopoverLive,
              closedAnimated,
              openAnimatedSteps,
              Story.message(
                Message.PressedPointerOnButton({
                  pointerType: 'mouse',
                  button: 0,
                }),
              ),
              Story.expectOutMessage(OutMessage.Closed()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.animation.transitionState).toBe('LeaveStart')
              }),
              Story.Command.resolveAll(
                [FocusPopoverButton, Message.CompletedFocusPopoverButton()],
                [
                  Animation.WaitForPaint,
                  Animation.Message.CompletedWaitForPaint({ generation: 2 }),
                ],
                [
                  DetectPopoverMovementOrAnimationEnd,
                  completedDetectPopoverMovementOrAnimationEnd(2),
                ],
              ),
            ),
        )

        it.effect('sets LeaveStart on RequestedClose', () =>
          Story.story(
            PopoverLive,
            closedAnimated,
            openAnimatedSteps,
            Story.message(Message.RequestedClose()),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [FocusPopoverButton, Message.CompletedFocusPopoverButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectPopoverMovementOrAnimationEnd,
                completedDetectPopoverMovementOrAnimationEnd(2),
              ],
            ),
          ),
        )

        it.effect(
          'starts no leave cascade on RequestedClose when already closed',
          () =>
            Story.story(
              PopoverLive,
              closedAnimated,
              Story.message(Message.RequestedClose()),
              Story.expectNoOutMessage(),
              Story.Command.expectNone(),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )

        it.effect('begins the leave animation when the panel blurs', () =>
          Story.story(
            PopoverLive,
            closedAnimated,
            openAnimatedSteps,
            Story.message(Message.BlurredPanel()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.animation.transitionState).toBe('LeaveStart')
            }),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectPopoverMovementOrAnimationEnd,
                completedDetectPopoverMovementOrAnimationEnd(2),
              ],
            ),
          ),
        )

        it.effect(
          'advances LeaveStart to LeaveAnimating with DetectPopoverMovementOrAnimationEnd',
          () =>
            Story.story(
              PopoverLive,
              closedAnimated,
              openAnimatedSteps,
              Story.message(Message.RequestedClose()),
              Story.Command.resolve(
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('LeaveAnimating')
              }),
              Story.Command.expectHas(
                DetectPopoverMovementOrAnimationEnd({
                  id: 'test',
                  generation: 2,
                }),
              ),
              Story.Command.resolveAll(
                [FocusPopoverButton, Message.CompletedFocusPopoverButton()],
                [
                  DetectPopoverMovementOrAnimationEnd,
                  completedDetectPopoverMovementOrAnimationEnd(2),
                ],
              ),
            ),
        )

        it.effect('completes LeaveAnimating to Idle on animation end', () =>
          Story.story(
            PopoverLive,
            closedAnimated,
            openAnimatedSteps,
            Story.message(Message.RequestedClose()),
            Story.Command.resolveAll(
              [FocusPopoverButton, Message.CompletedFocusPopoverButton()],
              [
                Animation.WaitForPaint,
                Animation.Message.CompletedWaitForPaint({ generation: 2 }),
              ],
              [
                DetectPopoverMovementOrAnimationEnd,
                completedDetectPopoverMovementOrAnimationEnd(2),
              ],
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )
      })

      describe('non-animated', () => {
        it.effect('keeps transitionState Idle on RequestedOpen', () =>
          Story.story(
            PopoverLive,
            closed,
            Story.message(Message.RequestedOpen()),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )

        it.effect('keeps transitionState Idle on RequestedClose', () =>
          Story.story(
            PopoverLive,
            closed,
            openSteps,
            Story.message(Message.RequestedClose()),
            Story.Command.resolve(
              FocusPopoverButton,
              Message.CompletedFocusPopoverButton(),
            ),
            Story.model(model => {
              expect(model.animation.transitionState).toBe('Idle')
            }),
          ),
        )
      })

      describe('stale messages', () => {
        it.effect(
          'ignores a stale Animation CompletedWaitForPaint when Idle',
          () =>
            Story.story(
              PopoverLive,
              closed,
              openSteps,
              Story.message(
                deliverAnimationMessage(
                  Animation.Message.CompletedWaitForPaint({ generation: 0 }),
                ),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )

        it.effect(
          'ignores CompletedDetectPopoverMovementOrAnimationEnd when Idle',
          () =>
            Story.story(
              PopoverLive,
              closed,
              openSteps,
              Story.message(completedDetectPopoverMovementOrAnimationEnd(0)),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )
      })

      describe('interruptions', () => {
        it.effect(
          'transitions to LeaveStart when RequestedClose during enter',
          () =>
            Story.story(
              PopoverLive,
              closedAnimated,
              Story.message(Message.RequestedOpen()),
              Story.Command.resolveAll(
                [
                  Animation.WaitForPaint,
                  Animation.Message.CompletedWaitForPaint({ generation: 1 }),
                ],
                [
                  Animation.WaitForAnimationSettled,
                  Animation.Message.EndedAnimation({
                    generation: STALE_ANIMATION_GENERATION,
                  }),
                ],
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('EnterAnimating')
              }),
              Story.message(Message.RequestedClose()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.animation.transitionState).toBe('LeaveStart')
              }),
              Story.Command.resolveAll(
                [FocusPopoverButton, Message.CompletedFocusPopoverButton()],
                [
                  Animation.WaitForPaint,
                  Animation.Message.CompletedWaitForPaint({ generation: 2 }),
                ],
                [
                  DetectPopoverMovementOrAnimationEnd,
                  completedDetectPopoverMovementOrAnimationEnd(2),
                ],
              ),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
        )
      })
    })
  })

  describe('modal commands', () => {
    it.effect(
      'emits lockScroll and inertOthers commands on RequestedOpen when isModal is true',
      () =>
        Story.story(
          PopoverLive,
          closedModal,
          Story.message(Message.RequestedOpen()),
          Story.Command.resolveAll(
            [LockPopoverScroll, Message.CompletedLockPopoverScroll()],
            [InertPopoverOthers, Message.CompletedInertPopoverOthers()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands on RequestedClose when isModal is true',
      () =>
        Story.story(
          PopoverLive,
          closedModal,
          openModalSteps,
          Story.message(Message.RequestedClose()),
          Story.Command.resolveAll(
            [FocusPopoverButton, Message.CompletedFocusPopoverButton()],
            [UnlockPopoverScroll, Message.CompletedUnlockPopoverScroll()],
            [RestorePopoverInert, Message.CompletedRestorePopoverInert()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits no Commands on RequestedClose when already closed in modal mode',
      () =>
        Story.story(
          PopoverLive,
          closedModal,
          Story.message(Message.RequestedClose()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits no Commands when RequestedOpen reaches an open modal Popover',
      () =>
        Story.story(
          PopoverLive,
          closedModal,
          openModalSteps,
          Story.message(Message.RequestedOpen()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
    )

    it.effect(
      'emits unlockScroll and restoreInert commands when the panel blurs in modal mode',
      () =>
        Story.story(
          PopoverLive,
          closedModal,
          openModalSteps,
          Story.message(Message.BlurredPanel()),
          Story.Command.resolveAll(
            [UnlockPopoverScroll, Message.CompletedUnlockPopoverScroll()],
            [RestorePopoverInert, Message.CompletedRestorePopoverInert()],
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect(
      'emits no Commands when the panel blurs on a closed popover in modal mode',
      () =>
        Story.story(
          PopoverLive,
          closedModal,
          Story.message(Message.BlurredPanel()),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
    )

    it.effect('does not emit modal commands when isModal is false', () =>
      Story.story(
        PopoverLive,
        closed,
        Story.message(Message.RequestedOpen()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Message.RequestedClose()),
        Story.Command.resolve(
          FocusPopoverButton,
          Message.CompletedFocusPopoverButton(),
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      ),
    )
  })
})

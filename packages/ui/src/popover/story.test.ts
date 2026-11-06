import { Option } from 'effect'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { makeInitialModel as makeAnimationModel } from '../animation/schema.js'
import {
  AnimationBinding,
  DetectPopoverMovementOrAnimationEnd,
  FocusPopoverButton,
  InMessage,
  InertPopoverOthers,
  LockPopoverScroll,
  Message,
  type Model,
  OutMessage,
  PopoverBlock,
  RestorePopoverInert,
  UnlockPopoverScroll,
  layer,
} from './block.js'

const completedDetectPopoverMovementOrAnimationEnd = (generation: number) =>
  Message.CompletedDetectPopoverMovementOrAnimationEnd({ generation })

const STALE_ANIMATION_GENERATION = -1

const givenClosed = Story.init({ id: 'test' })

const givenOpen = Story.steps(Story.inMessage(InMessage.RequestedOpen()))

const givenClosedAnimated = Story.init({ id: 'test', isAnimated: true })

const givenOpenAnimated = Story.steps(
  Story.inMessage(InMessage.RequestedOpen()),
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
  Story.model((model: Model) => {
    expect(model.animation.transitionState).toBe('Idle')
  }),
)

const givenClosedModal = Story.init({ id: 'test', isModal: true })

const givenOpenModal = Story.steps(
  Story.inMessage(InMessage.RequestedOpen()),
  Story.Command.resolveAll(
    [LockPopoverScroll, Message.CompletedLockPopoverScroll()],
    [InertPopoverOthers, Message.CompletedInertPopoverOthers()],
  ),
)

const makeFixture = (block: Story.TestBlock<typeof PopoverBlock>) => {
  const { init, update } = block

  const givenClosed = Story.given(init({ id: 'test' }).model)

  const givenOpen = Story.steps(Story.inMessage(InMessage.RequestedOpen()))

  const givenClosedAnimated = Story.given(
    init({ id: 'test', isAnimated: true }).model,
  )

  const givenOpenAnimated = Story.steps(
    Story.inMessage(InMessage.RequestedOpen()),
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
    Story.model((model: Model) => {
      expect(model.animation.transitionState).toBe('Idle')
    }),
  )

  const givenClosedModal = Story.given(
    init({ id: 'test', isModal: true }).model,
  )

  const givenOpenModal = Story.steps(
    Story.inMessage(InMessage.RequestedOpen()),
    Story.Command.resolveAll(
      [LockPopoverScroll, Message.CompletedLockPopoverScroll()],
      [InertPopoverOthers, Message.CompletedInertPopoverOthers()],
    ),
  )

  return {
    givenClosedModal,
    givenOpenModal,
    operations: block.operations,
    init,
    update,
    givenClosed,
    givenOpen,
    givenClosedAnimated,
    givenOpenAnimated,
  }
}

it.layer(layer, { buildPerTest: true })(it => {
  describe('Popover', () => {
    describe('init', () => {
      it.effect('defaults to closed', () =>
        Story.story(
          PopoverBlock,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(model).toStrictEqual({
              id: 'test',
              isOpen: false,
              isAnimated: false,
              isModal: false,
              contentFocus: false,
              animation: makeAnimationModel({ id: 'test-panel' }),
              maybeLastButtonPointerType: Option.none(),
            })
          }),
        ),
      )

      it.effect('accepts isAnimated option', () =>
        Story.story(
          PopoverBlock,
          Story.init({ id: 'test', isAnimated: true }),
          Story.model(model => {
            expect(model.isAnimated).toBe(true)
            expect(model.animation.transitionState).toBe('Idle')
          }),
        ),
      )

      it.effect('defaults isModal to false', () =>
        Story.story(
          PopoverBlock,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(model.isModal).toBe(false)
          }),
        ),
      )

      it.effect('accepts isModal option', () =>
        Story.story(
          PopoverBlock,
          Story.init({ id: 'test', isModal: true }),
          Story.model(model => {
            expect(model.isModal).toBe(true)
          }),
        ),
      )

      it.effect('defaults contentFocus to false', () =>
        Story.story(
          PopoverBlock,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(model.contentFocus).toBe(false)
          }),
        ),
      )

      it.effect('accepts contentFocus option', () =>
        Story.story(
          PopoverBlock,
          Story.init({ id: 'test', contentFocus: true }),
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
            PopoverBlock,
            givenClosed,
            Story.inMessage(InMessage.RequestedOpen()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
            }),
          ),
        )

        it.effect('does not dispatch focus commands when opening', () =>
          Story.story(
            PopoverBlock,
            givenClosed,
            Story.inMessage(InMessage.RequestedOpen()),
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
            PopoverBlock,
            givenClosed,
            givenOpen,
            Story.inMessage(InMessage.RequestedClose()),
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
              PopoverBlock,
              givenClosed,
              Story.inMessage(InMessage.RequestedClose()),
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
            PopoverBlock,
            givenClosed,
            givenOpen,
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
            PopoverBlock,
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
          ),
        )

        it.effect('records pointer type for pen without toggling', () =>
          Story.story(
            PopoverBlock,
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
          ),
        )

        it.effect('opens the popover on mouse left button when closed', () =>
          Story.story(
            PopoverBlock,
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
          ),
        )

        it.effect(
          'closes the popover on mouse left button when open and preserves pointer type',
          () =>
            Story.story(
              PopoverBlock,
              givenClosed,
              givenOpen,
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
            PopoverBlock,
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
          ),
        )

        it.effect('always records maybeLastButtonPointerType', () =>
          Story.story(
            PopoverBlock,
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
          ),
        )
      })

      describe('IgnoredMouseClick', () => {
        it.effect('resets maybeLastButtonPointerType', () =>
          Story.story(
            PopoverBlock,
            givenClosed,
            givenOpen,
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
              PopoverBlock,
              givenClosed,
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
            PopoverBlock,
            givenClosed,
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
              PopoverBlock,
              givenClosed,
              givenOpen,
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
            PopoverBlock,
            givenClosed,
            givenOpen,
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
                PopoverBlock,
                givenClosedAnimated,
                Story.inMessage(InMessage.RequestedOpen()),
                Story.expectOutMessage(OutMessage.Opened()),
                Story.model(model => {
                  expect(model.isOpen).toBe(true)
                  expect(model.animation.transitionState).toBe('EnterStart')
                }),
                Story.Command.expectHas(Animation.WaitForPaint),
                Story.Command.resolveAll(
                  [
                    Animation.WaitForPaint,
                    Animation.Message.CompletedWaitForPaint({
                      generation: 1,
                    }),
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
                PopoverBlock,
                givenClosedAnimated,
                Story.inMessage(InMessage.RequestedOpen()),
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
              PopoverBlock,
              givenClosedAnimated,
              Story.inMessage(InMessage.RequestedOpen()),
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
              Story.withBlock(PopoverBlock, block => {
                const { update, init } = makeFixture(block)

                const opened = block.inMessageUpdate(
                  init({ id: 'animated-pointer', isAnimated: true }).model,
                  InMessage.RequestedOpen(),
                )
                const closed = update(
                  opened.model,
                  Message.PressedPointerOnButton({
                    pointerType: 'mouse',
                    button: 0,
                  }),
                )

                expect(closed.outMessage).toEqual(OutMessage.Closed())
                expect(closed.model.isOpen).toBe(false)
                expect(closed.model.animation.transitionState).toBe(
                  'LeaveStart',
                )
              }),
          )

          it.effect('sets LeaveStart on RequestedClose', () =>
            Story.story(
              PopoverBlock,
              givenClosedAnimated,
              givenOpenAnimated,
              Story.inMessage(InMessage.RequestedClose()),
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
                PopoverBlock,
                givenClosedAnimated,
                Story.inMessage(InMessage.RequestedClose()),
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
              PopoverBlock,
              givenClosedAnimated,
              givenOpenAnimated,
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
                PopoverBlock,
                givenClosedAnimated,
                givenOpenAnimated,
                Story.inMessage(InMessage.RequestedClose()),
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
              PopoverBlock,
              givenClosedAnimated,
              givenOpenAnimated,
              Story.inMessage(InMessage.RequestedClose()),
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
              PopoverBlock,
              givenClosed,
              Story.inMessage(InMessage.RequestedOpen()),
              Story.model(model => {
                expect(model.animation.transitionState).toBe('Idle')
              }),
            ),
          )

          it.effect('keeps transitionState Idle on RequestedClose', () =>
            Story.story(
              PopoverBlock,
              givenClosed,
              givenOpen,
              Story.inMessage(InMessage.RequestedClose()),
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
            'ignores GotAnimationMessage with CompletedWaitForPaint when Idle',
            () =>
              Story.story(
                PopoverBlock,
                Story.init({ id: 'test' }),
                Story.inMessage(InMessage.RequestedOpen()),
                Story.messageIn(
                  AnimationBinding,
                  Animation.Message.CompletedWaitForPaint({ generation: 0 }),
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
                PopoverBlock,
                givenClosed,
                givenOpen,
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
                PopoverBlock,
                givenClosedAnimated,
                Story.inMessage(InMessage.RequestedOpen()),
                Story.Command.resolveAll(
                  [
                    Animation.WaitForPaint,
                    Animation.Message.CompletedWaitForPaint({
                      generation: 1,
                    }),
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
                Story.inMessage(InMessage.RequestedClose()),
                Story.model(model => {
                  expect(model.isOpen).toBe(false)
                  expect(model.animation.transitionState).toBe('LeaveStart')
                }),
                Story.Command.resolveAll(
                  [FocusPopoverButton, Message.CompletedFocusPopoverButton()],
                  [
                    Animation.WaitForPaint,
                    Animation.Message.CompletedWaitForPaint({
                      generation: 2,
                    }),
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
            PopoverBlock,
            givenClosedModal,
            Story.inMessage(InMessage.RequestedOpen()),
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
            PopoverBlock,
            givenClosedModal,
            givenOpenModal,
            Story.inMessage(InMessage.RequestedClose()),
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
            PopoverBlock,
            givenClosedModal,
            Story.inMessage(InMessage.RequestedClose()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'emits no Commands when requestOpen receives an open modal Model',
        () =>
          Story.withBlock(PopoverBlock, block => {
            const { init, operations } = makeFixture(block)

            const openModal = modifyFields(
              init({ id: 'test', isModal: true }).model,
              { isOpen: () => true },
            )

            const reopened = operations.requestOpen(openModal)

            expect(reopened.commands).toBeUndefined()
            expect(reopened.outMessage).toBeUndefined()
            expect(reopened.model.isOpen).toBe(true)
          }),
      )

      it.effect(
        'emits unlockScroll and restoreInert commands when the panel blurs in modal mode',
        () =>
          Story.story(
            PopoverBlock,
            givenClosedModal,
            givenOpenModal,
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
            PopoverBlock,
            givenClosedModal,
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
          PopoverBlock,
          givenClosed,
          Story.inMessage(InMessage.RequestedOpen()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
          Story.inMessage(InMessage.RequestedClose()),
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
})

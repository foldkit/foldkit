import { Duration, Option, Tuple } from 'effect'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { WaitBeforeShowing, TooltipBlock as block, layer } from './block.js'
import { Message, OutMessage } from './message.js'

const STALE_SHOW_VERSION = -1

const resolveShowAsStale = Story.Command.resolve(
  WaitBeforeShowing,
  Message.CompletedWaitBeforeShowing({ version: STALE_SHOW_VERSION }),
)

const givenHidden = Story.init({ id: 'test' })

const givenHoveredOpen = Tuple.make(
  Story.message(Message.EnteredTrigger()),
  Story.Command.resolve(
    WaitBeforeShowing,
    Message.CompletedWaitBeforeShowing({ version: 1 }),
  ),
)

const givenFocusedOpen = Tuple.make(Story.message(Message.FocusedTrigger()))

it.layer(layer, { buildPerTest: true })(it => {
  describe('Tooltip', () => {
    describe('init', () => {
      it.effect('defaults to hidden with the standard show delay', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(model).toStrictEqual({
              id: 'test',
              isOpen: false,
              isHovered: false,
              isFocused: false,
              isDismissed: false,
              showDelay: Duration.millis(500),
              pendingShowVersion: 0,
              maybeLastPointerType: Option.none(),
            })
          }),
        ),
      )

      it.effect('accepts a custom show delay as a number of milliseconds', () =>
        Story.story(
          block,
          Story.init({ id: 'test', showDelay: 100 }),
          Story.model(model => {
            expect(model.showDelay).toStrictEqual(Duration.millis(100))
          }),
        ),
      )

      it.effect('accepts a custom show delay as a Duration', () =>
        Story.story(
          block,
          Story.init({
            id: 'test',
            showDelay: Duration.seconds(1),
          }),
          Story.model(model => {
            expect(model.showDelay).toStrictEqual(Duration.seconds(1))
          }),
        ),
      )
    })

    describe('update', () => {
      describe('EnteredTrigger', () => {
        it.effect('starts a show-delay timer when hidden', () =>
          Story.story(
            block,
            givenHidden,
            Story.message(Message.EnteredTrigger()),
            Story.model(model => {
              expect(model.isHovered).toBe(true)
              expect(model.isOpen).toBe(false)
              expect(model.pendingShowVersion).toBe(1)
            }),
            Story.Command.expectHas(WaitBeforeShowing),
            Story.Command.resolve(
              WaitBeforeShowing,
              Message.CompletedWaitBeforeShowing({ version: 1 }),
            ),
          ),
        )

        it.effect(
          'opens the tooltip and emits Shown when the delay completes while hovering',
          () =>
            Story.story(
              block,
              givenHidden,
              Story.message(Message.EnteredTrigger()),
              Story.Command.resolve(
                WaitBeforeShowing,
                Message.CompletedWaitBeforeShowing({ version: 1 }),
              ),
              Story.expectOutMessage(OutMessage.Shown()),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.isHovered).toBe(true)
              }),
            ),
        )

        it.effect(
          'does not start a new timer when already open via focus',
          () =>
            Story.story(
              block,
              Story.init({ id: 'test' }),
              ...givenFocusedOpen,
              Story.message(Message.EnteredTrigger()),
              Story.Command.expectNone(),
              Story.model(model => {
                expect(model.isHovered).toBe(true)
                expect(model.isFocused).toBe(true)
                expect(model.isOpen).toBe(true)
              }),
            ),
        )

        it.effect(
          'schedules a show on re-hover after Escape even while focus stays active',
          () =>
            Story.story(
              block,
              givenHidden,
              Story.message(Message.FocusedTrigger()),
              Story.message(Message.EnteredTrigger()),
              Story.message(Message.PressedEscape()),
              Story.message(Message.LeftTrigger()),
              Story.message(Message.EnteredTrigger()),
              Story.Command.expectHas(WaitBeforeShowing),
              Story.model(model => {
                expect(model.isFocused).toBe(true)
                expect(model.isHovered).toBe(true)
                expect(model.isOpen).toBe(false)
                expect(model.isDismissed).toBe(false)
              }),
              Story.Command.resolve(
                WaitBeforeShowing,
                Message.CompletedWaitBeforeShowing({ version: 4 }),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
              }),
            ),
        )
      })

      describe('LeftTrigger', () => {
        it.effect('cancels a pending show-delay by advancing the version', () =>
          Story.story(
            block,
            givenHidden,
            Story.message(Message.EnteredTrigger()),
            Story.model(model => {
              expect(model.pendingShowVersion).toBe(1)
            }),
            resolveShowAsStale,
            Story.message(Message.LeftTrigger()),
            Story.model(model => {
              expect(model.isHovered).toBe(false)
              expect(model.isOpen).toBe(false)
              expect(model.pendingShowVersion).toBe(2)
            }),
          ),
        )

        it.effect(
          'hides the tooltip and emits Hidden when hover was the only source',
          () =>
            Story.story(
              block,
              Story.init({ id: 'test' }),
              ...givenHoveredOpen,
              Story.message(Message.LeftTrigger()),
              Story.expectOutMessage(OutMessage.Hidden()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.isHovered).toBe(false)
              }),
            ),
        )

        it.effect('keeps the tooltip open when focus is still active', () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            ...givenFocusedOpen,
            Story.message(Message.EnteredTrigger()),
            Story.message(Message.LeftTrigger()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.isHovered).toBe(false)
              expect(model.isFocused).toBe(true)
            }),
          ),
        )
      })

      describe('FocusedTrigger', () => {
        it.effect('shows the tooltip immediately', () =>
          Story.story(
            block,
            givenHidden,
            Story.message(Message.FocusedTrigger()),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.isFocused).toBe(true)
            }),
          ),
        )

        it.effect('invalidates a pending hover-delay', () =>
          Story.story(
            block,
            givenHidden,
            Story.message(Message.EnteredTrigger()),
            resolveShowAsStale,
            Story.message(Message.FocusedTrigger()),
            Story.model(model => {
              expect(model.pendingShowVersion).toBe(2)
              expect(model.isOpen).toBe(true)
            }),
          ),
        )
      })

      describe('BlurredTrigger', () => {
        it.effect('hides the tooltip when focus was the only source', () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            ...givenFocusedOpen,
            Story.message(Message.BlurredTrigger()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isFocused).toBe(false)
            }),
          ),
        )

        it.effect('keeps the tooltip open when hover is still active', () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            ...givenHoveredOpen,
            Story.message(Message.FocusedTrigger()),
            Story.message(Message.BlurredTrigger()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.isFocused).toBe(false)
              expect(model.isHovered).toBe(true)
            }),
          ),
        )
      })

      describe('PressedEscape', () => {
        it.effect(
          'hides the tooltip without lying about hover or focus state',
          () =>
            Story.story(
              block,
              Story.init({ id: 'test' }),
              ...givenHoveredOpen,
              Story.message(Message.PressedEscape()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.isHovered).toBe(true)
                expect(model.isDismissed).toBe(true)
              }),
            ),
        )

        it.effect('does not re-open on hover until the pointer leaves', () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            ...givenHoveredOpen,
            Story.message(Message.PressedEscape()),
            Story.Command.expectNone(),
            Story.message(Message.EnteredTrigger()),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isDismissed).toBe(true)
            }),
          ),
        )

        it.effect('does not re-open on focus until the trigger blurs', () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            ...givenFocusedOpen,
            Story.message(Message.PressedEscape()),
            Story.message(Message.FocusedTrigger()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isFocused).toBe(true)
              expect(model.isDismissed).toBe(true)
            }),
          ),
        )

        it.effect('clears the dismissed flag on leave', () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            ...givenHoveredOpen,
            Story.message(Message.PressedEscape()),
            Story.message(Message.LeftTrigger()),
            Story.model(model => {
              expect(model.isDismissed).toBe(false)
              expect(model.isHovered).toBe(false)
            }),
          ),
        )

        it.effect('clears the dismissed flag on blur', () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            ...givenFocusedOpen,
            Story.message(Message.PressedEscape()),
            Story.message(Message.BlurredTrigger()),
            Story.model(model => {
              expect(model.isDismissed).toBe(false)
              expect(model.isFocused).toBe(false)
            }),
          ),
        )

        it.effect('re-opens on a fresh hover after leaving', () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            ...givenHoveredOpen,
            Story.message(Message.PressedEscape()),
            Story.message(Message.LeftTrigger()),
            Story.message(Message.EnteredTrigger()),
            Story.Command.expectHas(WaitBeforeShowing),
            Story.Command.resolve(
              WaitBeforeShowing,
              Message.CompletedWaitBeforeShowing({ version: 4 }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.isDismissed).toBe(false)
            }),
          ),
        )
      })

      describe('CompletedWaitBeforeShowing', () => {
        it.effect('ignores a stale delay whose version does not match', () =>
          Story.story(
            block,
            givenHidden,
            Story.message(Message.EnteredTrigger()),
            Story.Command.resolve(
              WaitBeforeShowing,
              Message.CompletedWaitBeforeShowing({ version: 99 }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
        )

        it.effect(
          'stays hidden when a stale delay fires and the user then leaves',
          () =>
            Story.story(
              block,
              givenHidden,
              Story.message(Message.EnteredTrigger()),
              resolveShowAsStale,
              Story.message(Message.LeftTrigger()),
              Story.model(model => {
                expect(model.pendingShowVersion).toBe(2)
                expect(model.isOpen).toBe(false)
                expect(model.isHovered).toBe(false)
              }),
            ),
        )
      })

      describe('PressedPointerOnTrigger', () => {
        it.effect('records the pointer type without opening when closed', () =>
          Story.story(
            block,
            givenHidden,
            Story.message(
              Message.PressedPointerOnTrigger({ pointerType: 'mouse' }),
            ),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.maybeLastPointerType).toStrictEqual(
                Option.some('mouse'),
              )
              expect(model.isOpen).toBe(false)
            }),
          ),
        )

        it.effect(
          'suppresses the auto-show on focus that follows a mouse press and does not count it as keyboard focus',
          () =>
            Story.story(
              block,
              givenHidden,
              Story.message(
                Message.PressedPointerOnTrigger({ pointerType: 'mouse' }),
              ),
              Story.message(Message.FocusedTrigger()),
              Story.model(model => {
                expect(model.isFocused).toBe(false)
                expect(model.isOpen).toBe(false)
                expect(model.maybeLastPointerType).toStrictEqual(Option.none())
              }),
            ),
        )

        it.effect('does not suppress focus from a touch or pen press', () =>
          Story.story(
            block,
            givenHidden,
            Story.message(
              Message.PressedPointerOnTrigger({ pointerType: 'touch' }),
            ),
            Story.message(Message.FocusedTrigger()),
            Story.model(model => {
              expect(model.isFocused).toBe(true)
              expect(model.isOpen).toBe(true)
            }),
          ),
        )

        it.effect(
          'does not suppress a keyboard focus with no preceding pointer press',
          () =>
            Story.story(
              block,
              givenHidden,
              Story.message(Message.FocusedTrigger()),
              Story.model(model => {
                expect(model.isFocused).toBe(true)
                expect(model.isOpen).toBe(true)
              }),
            ),
        )

        it.effect('clears the recorded pointer type on blur', () =>
          Story.story(
            block,
            givenHidden,
            Story.message(
              Message.PressedPointerOnTrigger({ pointerType: 'mouse' }),
            ),
            Story.message(Message.FocusedTrigger()),
            Story.message(Message.BlurredTrigger()),
            Story.model(model => {
              expect(model.maybeLastPointerType).toStrictEqual(Option.none())
            }),
          ),
        )

        it.effect(
          'keeps an open tooltip visible when the trigger is pressed',
          () =>
            Story.story(
              block,
              Story.init({ id: 'test' }),
              ...givenHoveredOpen,
              Story.message(
                Message.PressedPointerOnTrigger({ pointerType: 'mouse' }),
              ),
              Story.Command.expectNone(),
              Story.expectNoOutMessage(),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.isDismissed).toBe(false)
                expect(model.isHovered).toBe(true)
                expect(model.maybeLastPointerType).toStrictEqual(
                  Option.some('mouse'),
                )
              }),
            ),
        )

        it.effect(
          'stays open across the focus that follows a press while hovering',
          () =>
            Story.story(
              block,
              Story.init({ id: 'test' }),
              ...givenHoveredOpen,
              Story.message(
                Message.PressedPointerOnTrigger({ pointerType: 'mouse' }),
              ),
              Story.message(Message.FocusedTrigger()),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
                expect(model.isFocused).toBe(false)
                expect(model.isHovered).toBe(true)
                expect(model.maybeLastPointerType).toStrictEqual(Option.none())
              }),
            ),
        )

        it.effect(
          'still hides on leave after the trigger is pressed while hovering',
          () =>
            Story.story(
              block,
              Story.init({ id: 'test' }),
              ...givenHoveredOpen,
              Story.message(
                Message.PressedPointerOnTrigger({ pointerType: 'mouse' }),
              ),
              Story.message(Message.FocusedTrigger()),
              Story.message(Message.LeftTrigger()),
              Story.expectOutMessage(OutMessage.Hidden()),
              Story.model(model => {
                expect(model.isOpen).toBe(false)
                expect(model.isHovered).toBe(false)
                expect(model.isFocused).toBe(false)
              }),
            ),
        )

        it.effect(
          'does not dismiss, so a re-hover after leaving still schedules a show',
          () =>
            Story.story(
              block,
              Story.init({ id: 'test' }),
              ...givenHoveredOpen,
              Story.message(
                Message.PressedPointerOnTrigger({ pointerType: 'mouse' }),
              ),
              Story.message(Message.LeftTrigger()),
              Story.message(Message.EnteredTrigger()),
              Story.Command.expectHas(WaitBeforeShowing),
              Story.model(model => {
                expect(model.isDismissed).toBe(false)
              }),
              resolveShowAsStale,
            ),
        )
      })

      describe('informOfShowDelayChanged', () => {
        it.effect(
          'records the informed delay without changing visibility or emitting an OutMessage',
          () =>
            Story.withBlock(block, block => {
              const next = block.operations.informOfShowDelayChanged(
                block.init({ id: 'test' }).model,
                '1 second',
              )
              expect(next.commands).toBeUndefined()
              expect(next.outMessage).toBeUndefined()
              expect(next.model.showDelay).toStrictEqual(Duration.seconds(1))
              expect(next.model.isOpen).toBe(false)
              expect(next.model.pendingShowVersion).toBe(0)
            }),
        )

        it.effect('uses the informed delay on a fresh hover', () =>
          Story.withBlock(block, block => {
            Story.story(
              block.update,
              Story.given(
                block.operations.informOfShowDelayChanged(
                  block.init({ id: 'test' }).model,
                  50,
                ).model,
              ),
              Story.message(Message.EnteredTrigger()),
              Story.model(model => {
                expect(model.showDelay).toStrictEqual(Duration.millis(50))
              }),
              Story.Command.resolve(
                WaitBeforeShowing,
                Message.CompletedWaitBeforeShowing({ version: 1 }),
              ),
              Story.model(model => {
                expect(model.isOpen).toBe(true)
              }),
            )
          }),
        )
      })
    })
  })
})

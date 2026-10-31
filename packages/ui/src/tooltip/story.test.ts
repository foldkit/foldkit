import { Duration, Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  message,
  model,
  steps,
  story,
} from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { TooltipLive, WaitBeforeShowing } from './block.js'
import { Message, OutMessage } from './message.js'

const STALE_SHOW_VERSION = -1

const args = { id: 'test' }

const resolveShowAsStale = Command.resolve(
  WaitBeforeShowing,
  Message.CompletedWaitBeforeShowing({ version: STALE_SHOW_VERSION }),
)

const givenHoveredOpen = steps(
  message(Message.EnteredTrigger()),
  Command.resolve(
    WaitBeforeShowing,
    Message.CompletedWaitBeforeShowing({ version: 1 }),
  ),
)

const givenFocusedOpen = steps(message(Message.FocusedTrigger()))

describe('Tooltip', () => {
  describe('init', () => {
    it.effect('defaults to hidden with the standard show delay', () =>
      story(
        TooltipLive,
        args,
        model(model => {
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
      story(
        TooltipLive,
        { id: 'test', showDelay: 100 },
        model(model => {
          expect(model.showDelay).toStrictEqual(Duration.millis(100))
        }),
      ),
    )

    it.effect('accepts a custom show delay as a Duration', () =>
      story(
        TooltipLive,
        { id: 'test', showDelay: Duration.seconds(1) },
        model(model => {
          expect(model.showDelay).toStrictEqual(Duration.seconds(1))
        }),
      ),
    )
  })

  describe('update', () => {
    describe('EnteredTrigger', () => {
      it.effect('starts a show-delay timer when hidden', () =>
        story(
          TooltipLive,
          args,
          message(Message.EnteredTrigger()),
          model(model => {
            expect(model.isHovered).toBe(true)
            expect(model.isOpen).toBe(false)
            expect(model.pendingShowVersion).toBe(1)
          }),
          Command.expectHas(WaitBeforeShowing),
          Command.resolve(
            WaitBeforeShowing,
            Message.CompletedWaitBeforeShowing({ version: 1 }),
          ),
        ),
      )

      it.effect(
        'opens the tooltip and emits Shown when the delay completes while hovering',
        () =>
          story(
            TooltipLive,
            args,
            message(Message.EnteredTrigger()),
            Command.resolve(
              WaitBeforeShowing,
              Message.CompletedWaitBeforeShowing({ version: 1 }),
            ),
            expectOutMessage(OutMessage.Shown()),
            model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.isHovered).toBe(true)
            }),
          ),
      )

      it.effect('does not start a new timer when already open via focus', () =>
        story(
          TooltipLive,
          args,
          givenFocusedOpen,
          message(Message.EnteredTrigger()),
          Command.expectNone(),
          model(model => {
            expect(model.isHovered).toBe(true)
            expect(model.isFocused).toBe(true)
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect(
        'schedules a show on re-hover after Escape even while focus stays active',
        () =>
          story(
            TooltipLive,
            args,
            message(Message.FocusedTrigger()),
            message(Message.EnteredTrigger()),
            message(Message.PressedEscape()),
            message(Message.LeftTrigger()),
            message(Message.EnteredTrigger()),
            Command.expectHas(WaitBeforeShowing),
            model(model => {
              expect(model.isFocused).toBe(true)
              expect(model.isHovered).toBe(true)
              expect(model.isOpen).toBe(false)
              expect(model.isDismissed).toBe(false)
            }),
            Command.resolve(
              WaitBeforeShowing,
              Message.CompletedWaitBeforeShowing({ version: 4 }),
            ),
            model(model => {
              expect(model.isOpen).toBe(true)
            }),
          ),
      )
    })

    describe('LeftTrigger', () => {
      it.effect('cancels a pending show-delay by advancing the version', () =>
        story(
          TooltipLive,
          args,
          message(Message.EnteredTrigger()),
          model(model => {
            expect(model.pendingShowVersion).toBe(1)
          }),
          resolveShowAsStale,
          message(Message.LeftTrigger()),
          model(model => {
            expect(model.isHovered).toBe(false)
            expect(model.isOpen).toBe(false)
            expect(model.pendingShowVersion).toBe(2)
          }),
        ),
      )

      it.effect(
        'hides the tooltip and emits Hidden when hover was the only source',
        () =>
          story(
            TooltipLive,
            args,
            givenHoveredOpen,
            message(Message.LeftTrigger()),
            expectOutMessage(OutMessage.Hidden()),
            model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isHovered).toBe(false)
            }),
          ),
      )

      it.effect('keeps the tooltip open when focus is still active', () =>
        story(
          TooltipLive,
          args,
          givenFocusedOpen,
          message(Message.EnteredTrigger()),
          message(Message.LeftTrigger()),
          model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isHovered).toBe(false)
            expect(model.isFocused).toBe(true)
          }),
        ),
      )
    })

    describe('FocusedTrigger', () => {
      it.effect('shows the tooltip immediately', () =>
        story(
          TooltipLive,
          args,
          message(Message.FocusedTrigger()),
          Command.expectNone(),
          model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isFocused).toBe(true)
          }),
        ),
      )

      it.effect('invalidates a pending hover-delay', () =>
        story(
          TooltipLive,
          args,
          message(Message.EnteredTrigger()),
          resolveShowAsStale,
          message(Message.FocusedTrigger()),
          model(model => {
            expect(model.pendingShowVersion).toBe(2)
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })

    describe('BlurredTrigger', () => {
      it.effect('hides the tooltip when focus was the only source', () =>
        story(
          TooltipLive,
          args,
          givenFocusedOpen,
          message(Message.BlurredTrigger()),
          model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isFocused).toBe(false)
          }),
        ),
      )

      it.effect('keeps the tooltip open when hover is still active', () =>
        story(
          TooltipLive,
          args,
          givenHoveredOpen,
          message(Message.FocusedTrigger()),
          message(Message.BlurredTrigger()),
          model(model => {
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
          story(
            TooltipLive,
            args,
            givenHoveredOpen,
            message(Message.PressedEscape()),
            model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isHovered).toBe(true)
              expect(model.isDismissed).toBe(true)
            }),
          ),
      )

      it.effect('does not re-open on hover until the pointer leaves', () =>
        story(
          TooltipLive,
          args,
          givenHoveredOpen,
          message(Message.PressedEscape()),
          Command.expectNone(),
          message(Message.EnteredTrigger()),
          Command.expectNone(),
          model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isDismissed).toBe(true)
          }),
        ),
      )

      it.effect('does not re-open on focus until the trigger blurs', () =>
        story(
          TooltipLive,
          args,
          givenFocusedOpen,
          message(Message.PressedEscape()),
          message(Message.FocusedTrigger()),
          model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isFocused).toBe(true)
            expect(model.isDismissed).toBe(true)
          }),
        ),
      )

      it.effect('clears the dismissed flag on leave', () =>
        story(
          TooltipLive,
          args,
          givenHoveredOpen,
          message(Message.PressedEscape()),
          message(Message.LeftTrigger()),
          model(model => {
            expect(model.isDismissed).toBe(false)
            expect(model.isHovered).toBe(false)
          }),
        ),
      )

      it.effect('clears the dismissed flag on blur', () =>
        story(
          TooltipLive,
          args,
          givenFocusedOpen,
          message(Message.PressedEscape()),
          message(Message.BlurredTrigger()),
          model(model => {
            expect(model.isDismissed).toBe(false)
            expect(model.isFocused).toBe(false)
          }),
        ),
      )

      it.effect('re-opens on a fresh hover after leaving', () =>
        story(
          TooltipLive,
          args,
          givenHoveredOpen,
          message(Message.PressedEscape()),
          message(Message.LeftTrigger()),
          message(Message.EnteredTrigger()),
          Command.expectHas(WaitBeforeShowing),
          Command.resolve(
            WaitBeforeShowing,
            Message.CompletedWaitBeforeShowing({ version: 4 }),
          ),
          model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isDismissed).toBe(false)
          }),
        ),
      )
    })

    describe('CompletedWaitBeforeShowing', () => {
      it.effect('ignores a stale delay whose version does not match', () =>
        story(
          TooltipLive,
          args,
          message(Message.EnteredTrigger()),
          Command.resolve(
            WaitBeforeShowing,
            Message.CompletedWaitBeforeShowing({ version: 99 }),
          ),
          model(model => {
            expect(model.isOpen).toBe(false)
          }),
        ),
      )

      it.effect(
        'stays hidden when a stale delay fires and the user then leaves',
        () =>
          story(
            TooltipLive,
            args,
            message(Message.EnteredTrigger()),
            resolveShowAsStale,
            message(Message.LeftTrigger()),
            model(model => {
              expect(model.pendingShowVersion).toBe(2)
              expect(model.isOpen).toBe(false)
              expect(model.isHovered).toBe(false)
            }),
          ),
      )
    })

    describe('PressedPointerOnTrigger', () => {
      it.effect('records the pointer type without opening when closed', () =>
        story(
          TooltipLive,
          args,
          message(Message.PressedPointerOnTrigger({ pointerType: 'mouse' })),
          Command.expectNone(),
          model(model => {
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
          story(
            TooltipLive,
            args,
            message(Message.PressedPointerOnTrigger({ pointerType: 'mouse' })),
            message(Message.FocusedTrigger()),
            model(model => {
              expect(model.isFocused).toBe(false)
              expect(model.isOpen).toBe(false)
              expect(model.maybeLastPointerType).toStrictEqual(Option.none())
            }),
          ),
      )

      it.effect('does not suppress focus from a touch or pen press', () =>
        story(
          TooltipLive,
          args,
          message(Message.PressedPointerOnTrigger({ pointerType: 'touch' })),
          message(Message.FocusedTrigger()),
          model(model => {
            expect(model.isFocused).toBe(true)
            expect(model.isOpen).toBe(true)
          }),
        ),
      )

      it.effect(
        'does not suppress a keyboard focus with no preceding pointer press',
        () =>
          story(
            TooltipLive,
            args,
            message(Message.FocusedTrigger()),
            model(model => {
              expect(model.isFocused).toBe(true)
              expect(model.isOpen).toBe(true)
            }),
          ),
      )

      it.effect('clears the recorded pointer type on blur', () =>
        story(
          TooltipLive,
          args,
          message(Message.PressedPointerOnTrigger({ pointerType: 'mouse' })),
          message(Message.FocusedTrigger()),
          message(Message.BlurredTrigger()),
          model(model => {
            expect(model.maybeLastPointerType).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect(
        'keeps an open tooltip visible when the trigger is pressed',
        () =>
          story(
            TooltipLive,
            args,
            givenHoveredOpen,
            message(Message.PressedPointerOnTrigger({ pointerType: 'mouse' })),
            Command.expectNone(),
            expectNoOutMessage(),
            model(model => {
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
          story(
            TooltipLive,
            args,
            givenHoveredOpen,
            message(Message.PressedPointerOnTrigger({ pointerType: 'mouse' })),
            message(Message.FocusedTrigger()),
            model(model => {
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
          story(
            TooltipLive,
            args,
            givenHoveredOpen,
            message(Message.PressedPointerOnTrigger({ pointerType: 'mouse' })),
            message(Message.FocusedTrigger()),
            message(Message.LeftTrigger()),
            expectOutMessage(OutMessage.Hidden()),
            model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isHovered).toBe(false)
              expect(model.isFocused).toBe(false)
            }),
          ),
      )

      it.effect(
        'does not dismiss, so a re-hover after leaving still schedules a show',
        () =>
          story(
            TooltipLive,
            args,
            givenHoveredOpen,
            message(Message.PressedPointerOnTrigger({ pointerType: 'mouse' })),
            message(Message.LeftTrigger()),
            message(Message.EnteredTrigger()),
            Command.expectHas(WaitBeforeShowing),
            model(model => {
              expect(model.isDismissed).toBe(false)
            }),
            resolveShowAsStale,
          ),
      )
    })

    describe('InformedOfShowDelayChange', () => {
      it.effect(
        'records the informed delay without changing visibility or emitting an OutMessage',
        () =>
          story(
            TooltipLive,
            args,
            message(
              Message.InformedOfShowDelayChange({
                showDelay: Duration.seconds(1),
              }),
            ),
            Command.expectNone(),
            expectNoOutMessage(),
            model(model => {
              expect(model.showDelay).toStrictEqual(Duration.seconds(1))
              expect(model.isOpen).toBe(false)
              expect(model.pendingShowVersion).toBe(0)
            }),
          ),
      )

      it.effect('uses the informed delay on a fresh hover', () =>
        story(
          TooltipLive,
          args,
          message(
            Message.InformedOfShowDelayChange({
              showDelay: Duration.millis(50),
            }),
          ),
          message(Message.EnteredTrigger()),
          model(model => {
            expect(model.showDelay).toStrictEqual(Duration.millis(50))
          }),
          Command.expectHas(
            WaitBeforeShowing({ delay: Duration.millis(50), version: 1 }),
          ),
          Command.resolve(
            WaitBeforeShowing,
            Message.CompletedWaitBeforeShowing({ version: 1 }),
          ),
          model(model => {
            expect(model.isOpen).toBe(true)
          }),
        ),
      )
    })
  })
})

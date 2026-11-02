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

import {
  HoverIntentLive,
  WaitBeforeClosing,
  WaitBeforeOpening,
} from './block.js'
import { Message, OutMessage } from './message.js'

const STALE_VERSION = -1

const resolveStaleOpen = Command.resolve(
  WaitBeforeOpening,
  Message.CompletedWaitBeforeOpening({ version: STALE_VERSION }),
)

const resolveStaleClose = Command.resolve(
  WaitBeforeClosing,
  Message.CompletedWaitBeforeClosing({ version: STALE_VERSION }),
)

const withPointerOpen = steps(
  message(Message.EnteredTrigger()),
  Command.resolve(
    WaitBeforeOpening,
    Message.CompletedWaitBeforeOpening({ version: 1 }),
  ),
)

const withFocusedOpen = steps(message(Message.FocusedTrigger()))

describe('HoverIntent', () => {
  describe('init', () => {
    it.effect('defaults to a hidden state with open and close delays', () =>
      story(
        HoverIntentLive,
        {},
        model(model => {
          expect(model).toStrictEqual({
            isOpen: false,
            isTriggerHovered: false,
            isPanelHovered: false,
            maybeFocusLocation: Option.none(),
            isDismissed: false,
            openDelay: Duration.millis(200),
            closeDelay: Duration.millis(300),
            pendingOpenVersion: 0,
            pendingCloseVersion: 0,
          })
        }),
      ),
    )

    it.effect('accepts custom delay inputs', () =>
      story(
        HoverIntentLive,
        { openDelay: Duration.seconds(1), closeDelay: 50 },
        model(model => {
          expect(model).toMatchObject({
            openDelay: Duration.seconds(1),
            closeDelay: Duration.millis(50),
          })
        }),
      ),
    )
  })

  describe('pointer intent', () => {
    it.effect(
      'opens after the configured delay while the trigger remains hovered',
      () =>
        story(
          HoverIntentLive,
          {},
          message(Message.EnteredTrigger()),
          Command.expectHas(WaitBeforeOpening),
          Command.resolve(
            WaitBeforeOpening,
            Message.CompletedWaitBeforeOpening({ version: 1 }),
          ),
          expectOutMessage(OutMessage.Opened()),
          model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isTriggerHovered).toBe(true)
          }),
        ),
    )

    it.effect(
      'does not open when the trigger leaves before the delay completes',
      () =>
        story(
          HoverIntentLive,
          {},
          message(Message.EnteredTrigger()),
          resolveStaleOpen,
          message(Message.LeftTrigger()),
          message(Message.CompletedWaitBeforeOpening({ version: 1 })),
          model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.pendingOpenVersion).toBe(2)
          }),
          expectNoOutMessage(),
        ),
    )

    it.effect(
      'keeps the panel open while the pointer crosses from trigger to panel',
      () =>
        story(
          HoverIntentLive,
          {},
          withPointerOpen,
          message(Message.LeftTrigger()),
          Command.expectHas(
            WaitBeforeClosing({ delay: Duration.millis(300), version: 2 }),
          ),
          resolveStaleClose,
          message(Message.EnteredPanel()),
          message(Message.CompletedWaitBeforeClosing({ version: 2 })),
          model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.isTriggerHovered).toBe(false)
            expect(model.isPanelHovered).toBe(true)
          }),
          expectNoOutMessage(),
        ),
    )

    it.effect(
      'does not close until the pointer leaves both zones for the close delay',
      () =>
        story(
          HoverIntentLive,
          {},
          withPointerOpen,
          message(Message.EnteredPanel()),
          message(Message.LeftTrigger()),
          Command.expectNone(),
          message(Message.LeftPanel()),
          Command.expectHas(WaitBeforeClosing),
          Command.resolve(
            WaitBeforeClosing,
            Message.CompletedWaitBeforeClosing({ version: 3 }),
          ),
          expectOutMessage(OutMessage.Closed()),
          model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isPanelHovered).toBe(false)
          }),
        ),
    )

    it.effect(
      'cancels a pending close when the pointer re-enters either zone',
      () =>
        story(
          HoverIntentLive,
          {},
          withPointerOpen,
          message(Message.LeftTrigger()),
          resolveStaleClose,
          message(Message.EnteredTrigger()),
          message(Message.CompletedWaitBeforeClosing({ version: 2 })),
          model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.pendingCloseVersion).toBe(3)
          }),
          expectNoOutMessage(),
        ),
    )
  })

  describe('focus intent', () => {
    it.effect('opens immediately when the trigger receives focus', () =>
      story(
        HoverIntentLive,
        {},
        message(Message.FocusedTrigger()),
        Command.expectNone(),
        expectOutMessage(OutMessage.Opened()),
        model(model => {
          expect(model.isOpen).toBe(true)
          expect(model.maybeFocusLocation).toStrictEqual(Option.some('Trigger'))
        }),
      ),
    )

    it.effect(
      'keeps the panel open while focus moves from the trigger to the panel',
      () =>
        story(
          HoverIntentLive,
          {},
          withFocusedOpen,
          message(Message.BlurredTrigger()),
          Command.expectHas(WaitBeforeClosing),
          resolveStaleClose,
          message(Message.FocusedPanel()),
          Command.expectNone(),
          message(Message.CompletedWaitBeforeClosing({ version: 2 })),
          model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeFocusLocation).toStrictEqual(Option.some('Panel'))
          }),
          expectNoOutMessage(),
        ),
    )

    it.effect('closes after blur only when neither hover zone remains', () =>
      story(
        HoverIntentLive,
        {},
        withFocusedOpen,
        message(Message.EnteredTrigger()),
        message(Message.BlurredTrigger()),
        Command.expectNone(),
        model(model => {
          expect(model.isOpen).toBe(true)
          expect(model.maybeFocusLocation).toStrictEqual(Option.none())
        }),
        message(Message.LeftTrigger()),
        Command.resolve(
          WaitBeforeClosing,
          Message.CompletedWaitBeforeClosing({ version: 3 }),
        ),
        expectOutMessage(OutMessage.Closed()),
      ),
    )

    it.effect('closes without the pointer grace delay when focus leaves', () =>
      story(
        HoverIntentLive,
        {},
        withFocusedOpen,
        message(Message.BlurredTrigger()),
        Command.expectHas(
          WaitBeforeClosing({ delay: Duration.zero, version: 2 }),
        ),
        Command.resolve(
          WaitBeforeClosing,
          Message.CompletedWaitBeforeClosing({ version: 2 }),
        ),
        expectOutMessage(OutMessage.Closed()),
      ),
    )
  })

  describe('dismissal', () => {
    it.effect(
      'closes immediately on Escape and suppresses re-opening while engaged',
      () =>
        story(
          HoverIntentLive,
          {},
          withPointerOpen,
          message(Message.PressedEscape({ source: 'Trigger' })),
          expectOutMessage(OutMessage.Closed()),
          message(Message.EnteredTrigger()),
          Command.expectNone(),
          model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.isDismissed).toBe(true)
          }),
        ),
    )

    it.effect('allows fresh intent after Escape removes a focused panel', () =>
      story(
        HoverIntentLive,
        {},
        withFocusedOpen,
        message(Message.FocusedPanel()),
        message(Message.EnteredPanel()),
        message(Message.PressedEscape({ source: 'Panel' })),
        model(model => {
          expect(model.maybeFocusLocation).toStrictEqual(Option.none())
          expect(model.isPanelHovered).toBe(false)
          expect(model.isDismissed).toBe(false)
        }),
        message(Message.EnteredTrigger()),
        Command.expectHas(WaitBeforeOpening),
        resolveStaleOpen,
      ),
    )

    it.effect('keeps focus dismissal until a restored trigger disengages', () =>
      story(
        HoverIntentLive,
        {},
        withFocusedOpen,
        message(Message.FocusedPanel()),
        message(Message.BlurredPanel()),
        resolveStaleClose,
        message(Message.FocusedTrigger()),
        message(Message.PressedEscape({ source: 'Panel' })),
        model(model => {
          expect(model.maybeFocusLocation).toStrictEqual(Option.some('Trigger'))
          expect(model.isDismissed).toBe(true)
        }),
        message(Message.BlurredTrigger()),
        model(model => {
          expect(model.maybeFocusLocation).toStrictEqual(Option.none())
          expect(model.isDismissed).toBe(false)
        }),
      ),
    )

    it.effect(
      'clears Escape dismissal only after pointer and focus both disengage',
      () =>
        story(
          HoverIntentLive,
          {},
          withFocusedOpen,
          message(Message.EnteredTrigger()),
          message(Message.PressedEscape({ source: 'Trigger' })),
          message(Message.BlurredTrigger()),
          model(model => {
            expect(model.isDismissed).toBe(true)
          }),
          message(Message.LeftTrigger()),
          model(model => {
            expect(model.isDismissed).toBe(false)
          }),
          message(Message.EnteredTrigger()),
          Command.expectHas(WaitBeforeOpening),
          resolveStaleOpen,
        ),
    )

    it.effect('invalidates pending open and close commands on Escape', () =>
      story(
        HoverIntentLive,
        {},
        message(Message.EnteredTrigger()),
        resolveStaleOpen,
        message(Message.PressedEscape({ source: 'Trigger' })),
        message(Message.CompletedWaitBeforeOpening({ version: 1 })),
        model(model => {
          expect(model.isOpen).toBe(false)
          expect(model.pendingOpenVersion).toBe(2)
        }),
        expectNoOutMessage(),
      ),
    )

    it.effect('closes programmatically and clears panel engagement', () =>
      story(
        HoverIntentLive,
        {},
        message(Message.FocusedTrigger()),
        message(Message.EnteredPanel()),
        message(Message.FocusedPanel()),
        message(Message.RequestedClose()),
        expectOutMessage(OutMessage.Closed()),
        model(model => {
          expect(model.isOpen).toBe(false)
          expect(model.isPanelHovered).toBe(false)
          expect(model.maybeFocusLocation).toStrictEqual(Option.none())
          expect(model.pendingOpenVersion).toBe(3)
          expect(model.pendingCloseVersion).toBe(4)
        }),
      ),
    )
  })

  describe('timer versions', () => {
    it.effect('ignores stale open and close completions', () =>
      story(
        HoverIntentLive,
        {},
        withPointerOpen,
        message(Message.LeftTrigger()),
        resolveStaleClose,
        message(Message.EnteredTrigger()),
        message(Message.CompletedWaitBeforeClosing({ version: 2 })),
        message(Message.CompletedWaitBeforeOpening({ version: 1 })),
        model(model => {
          expect(model.isOpen).toBe(true)
          expect(model.pendingOpenVersion).toBe(2)
          expect(model.pendingCloseVersion).toBe(3)
        }),
        expectNoOutMessage(),
      ),
    )
  })
})

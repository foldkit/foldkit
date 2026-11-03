import { Duration, Option, Tuple } from 'effect'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  WaitBeforeClosing,
  WaitBeforeOpening,
  HoverIntentBlock as block,
  layer,
} from './block.js'
import { InMessage, Message, OutMessage } from './message.js'

const STALE_VERSION = -1

const resolveStaleOpen = Story.Command.resolve(
  WaitBeforeOpening,
  Message.CompletedWaitBeforeOpening({ version: STALE_VERSION }),
)

const resolveStaleClose = Story.Command.resolve(
  WaitBeforeClosing,
  Message.CompletedWaitBeforeClosing({ version: STALE_VERSION }),
)

const withHidden = Story.init()

const withPointerOpen = Tuple.make(
  Story.message(Message.EnteredTrigger()),
  Story.Command.resolve(
    WaitBeforeOpening,
    Message.CompletedWaitBeforeOpening({ version: 1 }),
  ),
)

const withFocusedOpen = Tuple.make(Story.message(Message.FocusedTrigger()))

it.layer(layer, { buildPerTest: true })(it => {
  describe('HoverIntent', () => {
    describe('init', () => {
      it.effect('defaults to a hidden state with open and close delays', () =>
        Story.story(
          block,
          Story.init(),
          Story.model(model => {
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
        Story.story(
          block,
          Story.init({ openDelay: Duration.seconds(1), closeDelay: 50 }),
          Story.model(model => {
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
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredTrigger()),
            Story.Command.expectHas(WaitBeforeOpening),
            Story.Command.resolve(
              WaitBeforeOpening,
              Message.CompletedWaitBeforeOpening({ version: 1 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.isTriggerHovered).toBe(true)
            }),
          ),
      )

      it.effect(
        'does not open when the trigger leaves before the delay completes',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredTrigger()),
            resolveStaleOpen,
            Story.message(Message.LeftTrigger()),
            Story.message(Message.CompletedWaitBeforeOpening({ version: 1 })),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.pendingOpenVersion).toBe(2)
            }),
            Story.expectNoOutMessage(),
          ),
      )

      it.effect(
        'keeps the panel open while the pointer crosses from trigger to panel',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withPointerOpen,
            Story.message(Message.LeftTrigger()),
            Story.Command.expectHas(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 2 }),
            ),
            resolveStaleClose,
            Story.message(Message.EnteredPanel()),
            Story.message(Message.CompletedWaitBeforeClosing({ version: 2 })),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.isTriggerHovered).toBe(false)
              expect(model.isPanelHovered).toBe(true)
            }),
            Story.expectNoOutMessage(),
          ),
      )

      it.effect(
        'does not close until the pointer leaves both zones for the close delay',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withPointerOpen,
            Story.message(Message.EnteredPanel()),
            Story.message(Message.LeftTrigger()),
            Story.Command.expectNone(),
            Story.message(Message.LeftPanel()),
            Story.Command.expectHas(WaitBeforeClosing),
            Story.Command.resolve(
              WaitBeforeClosing,
              Message.CompletedWaitBeforeClosing({ version: 3 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isPanelHovered).toBe(false)
            }),
          ),
      )

      it.effect(
        'cancels a pending close when the pointer re-enters either zone',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withPointerOpen,
            Story.message(Message.LeftTrigger()),
            resolveStaleClose,
            Story.message(Message.EnteredTrigger()),
            Story.message(Message.CompletedWaitBeforeClosing({ version: 2 })),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.pendingCloseVersion).toBe(3)
            }),
            Story.expectNoOutMessage(),
          ),
      )
    })

    describe('focus intent', () => {
      it.effect('opens immediately when the trigger receives focus', () =>
        Story.story(
          block,
          withHidden,
          Story.message(Message.FocusedTrigger()),
          Story.Command.expectNone(),
          Story.expectOutMessage(OutMessage.Opened()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeFocusLocation).toStrictEqual(
              Option.some('Trigger'),
            )
          }),
        ),
      )

      it.effect(
        'keeps the panel open while focus moves from the trigger to the panel',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.message(Message.BlurredTrigger()),
            Story.Command.expectHas(WaitBeforeClosing),
            resolveStaleClose,
            Story.message(Message.FocusedPanel()),
            Story.Command.expectNone(),
            Story.message(Message.CompletedWaitBeforeClosing({ version: 2 })),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.maybeFocusLocation).toStrictEqual(
                Option.some('Panel'),
              )
            }),
            Story.expectNoOutMessage(),
          ),
      )

      it.effect('closes after blur only when neither hover zone remains', () =>
        Story.story(
          block,
          Story.init(),
          ...withFocusedOpen,
          Story.message(Message.EnteredTrigger()),
          Story.message(Message.BlurredTrigger()),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeFocusLocation).toStrictEqual(Option.none())
          }),
          Story.message(Message.LeftTrigger()),
          Story.Command.resolve(
            WaitBeforeClosing,
            Message.CompletedWaitBeforeClosing({ version: 3 }),
          ),
          Story.expectOutMessage(OutMessage.Closed()),
        ),
      )

      it.effect(
        'closes without the pointer grace delay when focus leaves',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.message(Message.BlurredTrigger()),
            Story.Command.expectHas(
              WaitBeforeClosing({ delay: Duration.zero, version: 2 }),
            ),
            Story.Command.resolve(
              WaitBeforeClosing,
              Message.CompletedWaitBeforeClosing({ version: 2 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )
    })

    describe('dismissal', () => {
      it.effect(
        'closes immediately on Escape and suppresses re-opening while engaged',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withPointerOpen,
            Story.message(Message.PressedEscape({ source: 'Trigger' })),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.message(Message.EnteredTrigger()),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isDismissed).toBe(true)
            }),
          ),
      )

      it.effect(
        'allows fresh intent after Escape removes a focused panel',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.message(Message.FocusedPanel()),
            Story.message(Message.EnteredPanel()),
            Story.message(Message.PressedEscape({ source: 'Panel' })),
            Story.model(model => {
              expect(model.maybeFocusLocation).toStrictEqual(Option.none())
              expect(model.isPanelHovered).toBe(false)
              expect(model.isDismissed).toBe(false)
            }),
            Story.message(Message.EnteredTrigger()),
            Story.Command.expectHas(WaitBeforeOpening),
            resolveStaleOpen,
          ),
      )

      it.effect(
        'keeps focus dismissal until a restored trigger disengages',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.message(Message.FocusedPanel()),
            Story.message(Message.BlurredPanel()),
            resolveStaleClose,
            Story.message(Message.FocusedTrigger()),
            Story.message(Message.PressedEscape({ source: 'Panel' })),
            Story.model(model => {
              expect(model.maybeFocusLocation).toStrictEqual(
                Option.some('Trigger'),
              )
              expect(model.isDismissed).toBe(true)
            }),
            Story.message(Message.BlurredTrigger()),
            Story.model(model => {
              expect(model.maybeFocusLocation).toStrictEqual(Option.none())
              expect(model.isDismissed).toBe(false)
            }),
          ),
      )

      it.effect(
        'clears Escape dismissal only after pointer and focus both disengage',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.message(Message.EnteredTrigger()),
            Story.message(Message.PressedEscape({ source: 'Trigger' })),
            Story.message(Message.BlurredTrigger()),
            Story.model(model => {
              expect(model.isDismissed).toBe(true)
            }),
            Story.message(Message.LeftTrigger()),
            Story.model(model => {
              expect(model.isDismissed).toBe(false)
            }),
            Story.message(Message.EnteredTrigger()),
            Story.Command.expectHas(WaitBeforeOpening),
            resolveStaleOpen,
          ),
      )

      it.effect('invalidates pending open and close commands on Escape', () =>
        Story.story(
          block,
          withHidden,
          Story.message(Message.EnteredTrigger()),
          resolveStaleOpen,
          Story.message(Message.PressedEscape({ source: 'Trigger' })),
          Story.message(Message.CompletedWaitBeforeOpening({ version: 1 })),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.pendingOpenVersion).toBe(2)
          }),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('closes programmatically and clears panel engagement', () =>
        Story.withBlock(block, block => {
          const focusedOpenUpdate = block.update(
            block.init().model,
            Message.FocusedTrigger(),
          )
          const panelHoveredUpdate = block.update(
            focusedOpenUpdate.model,
            Message.EnteredPanel(),
          )
          const panelFocusedUpdate = block.update(
            panelHoveredUpdate.model,
            Message.FocusedPanel(),
          )
          const closeUpdate = block.operations.requestClose(
            panelFocusedUpdate.model,
          )

          expect(closeUpdate.model.isOpen).toBe(false)
          expect(closeUpdate.model.isPanelHovered).toBe(false)
          expect(closeUpdate.model.maybeFocusLocation).toStrictEqual(
            Option.none(),
          )
          expect(closeUpdate.model.pendingOpenVersion).toBe(3)
          expect(closeUpdate.model.pendingCloseVersion).toBe(4)
          expect(closeUpdate.outMessage).toStrictEqual(OutMessage.Closed())
        }),
      )

      it.effect(
        'receives a parent close request without dispatching a local event',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.inMessage(InMessage.RequestedClose()),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.isDismissed).toBe(true)
              expect(model.pendingOpenVersion).toBe(2)
              expect(model.pendingCloseVersion).toBe(2)
            }),
          ),
      )
    })

    describe('timer versions', () => {
      it.effect('ignores stale open and close completions', () =>
        Story.story(
          block,
          Story.init(),
          ...withPointerOpen,
          Story.message(Message.LeftTrigger()),
          resolveStaleClose,
          Story.message(Message.EnteredTrigger()),
          Story.message(Message.CompletedWaitBeforeClosing({ version: 2 })),
          Story.message(Message.CompletedWaitBeforeOpening({ version: 1 })),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.pendingOpenVersion).toBe(2)
            expect(model.pendingCloseVersion).toBe(3)
          }),
          Story.expectNoOutMessage(),
        ),
      )
    })
  })
})

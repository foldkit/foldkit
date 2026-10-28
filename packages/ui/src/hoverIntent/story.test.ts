import { Array, Duration, Option, Tuple, pipe } from 'effect'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  FocusLocation,
  type Model,
  Trigger,
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

const toDismissedTriggers = (model: Model): ReadonlyArray<Trigger> =>
  pipe(
    [
      Option.flatMap(model.maybeHoveredTrigger, ({ trigger, isDismissed }) =>
        Option.liftPredicate(trigger, () => isDismissed),
      ),
      Option.flatMap(
        model.maybeFocusLocation,
        FocusLocation.match<Option.Option<Trigger>>({
          Trigger: ({ trigger, isDismissed }) =>
            Option.liftPredicate(trigger, () => isDismissed),
          Panel: () => Option.none(),
        }),
      ),
    ],
    Array.getSomes,
    Array.dedupe,
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

const withKeyedOpen = Tuple.make(
  Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
  Story.Command.resolve(
    WaitBeforeOpening,
    Message.CompletedWaitBeforeOpening({ version: 1 }),
  ),
)

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
              activeTrigger: Trigger.Unkeyed(),
              maybeHoveredTrigger: Option.none(),
              maybeHoveredPanel: Option.none(),
              maybeFocusLocation: Option.none(),
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
              expect(model.maybeHoveredTrigger).toStrictEqual(
                Option.some({ trigger: Trigger.Unkeyed(), isDismissed: false }),
              )
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
              expect(model.maybeHoveredTrigger).toStrictEqual(Option.none())
              expect(Option.isSome(model.maybeHoveredPanel)).toBe(true)
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
              expect(model.maybeHoveredPanel).toStrictEqual(Option.none())
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
              Option.some(
                FocusLocation.Trigger({
                  trigger: Trigger.Unkeyed(),
                  isDismissed: false,
                }),
              ),
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
                Option.some(FocusLocation.Panel({ isDismissed: false })),
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
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Unkeyed(),
              ])
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
              expect(model.maybeHoveredPanel).toStrictEqual(Option.none())
              expect(toDismissedTriggers(model)).toStrictEqual([])
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
                Option.some(
                  FocusLocation.Trigger({
                    trigger: Trigger.Unkeyed(),
                    isDismissed: true,
                  }),
                ),
              )
            }),
            Story.message(Message.BlurredTrigger()),
            Story.model(model => {
              expect(model.maybeFocusLocation).toStrictEqual(Option.none())
              expect(toDismissedTriggers(model)).toStrictEqual([])
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
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Unkeyed(),
              ])
            }),
            Story.message(Message.LeftTrigger()),
            Story.model(model => {
              expect(toDismissedTriggers(model)).toStrictEqual([])
            }),
            Story.message(Message.EnteredTrigger()),
            Story.Command.expectHas(WaitBeforeOpening),
            resolveStaleOpen,
          ),
      )

      it.effect(
        'keeps the panel closed after Escape when the pointer enters the panel',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.message(Message.PressedEscape({ source: 'Trigger' })),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.message(Message.EnteredPanel()),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'keeps the panel closed after Escape when focus enters the panel',
        () =>
          Story.story(
            block,
            Story.init(),
            Story.message(Message.EnteredTrigger()),
            Story.message(Message.FocusedTrigger()),
            resolveStaleOpen,
            Story.message(Message.PressedEscape({ source: 'Trigger' })),
            Story.message(Message.BlurredTrigger()),
            Story.message(Message.FocusedPanel()),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'keeps Escape dismissal while focus moves from the trigger to a hovered panel',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.message(Message.PressedEscape({ source: 'Trigger' })),
            Story.message(Message.EnteredPanel()),
            Story.message(Message.BlurredTrigger()),
            Story.message(Message.FocusedPanel()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
            Story.message(Message.LeftPanel()),
            Story.message(Message.BlurredPanel()),
            Story.message(Message.EnteredTrigger()),
            Story.Command.expectHas(WaitBeforeOpening),
            resolveStaleOpen,
          ),
      )

      it.effect(
        'keeps Escape dismissal while the pointer moves from the trigger to the panel',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withPointerOpen,
            Story.message(Message.PressedEscape({ source: 'Trigger' })),
            Story.message(Message.EnteredPanel()),
            Story.message(Message.LeftTrigger()),
            Story.message(Message.FocusedPanel()),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'keeps Escape dismissal when focus moves from the trigger into the panel',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withFocusedOpen,
            Story.message(Message.PressedEscape({ source: 'Trigger' })),
            Story.message(Message.FocusedPanel()),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'cancels an open wait from the panel when the trigger reports a leave',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredPanel()),
            Story.message(Message.LeftTrigger()),
            Story.Command.resolve(
              WaitBeforeOpening,
              Message.CompletedWaitBeforeOpening({ version: 1 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
          ),
      )

      it.effect(
        'ignores a matching open wait while the active trigger is dismissed',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withPointerOpen,
            Story.message(Message.PressedEscape({ source: 'Trigger' })),
            Story.message(Message.CompletedWaitBeforeOpening({ version: 2 })),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
            }),
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
          expect(closeUpdate.model.maybeHoveredPanel).toStrictEqual(
            Option.none(),
          )
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
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Unkeyed(),
              ])
              expect(model.pendingOpenVersion).toBe(2)
              expect(model.pendingCloseVersion).toBe(2)
            }),
          ),
      )
    })

    describe('keyed triggers', () => {
      it.effect(
        'hands the open panel to another keyed trigger without a delay',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withKeyedOpen,
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.Command.resolve(
              WaitBeforeClosing,
              Message.CompletedWaitBeforeClosing({ version: 2 }),
            ),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'second' }),
              )
            }),
            Story.expectNoOutMessage(),
          ),
      )

      it.effect('opens only for the latest keyed trigger', () =>
        Story.story(
          block,
          withHidden,
          Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
          Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
          Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
          Story.Command.resolve(
            WaitBeforeOpening({ delay: Duration.millis(200), version: 1 }),
            Message.CompletedWaitBeforeOpening({ version: 1 }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
          Story.Command.resolve(
            WaitBeforeOpening({ delay: Duration.millis(200), version: 3 }),
            Message.CompletedWaitBeforeOpening({ version: 3 }),
          ),
          Story.expectOutMessage(OutMessage.Opened()),
          Story.model(model => {
            expect(model.activeTrigger).toStrictEqual(
              Trigger.Keyed({ key: 'second' }),
            )
          }),
        ),
      )

      it.effect(
        'closes after the delay only when the active keyed trigger is left',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withKeyedOpen,
            Story.message(Message.LeftKeyedTrigger({ key: 'second' })),
            Story.Command.expectNone(),
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 2 }),
              Message.CompletedWaitBeforeClosing({ version: 2 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'clears Escape dismissal once the keyed trigger that pressed Escape blurs',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.message(
              Message.PressedEscapeOnKeyedTrigger({ key: 'first' }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.message(Message.LeftKeyedTrigger({ key: 'second' })),
            Story.message(Message.BlurredKeyedTrigger({ key: 'first' })),
            Story.model(model => {
              expect(toDismissedTriggers(model)).toStrictEqual([])
            }),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.Command.expectHas(WaitBeforeOpening),
            resolveStaleOpen,
          ),
      )

      it.effect(
        'opens for another keyed trigger after Escape dismisses the panel',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(
              Message.PressedEscapeOnKeyedTrigger({ key: 'first' }),
            ),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.Command.resolve(
              WaitBeforeOpening,
              Message.CompletedWaitBeforeOpening({ version: 3 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
          ),
      )

      it.effect(
        'keeps the panel open when focus moves by Tab to another keyed trigger',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(Message.BlurredKeyedTrigger({ key: 'first' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'second' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 2 }),
              Message.CompletedWaitBeforeClosing({ version: 2 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'second' }),
              )
            }),
          ),
      )

      it.effect(
        'keeps Escape dismissal on a hovered and focused keyed trigger until both leave',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            resolveStaleOpen,
            Story.message(
              Message.PressedEscapeOnKeyedTrigger({ key: 'first' }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Keyed({ key: 'first' }),
              ])
            }),
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.message(Message.BlurredKeyedTrigger({ key: 'first' })),
            Story.model(model => {
              expect(toDismissedTriggers(model)).toStrictEqual([])
            }),
            Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
            Story.Command.expectHas(WaitBeforeOpening),
            resolveStaleOpen,
          ),
      )

      it.effect(
        'returns Escape dismissal to the active keyed trigger when focus leaves the panel for it',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(Message.BlurredKeyedTrigger({ key: 'first' })),
            Story.message(Message.FocusedPanel()),
            resolveStaleClose,
            Story.message(Message.BlurredPanel()),
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            resolveStaleClose,
            Story.message(Message.PressedEscape({ source: 'Panel' })),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Keyed({ key: 'first' }),
              ])
              expect(model.maybeFocusLocation).toStrictEqual(
                Option.some(
                  FocusLocation.Trigger({
                    trigger: Trigger.Keyed({ key: 'first' }),
                    isDismissed: true,
                  }),
                ),
              )
            }),
            Story.message(Message.BlurredKeyedTrigger({ key: 'first' })),
            Story.model(model => {
              expect(toDismissedTriggers(model)).toStrictEqual([])
            }),
          ),
      )

      it.effect(
        'gives the panel to the unkeyed trigger after a keyed one',
        () =>
          Story.story(
            block,
            Story.init(),
            ...withKeyedOpen,
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredTrigger()),
            Story.Command.resolve(
              WaitBeforeClosing,
              Message.CompletedWaitBeforeClosing({ version: 2 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(Trigger.Unkeyed())
            }),
            Story.message(Message.LeftTrigger()),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 4 }),
              Message.CompletedWaitBeforeClosing({ version: 4 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'hands the panel back to the hovered keyed trigger after the focused one blurs',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'second' })),
            Story.expectOutMessage(OutMessage.Opened()),
            resolveStaleOpen,
            Story.message(Message.BlurredKeyedTrigger({ key: 'second' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 3 }),
              Message.CompletedWaitBeforeClosing({ version: 3 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'first' }),
              )
            }),
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 4 }),
              Message.CompletedWaitBeforeClosing({ version: 4 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'hands the panel back to the focused keyed trigger after the pointer leaves another one',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.message(Message.LeftKeyedTrigger({ key: 'second' })),
            Story.model(model => {
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'second' }),
              )
            }),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 3 }),
              Message.CompletedWaitBeforeClosing({ version: 3 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'first' }),
              )
            }),
          ),
      )

      it.effect(
        'keeps the panel open for a focused keyed trigger after the pointer crosses another one',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.message(Message.LeftKeyedTrigger({ key: 'second' })),
            resolveStaleClose,
            Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'first' }),
              )
            }),
            Story.message(Message.BlurredKeyedTrigger({ key: 'first' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 5 }),
              Message.CompletedWaitBeforeClosing({ version: 5 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'keeps the panel for the hovered keyed trigger when the pointer moves into the panel while another one has focus',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.message(Message.LeftKeyedTrigger({ key: 'second' })),
            Story.message(Message.EnteredPanel()),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 3 }),
              Message.CompletedWaitBeforeClosing({ version: 3 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'second' }),
              )
            }),
          ),
      )

      it.effect(
        'keeps the panel for the focused keyed trigger when focus moves into the panel while another one is hovered',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            resolveStaleOpen,
            Story.message(Message.BlurredKeyedTrigger({ key: 'first' })),
            Story.message(Message.FocusedPanel()),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 3 }),
              Message.CompletedWaitBeforeClosing({ version: 3 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'first' }),
              )
            }),
          ),
      )

      it.effect(
        'keeps a dismissed keyed trigger closed after the pointer crosses another one',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(
              Message.PressedEscapeOnKeyedTrigger({ key: 'first' }),
            ),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            resolveStaleOpen,
            Story.message(Message.LeftKeyedTrigger({ key: 'second' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Keyed({ key: 'first' }),
              ])
            }),
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.Command.resolve(
              WaitBeforeOpening({ delay: Duration.millis(200), version: 5 }),
              Message.CompletedWaitBeforeOpening({ version: 5 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.message(Message.LeftKeyedTrigger({ key: 'second' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 5 }),
              Message.CompletedWaitBeforeClosing({ version: 5 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'second' }),
              )
            }),
          ),
      )

      it.effect(
        'closes and forgets a removed keyed trigger that held focus',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.inMessage(
              InMessage.InformedOfRemovedKeyedTrigger({ key: 'first' }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(model.maybeFocusLocation).toStrictEqual(Option.none())
            }),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.Command.resolve(
              WaitBeforeOpening({ delay: Duration.millis(200), version: 3 }),
              Message.CompletedWaitBeforeOpening({ version: 3 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.message(Message.LeftKeyedTrigger({ key: 'second' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 4 }),
              Message.CompletedWaitBeforeClosing({ version: 4 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'hands the panel from a removed hovered keyed trigger to the focused one',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'first' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'second' })),
            Story.inMessage(
              InMessage.InformedOfRemovedKeyedTrigger({ key: 'second' }),
            ),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.maybeHoveredTrigger).toStrictEqual(Option.none())
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'first' }),
              )
            }),
            Story.message(Message.BlurredKeyedTrigger({ key: 'first' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 4 }),
              Message.CompletedWaitBeforeClosing({ version: 4 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'hands the panel back to the focused unkeyed trigger after the pointer leaves a keyed one',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedTrigger()),
            Story.message(Message.EnteredKeyedTrigger({ key: 'first' })),
            Story.message(Message.LeftKeyedTrigger({ key: 'first' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 3 }),
              Message.CompletedWaitBeforeClosing({ version: 3 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(Trigger.Unkeyed())
            }),
            Story.message(Message.BlurredTrigger()),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 4 }),
              Message.CompletedWaitBeforeClosing({ version: 4 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'keeps an earlier Escape dismissal when a second trigger is dismissed',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredKeyedTrigger({ key: 'b' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'b' })),
            resolveStaleOpen,
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'b' })),
            Story.message(Message.BlurredKeyedTrigger({ key: 'b' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'a' })),
            Story.message(Message.BlurredKeyedTrigger({ key: 'a' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'd' })),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.message(Message.BlurredKeyedTrigger({ key: 'd' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 7 }),
              Message.CompletedWaitBeforeClosing({ version: 7 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Keyed({ key: 'b' }),
              ])
            }),
          ),
      )

      it.effect(
        'keeps a focused trigger dismissed when RequestedClose dismisses a hovered one',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'a' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'b' })),
            Story.Command.resolve(
              WaitBeforeOpening({ delay: Duration.millis(200), version: 3 }),
              Message.CompletedWaitBeforeOpening({ version: 3 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.inMessage(InMessage.RequestedClose()),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.message(Message.LeftKeyedTrigger({ key: 'b' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'c' })),
            Story.Command.resolve(
              WaitBeforeOpening({ delay: Duration.millis(200), version: 6 }),
              Message.CompletedWaitBeforeOpening({ version: 6 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.message(Message.LeftKeyedTrigger({ key: 'c' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 6 }),
              Message.CompletedWaitBeforeClosing({ version: 6 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Keyed({ key: 'a' }),
              ])
            }),
          ),
      )

      it.effect(
        'dismisses the hovered active keyed trigger when Escape is pressed on a focused one',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'b' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'a' })),
            Story.model(model => {
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'a' }),
              )
            }),
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'b' })),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.message(Message.BlurredKeyedTrigger({ key: 'b' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'c' })),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.message(Message.BlurredKeyedTrigger({ key: 'c' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 5 }),
              Message.CompletedWaitBeforeClosing({ version: 5 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(toDismissedTriggers(model)).toStrictEqual([
                Trigger.Keyed({ key: 'a' }),
              ])
            }),
          ),
      )

      it.effect(
        'does not hand the panel back to a trigger dismissed through either of its records',
        () =>
          Story.story(
            block,
            Story.given({
              isOpen: true,
              activeTrigger: Trigger.Keyed({ key: 'b' }),
              maybeHoveredTrigger: Option.some({
                trigger: Trigger.Keyed({ key: 'a' }),
                isDismissed: false,
              }),
              maybeHoveredPanel: Option.none(),
              maybeFocusLocation: Option.some(
                FocusLocation.Trigger({
                  trigger: Trigger.Keyed({ key: 'a' }),
                  isDismissed: true,
                }),
              ),
              openDelay: Duration.millis(200),
              closeDelay: Duration.millis(300),
              pendingOpenVersion: 0,
              pendingCloseVersion: 1,
            }),
            Story.message(Message.CompletedWaitBeforeClosing({ version: 1 })),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'opens for another keyed trigger while the panel holds a dismissal',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'a' })),
            Story.message(Message.EnteredPanel()),
            Story.message(Message.BlurredKeyedTrigger({ key: 'a' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'b' })),
            Story.Command.resolve(
              WaitBeforeOpening,
              Message.CompletedWaitBeforeOpening({ version: 4 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
          ),
      )

      it.effect(
        'opens for another keyed trigger while the focused panel holds a dismissal',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'a' })),
            Story.message(Message.EnteredPanel()),
            Story.message(Message.BlurredKeyedTrigger({ key: 'a' })),
            Story.message(Message.FocusedPanel()),
            Story.message(Message.LeftPanel()),
            Story.message(Message.EnteredKeyedTrigger({ key: 'b' })),
            Story.Command.resolve(
              WaitBeforeOpening,
              Message.CompletedWaitBeforeOpening({ version: 6 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
          ),
      )

      it.effect(
        'keeps the panel open while the pointer crosses a dismissed keyed trigger',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'a' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'b' })),
            Story.Command.resolve(
              WaitBeforeOpening({ delay: Duration.millis(200), version: 3 }),
              Message.CompletedWaitBeforeOpening({ version: 3 }),
            ),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.message(Message.LeftKeyedTrigger({ key: 'b' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'a' })),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'b' }),
              )
            }),
            Story.message(Message.LeftKeyedTrigger({ key: 'a' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'c' })),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.millis(300), version: 4 }),
              Message.CompletedWaitBeforeClosing({ version: 4 }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'c' }),
              )
            }),
          ),
      )

      it.effect(
        'keeps a dismissed keyed trigger from taking the open panel through focus',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredKeyedTrigger({ key: 'a' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            resolveStaleOpen,
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'a' })),
            Story.message(Message.BlurredKeyedTrigger({ key: 'a' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'b' })),
            Story.expectOutMessage(OutMessage.Opened()),
            Story.message(Message.BlurredKeyedTrigger({ key: 'b' })),
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.expectNoOutMessage(),
            Story.model(model => {
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'b' }),
              )
            }),
            Story.Command.resolve(
              WaitBeforeClosing({ delay: Duration.zero, version: 5 }),
              Message.CompletedWaitBeforeClosing({ version: 5 }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
          ),
      )

      it.effect(
        'closes and releases the panel when the active keyed trigger is removed while the panel is engaged',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.EnteredKeyedTrigger({ key: 'b' })),
            Story.Command.resolve(
              WaitBeforeOpening,
              Message.CompletedWaitBeforeOpening({ version: 1 }),
            ),
            Story.message(Message.LeftKeyedTrigger({ key: 'b' })),
            resolveStaleClose,
            Story.message(Message.EnteredPanel()),
            Story.message(Message.FocusedPanel()),
            Story.inMessage(
              InMessage.InformedOfRemovedKeyedTrigger({ key: 'b' }),
            ),
            Story.expectOutMessage(OutMessage.Closed()),
            Story.model(model => {
              expect(model.isOpen).toBe(false)
              expect(model.maybeHoveredPanel).toStrictEqual(Option.none())
              expect(model.maybeFocusLocation).toStrictEqual(Option.none())
            }),
          ),
      )

      it.effect(
        'keeps the panel hovered when a removed active keyed trigger hands the panel to a focused one',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.message(Message.EnteredKeyedTrigger({ key: 'b' })),
            Story.message(Message.LeftKeyedTrigger({ key: 'b' })),
            resolveStaleClose,
            Story.message(Message.EnteredPanel()),
            Story.inMessage(
              InMessage.InformedOfRemovedKeyedTrigger({ key: 'b' }),
            ),
            Story.expectNoOutMessage(),
            Story.message(Message.BlurredKeyedTrigger({ key: 'a' })),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.isOpen).toBe(true)
              expect(Option.isSome(model.maybeHoveredPanel)).toBe(true)
              expect(model.activeTrigger).toStrictEqual(
                Trigger.Keyed({ key: 'a' }),
              )
            }),
          ),
      )

      it.effect(
        'opens for a removed dismissed keyed trigger whose key engages again',
        () =>
          Story.story(
            block,
            withHidden,
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.message(Message.PressedEscapeOnKeyedTrigger({ key: 'a' })),
            Story.inMessage(
              InMessage.InformedOfRemovedKeyedTrigger({ key: 'a' }),
            ),
            Story.model(model => {
              expect(toDismissedTriggers(model)).toStrictEqual([])
            }),
            Story.message(Message.FocusedKeyedTrigger({ key: 'a' })),
            Story.expectOutMessage(OutMessage.Opened()),
          ),
      )

      it.effect('forgets a removed keyed trigger that is not active', () =>
        Story.story(
          block,
          withHidden,
          Story.message(Message.EnteredKeyedTrigger({ key: 'a' })),
          Story.message(Message.FocusedKeyedTrigger({ key: 'b' })),
          resolveStaleOpen,
          Story.inMessage(
            InMessage.InformedOfRemovedKeyedTrigger({ key: 'a' }),
          ),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
            expect(model.maybeHoveredTrigger).toStrictEqual(Option.none())
            expect(model.activeTrigger).toStrictEqual(
              Trigger.Keyed({ key: 'b' }),
            )
          }),
          Story.message(Message.BlurredKeyedTrigger({ key: 'b' })),
          Story.Command.resolve(
            WaitBeforeClosing({ delay: Duration.zero, version: 3 }),
            Message.CompletedWaitBeforeClosing({ version: 3 }),
          ),
          Story.expectOutMessage(OutMessage.Closed()),
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

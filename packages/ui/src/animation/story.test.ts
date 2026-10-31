import { Array, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  Animation,
  AnimationLive,
  Message,
  OutMessage,
  WaitForAnimationSettled,
  WaitForPaint,
} from './block.js'

const INITIAL_TRANSITION_GENERATION = 0
const FIRST_TRANSITION_GENERATION = 1
const SECOND_TRANSITION_GENERATION = 2
const STALE_TRANSITION_GENERATION = -1

const hidden = { id: 'test' }
const showing = { id: 'test', isShowing: true }

const resolveStaleSettle = Story.Command.resolve(
  WaitForAnimationSettled,
  Message.EndedAnimation({ generation: STALE_TRANSITION_GENERATION }),
)

const resolveFirstPaint = Story.Command.resolve(
  WaitForPaint,
  Message.CompletedWaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
)

const resolveFirstSettle = Story.Command.resolve(
  WaitForAnimationSettled,
  Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
)

const enterAnimating = Story.steps(
  Story.message(Message.Showed()),
  resolveFirstPaint,
)

const leaveAnimating = Story.steps(
  Story.message(Message.Hid()),
  resolveFirstPaint,
)

const leaveAnimatingModel = {
  id: 'test',
  isShowing: false,
  transitionState: 'LeaveAnimating',
  transitionGeneration: FIRST_TRANSITION_GENERATION,
}

describe('Animation', () => {
  describe('constructor', () => {
    it.effect('defaults isShowing to false', () =>
      Story.story(
        AnimationLive,
        hidden,
        Story.model(model => {
          expect(model).toStrictEqual({
            id: 'test',
            isShowing: false,
            transitionState: 'Idle',
            transitionGeneration: INITIAL_TRANSITION_GENERATION,
          })
        }),
      ),
    )

    it.effect('accepts a custom isShowing', () =>
      Story.story(
        AnimationLive,
        showing,
        Story.model(model => {
          expect(model).toStrictEqual({
            id: 'test',
            isShowing: true,
            transitionState: 'Idle',
            transitionGeneration: INITIAL_TRANSITION_GENERATION,
          })
        }),
      ),
    )

    it.effect('defaults the element id to the instance id', () =>
      Story.story(
        AnimationLive,
        {},
        Story.model(model => {
          expect(model.id).toBe(Animation.id)
        }),
      ),
    )
  })

  describe('update', () => {
    describe('Showed', () => {
      it.effect('starts enter lifecycle when hidden', () =>
        Story.story(
          AnimationLive,
          hidden,
          Story.message(Message.Showed()),
          Story.model(model => {
            expect(model.isShowing).toBe(true)
            expect(model.transitionState).toBe('EnterStart')
            expect(model.transitionGeneration).toBe(FIRST_TRANSITION_GENERATION)
          }),
          Story.Command.expectHas(
            WaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          resolveFirstPaint,
          Story.model(model => {
            expect(model.transitionState).toBe('EnterAnimating')
          }),
          Story.Command.expectHas(
            WaitForAnimationSettled({
              id: 'test',
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
          Story.Command.resolve(
            WaitForAnimationSettled,
            Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('does nothing when already showing', () =>
        Story.story(
          AnimationLive,
          showing,
          Story.message(Message.Showed()),
          Story.model(model => {
            expect(model.isShowing).toBe(true)
            expect(model.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
        ),
      )
    })

    describe('Hid', () => {
      it.effect('starts leave lifecycle when showing', () =>
        Story.story(
          AnimationLive,
          showing,
          Story.message(Message.Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
            expect(model.transitionState).toBe('LeaveStart')
            expect(model.transitionGeneration).toBe(FIRST_TRANSITION_GENERATION)
          }),
          Story.Command.expectHas(
            WaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          resolveFirstPaint,
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.Command.expectNone(),
          Story.expectOutMessage(
            OutMessage.StartedLeaveAnimating({
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
          Story.message(
            Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectOutMessage(OutMessage.TransitionedOut()),
        ),
      )

      it.effect('does nothing when already hidden', () =>
        Story.story(
          AnimationLive,
          hidden,
          Story.message(Message.Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('does nothing when already in LeaveAnimating', () =>
        Story.story(
          AnimationLive,
          showing,
          Story.message(Message.Hid()),
          Story.Command.expectHas(WaitForPaint),
          resolveFirstPaint,
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.Command.expectNone(),
          Story.expectOutMessage(
            OutMessage.StartedLeaveAnimating({
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
          Story.message(Message.Hid()),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
        ),
      )
    })

    describe('CompletedWaitForPaint', () => {
      it.effect('does nothing when Idle', () =>
        Story.story(
          AnimationLive,
          hidden,
          Story.message(
            Message.CompletedWaitForPaint({
              generation: INITIAL_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        ),
      )
    })

    describe('EndedAnimation', () => {
      it.effect('does nothing when Idle', () =>
        Story.story(
          AnimationLive,
          hidden,
          Story.message(
            Message.EndedAnimation({
              generation: INITIAL_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        ),
      )
    })

    describe('stale results', () => {
      it.effect('ignores an enter settlement after a leave starts', () =>
        Story.story(
          AnimationLive,
          hidden,
          enterAnimating,
          resolveStaleSettle,
          Story.message(Message.Hid()),
          Story.Command.resolve(
            WaitForPaint,
            Message.CompletedWaitForPaint({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.expectOutMessage(
            OutMessage.StartedLeaveAnimating({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.message(
            Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.expectNoOutMessage(),
          Story.message(
            Message.EndedAnimation({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectOutMessage(OutMessage.TransitionedOut()),
        ),
      )

      it.effect('ignores a leave settlement after an enter starts', () =>
        Story.story(
          AnimationLive,
          showing,
          leaveAnimating,
          Story.message(Message.Showed()),
          Story.Command.resolve(
            WaitForPaint,
            Message.CompletedWaitForPaint({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('EnterAnimating')
          }),
          resolveStaleSettle,
          Story.message(
            Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('EnterAnimating')
          }),
          Story.expectNoOutMessage(),
          Story.message(
            Message.EndedAnimation({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('ignores an enter paint after a leave starts', () =>
        Story.story(
          AnimationLive,
          hidden,
          Story.message(Message.Showed()),
          Story.Command.resolve(
            WaitForPaint,
            Message.CompletedWaitForPaint({
              generation: STALE_TRANSITION_GENERATION,
            }),
          ),
          Story.message(Message.Hid()),
          Story.Command.resolve(
            WaitForPaint,
            Message.CompletedWaitForPaint({
              generation: STALE_TRANSITION_GENERATION,
            }),
          ),
          Story.message(
            Message.CompletedWaitForPaint({
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveStart')
          }),
          Story.expectNoOutMessage(),
          Story.message(
            Message.CompletedWaitForPaint({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.expectOutMessage(
            OutMessage.StartedLeaveAnimating({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
        ),
      )
    })
  })

  describe('RequestedToggle', () => {
    it.effect('shows a hidden animation', () =>
      Story.story(
        AnimationLive,
        hidden,
        Story.message(Message.RequestedToggle()),
        Story.model(model => {
          expect(model.isShowing).toBe(true)
          expect(model.transitionState).toBe('EnterStart')
        }),
        Story.Command.expectExact(
          WaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
        ),
        resolveFirstPaint,
        resolveFirstSettle,
      ),
    )

    it.effect('hides a shown animation', () =>
      Story.story(
        AnimationLive,
        showing,
        Story.message(Message.RequestedToggle()),
        Story.model(model => {
          expect(model.isShowing).toBe(false)
          expect(model.transitionState).toBe('LeaveStart')
        }),
        Story.Command.expectExact(
          WaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
        ),
        resolveFirstPaint,
      ),
    )
  })

  describe('parent requests', () => {
    it.effect('RequestedShow shows a hidden Animation', () =>
      Story.story(
        AnimationLive,
        hidden,
        Story.message(Message.RequestedShow()),
        Story.model(model => {
          expect(model.isShowing).toBe(true)
          expect(model.transitionState).toBe('EnterStart')
        }),
        Story.Command.expectExact(
          WaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
        ),
        resolveFirstPaint,
        resolveFirstSettle,
      ),
    )

    it.effect('RequestedHide hides a showing Animation', () =>
      Story.story(
        AnimationLive,
        showing,
        Story.message(Message.RequestedHide()),
        Story.model(model => {
          expect(model.isShowing).toBe(false)
          expect(model.transitionState).toBe('LeaveStart')
        }),
        Story.Command.expectExact(
          WaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
        ),
        resolveFirstPaint,
      ),
    )

    it.effect('RequestedFinish completes only the current generation', () =>
      Story.story(
        AnimationLive,
        showing,
        leaveAnimating,
        Story.message(
          Message.RequestedFinish({ generation: STALE_TRANSITION_GENERATION }),
        ),
        Story.model(model => {
          expect(model.transitionState).toBe('LeaveAnimating')
        }),
        Story.expectNoOutMessage(),
        Story.message(
          Message.RequestedFinish({ generation: FIRST_TRANSITION_GENERATION }),
        ),
        Story.model(model => {
          expect(model.transitionState).toBe('Idle')
        }),
        Story.expectOutMessage(OutMessage.TransitionedOut()),
      ),
    )

    it.effect(
      'RequestedWaitForLeaveSettlement does nothing unless leave is animating',
      () =>
        Story.story(
          AnimationLive,
          hidden,
          Story.message(Message.RequestedWaitForLeaveSettlement()),
          Story.model(model => {
            expect(model).toStrictEqual({
              id: 'test',
              isShowing: false,
              transitionState: 'Idle',
              transitionGeneration: INITIAL_TRANSITION_GENERATION,
            })
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
        ),
    )

    it.effect(
      'RequestedWaitForLeaveSettlement waits while leave is animating',
      () =>
        Story.story(
          AnimationLive,
          showing,
          leaveAnimating,
          Story.message(Message.RequestedWaitForLeaveSettlement()),
          Story.model(model => {
            expect(model).toStrictEqual(leaveAnimatingModel)
          }),
          Story.Command.expectExact(
            WaitForAnimationSettled({
              id: 'test',
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
          resolveFirstSettle,
        ),
    )

    it.effect(
      'emits TransitionedOut once when the wait is requested twice',
      () =>
        Story.story(
          AnimationLive,
          showing,
          leaveAnimating,
          Story.message(
            Message.CompletedWaitForPaint({
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model).toStrictEqual(leaveAnimatingModel)
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
          Story.message(Message.RequestedWaitForLeaveSettlement()),
          Story.message(Message.RequestedWaitForLeaveSettlement()),
          Story.Command.expectExact(
            WaitForAnimationSettled({
              id: 'test',
              generation: FIRST_TRANSITION_GENERATION,
            }),
            WaitForAnimationSettled({
              id: 'test',
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
          Story.message(
            Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.expectOutMessage(OutMessage.TransitionedOut()),
          Story.message(
            Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoOutMessage(),
          Story.Command.resolveAllExact(
            [
              WaitForAnimationSettled,
              Message.EndedAnimation({
                generation: FIRST_TRANSITION_GENERATION,
              }),
            ],
            [
              WaitForAnimationSettled,
              Message.EndedAnimation({
                generation: FIRST_TRANSITION_GENERATION,
              }),
            ],
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoOutMessage(),
        ),
    )

    it.effect(
      'RequestedImmediateReset resets a leaving Animation without completing the transition',
      () =>
        Story.story(
          AnimationLive,
          showing,
          leaveAnimating,
          Story.message(Message.RequestedImmediateReset()),
          Story.model(model => {
            expect(model).toStrictEqual({
              id: 'test',
              isShowing: false,
              transitionState: 'Idle',
              transitionGeneration: FIRST_TRANSITION_GENERATION,
            })
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
          Story.message(
            Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoOutMessage(),
        ),
    )

    it.effect('RequestedResume repeats the wait the current phase needs', () =>
      Story.story(
        AnimationLive,
        hidden,
        Story.message(Message.RequestedResume()),
        Story.Command.expectNone(),
        Story.message(Message.RequestedShow()),
        resolveFirstPaint,
        Story.Command.resolve(
          WaitForAnimationSettled,
          Message.EndedAnimation({ generation: STALE_TRANSITION_GENERATION }),
        ),
        Story.message(Message.RequestedResume()),
        Story.Command.expectExact(
          WaitForAnimationSettled({
            id: 'test',
            generation: FIRST_TRANSITION_GENERATION,
          }),
        ),
        resolveFirstSettle,
        Story.model(model => {
          expect(model.transitionState).toBe('Idle')
        }),
      ),
    )
  })

  describe('in a parent', () => {
    const PanelMessage = defineMessageUnion({
      ClickedShow: {},
      ClickedHide: {},
      ClickedAddEntry: {},
    })

    class Panel extends Block<Panel>()('Panel', {
      Model: Schema.Struct({
        animation: Animation,
        entries: Schema.Array(Animation),
        transitionedOutCount: Schema.Number,
        nextEntryKey: Schema.Number,
      }),
      Message: PanelMessage,
    }) {}

    const PanelLive = Panel.make(
      Effect.fn(function* () {
        const animation = yield* new Animation('animation', {
          id: 'panel-content',
        })
        const entry = yield* Animation.each('entries', { isShowing: true })

        return {
          model: {
            animation,
            entries: [],
            transitionedOutCount: 0,
            nextEntryKey: 0,
          },
          update: {
            ClickedShow: model => ({
              model,
              messages: [model.animation.send(Message.RequestedShow())],
            }),
            ClickedHide: model => ({
              model,
              messages: [model.animation.send(Message.RequestedHide())],
            }),
            ClickedAddEntry: model => ({
              model: {
                ...model,
                entries: Array.append(
                  model.entries,
                  entry(`entry-${model.nextEntryKey}`),
                ),
                nextEntryKey: model.nextEntryKey + 1,
              },
            }),
            ...animation.on({
              StartedLeaveAnimating: model => ({
                model,
                messages: [
                  model.animation.send(
                    Message.RequestedWaitForLeaveSettlement(),
                  ),
                ],
              }),
              TransitionedOut: model => ({
                model: {
                  ...model,
                  transitionedOutCount: model.transitionedOutCount + 1,
                },
              }),
            }),
          },
          view: (model, h) =>
            h.div(
              [],
              [
                h.button([h.OnClick(PanelMessage.ClickedShow())], ['Show']),
                h.button([h.OnClick(PanelMessage.ClickedHide())], ['Hide']),
                model.animation.view({
                  toView: () => h.p([], ['Content']),
                  className: 'panel',
                  attributes: childAttributes([h.Role('region')]),
                }),
              ],
            ),
        }
      }),
    )

    const PanelWithAnimation = PanelLive.pipe(Layer.provide(AnimationLive))

    it.effect(
      'drives the lifecycle through sent Messages and OutMessages',
      () =>
        Story.story(
          PanelWithAnimation,
          Story.message(PanelMessage.ClickedShow()),
          Story.model(model => {
            expect(model.animation.transitionState).toBe('EnterStart')
          }),
          resolveFirstPaint,
          Story.Command.resolve(
            WaitForAnimationSettled,
            Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.message(PanelMessage.ClickedHide()),
          Story.Command.resolve(
            WaitForPaint,
            Message.CompletedWaitForPaint({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.Command.expectExact(
            WaitForAnimationSettled({
              id: 'panel-content',
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.Command.resolve(
            WaitForAnimationSettled,
            Message.EndedAnimation({
              generation: SECOND_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.animation.transitionState).toBe('Idle')
            expect(model.transitionedOutCount).toBe(1)
          }),
        ),
    )

    it.effect('uses each instance key as its element id', () =>
      Story.story(
        PanelWithAnimation,
        Story.message(PanelMessage.ClickedAddEntry()),
        Story.message(PanelMessage.ClickedAddEntry()),
        Story.model(model => {
          expect(model.entries).toStrictEqual([
            {
              id: 'entry-0',
              isShowing: true,
              transitionState: 'Idle',
              transitionGeneration: INITIAL_TRANSITION_GENERATION,
            },
            {
              id: 'entry-1',
              isShowing: true,
              transitionState: 'Idle',
              transitionGeneration: INITIAL_TRANSITION_GENERATION,
            },
          ])
        }),
      ),
    )

    it.effect('renders transition data attributes and parent content', () =>
      Scene.scene(
        PanelWithAnimation,
        Scene.expect(Scene.role('region')).toBeAbsent(),
        Scene.click(Scene.role('button', { name: 'Show' })),
        Scene.expect(Scene.role('region')).toHaveAttr('id', 'panel-content'),
        Scene.expect(Scene.role('region')).toHaveAttr('data-enter', ''),
        Scene.expect(Scene.role('region')).toHaveAttr('data-closed', ''),
        Scene.expect(Scene.text('Content')).toExist(),
        Scene.Command.resolve(
          WaitForPaint,
          Message.CompletedWaitForPaint({
            generation: FIRST_TRANSITION_GENERATION,
          }),
        ),
        Scene.expect(Scene.role('region')).not.toHaveAttr('data-closed'),
        Scene.Command.resolve(
          WaitForAnimationSettled,
          Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
        ),
        Scene.expect(Scene.role('region')).not.toHaveAttr('data-transition'),
        Scene.expect(Scene.role('region')).toHaveAttr('class', 'panel'),
      ),
    )
  })
})

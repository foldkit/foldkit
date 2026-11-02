import { Effect } from 'effect'
import * as Story from 'foldkit/story'
import { it as baseIt, expect } from 'vitest'

import { describe } from '@effect/vitest'

import {
  InMessage,
  Message,
  OutMessage,
  WaitForAnimationSettled,
  WaitForPaint,
  block,
} from './block.js'

const INITIAL_TRANSITION_GENERATION = 0
const FIRST_TRANSITION_GENERATION = 1
const SECOND_TRANSITION_GENERATION = 2
const STALE_TRANSITION_GENERATION = -1

const resolveStaleSettle = Story.Command.resolve(
  WaitForAnimationSettled,
  Message.EndedAnimation({ generation: STALE_TRANSITION_GENERATION }),
)

type AnimationOperations = Pick<
  Effect.Success<typeof block.get>,
  'init' | 'update' | 'receive' | 'operations'
>

const makeFixture = (animation: AnimationOperations) => {
  const { init, update, receive, operations } = animation
  const givenEnterAnimating = Story.steps(
    Story.given(init({ id: 'test' }).model),
    Story.message(Message.Showed()),
    Story.Command.resolve(
      WaitForPaint,
      Message.CompletedWaitForPaint({
        generation: FIRST_TRANSITION_GENERATION,
      }),
    ),
  )

  const givenLeaveAnimating = Story.steps(
    Story.given(init({ id: 'test', isShowing: true }).model),
    Story.message(Message.Hid()),
    Story.Command.resolve(
      WaitForPaint,
      Message.CompletedWaitForPaint({
        generation: FIRST_TRANSITION_GENERATION,
      }),
    ),
  )

  return {
    init,
    update,
    receive,
    operations,
    givenEnterAnimating,
    givenLeaveAnimating,
  }
}

const it = baseIt.extend<{ animation: ReturnType<typeof makeFixture> }>({
  animation: async ({}, use) =>
    Effect.runPromise(
      Story.withBlock(block, animation =>
        Effect.promise(() => use(makeFixture(animation))),
      ),
    ),
})

describe('Animation', () => {
  describe('init', () => {
    it('defaults isShowing to false', ({ animation: { init } }) => {
      expect(init({ id: 'test' }).model).toStrictEqual({
        id: 'test',
        isShowing: false,
        transitionState: 'Idle',
        transitionGeneration: INITIAL_TRANSITION_GENERATION,
      })
    })

    it('accepts a custom isShowing', ({ animation: { init } }) => {
      expect(init({ id: 'test', isShowing: true }).model).toStrictEqual({
        id: 'test',
        isShowing: true,
        transitionState: 'Idle',
        transitionGeneration: INITIAL_TRANSITION_GENERATION,
      })
    })
  })

  describe('update', () => {
    describe('Showed', () => {
      it('starts enter lifecycle when hidden', ({
        animation: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test' }).model),
          Story.message(Message.Showed()),
          Story.model(model => {
            expect(model.isShowing).toBe(true)
            expect(model.transitionState).toBe('EnterStart')
            expect(model.transitionGeneration).toBe(FIRST_TRANSITION_GENERATION)
          }),
          Story.Command.expectHas(
            WaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.Command.resolve(
            WaitForPaint,
            Message.CompletedWaitForPaint({
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
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
        )
      })

      it('does nothing when already showing', ({
        animation: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isShowing: true }).model),
          Story.message(Message.Showed()),
          Story.model(model => {
            expect(model.isShowing).toBe(true)
            expect(model.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
        )
      })
    })

    describe('Hid', () => {
      it('starts leave lifecycle when showing', ({
        animation: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isShowing: true }).model),
          Story.message(Message.Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
            expect(model.transitionState).toBe('LeaveStart')
            expect(model.transitionGeneration).toBe(FIRST_TRANSITION_GENERATION)
          }),
          Story.Command.expectHas(
            WaitForPaint({ generation: FIRST_TRANSITION_GENERATION }),
          ),
          Story.Command.resolve(
            WaitForPaint,
            Message.CompletedWaitForPaint({
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
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
        )
      })

      it('does nothing when already hidden', ({
        animation: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test' }).model),
          Story.message(Message.Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
        )
      })

      it('does nothing when already in LeaveAnimating', ({
        animation: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isShowing: true }).model),
          Story.message(Message.Hid()),
          Story.Command.expectHas(WaitForPaint),
          Story.Command.resolve(
            WaitForPaint,
            Message.CompletedWaitForPaint({
              generation: FIRST_TRANSITION_GENERATION,
            }),
          ),
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
        )
      })
    })

    describe('CompletedWaitForPaint', () => {
      it('does nothing when Idle', ({ animation: { update, init } }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test' }).model),
          Story.message(
            Message.CompletedWaitForPaint({
              generation: INITIAL_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })
    })

    describe('EndedAnimation', () => {
      it('does nothing when Idle', ({ animation: { update, init } }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test' }).model),
          Story.message(
            Message.EndedAnimation({
              generation: INITIAL_TRANSITION_GENERATION,
            }),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })
    })

    describe('stale results', () => {
      it('ignores an enter settlement after a leave starts', ({
        animation: { update, givenEnterAnimating },
      }) => {
        Story.story(
          update,
          givenEnterAnimating,
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
        )
      })

      it('ignores a leave settlement after an enter starts', ({
        animation: { update, givenLeaveAnimating },
      }) => {
        Story.story(
          update,
          givenLeaveAnimating,
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
        )
      })

      it('ignores an enter paint after a leave starts', ({
        animation: { update, init },
      }) => {
        Story.story(
          update,
          Story.given(init({ id: 'test' }).model),
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
        )
      })
    })
  })

  describe('toggle', () => {
    it('shows a hidden animation', ({ animation: { operations, init } }) => {
      const animationToggle = operations.requestToggle(
        init({ id: 'test' }).model,
      )

      expect(animationToggle.model.isShowing).toBe(true)
      expect(animationToggle.model.transitionState).toBe('EnterStart')
      expect(animationToggle.commands).toHaveLength(1)
    })

    it('hides a shown animation', ({ animation: { operations, init } }) => {
      const animationToggle = operations.requestToggle(
        init({ id: 'test', isShowing: true }).model,
      )

      expect(animationToggle.model.isShowing).toBe(false)
      expect(animationToggle.model.transitionState).toBe('LeaveStart')
      expect(animationToggle.commands).toHaveLength(1)
    })
  })

  describe('programmatic capabilities', () => {
    it('shows a hidden Animation', ({ animation: { operations, init } }) => {
      const animationShow = operations.requestShow(init({ id: 'test' }).model)

      expect(animationShow.model.isShowing).toBe(true)
      expect(animationShow.model.transitionState).toBe('EnterStart')
      expect(animationShow.commands).toHaveLength(1)
    })

    it('hides a showing Animation', ({ animation: { operations, init } }) => {
      const animationHide = operations.requestHide(
        init({ id: 'test', isShowing: true }).model,
      )

      expect(animationHide.model.isShowing).toBe(false)
      expect(animationHide.model.transitionState).toBe('LeaveStart')
      expect(animationHide.commands).toHaveLength(1)
    })

    it('requests the standard wait only while leave is animating', ({
      animation: { init, operations, update, receive },
    }) => {
      const idleModel = init({ id: 'test' }).model
      const idleWait = operations.requestWaitForLeaveSettlement(idleModel)

      expect(idleWait).toEqual({ model: idleModel })

      const leaveStart = receive(
        init({ id: 'test', isShowing: true }).model,
        InMessage.RequestedHide(),
      )
      const leaveAnimating = update(
        leaveStart.model,
        Message.CompletedWaitForPaint({
          generation: FIRST_TRANSITION_GENERATION,
        }),
      )
      const leaveWait = operations.requestWaitForLeaveSettlement(
        leaveAnimating.model,
      )

      expect(leaveWait.model).toBe(leaveAnimating.model)
      expect(
        leaveWait.commands?.map(({ name, args }) => ({ name, args })),
      ).toStrictEqual([
        {
          name: WaitForAnimationSettled.name,
          args: {
            id: 'test',
            generation: FIRST_TRANSITION_GENERATION,
          },
        },
      ])
    })

    it('emits TransitionedOut once when the standard wait is explicitly requested twice', ({
      animation: { update, init, operations, receive },
    }) => {
      const leaveStart = receive(
        init({ id: 'test', isShowing: true }).model,
        InMessage.RequestedHide(),
      )
      const leaveAnimating = update(
        leaveStart.model,
        Message.CompletedWaitForPaint({
          generation: FIRST_TRANSITION_GENERATION,
        }),
      )
      const duplicatePaint = update(
        leaveAnimating.model,
        Message.CompletedWaitForPaint({
          generation: FIRST_TRANSITION_GENERATION,
        }),
      )
      const firstWait = operations.requestWaitForLeaveSettlement(
        duplicatePaint.model,
      )
      const duplicateWait = operations.requestWaitForLeaveSettlement(
        firstWait.model,
      )
      const expectedWait = [
        {
          name: WaitForAnimationSettled.name,
          args: {
            id: 'test',
            generation: FIRST_TRANSITION_GENERATION,
          },
        },
      ]

      expect(duplicatePaint).toEqual({ model: leaveAnimating.model })
      expect(
        firstWait.commands?.map(({ name, args }) => ({ name, args })),
      ).toStrictEqual(expectedWait)
      expect(
        duplicateWait.commands?.map(({ name, args }) => ({ name, args })),
      ).toStrictEqual(expectedWait)

      const firstCompletion = update(
        duplicateWait.model,
        Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
      )

      expect(firstCompletion.outMessage).toEqual(OutMessage.TransitionedOut())

      const duplicateCompletion = update(
        firstCompletion.model,
        Message.EndedAnimation({ generation: FIRST_TRANSITION_GENERATION }),
      )

      expect(duplicateCompletion).toEqual({ model: firstCompletion.model })
    })

    it('resets a leaving Animation immediately without completing the transition', ({
      animation: { update, init, operations, receive },
    }) => {
      const leaveStart = receive(
        init({ id: 'test', isShowing: true }).model,
        InMessage.RequestedHide(),
      )
      const leaveAnimating = update(
        leaveStart.model,
        Message.CompletedWaitForPaint({
          generation: FIRST_TRANSITION_GENERATION,
        }),
      )

      const animationReset = operations.requestImmediateReset(
        leaveAnimating.model,
      )

      expect(animationReset).toEqual({
        model: {
          id: 'test',
          isShowing: false,
          transitionState: 'Idle',
          transitionGeneration: FIRST_TRANSITION_GENERATION,
        },
      })

      const staleSettlement = update(
        animationReset.model,
        Message.EndedAnimation({
          generation: FIRST_TRANSITION_GENERATION,
        }),
      )

      expect(staleSettlement).toEqual({ model: animationReset.model })
    })
  })
})

import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  Message,
  OutMessage,
  WaitForAnimationSettled,
  WaitForPaint,
  hide,
  init,
  show,
  toggle,
  update,
} from './index.js'

describe('Animation', () => {
  describe('init', () => {
    it('defaults isShowing to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isShowing: false,
        transitionState: 'Idle',
      })
    })

    it('accepts a custom isShowing', () => {
      expect(init({ id: 'test', isShowing: true })).toStrictEqual({
        id: 'test',
        isShowing: true,
        transitionState: 'Idle',
      })
    })
  })

  describe('update', () => {
    describe('Showed', () => {
      it('starts enter lifecycle when hidden', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test' })),
          Story.message(Message.Showed()),
          Story.model(model => {
            expect(model.isShowing).toBe(true)
            expect(model.transitionState).toBe('EnterStart')
          }),
          Story.Command.expectHas(WaitForPaint),
          Story.Command.resolve(WaitForPaint, Message.CompletedWaitForPaint()),
          Story.model(model => {
            expect(model.transitionState).toBe('EnterAnimating')
          }),
          Story.Command.resolve(
            WaitForAnimationSettled,
            Message.EndedAnimation(),
          ),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectNoOutMessage(),
        )
      })

      it('does nothing when already showing', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isShowing: true })),
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
      it('starts leave lifecycle when showing', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isShowing: true })),
          Story.message(Message.Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
            expect(model.transitionState).toBe('LeaveStart')
          }),
          Story.Command.expectHas(WaitForPaint),
          Story.Command.resolve(WaitForPaint, Message.CompletedWaitForPaint()),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.Command.expectNone(),
          Story.expectOutMessage(OutMessage.StartedLeaveAnimating()),
          Story.message(Message.EndedAnimation()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.expectOutMessage(OutMessage.TransitionedOut()),
        )
      })

      it('does nothing when already hidden', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test' })),
          Story.message(Message.Hid()),
          Story.model(model => {
            expect(model.isShowing).toBe(false)
          }),
          Story.Command.expectNone(),
          Story.expectNoOutMessage(),
        )
      })

      it('does nothing when already in LeaveAnimating', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', isShowing: true })),
          Story.message(Message.Hid()),
          Story.Command.expectHas(WaitForPaint),
          Story.Command.resolve(WaitForPaint, Message.CompletedWaitForPaint()),
          Story.model(model => {
            expect(model.transitionState).toBe('LeaveAnimating')
          }),
          Story.Command.expectNone(),
          Story.expectOutMessage(OutMessage.StartedLeaveAnimating()),
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
      it('does nothing when Idle', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test' })),
          Story.message(Message.CompletedWaitForPaint()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })
    })

    describe('EndedAnimation', () => {
      it('does nothing when Idle', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test' })),
          Story.message(Message.EndedAnimation()),
          Story.model(model => {
            expect(model.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })
    })
  })

  describe('toggle', () => {
    it('shows a hidden animation', () => {
      const animationToggle = toggle(init({ id: 'test' }))

      expect(animationToggle.model.isShowing).toBe(true)
      expect(animationToggle.model.transitionState).toBe('EnterStart')
      expect(animationToggle.commands).toHaveLength(1)
    })

    it('hides a shown animation', () => {
      const animationToggle = toggle(init({ id: 'test', isShowing: true }))

      expect(animationToggle.model.isShowing).toBe(false)
      expect(animationToggle.model.transitionState).toBe('LeaveStart')
      expect(animationToggle.commands).toHaveLength(1)
    })
  })

  describe('programmatic capabilities', () => {
    it('shows a hidden Animation', () => {
      const animationShow = show(init({ id: 'test' }))

      expect(animationShow.model.isShowing).toBe(true)
      expect(animationShow.model.transitionState).toBe('EnterStart')
      expect(animationShow.commands).toHaveLength(1)
    })

    it('hides a showing Animation', () => {
      const animationHide = hide(init({ id: 'test', isShowing: true }))

      expect(animationHide.model.isShowing).toBe(false)
      expect(animationHide.model.transitionState).toBe('LeaveStart')
      expect(animationHide.commands).toHaveLength(1)
    })
  })
})
